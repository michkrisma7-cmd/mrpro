"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Star, UploadCloud, X } from "lucide-react";

type Photo = { id: string; preview: string; url?: string; error?: string };

// gallery[0] remains the persisted cover, including for legacy listings.
export function PropertyPhotos({
  initialGallery = [],
  enabled,
  onReady,
}: {
  initialGallery?: string[];
  enabled: boolean;
  onReady?: (ready: boolean) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>(() =>
    initialGallery.map((url) => ({ id: url, preview: url, url })),
  );
  const [primary, setPrimary] = useState<string | null>(
    initialGallery[0] ?? null,
  );
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const blobs = useRef(new Set<string>());
  const busy = photos.some((p) => !p.url && !p.error);
  const ready = photos.length > 0 && photos.every((p) => Boolean(p.url));
  useEffect(() => {
    onReady?.(ready);
  }, [ready, onReady]);
  useEffect(() => {
    const urls = blobs.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  const gallery = photos.filter((p) => p.url).map((p) => p.url!);
  const cover = photos.find((p) => p.id === primary)?.url;
  const ordered = cover
    ? [cover, ...gallery.filter((url) => url !== cover)]
    : gallery;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (input.current) input.current.value = "";
    setError("");
    if (photos.length + selected.length > 12) {
      setError("Maksimal 12 foto.");
      return;
    }
    if (
      selected.some(
        (file) =>
          file.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type),
      )
    ) {
      setError("Gunakan JPG, PNG, atau WebP, maksimal 5 MB per foto.");
      return;
    }
    const added = selected.map((file) => {
      const preview = URL.createObjectURL(file);
      blobs.current.add(preview);
      return { id: crypto.randomUUID(), preview } as Photo;
    });
    setPhotos((prev) => [...prev, ...added]);
    setPrimary((prev) => prev ?? added[0].id);
    await Promise.all(
      added.map(async (photo, index) => {
        try {
          const form = new FormData();
          form.set("file", selected[index]);
          const response = await fetch("/api/upload", {
            method: "POST",
            body: form,
          });
          const data = await response.json();
          if (!response.ok || typeof data.url !== "string")
            throw new Error(data.error || "Unggah gagal.");
          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, url: data.url } : p)),
          );
        } catch (e) {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id
                ? {
                    ...p,
                    error: e instanceof Error ? e.message : "Unggah gagal.",
                  }
                : p,
            ),
          );
        }
      }),
    );
  }
  function remove(id: string) {
    const remaining = photos.filter((p) => p.id !== id);
    setPhotos(remaining);
    setPrimary((prev) => (prev === id ? (remaining[0]?.id ?? null) : prev));
  }
  return (
    <>
      <p>
        Foto pertama otomatis menjadi foto utama. Ketuk ‘Jadikan Foto Utama’
        pada foto lain untuk menggantinya.
      </p>
      <p>Maksimal 12 foto, 5 MB per foto.</p>
      <input type="hidden" name="gallery" value={JSON.stringify(ordered)} />
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="visually-hidden"
        disabled={!enabled || busy}
        onChange={(e) => upload(e.target.files)}
      />
      <button
        type="button"
        className="upload-zone"
        disabled={!enabled || busy}
        onClick={() => input.current?.click()}
      >
        <UploadCloud size={32} />
        <strong>{busy ? "Mengunggah foto…" : "Pilih foto properti"}</strong>
        <span>JPG, PNG, atau WebP</span>
      </button>
      {!enabled && (
        <p className="notice">
          Unggah foto tersedia setelah penyimpanan S3 dikonfigurasi.
        </p>
      )}
      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
      <div className="property-photos">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className={`property-photo ${primary === photo.id ? "is-primary" : ""}`}
          >
            <div className="property-photo-image">
              <Image
                src={photo.preview}
                alt={`Foto properti ${i + 1}`}
                fill
                unoptimized
                className="cover"
              />
            </div>
            <button
              type="button"
              className="photo-remove"
              aria-label={`Hapus foto ${i + 1}`}
              onClick={() => remove(photo.id)}
            >
              <X size={20} />
            </button>
            {primary === photo.id ? (
              <span className="photo-primary" role="status">
                ★ Foto Utama
              </span>
            ) : (
              <button
                type="button"
                className="photo-select"
                onClick={() => setPrimary(photo.id)}
              >
                <Star size={18} aria-hidden="true" />
                Jadikan Foto Utama
              </button>
            )}
            {!photo.url && <p role="status">{photo.error || "Mengunggah…"}</p>}
            {photo.error && (
              <small>Hapus foto ini lalu pilih ulang untuk mencoba lagi.</small>
            )}
          </div>
        ))}
      </div>
      <input type="hidden" name="photosReady" value={ready ? "1" : "0"} />
    </>
  );
}
