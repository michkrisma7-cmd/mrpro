"use client";
import Image from "next/image";
import { useState } from "react";
import { X, Images, ChevronLeft, ChevronRight } from "lucide-react";
export function Gallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <>
      <div className="detail-gallery">
        <button
          className="gallery-main"
          onClick={() => setActive(0)}
          aria-label="Buka galeri"
        >
          <Image
            src={images[0] || "/images/hero.webp"}
            alt={title}
            fill
            priority
            sizes="(max-width:800px) 95vw, 70vw"
            className="cover"
          />
        </button>
        {images.length > 1 && (
          <div className="gallery-thumbs">
            {images.slice(1, 3).map((src, i) => (
              <button
                key={i}
                onClick={() => setActive(i + 1)}
                aria-label={`Lihat foto ${i + 2}`}
              >
                <Image
                  src={src}
                  alt={`${title} foto ${i + 2}`}
                  fill
                  sizes="30vw"
                  className="cover"
                />
              </button>
            ))}
          </div>
        )}
        <button
          className="gallery-count outline-button"
          onClick={() => setActive(0)}
        >
          <Images size={17} />
          Lihat {images.length} foto
        </button>
      </div>
      {active !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Galeri foto"
          onKeyDown={(e) => {
            if (e.key === "Escape") setActive(null);
          }}
        >
          <button
            autoFocus
            className="lightbox-close icon-button"
            onClick={() => setActive(null)}
            aria-label="Tutup galeri"
          >
            <X />
          </button>
          <button
            className="icon-button"
            onClick={() =>
              setActive((active - 1 + images.length) % images.length)
            }
            aria-label="Foto sebelumnya"
          >
            <ChevronLeft />
          </button>
          <div className="lightbox-image">
            <Image
              src={images[active]}
              alt={`${title} foto ${active + 1}`}
              fill
              sizes="90vw"
              className="contain"
            />
          </div>
          <button
            className="icon-button"
            onClick={() => setActive((active + 1) % images.length)}
            aria-label="Foto berikutnya"
          >
            <ChevronRight />
          </button>
          <span className="lightbox-position">
            {active + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  );
}
