// chatbot-mrp: a 1:1 port of the n8n workflow "MRP-Chat-groq" (UI0HBaX7pESdq629).
//
// Behaviour copies the live workflow (versionId 0f416495, 21-11-2026):
// Chat Webhook (header auth x-mr-token) → Validasi Pesan → Ada Sumber? →
// [Baca Data MR] → Susun Prompt → Groq gpt-oss-120b → Periksa Jawaban →
// [Groq gpt-oss-20b → Periksa Cadangan] → 200 jawaban / 502 gagal.
// Only stdlib, so the image is a single static binary.
package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"
)

//go:embed prompt.txt
var systemPrompt string

const (
	webhookPath    = "/webhook/mr-konsultasi"
	modelPrimary   = "openai/gpt-oss-120b"
	modelFallback  = "openai/gpt-oss-20b"
	groqURL        = "https://api.groq.com/openai/v1/chat/completions"
	groqTimeout    = 40 * time.Second
	knowledgeLimit = 10 * time.Second
	invalidReply   = "Pesan tidak valid atau terlalu panjang. Tulis pertanyaan maksimal 1.200 karakter."
)

type config struct {
	token        string
	groqKey      string
	knowledgeURL string
	groqURL      string
}

type server struct {
	cfg    config
	client *http.Client
	wib    *time.Location
}

func main() {
	health := flag.Bool("health", false, "cek /healthz lalu keluar (untuk HEALTHCHECK Docker)")
	flag.Parse()
	port := envOr("PORT", "8080")
	if *health {
		r, err := http.Get("http://127.0.0.1:" + port + "/healthz")
		if err != nil || r.StatusCode != 200 {
			os.Exit(1)
		}
		os.Exit(0)
	}
	cfg := config{
		token:        os.Getenv("MR_CHAT_TOKEN"),
		groqKey:      os.Getenv("GROQ_API_KEY"),
		knowledgeURL: envOr("KNOWLEDGE_URL", "https://mrproperti.com/api/chat/knowledge"),
		groqURL:      envOr("GROQ_URL", groqURL),
	}
	if cfg.token == "" || cfg.groqKey == "" {
		log.Fatal("MR_CHAT_TOKEN dan GROQ_API_KEY wajib diisi (lihat .env.example)")
	}
	s := newServer(cfg)
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           s.routes(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	go func() {
		ch := make(chan os.Signal, 1)
		signal.Notify(ch, syscall.SIGTERM, syscall.SIGINT)
		<-ch
		ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
	}()
	log.SetFlags(0)
	log.Printf(`{"t":%q,"info":"start","port":%q}`, time.Now().In(s.wib).Format(time.RFC3339), port)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func newServer(cfg config) *server {
	return &server{
		cfg:    cfg,
		client: &http.Client{CheckRedirect: nil},
		wib:    time.FixedZone("WIB", 7*3600),
	}
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	mux.HandleFunc(webhookPath, s.handle)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 404, map[string]any{"code": 404, "message": "The requested webhook is not registered."})
	})
	return mux
}

// logLine records metadata only — never the visitor's message or the answer.
type logLine struct {
	T      string `json:"t"`
	Sesi   string `json:"sesi"`
	Model  string `json:"model"`
	Hasil  string `json:"hasil"`
	Status int    `json:"status"`
	MS     int64  `json:"ms"`
	Sumber string `json:"sumber,omitempty"`
}

func (s *server) handle(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	ll := logLine{Sesi: requestID(), Model: "-"}
	defer func() {
		ll.T = start.In(s.wib).Format(time.RFC3339)
		ll.MS = time.Since(start).Milliseconds()
		var b bytes.Buffer
		enc := json.NewEncoder(&b)
		enc.SetEscapeHTML(false)
		_ = enc.Encode(ll)
		log.Print(strings.TrimSpace(b.String()))
	}()

	if r.Method != http.MethodPost {
		ll.Hasil, ll.Status = "method_"+r.Method, 404
		writeJSON(w, 404, map[string]any{"code": 404, "message": "This webhook is not registered for " + r.Method + " requests. Did you mean to make a POST request?"})
		return
	}
	// n8n Header Auth: exact value match, otherwise 403 with this text.
	provided := r.Header.Get("x-mr-token")
	if !equalSecret(provided, s.cfg.token) {
		ll.Hasil, ll.Status = "auth_403", 403
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(403)
		w.Write([]byte("Authorization data is wrong!"))
		return
	}

	raw, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	var body any
	_ = json.Unmarshal(raw, &body)
	in := validate(body)
	if !in.Valid {
		ll.Hasil, ll.Status = "pesan_tidak_valid", 200
		writeJSON(w, 200, answer{Reply: invalidReply, Handoff: false, SourceIDs: []string{}})
		return
	}

	sources := in.Sources
	ll.Sumber = "website"
	if !in.HasSources {
		ll.Sumber = "knowledge"
		kb, err := s.fetchKnowledge(r.Context(), in.Message, provided)
		if err != nil {
			// n8n: a thrown node error ends the execution before Respond to Webhook.
			ll.Hasil, ll.Status = "knowledge_error", 500
			writeJSON(w, 500, map[string]any{"code": 0, "message": "Error in workflow"})
			return
		}
		sources = knowledgeSources(kb)
	}

	allowed := map[string]bool{}
	for _, src := range sources {
		allowed[src.ID] = true
	}
	messages := buildMessages(in, sources)

	res, err := s.askGroq(r.Context(), modelPrimary, messages)
	if err != nil {
		ll.Model, ll.Hasil, ll.Status = "gpt-oss-120b", "groq_transport_error", 500
		writeJSON(w, 500, map[string]any{"code": 0, "message": "Error in workflow"})
		return
	}
	a := checkAnswer(res, allowed)
	ll.Model = "gpt-oss-120b"
	if a.Thrown {
		ll.Hasil, ll.Status = "periksa_throw", 500
		writeJSON(w, 500, map[string]any{"code": 0, "message": "Error in workflow"})
		return
	}
	if !a.OK {
		ll.Model = "gpt-oss-20b"
		res, err = s.askGroq(r.Context(), modelFallback, messages)
		if err != nil {
			ll.Hasil, ll.Status = a.Diagnostic+">groq_transport_error", 500
			writeJSON(w, 500, map[string]any{"code": 0, "message": "Error in workflow"})
			return
		}
		first := a.Diagnostic
		a = checkAnswer(res, allowed)
		ll.Hasil = first + ">" + a.Diagnostic
		if a.Thrown {
			ll.Hasil, ll.Status = first+">periksa_throw", 500
			writeJSON(w, 500, map[string]any{"code": 0, "message": "Error in workflow"})
			return
		}
		if !a.OK {
			ll.Status = 502
			writeJSON(w, 502, answer{Reply: a.Reply, Handoff: a.Handoff, SourceIDs: a.SourceIDs})
			return
		}
	} else {
		ll.Hasil = a.Diagnostic
	}
	ll.Status = 200
	writeJSON(w, 200, answer{Reply: a.Reply, Handoff: a.Handoff, SourceIDs: a.SourceIDs})
}

type answer struct {
	Reply     string   `json:"reply"`
	Handoff   bool     `json:"handoff"`
	SourceIDs []string `json:"source_ids"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}

func equalSecret(a, b string) bool {
	ha, hb := sha256.Sum256([]byte(a)), sha256.Sum256([]byte(b))
	return a != "" && subtle.ConstantTimeCompare(ha[:], hb[:]) == 1
}

func requestID() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// fetchKnowledge copies node "Baca Data MR": GET ?search=<message>, header
// x-mr-token from the incoming request, 10 s timeout, HTTP errors do not throw
// (neverError) but network errors do.
func (s *server) fetchKnowledge(ctx context.Context, message, token string) (any, error) {
	ctx, cancel := context.WithTimeout(ctx, knowledgeLimit)
	defer cancel()
	u := s.cfg.knowledgeURL + "?search=" + url.QueryEscape(message)
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	req.Header.Set("x-mr-token", token)
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	var v any
	if json.Unmarshal(b, &v) != nil {
		return map[string]any{}, nil
	}
	return v, nil
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func buildMessages(in input, sources []source) []chatMessage {
	data := ""
	for i, src := range sources {
		if i > 0 {
			data += "\n\n"
		}
		data += "[" + src.ID + "] " + src.Title + "\n" + src.Text
	}
	if data == "" {
		data = "(kosong)"
	}
	msgs := []chatMessage{{Role: "system", Content: systemPrompt}}
	msgs = append(msgs, in.History...)
	msgs = append(msgs, chatMessage{Role: "user", Content: "DATA:\n" + data + "\n\nPERTANYAAN:\n" + in.Message})
	return msgs
}

// askGroq copies "Tanya Groq"/"Tanya Groq Cadangan": same body, 40 s timeout,
// HTTP errors are returned as data (neverError), network errors fail.
func (s *server) askGroq(ctx context.Context, model string, messages []chatMessage) (any, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(groqBody(model, messages))
	ctx, cancel := context.WithTimeout(ctx, groqTimeout)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, s.cfg.groqURL, &buf)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.cfg.groqKey)
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	var v any
	if json.Unmarshal(b, &v) != nil {
		return map[string]any{"_status": strconv.Itoa(resp.StatusCode)}, nil
	}
	return v, nil
}

// groqBody = groqBody/groqBodyCadangan built in node "Susun Prompt".
func groqBody(model string, messages []chatMessage) map[string]any {
	return map[string]any{
		"model":                 model,
		"messages":              messages,
		"temperature":           0.3,
		"max_completion_tokens": 1200,
		"reasoning_effort":      "low",
		"response_format":       map[string]string{"type": "json_object"},
	}
}
