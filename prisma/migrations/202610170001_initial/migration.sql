CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'PRICE', 'SELECT', 'MULTISELECT');
CREATE TABLE "AppUser" (
 "id" TEXT NOT NULL, "authId" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL,
 "role" "Role" NOT NULL DEFAULT 'USER', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Property" (
 "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
 "gallery" TEXT[] NOT NULL, "values" JSONB NOT NULL DEFAULT '{}', "whatsapp" TEXT NOT NULL,
 "status" "ListingStatus" NOT NULL DEFAULT 'PENDING', "featured" BOOLEAN NOT NULL DEFAULT false,
 "ownerId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PropertyField" (
 "id" TEXT NOT NULL, "key" TEXT NOT NULL, "name" TEXT NOT NULL, "type" "FieldType" NOT NULL,
 "options" TEXT[] NOT NULL, "required" BOOLEAN NOT NULL DEFAULT false,
 "showInForm" BOOLEAN NOT NULL DEFAULT true, "showOnCard" BOOLEAN NOT NULL DEFAULT false,
 "showOnDetail" BOOLEAN NOT NULL DEFAULT true, "cardLabel" TEXT NOT NULL DEFAULT '',
 "position" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PropertyField_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Service" (
 "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "type" TEXT NOT NULL, "workerName" TEXT NOT NULL,
 "skills" TEXT[] NOT NULL, "description" TEXT NOT NULL, "minPrice" INTEGER NOT NULL,
 "unit" TEXT NOT NULL DEFAULT 'hari', "image" TEXT NOT NULL DEFAULT '', "whatsapp" TEXT NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Media" (
 "id" TEXT NOT NULL, "key" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SiteSettings" (
 "id" TEXT NOT NULL DEFAULT 'main', "heroTitle" TEXT NOT NULL DEFAULT 'Ruang baru, cerita baru.',
 "heroDescription" TEXT NOT NULL DEFAULT 'Temukan tempat untuk pulang, ruang untuk bertumbuh, dan partner untuk mewujudkannya.',
 "whatsapp" TEXT NOT NULL DEFAULT '', "email" TEXT NOT NULL DEFAULT '', "area" TEXT NOT NULL DEFAULT 'Indonesia',
 CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AppUser_authId_key" ON "AppUser"("authId");
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");
CREATE INDEX "Property_status_createdAt_idx" ON "Property"("status", "createdAt");
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");
CREATE UNIQUE INDEX "PropertyField_key_key" ON "PropertyField"("key");
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");
CREATE UNIQUE INDEX "Media_key_key" ON "Media"("key");
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Media" ADD CONSTRAINT "Media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
