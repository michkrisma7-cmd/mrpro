CREATE TYPE "AdvertiserType" AS ENUM ('PEMILIK', 'AGEN');
ALTER TABLE "Property" ADD COLUMN "advertiserType" "AdvertiserType";
