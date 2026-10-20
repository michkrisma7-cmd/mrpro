import { randomUUID } from "node:crypto";
import {
  chatInput,
  groundedAnswer,
  handoffReply,
  outsideChatScope,
  scopeReply,
  unavailableReply,
} from "@/lib/chat";
import { getChatKnowledge } from "@/lib/chat-knowledge";
import { allowChatAttempt } from "@/lib/chat-limit";
import { getSettings } from "@/lib/data";
import { whatsappLink } from "@/lib/format";
import { chatOriginAllowed } from "@/lib/chat-config";

export const runtime = "nodejs";

async function readBody(request: Request) {
  if (!request.body) throw new Error("Empty body");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "",
    size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20000) {
        await reader.cancel();
        throw new Error("Body too large");
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  if (!chatOriginAllowed(request, process.env))
    return Response.json(
      { message: "Permintaan tidak diizinkan." },
      { status: 403 },
    );
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    return Response.json({ message: "Gunakan JSON." }, { status: 415 });
  let body: unknown;
  try {
    body = await readBody(request);
  } catch {
    return Response.json(
      { message: "Pesan tidak valid atau terlalu panjang." },
      { status: 400 },
    );
  }
  const parsed = chatInput.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { message: "Tulis pesan maksimal 1.200 karakter." },
      { status: 400 },
    );
  const { message, history } = parsed.data;
  const cookie = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)mr_chat=([a-f0-9-]{36})(?:;|$)/)?.[1];
  const session = cookie || randomUUID();
  const headers = {
    "Cache-Control": "private, no-store",
    "Set-Cookie": `mr_chat=${session}; Path=/api/chat; HttpOnly; SameSite=Strict; Max-Age=900${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  };
  let whatsappUrl: string | null = null;
  try {
    whatsappUrl = whatsappLink(
      (await getSettings()).whatsapp,
      `Halo MR Properti, saya ingin dibantu mengenai: ${message.slice(0, 500)}`,
    );
  } catch {
    /* The widget keeps its contact link if a database read fails. */
  }
  const fallback = (reply = handoffReply, status = 200) =>
    Response.json(
      { reply, handoff: true, sources: [], whatsappUrl },
      { status, headers },
    );
  if (outsideChatScope(message)) return fallback(scopeReply);
  if (
    /\b(admin|manusia|orang langsung|whatsapp|wa|pesan jasa|booking|jadwalkan survei)\b/i.test(
      message,
    )
  )
    return fallback();
  try {
    if (!(await allowChatAttempt(session)))
      return fallback(
        "Pesan kamu cukup banyak. Yuk lanjutkan dengan tim MR Properti lewat WhatsApp, atau coba Chat lagi dalam 15 menit.",
        429,
      );
    const url = process.env.N8N_CHAT_WEBHOOK_URL;
    const key = process.env.N8N_CHAT_WEBHOOK_SECRET;
    if (!url || !key) {
      console.warn("[chat] webhook_not_configured");
      return fallback(unavailableReply);
    }
    const knowledge = await getChatKnowledge(
      [
        message,
        ...history
          .filter((h) => h.role === "user")
          .slice(-2)
          .map((h) => h.content),
      ]
        .join(" ")
        .slice(0, 3500),
    );
    if (
      knowledge.sources.length < 2 &&
      !/\b(halo|hai|hello|pagi|siang|sore|malam|layanan|properti|bantu|terima kasih|makasih)\b/i.test(
        message,
      )
    )
      return fallback();
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mr-token": key },
      body: JSON.stringify({ message, history }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) {
      console.warn(
        `[chat] webhook_http_${response.status}${url.includes("/webhook-test/") && response.status === 404 ? ": klik Listen for test event di n8n sebelum mengirim pesan; listener test hanya menerima satu panggilan." : ""}`,
      );
      return fallback(unavailableReply);
    }
    const answer = groundedAnswer(await response.json(), knowledge.sources);
    if (!answer) {
      console.warn("[chat] invalid_model_answer");
      return fallback();
    }
    return Response.json({ ...answer, whatsappUrl }, { headers });
  } catch (error) {
    console.warn(
      "[chat] request_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return fallback(unavailableReply);
  }
}
