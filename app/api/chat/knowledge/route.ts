import { createHash, timingSafeEqual } from "node:crypto";
import { getChatKnowledge } from "@/lib/chat-knowledge";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const expected = process.env.N8N_CHAT_WEBHOOK_SECRET;
  if (!expected)
    return Response.json(
      { message: "Knowledge belum dikonfigurasi." },
      { status: 503 },
    );
  const provided = request.headers.get("x-mr-token");
  if (
    !provided ||
    !timingSafeEqual(
      createHash("sha256").update(provided).digest(),
      createHash("sha256").update(expected).digest(),
    )
  )
    return Response.json(
      { message: "Akses tidak diizinkan." },
      { status: 401 },
    );
  const search = new URL(request.url).searchParams.get("search")?.trim();
  if (!search || search.length > 3500)
    return Response.json(
      { message: "Pertanyaan tidak valid." },
      { status: 400 },
    );
  try {
    const knowledge = await getChatKnowledge(search);
    // Contact URLs stay under the control of the website.
    return Response.json(
      { brand: knowledge.brand, sources: knowledge.sources, partial: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    console.warn("[chat] knowledge_unavailable");
    return Response.json(
      { message: "Knowledge belum tersedia." },
      { status: 503 },
    );
  }
}
