import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { optimizeUpload } from "../lib/image-upload";

test("WebP upload preserves dimensions, pixels and alpha without resizing", async () => {
  const input = await sharp({
    create: {
      width: 2100,
      height: 20,
      channels: 4,
      background: { r: 42, g: 120, b: 200, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();
  const output = await optimizeUpload(input);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 2100);
  assert.equal(metadata.height, 20);
  assert.equal(metadata.hasAlpha, true);
  assert.deepEqual(
    await sharp(output).raw().toBuffer(),
    await sharp(input).raw().toBuffer(),
  );
  assert.ok(output.length < input.length);
});

test("JPEG conversion preserves decoded pixels", async () => {
  const input = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "orange" },
  })
    .jpeg()
    .toBuffer();
  const output = await optimizeUpload(input);
  assert.deepEqual(
    await sharp(output).raw().toBuffer(),
    await sharp(input).raw().toBuffer(),
  );
});

test("invalid images and unsupported formats are rejected", async () => {
  await assert.rejects(optimizeUpload(Buffer.from("not an image")));
  const gif = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "red" },
  })
    .gif()
    .toBuffer();
  await assert.rejects(optimizeUpload(gif), /Format/);
});

test("detailed photos retain every decoded pixel and strip GPS/EXIF metadata", async () => {
  const pixels = Buffer.alloc(96 * 64 * 3);
  for (let i = 0; i < pixels.length; i++)
    pixels[i] = (i * 73 + Math.floor(i / 17)) % 256;
  const input = await sharp(pixels, {
    raw: { width: 96, height: 64, channels: 3 },
  })
    .jpeg({ quality: 92 })
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const output = await optimizeUpload(input);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 64);
  assert.equal(metadata.height, 96);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
  assert.deepEqual(
    await sharp(output).raw().toBuffer(),
    await sharp(input).rotate().raw().toBuffer(),
  );
});
