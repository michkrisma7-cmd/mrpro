package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"strings"
	"sync"
	"testing"
)

type fixtures struct {
	Validasi []struct {
		Body any `json:"body"`
		Out  any `json:"out"`
	} `json:"validasi"`
	Prompts []struct {
		V   json.RawMessage `json:"v"`
		KB  any             `json:"kb"`
		Out map[string]any  `json:"out"`
	} `json:"prompts"`
	Periksa []struct {
		Item    any      `json:"item"`
		Allowed []string `json:"allowed"`
		Thrown  bool     `json:"thrown"`
		Out     any      `json:"out"`
	} `json:"periksa"`
	TidakValid any `json:"tidakValid"`
}

func loadFixtures(t *testing.T) fixtures {
	t.Helper()
	b, err := os.ReadFile("testdata/fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var f fixtures
	if err := json.Unmarshal(b, &f); err != nil {
		t.Fatal(err)
	}
	return f
}

// norm round-trips through JSON so Go structs compare with JS output.
func norm(t *testing.T, v any) any {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	var out any
	_ = json.Unmarshal(b, &out)
	return out
}

func set(ids []string) map[string]bool {
	m := map[string]bool{}
	for _, id := range ids {
		m[id] = true
	}
	return m
}

func TestValidasiSamaDenganN8n(t *testing.T) {
	for i, c := range loadFixtures(t).Validasi {
		if got := norm(t, validate(c.Body)); !reflect.DeepEqual(got, c.Out) {
			t.Errorf("kasus %d:\n go: %v\n n8n: %v", i, got, c.Out)
		}
	}
}

func TestSusunPromptSamaDenganN8n(t *testing.T) {
	f := loadFixtures(t)
	if len(f.Prompts) == 0 {
		t.Fatal("tidak ada fixture prompt")
	}
	for i, c := range f.Prompts {
		var in input
		if err := json.Unmarshal(c.V, &in); err != nil {
			t.Fatal(err)
		}
		sources := in.Sources
		if !in.HasSources {
			sources = knowledgeSources(c.KB)
		}
		ids := []string{}
		for _, s := range sources {
			ids = append(ids, s.ID)
		}
		msgs := buildMessages(in, sources)
		got := map[string]any{
			"sourceIds":        norm(t, ids),
			"groqBody":         norm(t, groqBody(modelPrimary, msgs)),
			"groqBodyCadangan": norm(t, groqBody(modelFallback, msgs)),
		}
		want := norm(t, c.Out).(map[string]any)
		if !reflect.DeepEqual(got, want) {
			gb, _ := json.Marshal(got)
			wb, _ := json.Marshal(want)
			t.Errorf("kasus %d berbeda:\n go: %.600s\n n8n: %.600s", i, gb, wb)
		}
	}
}

func TestPeriksaJawabanSamaDenganN8n(t *testing.T) {
	for i, c := range loadFixtures(t).Periksa {
		got := checkAnswer(c.Item, set(c.Allowed))
		if got.Thrown != c.Thrown {
			t.Errorf("kasus %d: thrown go=%v n8n=%v", i, got.Thrown, c.Thrown)
			continue
		}
		if c.Thrown {
			continue
		}
		if g := norm(t, got); !reflect.DeepEqual(g, c.Out) {
			t.Errorf("kasus %d:\n go: %v\n n8n: %v", i, g, c.Out)
		}
	}
}

func TestPesanTidakValidSama(t *testing.T) {
	want := loadFixtures(t).TidakValid
	got := norm(t, answer{Reply: invalidReply, Handoff: false, SourceIDs: []string{}})
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("go %v, n8n %v", got, want)
	}
}

// --- alur HTTP dengan Groq & knowledge palsu ---------------------------------

type fakeGroq struct {
	mu      sync.Mutex
	models  []string
	replies map[string]string // model -> raw response body
	status  map[string]int
}

func (f *fakeGroq) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var b map[string]any
	_ = json.NewDecoder(r.Body).Decode(&b)
	m, _ := b["model"].(string)
	f.mu.Lock()
	f.models = append(f.models, m)
	f.mu.Unlock()
	if r.Header.Get("Authorization") != "Bearer kunci-groq" {
		w.WriteHeader(401)
		return
	}
	if s := f.status[m]; s != 0 {
		w.WriteHeader(s)
	}
	io.WriteString(w, f.replies[m])
}

func content(c string) string {
	b, _ := json.Marshal(map[string]any{"choices": []any{map[string]any{"message": map[string]any{"content": c}}}})
	return string(b)
}

func setup(t *testing.T, g *fakeGroq, kb http.Handler) (*httptest.Server, *bytes.Buffer) {
	t.Helper()
	gs := httptest.NewServer(g)
	t.Cleanup(gs.Close)
	kbURL := "http://127.0.0.1:1/tutup"
	if kb != nil {
		ks := httptest.NewServer(kb)
		t.Cleanup(ks.Close)
		kbURL = ks.URL
	}
	s := newServer(config{token: "rahasia", groqKey: "kunci-groq", knowledgeURL: kbURL, groqURL: gs.URL})
	srv := httptest.NewServer(s.routes())
	t.Cleanup(srv.Close)
	var logs bytes.Buffer
	log.SetOutput(&logs)
	log.SetFlags(0)
	t.Cleanup(func() { log.SetOutput(os.Stderr) })
	return srv, &logs
}

func post(t *testing.T, url, token, body string) (int, string) {
	t.Helper()
	req, _ := http.NewRequest("POST", url+webhookPath, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("X-Mr-Token", token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, strings.TrimSpace(string(b))
}

const rahasiaPesan = "RAHASIA-KONSUMEN-0812"

var bodyDenganSumber = `{"message":"` + rahasiaPesan + ` rumah di Cikarang?","history":[],"sources":[{"id":"site:overview","title":"MR","text":"x"},{"id":"property:1","title":"Rumah","text":"y"}]}`

func TestAuth(t *testing.T) {
	srv, _ := setup(t, &fakeGroq{}, nil)
	for _, tok := range []string{"", "salah"} {
		code, body := post(t, srv.URL, tok, bodyDenganSumber)
		if code != 403 || body != "Authorization data is wrong!" {
			t.Errorf("token %q: %d %q", tok, code, body)
		}
	}
	resp, _ := http.Get(srv.URL + webhookPath)
	if resp.StatusCode != 404 {
		t.Errorf("GET: %d", resp.StatusCode)
	}
}

func TestPesanTidakValidHTTP(t *testing.T) {
	g := &fakeGroq{}
	srv, _ := setup(t, g, nil)
	code, body := post(t, srv.URL, "rahasia", `{"message":"   "}`)
	if code != 200 || body != `{"reply":"`+invalidReply+`","handoff":false,"source_ids":[]}` {
		t.Fatalf("%d %s", code, body)
	}
	if len(g.models) != 0 {
		t.Fatal("Groq tidak boleh dipanggil")
	}
}

func TestUtamaBerhasil(t *testing.T) {
	g := &fakeGroq{replies: map[string]string{modelPrimary: content(`{"reply":"Ada, Kak.","handoff":false,"source_ids":["property:1"]}`)}}
	srv, logs := setup(t, g, nil)
	code, body := post(t, srv.URL, "rahasia", bodyDenganSumber)
	if code != 200 || body != `{"reply":"Ada, Kak.","handoff":false,"source_ids":["property:1"]}` {
		t.Fatalf("%d %s", code, body)
	}
	if !reflect.DeepEqual(g.models, []string{modelPrimary}) {
		t.Fatal(g.models)
	}
	if strings.Contains(logs.String(), rahasiaPesan) || strings.Contains(logs.String(), "Ada, Kak") {
		t.Fatal("log memuat isi pesan/jawaban")
	}
	if !strings.Contains(logs.String(), `"model":"gpt-oss-120b","hasil":"groq_ok","status":200`) {
		t.Fatal(logs.String())
	}
}

func TestCadangan(t *testing.T) {
	g := &fakeGroq{
		replies: map[string]string{
			modelPrimary:  `{"error":{"message":"limit","code":"rate_limit_exceeded"}}`,
			modelFallback: content(`{"reply":"Cadangan.","handoff":false,"source_ids":[]}`),
		},
		status: map[string]int{modelPrimary: 429},
	}
	srv, logs := setup(t, g, nil)
	code, body := post(t, srv.URL, "rahasia", bodyDenganSumber)
	if code != 200 || body != `{"reply":"Cadangan.","handoff":false,"source_ids":["site:overview"]}` {
		t.Fatalf("%d %s", code, body)
	}
	if !reflect.DeepEqual(g.models, []string{modelPrimary, modelFallback}) {
		t.Fatal(g.models)
	}
	if !strings.Contains(logs.String(), `groq_error:rate_limit_exceeded>groq_ok`) {
		t.Fatal(logs.String())
	}
}

func TestKeduanyaGagal502(t *testing.T) {
	g := &fakeGroq{replies: map[string]string{modelPrimary: content("rusak"), modelFallback: content("rusak")}}
	srv, _ := setup(t, g, nil)
	code, body := post(t, srv.URL, "rahasia", bodyDenganSumber)
	if code != 502 || body != `{"reply":"","handoff":true,"source_ids":[]}` {
		t.Fatalf("%d %s", code, body)
	}
}

func TestTanpaSumberAmbilKnowledge(t *testing.T) {
	var gotSearch, gotToken string
	kb := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotSearch, gotToken = r.URL.Query().Get("search"), r.Header.Get("x-mr-token")
		io.WriteString(w, `{"brand":"MR","sources":[{"id":"site:overview","title":"MR","text":"Marketplace"}]}`)
	})
	g := &fakeGroq{replies: map[string]string{modelPrimary: content(`{"reply":"Halo!","handoff":false,"source_ids":["site:overview"]}`)}}
	srv, _ := setup(t, g, kb)
	code, body := post(t, srv.URL, "rahasia", `{"message":"  halo & salam  ","history":[]}`)
	if code != 200 || !strings.Contains(body, `"Halo!"`) {
		t.Fatalf("%d %s", code, body)
	}
	if gotSearch != "halo & salam" || gotToken != "rahasia" {
		t.Fatalf("search=%q token=%q", gotSearch, gotToken)
	}
}

func TestKnowledgeMati500(t *testing.T) {
	srv, _ := setup(t, &fakeGroq{}, nil)
	code, _ := post(t, srv.URL, "rahasia", `{"message":"halo"}`)
	if code != 500 {
		t.Fatal(code)
	}
}
