import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const cookieName = "mr-listing-upload";
export async function guestUploadKey(create = false) {
  const jar = await cookies();
  let token = jar.get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    if (!create) return null;
    token = randomBytes(32).toString("hex");
    jar.set(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });
  }
  return createHash("sha256").update(token).digest("hex");
}

// Atomic, persistent per-session and global limits also bound cookie rotation.
export async function allowGuestListingAttempt(
  key: string,
  action: "upload" | "submit",
) {
  const now = new Date();
  const expires = new Date(now.getTime() + 3600000);
  for (const [scope, limit] of [
    [`guest-listing:${action}:${key}`, action === "upload" ? 36 : 6],
    [`guest-listing:${action}:global`, action === "upload" ? 360 : 60],
  ] as const) {
    const rows = await db().$queryRaw<{ count: number }[]>`
      INSERT INTO "AuthAttempt" (key, count, "expiresAt") VALUES (${scope}, 1, ${expires})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN "AuthAttempt"."expiresAt" <= ${now} THEN 1 ELSE "AuthAttempt".count + 1 END,
        "expiresAt" = CASE WHEN "AuthAttempt"."expiresAt" <= ${now} THEN ${expires} ELSE "AuthAttempt"."expiresAt" END
      RETURNING count`;
    if (rows[0].count > limit) return false;
  }
  return true;
}
