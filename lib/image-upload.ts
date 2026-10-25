import sharp from "sharp";

// Preserve decoded pixels, dimensions and transparency. Metadata (including GPS)
// is removed; EXIF orientation is applied before encoding.
export async function optimizeUpload(input: Buffer): Promise<Buffer> {
  const image = sharp(input, { limitInputPixels: 25000000, failOn: "warning" });
  const metadata = await image.metadata();
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format))
    throw new Error("Format gambar harus JPG, PNG, atau WebP.");
  if ((metadata.pages ?? 1) > 1) throw new Error("Gunakan gambar statis.");
  return image
    .rotate()
    .webp({ lossless: true, effort: 6, exact: true })
    .toBuffer();
}
