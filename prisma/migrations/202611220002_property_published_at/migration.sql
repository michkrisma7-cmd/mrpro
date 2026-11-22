-- Tanggal tayang untuk prioritas "listing baru" pada rolling listing.
ALTER TABLE "Property" ADD COLUMN "publishedAt" TIMESTAMP(3);
UPDATE "Property" SET "publishedAt" = "createdAt" WHERE "status" = 'PUBLISHED';
