import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { createShareImage } from "../lib/share-image";
import { listingPreviewImage } from "../lib/listing-preview";
import { siteUrl } from "../lib/format";

test("large lossless covers become lightweight standard JPEG without altering the original", async () => {
  const source = await sharp(randomBytes(2400 * 1600 * 3), {
    raw: { width: 2400, height: 1600, channels: 3 },
  })
    .webp({ lossless: true })
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const before = Buffer.from(source);
  const image = await createShareImage(source);
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 630);
  assert.equal(metadata.exif, undefined);
  assert.ok(image.length < 300000, `${image.length} bytes`);
  assert.deepEqual(source, before);
  await assert.rejects(createShareImage(Buffer.from("invalid image")));
  const noisyCover = await sharp(randomBytes(1200 * 630 * 3), {
    raw: { width: 1200, height: 630, channels: 3 },
  })
    .webp({ lossless: true })
    .toBuffer();
  assert.ok((await createShareImage(noisyCover)).length < 300000);
});

test("metadata uses the first photo and a public, absolute derivative URL for uploads old or new", () => {
  for (const main of [
    "/api/media/oldphoto",
    `${siteUrl()}/api/media/newphoto`,
  ]) {
    const image = listingPreviewImage(
      [main, "/api/media/another"],
      "Rumah utama",
    );
    assert.equal(image.url, new URL(`${main}?variant=share`, siteUrl()).href);
    assert.equal(image.type, "image/jpeg");
    assert.equal(image.width, 1200);
  }
  assert.equal(
    listingPreviewImage(["/images/house-1.webp"], "Rumah").url,
    `${siteUrl()}/images/house-1.webp`,
  );
  assert.equal(
    listingPreviewImage(["https://photos.example/main.jpg"], "Rumah").url,
    "https://photos.example/main.jpg",
  );
});
