import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthModal } from "@/components/auth-modal";
import { authConfigured, currentUser } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";

export default async function LoginModal({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string }>;
}) {
  const { lanjut } = await searchParams;
  const next = lanjut === "titip" ? "/titip-properti" : "/akun";
  if (await currentUser()) redirect(next);
  return (
    <AuthModal>
      <AuthForm configured={authConfigured && databaseConfigured} next={next} />
    </AuthModal>
  );
}
