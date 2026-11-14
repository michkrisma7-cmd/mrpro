-- Nullable and additive: existing listings keep their data and have no video.
ALTER TABLE "Property" ADD COLUMN "youtubeVideoId" TEXT;
ALTER TABLE "Property" ADD CONSTRAINT "Property_youtubeVideoId_check"
  CHECK ("youtubeVideoId" IS NULL OR "youtubeVideoId" ~ '^[A-Za-z0-9_-]{11}$');
