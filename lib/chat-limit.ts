import "server-only";
import { db } from "./db";
import { createHash } from "node:crypto";

// Reuses the existing database counter table; no schema migration required.
export async function allowChatAttempt(session: string) {
  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000);
  for (const [key, limit] of [
    [`chat:${createHash("sha256").update(session).digest("hex")}`, 15],
    ["chat:global", 300],
  ] as const) {
    const rows = await db().$queryRaw<{ count: number }[]>`
      INSERT INTO "AuthAttempt" (key, count, "expiresAt") VALUES (${key}, 1, ${expires})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN "AuthAttempt"."expiresAt" <= ${now} THEN 1 ELSE "AuthAttempt".count + 1 END,
        "expiresAt" = CASE WHEN "AuthAttempt"."expiresAt" <= ${now} THEN ${expires} ELSE "AuthAttempt"."expiresAt" END
      RETURNING count`;
    if (rows[0].count > limit) return false;
  }
  return true;
}
