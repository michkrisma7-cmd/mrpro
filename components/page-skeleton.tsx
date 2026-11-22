// Kerangka kartu saat konten dimuat; teks status hanya untuk pembaca layar.
export function PageSkeleton() {
  return (
    <div
      className="container page-wrap page-loading"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Memuat konten…</span>
      <div className="property-grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-block skeleton-image" />
            <div className="skeleton-block skeleton-line" />
            <div className="skeleton-block skeleton-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}
