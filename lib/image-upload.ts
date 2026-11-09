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

const DISPLAY_MAX_PIXELS = 1200;
const DISPLAY_TARGET_BYTES = 250 * 1024;

// Keep the master above intact; only this display copy is resized/compressed.
export async function optimizeDisplay(input: Buffer): Promise<Buffer> {
  const image = sharp(input, { limitInputPixels: 25000000, failOn: "warning" })
    .rotate()
    .resize({
      width: DISPLAY_MAX_PIXELS,
      height: DISPLAY_MAX_PIXELS,
      fit: "inside",
      withoutEnlargement: true,
    });
  let output = await image.clone().webp({ quality: 78, effort: 4 }).toBuffer();
  for (const quality of [68, 58]) {
    if (output.length <= DISPLAY_TARGET_BYTES) break;
    output = await image.clone().webp({ quality, effort: 4 }).toBuffer();
  }
  return output;
}
