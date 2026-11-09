import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { optimizeDisplay, optimizeUpload } from "../lib/image-upload";
import { displayImageKey, mediaDisplayUrl } from "../lib/image-variants";

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

test("display copies fit 1200px without changing the master", async () => {
  const input = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: "orange" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const master = await optimizeUpload(input);
  const display = await optimizeDisplay(master);
  const metadata = await sharp(display).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 800);
  assert.equal(metadata.height, 1200);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
  assert.ok(display.length <= 250 * 1024);
  assert.deepEqual(
    await sharp(master).raw().toBuffer(),
    await sharp(input).rotate().raw().toBuffer(),
  );
});

test("display copies preserve transparency and never enlarge small images", async () => {
  const input = await sharp({
    create: {
      width: 128,
      height: 96,
      channels: 4,
      background: { r: 42, g: 120, b: 200, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();
  const metadata = await sharp(await optimizeDisplay(input)).metadata();
  assert.equal(metadata.width, 128);
  assert.equal(metadata.height, 96);
  assert.equal(metadata.hasAlpha, true);
});

test("only local media display consumers request derivatives", () => {
  assert.equal(
    mediaDisplayUrl("/api/media/photo?version=2"),
    "/api/media/photo/display.webp?version=2",
  );
  assert.equal(
    mediaDisplayUrl("/api/media/photo?variant=display"),
    "/api/media/photo/display.webp",
  );
  for (const source of [
    "/images/hero.webp",
    "https://example.com/photo.jpg",
    "/api/media/photo/other",
    "/api/media/photo/display.webp",
  ])
    assert.equal(mediaDisplayUrl(source), source);
  assert.equal(
    displayImageKey("properties/owner/photo.webp"),
    "properties/owner/photo.webp.display-v1.webp",
  );
});
