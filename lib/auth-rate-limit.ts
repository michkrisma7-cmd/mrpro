import { createHash } from "node:crypto";
import { db } from "./db";
// Database-backed limits apply across processes and survive restarts.
export async function allowAuthAttempt(
  email: string,
  action: "login" | "register",
) {
  const now = new Date();
  const key = createHash("sha256")
    .update(`${action}:${email.toLowerCase()}`)
    .digest("hex");
  await db().authAttempt.deleteMany({ where: { expiresAt: { lte: now } } });
  const rows = await db().$queryRaw<{ count: number }[]>`
    INSERT INTO "AuthAttempt" (key, count, "expiresAt")
    VALUES (${key}, 1, ${new Date(now.getTime() + 15 * 60 * 1000)})
    ON CONFLICT (key) DO UPDATE SET count = "AuthAttempt".count + 1
    RETURNING count`;
  return rows[0].count <= (action === "register" ? 5 : 10);
}
