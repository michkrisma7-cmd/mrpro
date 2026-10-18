import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db, databaseConfigured } from "./db";
import { getAuth, authConfigured } from "./auth-server";
export { getAuth, authConfigured } from "./auth-server";
export const currentUser = cache(async () => {
  if (!authConfigured || !databaseConfigured) return null;
  const { data, error } = await getAuth().getSession();
  if (error?.status === 401) return null;
  if (error) throw new Error("Sesi tidak dapat diperiksa. Coba lagi.");
  if (!data?.user) return null;
  const user = data.user;
  // Most navigations only need a read. Keep the role fresh without writing
  // the same profile back to Neon on every page and API request.
  const profile = await db().appUser.findUnique({ where: { authId: user.id } });
  if (profile && profile.name === user.name && profile.email === user.email)
    return profile;
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
