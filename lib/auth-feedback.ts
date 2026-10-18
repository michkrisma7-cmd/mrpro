export function authErrorMessage(
  error: { status?: number },
  registering: boolean,
) {
  if (error.status === 429)
    return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (error.status && error.status >= 500)
    return "Layanan akun belum dapat dijangkau. Silakan coba beberapa saat lagi.";
  return registering
    ? "Pendaftaran belum berhasil. Periksa data atau gunakan email lain."
    : "Email atau kata sandi belum cocok.";
}
