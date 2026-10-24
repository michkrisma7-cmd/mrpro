// Run with: bunx tsx scripts/generate-favicons.ts
// Resize the isolated favicon from the supplied design, preserving its colors.
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

async function main() {
  const rasterize = (size: number) =>
    sharp("public/brand/mrproperti-icon.png")
      .resize(size, size)
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();

  for (const size of [16, 32, 48, 192, 512]) {
    const name = size <= 48 ? "favicon" : "icon";
    await writeFile(
      `public/${name}-${size}x${size}.png`,
      await rasterize(size),
    );
  }
  await writeFile("public/apple-touch-icon.png", await rasterize(180));

  // ICO directory entries point to PNG frames for small browser tab sizes.
  const sizes = [16, 32, 48];
  const frames = await Promise.all(sizes.map(rasterize));
  const header = Buffer.alloc(6 + 16 * frames.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach((frame, index) => {
    const entry = 6 + 16 * index;
    header[entry] = sizes[index];
    header[entry + 1] = sizes[index];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  await writeFile("app/favicon.ico", Buffer.concat([header, ...frames]));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
