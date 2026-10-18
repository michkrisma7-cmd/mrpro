import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db, databaseConfigured } from "./db";
import { auth, authConfigured } from "./auth-server";
export { auth, authConfigured } from "./auth-server";
export const currentUser = cache(async () => {
  if (!authConfigured || !databaseConfigured) return null;
  const session = await auth();
  if (!session?.user?.id) return null;
  return db().appUser.findUnique({ where: { id: session.user.id } });
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
