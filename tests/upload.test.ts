import { test } from "node:test";
import assert from "node:assert/strict";
import { boundedFormData } from "../lib/upload-body";
test("upload body is bounded even when content-length is absent", async () => {
  const body = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(2048));
      c.close();
    },
  });
  const request = new Request("http://localhost/api/upload", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(boundedFormData(request, 1024), /terlalu besar/);
});
test("valid multipart uploads retain bytes for image validation", async () => {
  const form = new FormData();
  form.append(
    "file",
    new File(["test-image"], "foto.webp", { type: "image/webp" }),
  );
  const request = new Request("http://localhost/api/upload", {
    method: "POST",
    body: form,
  });
  const parsed = await boundedFormData(request);
  const file = parsed.get("file");
  assert.ok(file instanceof File);
  assert.equal(await file.text(), "test-image");
});
