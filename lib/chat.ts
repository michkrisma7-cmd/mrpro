import { z } from "zod";

export const chatInput = z
  .object({
    message: z.string().trim().min(1).max(1200),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().max(2400),
          })
          .strict(),
      )
      .max(6)
      .default([]),
  })
  .strict();
import { handoffReply, type ChatSource } from "./chat-shared";
export {
  handoffReply,
  unavailableReply,
  scopeReply,
  type ChatSource,
  type ChatAnswer,
} from "./chat-shared";

export function queryTokens(query: string) {
  const stop = new Set(
    "apa apakah ada yang dan atau untuk dengan dari saya aku gw gue mau ingin bisa tolong dong nih itu ini nya berapa bagaimana gimana tentang info informasi layanan properti rumah mr cari tahu jelaskan dong di ke ya please".split(
      " ",
    ),
  );
  return [
    ...new Set(
      query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2 && !stop.has(t)),
    ),
  ].slice(0, 16);
}
export function rankSources(sources: ChatSource[], query: string, take = 8) {
  const tokens = queryTokens(query);
  const matches = (text: string, token: string) =>
    token.length <= 3
      ? new RegExp(`\\b${token}\\b`, "i").test(text)
      : text.toLowerCase().includes(token);
  return sources
    .map((source) => ({
      source,
      score: tokens.reduce(
        (sum, token) =>
          sum +
          (matches(source.title, token) ? 5 : 0) +
          (matches(source.text, token) ? 1 : 0),
        0,
      ),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map((row) => row.source);
}

// Explicit unrelated requests stop before a paid model call. Remaining scope is
// checked against retrieved knowledge by the workflow, with a handoff on gaps.
export function outsideChatScope(message: string) {
  return (
    /\b(coding|ngoding|kode program|javascript|typescript|python|react|nextjs|next\.js|html|css|sql|debug|programming|buat(?:kan)? (?:kode|script|website|aplikasi)|politik|pemilu|resep masak|horoskop|ramalan|judi|slot gacor|bitcoin|crypto)\b/i.test(
      message,
    ) ||
    /(?:abaikan|ignore|lupakan).{0,40}(?:instruksi|instruction|prompt|aturan)|(?:system|developer)\s*(?:prompt|message)|jailbreak/i.test(
      message,
    )
  );
}

const modelAnswer = z.object({
  reply: z.string().trim().min(1).max(2400),
  handoff: z.boolean(),
  source_ids: z.array(z.string()).max(8),
});
export function groundedAnswer(raw: unknown, sources: ChatSource[]) {
  const parsed = modelAnswer.safeParse(raw);
  if (!parsed.success) return null;
  const answer = parsed.data;
  const ids = new Set(sources.map((s) => s.id));
  if (answer.source_ids.some((id) => !ids.has(id))) return null;
  if (!answer.handoff && answer.source_ids.length === 0) return null;
  // Navigation and WhatsApp links are assembled by the server, never the model.
  if (/https?:\/\/|www\.|wa\.me|<[^>]*>/i.test(answer.reply)) return null;
  return {
    reply: answer.handoff ? handoffReply : answer.reply,
    handoff: answer.handoff,
    sources: answer.handoff
      ? []
      : sources
          .filter((s) => answer.source_ids.includes(s.id))
          .map(({ title, path }) => ({ title, path })),
  };
}
