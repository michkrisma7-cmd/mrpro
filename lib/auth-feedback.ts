export function authErrorMessage(
  error: { code?: string; status?: number },
  registering: boolean,
) {
  if (error.status === 429)
    return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (["EMAIL_NOT_VERIFIED", "email_not_confirmed"].includes(error.code || ""))
    return "Email belum diverifikasi. Buka tautan verifikasi di kotak masuk Anda.";
  if (error.code === "INVALID_ORIGIN" || error.code === "INVALID_CALLBACK_URL")
    return "Alamat website belum diizinkan oleh layanan login. Hubungi pengelola.";
  if (error.status && error.status >= 500)
    return "Layanan akun belum dapat dijangkau. Silakan coba beberapa saat lagi.";
  return registering
    ? "Pendaftaran belum berhasil. Periksa data atau gunakan email lain."
    : "Email atau kata sandi belum cocok, atau akun belum diverifikasi.";
}
