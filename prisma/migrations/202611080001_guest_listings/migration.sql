-- Guest submissions have no account owner. Existing ownership is preserved.
ALTER TABLE "Property" ALTER COLUMN "ownerId" DROP NOT NULL;
ALTER TABLE "Media" ALTER COLUMN "ownerId" DROP NOT NULL;
ALTER TABLE "Media" ADD COLUMN "guestKey" TEXT;
CREATE INDEX "Media_guestKey_idx" ON "Media"("guestKey");
