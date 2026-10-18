import { authConfigured, credentialsSchema } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { allowAuthAttempt } from "@/lib/auth-rate-limit";
import { z } from "zod";
import { registrationOriginAllowed } from "@/lib/auth-origin";
const schema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(100),
});
export async function POST(request: Request) {
  if (!authConfigured) return Response.json({}, { status: 503 });
  if (!registrationOriginAllowed(request, process.env))
    return Response.json({}, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({}, { status: 415 });
  let data;
  try {
    const reader = request.body?.getReader();
    if (!reader) return Response.json({}, { status: 400 });
    let total = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > 4096) {
          await reader.cancel();
          return Response.json({}, { status: 413 });
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    data = schema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    return Response.json({}, { status: 400 });
  }
  if (!data.success) return Response.json({}, { status: 400 });
  try {
    if (!(await allowAuthAttempt(data.data.email, "register")))
      return Response.json({}, { status: 429 });
    const { password, ...profile } = data.data;
    await db().appUser.create({
      data: { ...profile, passwordHash: await hashPassword(password) },
    });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    )
      return Response.json({}, { status: 409 });
    console.error("Account registration failed");
    return Response.json({}, { status: 500 });
  }
}
