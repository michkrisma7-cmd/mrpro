"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  MessageCircle,
  Plus,
  Send,
  X,
} from "lucide-react";
import { whatsappLink } from "@/lib/format";
import { unavailableReply, type ChatAnswer } from "@/lib/chat-shared";
import "./chat-widget.css";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  answer?: ChatAnswer;
};
const suggestions = [
  "Layanan apa saja yang tersedia?",
  "Mau tanya soal cuci AC",
  "Bagaimana cara titip properti?",
];

export function ChatWidget({
  whatsapp,
  initiallyOpen = false,
}: {
  whatsapp: string;
  initiallyOpen?: boolean;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(initiallyOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const defaultWa = whatsappLink(
    whatsapp,
    "Halo MR Properti, saya ingin berkonsultasi.",
  );

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => {
    log.current?.scrollTo({
      top: log.current.scrollHeight,
      behavior: "instant",
    });
  }, [messages, busy, open]);
  useEffect(() => () => controller.current?.abort(), []);

  if (path.startsWith("/admin") || path.startsWith("/login")) return null;

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }
  async function send(value: string) {
    const message = value.trim();
    if (!message || message.length > 1200 || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setDraft("");
    const history = messages
      .filter((m) => !m.answer?.handoff)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2400) }));
    setMessages((previous) => [
      ...previous,
      { id: ++sequence.current, role: "user", content: message },
    ]);
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 50000);
    let answer: ChatAnswer;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (
        typeof data.reply !== "string" ||
        typeof data.handoff !== "boolean" ||
        !Array.isArray(data.sources)
      )
        throw new Error("Invalid response");
      answer = data;
    } catch {
      answer = {
        reply: unavailableReply,
        handoff: true,
        sources: [],
        whatsappUrl: defaultWa,
      };
    } finally {
      window.clearTimeout(timeout);
      inFlight.current = false;
      setBusy(false);
    }
    setMessages((previous) => [
      ...previous,
      {
        id: ++sequence.current,
        role: "assistant",
        content: answer.reply,
        answer,
      },
    ]);
  }

  return (
    <div className="mr-chat">
      {open && (
        <section
          id="mr-chat-panel"
          className="mr-chat-panel"
          role="dialog"
          aria-labelledby="mr-chat-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <header className="mr-chat-header">
            <span className="mr-chat-avatar">
              <MessageCircle size={23} strokeWidth={1.6} />
            </span>
            <div>
              <span className="mr-chat-overline">MR PROPERTI</span>
              <h2 id="mr-chat-title">Ruang untuk bertanya.</h2>
              <p>
                <span /> Properti & layanan rumah
              </p>
            </div>
            <button
              type="button"
              className="mr-chat-close"
              aria-label="Tutup Chat"
              onClick={close}
            >
              <X size={20} />
            </button>
          </header>
          <div
            ref={log}
            className="mr-chat-log"
            role="log"
            aria-label="Percakapan Chat"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={busy}
          >
            <div className="mr-chat-date">MARI MULAI CERITA ANDA</div>
            <div className="mr-chat-message is-assistant">
              <span className="mr-chat-speaker">MR Properti</span>
              <p>
                Halo! Lagi cari tempat untuk pulang, atau butuh bantuan untuk
                rumah?
              </p>
              <p>Ceritakan kebutuhan kamu. Kita cari informasinya bareng.</p>
            </div>
            {!messages.length && (
              <div
                className="mr-chat-suggestions"
                aria-label="Mulai percakapan"
              >
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => void send(s)}>
                    {s}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`mr-chat-message is-${m.role}`}>
                <span className="mr-chat-speaker">
                  {m.role === "user" ? "Kamu" : "MR Properti"}
                </span>
                <p>{m.content}</p>
                {m.answer?.sources.length ? (
                  <div className="mr-chat-sources">
                    <span>Informasi dari</span>
                    {m.answer.sources.map((source) => (
                      <Link key={source.path + source.title} href={source.path}>
                        {source.title}
                        <ArrowUpRight size={13} />
                      </Link>
                    ))}
                  </div>
                ) : null}
                {m.answer?.handoff &&
                  (m.answer.whatsappUrl || defaultWa ? (
                    <a
                      className="mr-chat-handoff"
                      href={m.answer.whatsappUrl || defaultWa || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Lanjut ke WhatsApp
                      <ArrowUpRight size={16} />
                    </a>
                  ) : (
                    <Link className="mr-chat-handoff" href="/#tentang">
                      Lihat kontak MR Properti
                      <ArrowUpRight size={16} />
                    </Link>
                  ))}
              </div>
            ))}
            {busy && (
              <div className="mr-chat-typing" role="status">
                <span />
                <span />
                <span />
                <span className="sr-only">Sedang menyiapkan jawaban</span>
              </div>
            )}
          </div>
          <div className="mr-chat-bottom">
            {defaultWa && (
              <a
                className="mr-chat-team"
                href={defaultWa}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  <MessageCircle size={14} /> Ingin langsung ngobrol dengan tim?
                </span>
                <ArrowUpRight size={15} />
              </a>
            )}
            <form
              className="mr-chat-form"
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
            >
              <label className="sr-only" htmlFor="mr-chat-input">
                Pesan Chat
              </label>
              <textarea
                id="mr-chat-input"
                ref={input}
                rows={1}
                maxLength={1200}
                value={draft}
                placeholder="Tulis kebutuhan kamu…"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void send(draft);
                  }
                }}
              />
              <button
                type="submit"
                aria-label="Kirim pesan"
                disabled={busy || !draft.trim()}
              >
                <Send size={17} />
              </button>
            </form>
            <p className="mr-chat-caption">
              <Check size={12} /> Jawaban dari informasi MR Properti
            </p>
          </div>
        </section>
      )}
      <button
        type="button"
        ref={launcher}
        className={`mr-chat-launcher${open ? " is-open" : ""}`}
        aria-label={open ? "Minimalkan Chat" : "Buka Chat"}
        aria-expanded={open}
        aria-controls="mr-chat-panel"
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? (
          <ArrowDown size={21} />
        ) : (
          <MessageCircle size={22} strokeWidth={1.7} />
        )}
        <span>Chat</span>
        {!open && (
          <span className="mr-chat-launcher-plus">
            <Plus size={14} />
          </span>
        )}
      </button>
    </div>
  );
}
