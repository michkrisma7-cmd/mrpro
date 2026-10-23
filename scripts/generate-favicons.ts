// Run with: bunx tsx scripts/generate-favicons.ts
// Reuse the website's existing logo and theme; do not maintain a second design.
import { readFile, writeFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { BrandMark } from "../components/icons";

async function main() {
  const css = await readFile("app/globals.css", "utf8");
  const color = css.match(/--ink:\s*(#[\da-f]{6})\s*;/i)?.[1];
  if (!color) throw new Error("Cannot find the existing brand color");
  const svg = renderToStaticMarkup(createElement(BrandMark))
    .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replaceAll("currentColor", color);
  const rasterize = (size: number) =>
    sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

  for (const size of [48, 192, 512]) {
    const name = size === 48 ? "favicon" : "icon";
    await writeFile(
      `public/${name}-${size}x${size}.png`,
      await rasterize(size),
    );
  }

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
