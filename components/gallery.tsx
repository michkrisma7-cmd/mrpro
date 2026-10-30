"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { Images, ChevronLeft, ChevronRight } from "lucide-react";

export function Gallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const photos = images.length ? images : ["/images/hero.webp"];
  const position = active % photos.length;
  function move(direction: number) {
    setActive(
      (current) => (current + direction + photos.length) % photos.length,
    );
  }
  return (
    <section
      className="detail-gallery"
      aria-label={`Foto ${title}`}
      aria-roledescription="karusel"
      tabIndex={photos.length > 1 ? 0 : undefined}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          move(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      onTouchStart={(event) => {
        start.current =
          event.touches.length === 1
            ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
            : null;
      }}
      onTouchCancel={() => {
        start.current = null;
      }}
      onTouchEnd={(event) => {
        const origin = start.current;
        start.current = null;
        if (!origin || !event.changedTouches.length) return;
        const dx = event.changedTouches[0].clientX - origin.x;
        const dy = event.changedTouches[0].clientY - origin.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          move(dx < 0 ? 1 : -1);
        }
      }}
    >
      <div className="gallery-main">
        <Image
          key={photos[position]}
          src={photos[position]}
          alt={`${title} foto ${position + 1}`}
          fill
          priority={position === 0}
          sizes="(max-width:700px) 100vw, (max-width:1336px) calc(100vw - 96px), 1240px"
          className="cover"
          draggable={false}
        />
      </div>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="gallery-arrow gallery-prev"
            aria-label="Foto sebelumnya"
            onClick={(event) => {
              event.stopPropagation();
              move(-1);
            }}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="gallery-arrow gallery-next"
            aria-label="Foto berikutnya"
            onClick={(event) => {
              event.stopPropagation();
              move(1);
            }}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </>
      )}
      <span
        className="gallery-count"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <Images size={17} aria-hidden="true" />
        {images.length
          ? `${position + 1} / ${images.length}`
          : "Belum ada foto"}
      </span>
    </section>
  );
}
