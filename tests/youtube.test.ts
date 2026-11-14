import { test } from "node:test";
import assert from "node:assert/strict";
import { youtubeVideoId, isYoutubeVideoId } from "../lib/youtube";
import { youtubeUrlSchema } from "../lib/validation";

test("YouTube links normalize to an ID, while empty and omitted fields remain optional", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
    "http://youtube.com/watch?v=dQw4w9WgXcQ&t=20",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=tracking",
    "https://youtube.com/shorts/dQw4w9WgXcQ?feature=share",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "  youtu.be/dQw4w9WgXcQ  ",
  ]) {
    assert.equal(youtubeVideoId(url), "dQw4w9WgXcQ");
    assert.equal(youtubeUrlSchema.parse(url), "dQw4w9WgXcQ");
  }
  assert.equal(youtubeUrlSchema.parse(undefined), undefined);
  assert.equal(youtubeUrlSchema.parse("   "), null);
});

test("YouTube validation rejects spoofed hosts, markup, invalid IDs and ambiguous URLs", () => {
  for (const value of [
    "dQw4w9WgXcQ",
    "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ",
    "https://evil.test/youtu.be/dQw4w9WgXcQ",
    "https://user:password@youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com:8080/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=short",
    "https://youtube.com/playlist?list=test",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&v=M7lc1UVf-VE",
    "https://youtu.be/dQw4w9WgXcQ/extra",
    "https://youtu.be/%22onload%3Dalert",
    "javascript:alert(1)",
    '<iframe src="https://youtu.be/dQw4w9WgXcQ"></iframe>',
    "https://youtube.com/watch?v=" + "a".repeat(2050),
  ])
    assert.throws(
      () => youtubeUrlSchema.parse(value),
      /Link YouTube tidak valid/,
    );
  assert.equal(isYoutubeVideoId("abc_def-G12"), true);
  assert.equal(isYoutubeVideoId(null), false);
  assert.equal(isYoutubeVideoId('" onload="x'), false);
});
