"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container page-wrap">
      <div className="empty-state">
        <h1>Halaman belum dapat dimuat.</h1>
        <p>
          Koneksi sedang bermasalah. Silakan coba kembali beberapa saat lagi.
        </p>
        <button className="button" onClick={reset}>
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
