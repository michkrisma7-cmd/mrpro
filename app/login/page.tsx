import type { Metadata } from "next";
import Image from "next/image";
import { AuthForm } from "@/components/auth-form";
import { authConfigured } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
export const metadata: Metadata = {
  title: "Masuk / Daftar",
  robots: { index: false, follow: false },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string }>;
}) {
  const { lanjut } = await searchParams;
  return (
    <div className="container auth-layout">
      <div className="auth-visual">
        <Image
          src="/images/hero.webp"
          alt="Hunian tropis untuk awal cerita yang baru"
          fill
          priority
          sizes="45vw"
          className="cover"
        />
        <div>
          <p className="eyebrow">SETIAP RUANG PUNYA CERITA</p>
          <h2>
            Langkah baru.
            <br />
            Kemungkinan baru.
          </h2>
          <p>Temukan ruang untuk mewujudkan rencana Anda.</p>
        </div>
      </div>
      <AuthForm
        configured={authConfigured && databaseConfigured}
        next={lanjut === "titip" ? "/titip-properti" : "/akun"}
      />
    </div>
  );
}
