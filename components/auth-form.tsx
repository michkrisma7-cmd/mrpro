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
  const [notice, setNotice] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const f = new FormData(e.currentTarget);
    try {
      const credentials = {
        email: String(f.get("email")),
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
      <h1>
        {register ? "Mulai cerita baru Anda." : "Senang bertemu kembali."}
      </h1>
      <p>
        {register
          ? "Buat akun untuk menitipkan dan memantau properti Anda."
          : "Masuk untuk melanjutkan rencana Anda."}
      </p>
      <div className="auth-tabs">
        <button
          className={!register ? "active" : ""}
          onClick={() => {
            setRegister(false);
            setError("");
          }}
        >
          Masuk
        </button>
        <button
          className={register ? "active" : ""}
          onClick={() => {
            setRegister(true);
            setError("");
          }}
        >
          Daftar Akun
        </button>
      </div>
      <form onSubmit={submit}>
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
            autoComplete="email"
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
              placeholder="Minimal 8 karakter"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={
                show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
              }
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
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
        {notice && (
          <p className="form-message success" role="status">
            {notice}
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
      </form>
      <p className="auth-footnote">
        Akun yang sama untuk pengguna dan admin.
        <br />
        Hak akses disesuaikan dengan role akun Anda.
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
