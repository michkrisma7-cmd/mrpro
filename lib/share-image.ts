import sharp from "sharp";

export const shareImageSize = { width: 1200, height: 630 };

// A separate derivative keeps lossless gallery originals intact, including old uploads.
export async function createShareImage(input: Uint8Array): Promise<Buffer> {
  const image = sharp(input, { limitInputPixels: 25000000, failOn: "warning" })
    .rotate()
    .resize({ ...shareImageSize, fit: "contain", background: "#f4f4f4" })
    .flatten({ background: "#f4f4f4" });
  const preview = await image
    .clone()
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  // Very detailed covers can exceed a crawler's small-image budget at normal quality.
  return preview.length <= 300000
    ? preview
    : image.jpeg({ quality: 40, mozjpeg: true }).toBuffer();
}
