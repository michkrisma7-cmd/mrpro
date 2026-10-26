import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div
      className="container page-wrap page-loading"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="spin" size={24} aria-hidden="true" />
      <p>Menyiapkan halaman…</p>
    </div>
  );
}
