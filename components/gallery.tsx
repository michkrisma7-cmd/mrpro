"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { Images, ChevronLeft, ChevronRight } from "lucide-react";
import { mediaDisplayUrl } from "@/lib/image-variants";

type GalleryProps = {
  images: string[];
  title: string;
};

export function Gallery(props: GalleryProps) {
  // A different listing must not retain the previous listing's photo state.
  return <GalleryPhotos key={JSON.stringify(props.images)} {...props} />;
}

function GalleryPhotos({ images, title }: GalleryProps) {
  const photos = images.length
    ? images.map(mediaDisplayUrl)
    : ["/images/hero.webp"];
  const [photo, setPhoto] = useState({
    target: 0,
    visible: 0,
    ready: false,
    prefetch: false,
    prefetchFailed: "",
    failed: false,
  });
  const loaded = useRef(new Map<string, HTMLImageElement>());
  const start = useRef<{ x: number; y: number } | null>(null);
  const visibleSource = photos[photo.visible];
  const targetSource = photos[photo.target];
  const nextSource = photos[(photo.target + 1) % photos.length];
  const shouldPrefetch =
    photos.length > 1 &&
    photo.prefetch &&
    photo.ready &&
    photo.target === photo.visible &&
    !photo.failed &&
    nextSource !== photo.prefetchFailed;
  // Keep the decoded element when promoting a hidden responsive photo to visible.
  const sources = Array.from(
    new Set([
      visibleSource,
      ...(!photo.failed ? [targetSource] : []),
      ...(shouldPrefetch ? [nextSource] : []),
    ]),
  );

  function move(direction: number) {
    setPhoto((current) => {
      const target =
        (current.target + direction + photos.length) % photos.length;
      const image = loaded.current.get(photos[target]);
      const ready = Boolean(
        image?.isConnected && image.complete && image.naturalWidth > 0,
      );
      return {
        ...current,
        target,
        visible: ready ? target : current.visible,
        ready: ready || current.ready,
        failed: false,
      };
    });
  }

  function imageLoaded(source: string, image: HTMLImageElement) {
    loaded.current.set(source, image);
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    setPhoto((current) => {
      if (source === photos[current.target]) {
        return {
          ...current,
          visible: current.target,
          ready: true,
          prefetch: !connection?.saveData,
          failed: false,
        };
      }
      if (source === photos[current.visible] && !current.ready) {
        return { ...current, ready: true, prefetch: !connection?.saveData };
      }
      return current;
    });
  }

  function imageFailed(source: string) {
    loaded.current.delete(source);
    setPhoto((current) => ({
      ...current,
      prefetchFailed: source,
      failed: source === photos[current.target] || current.failed,
    }));
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
      <div
        className="gallery-main"
        aria-busy={photo.target !== photo.visible && !photo.failed}
      >
        {sources.map((source) => {
          const visible = source === visibleSource;
          const preload = visible && photo.visible === 0;
          return (
            <Image
              key={source}
              src={source}
              alt={visible ? `${title} foto ${photo.visible + 1}` : ""}
              aria-hidden={!visible}
              fill
              unoptimized={/^\/api\/media\/[^/?#]+\/display\.webp(?:[?#]|$)/.test(
                source,
              )}
              preload={preload}
              loading={preload ? undefined : "eager"}
              fetchPriority={
                preload ? undefined : source === targetSource ? "auto" : "low"
              }
              sizes="(max-width:700px) 100vw, (max-width:1336px) calc(100vw - 96px), 1240px"
              className="cover"
              style={{
                opacity: visible ? 1 : 0,
                pointerEvents: visible ? undefined : "none",
              }}
              draggable={false}
              onLoad={async (event) => {
                const image = event.currentTarget;
                try {
                  await image.decode();
                  if (image.isConnected) imageLoaded(source, image);
                } catch {
                  if (image.isConnected) imageFailed(source);
                }
              }}
              onError={() => imageFailed(source)}
            />
          );
        })}
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
          ? `${photo.visible + 1} / ${images.length}`
          : "Belum ada foto"}
      </span>
      {photo.failed && (
        <span className="visually-hidden" role="status">
          Foto tidak dapat dimuat. Silakan coba foto lain.
        </span>
      )}
    </section>
  );
}
