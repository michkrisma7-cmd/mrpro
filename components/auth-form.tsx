"use client";
import Link from "next/link";
import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { authErrorMessage } from "@/lib/auth-feedback";
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  LockKeyhole,
} from "lucide-react";
export function AuthForm({
  configured,
  next,
}: {
  configured: boolean;
  next: string;
}) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const credentials = {
        email: String(f.get("email")).trim(),
        password: String(f.get("password")),
      };
      if (register) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...credentials, name: String(f.get("name")) }),
        });
        if (!response.ok) {
          setError(authErrorMessage({ status: response.status }, true));
          return;
        }
      }
      const result = await signIn("credentials", {
        ...credentials,
        redirect: false,
      });
      if (result?.error)
        setError(
          authErrorMessage(
            { status: result.code === "rate_limited" ? 429 : undefined },
            false,
          ),
        );
      else window.location.assign(next);
    } catch {
      setError("Layanan login belum dapat dijangkau. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-card">
      <p className="eyebrow">SELAMAT DATANG DI MR PROPERTI</p>
      <h1 id="auth-title">
        {register ? "Buat akun baru" : "Masuk ke akun Anda"}
      </h1>
      <p>
        {register
          ? "Isi nama, email, dan buat kata sandi. Setelah daftar, Anda langsung masuk."
          : "Sudah punya akun? Isi email dan kata sandi yang digunakan saat mendaftar."}
      </p>
      <div className="auth-tabs">
        <button
          type="button"
          disabled={busy}
          aria-pressed={!register}
          className={!register ? "active" : ""}
          onClick={() => {
            setRegister(false);
            setError("");
          }}
        >
          Masuk
        </button>
        <button
          type="button"
          disabled={busy}
          aria-pressed={register}
          className={register ? "active" : ""}
          onClick={() => {
            setRegister(true);
            setError("");
          }}
        >
          Belum punya akun? Daftar
        </button>
      </div>
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy} className="auth-fields">
          {register && (
            <label>
              Nama lengkap
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="Nama Anda"
              />
            </label>
          )}
          <label>
            <span>
              <Mail size={15} />
              Alamat email
            </span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              required
              placeholder="nama@email.com"
            />
          </label>
          <label>
            <span>
              <LockKeyhole size={15} />
              Kata sandi
            </span>
            <div className="password-input">
              <input
                name="password"
                type={show ? "text" : "password"}
                required
                minLength={8}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={
                  register
                    ? "Buat kata sandi minimal 8 karakter"
                    : "Kata sandi Anda"
                }
                aria-describedby={register ? "password-help" : undefined}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-pressed={show}
                aria-label={
                  show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                }
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
                <span>{show ? "Sembunyikan" : "Lihat"}</span>
              </button>
            </div>
            {register && (
              <small id="password-help">
                Minimal 8 karakter. Gunakan kata sandi yang mudah Anda ingat dan
                jangan bagikan kepada orang lain.
              </small>
            )}
          </label>
          {register && (
            <label className="checkbox-label">
              <input type="checkbox" required />
              Saya setuju informasi akun digunakan untuk mengelola kiriman
              properti saya.
            </label>
          )}
          {error && (
            <p className="form-message error" role="alert">
              {error}
            </p>
          )}
          {!configured && (
            <p className="notice">
              Login belum tersedia. Pengelola sedang menyiapkan koneksi akun.
            </p>
          )}
          <button
            className="button full-width"
            type="submit"
            disabled={busy || !configured}
          >
            {busy ? <LoaderCircle size={17} className="spin" /> : null}
            {busy ? "Menghubungkan…" : register ? "Buat Akun" : "Masuk ke Akun"}
            <ArrowUpRight size={17} />
          </button>
        </fieldset>
      </form>
      <p className="auth-footnote">
        Tidak perlu akun untuk melihat properti. Masuk saat ingin memasang atau
        mengelola iklan.
      </p>
      <Link href="/properti" className="text-button">
        Kembali jelajahi properti <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}
export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="outline-button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await signOut({ redirect: false });
          // Discard private pages cached under the previous session.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Authentication state changed outside a Server Action.
          window.location.assign("/");
        } catch {
          setBusy(false);
        }
      }}
    >
      {busy ? "Keluar…" : "Keluar akun"}
    </button>
  );
}
