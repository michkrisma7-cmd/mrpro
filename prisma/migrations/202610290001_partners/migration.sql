CREATE TABLE "Partner" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "whatsapp" TEXT NOT NULL,
  "domicile" TEXT NOT NULL,
  "areas" TEXT[] NOT NULL,
  "skills" TEXT[] NOT NULL,
  "experience" TEXT NOT NULL,
  "consent" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Partner_submissionId_key" ON "Partner"("submissionId");
CREATE INDEX "Partner_createdAt_idx" ON "Partner"("createdAt");
