import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db, databaseConfigured } from "./db";
export const authConfigured = Boolean(
  process.env.NEON_AUTH_URL &&
  process.env.NEON_AUTH_COOKIE_SECRET &&
  process.env.NEON_AUTH_COOKIE_SECRET.length >= 32,
);
let instance: ReturnType<typeof createNeonAuth> | undefined;
export function getAuth() {
  if (!authConfigured) throw new Error("Login belum dikonfigurasi.");
  return (instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_URL!,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      sessionDataTtl: 60,
    },
    logLevel: "error",
  }));
}
export const currentUser = cache(async () => {
  if (!authConfigured || !databaseConfigured) return null;
  const { data, error } = await getAuth().getSession();
  if (error) throw new Error("Sesi tidak dapat diperiksa. Coba lagi.");
  if (!data?.user) return null;
  const user = data.user;
  return db().appUser.upsert({
    where: { authId: user.id },
    create: { authId: user.id, email: user.email, name: user.name },
    update: { email: user.email, name: user.name },
  });
});
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN")
    throw new Error("Akses hanya untuk administrator.");
  return user;
}
