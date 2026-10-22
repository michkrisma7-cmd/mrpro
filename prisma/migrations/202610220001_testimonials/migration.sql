CREATE TABLE "Testimonial" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "quote" TEXT NOT NULL,
  "rating" INTEGER NOT NULL DEFAULT 5,
  "position" INTEGER NOT NULL DEFAULT 0,
  "photoId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Testimonial_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "Testimonial_position_check" CHECK ("position" >= 0),
  CONSTRAINT "Testimonial_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Testimonial_active_position_idx" ON "Testimonial"("active", "position");
CREATE INDEX "Testimonial_photoId_idx" ON "Testimonial"("photoId");
INSERT INTO "Testimonial" ("id", "category", "name", "status", "quote", "rating", "position", "updatedAt") VALUES ('testimonial-kpr', 'Pembeli Rumah Pertama (KPR)', 'Ahmad Rizky', 'Pembeli Rumah di Pondok Permata 2 Babelan', 'Awalnya bingung dan takut ribet ngurus KPR untuk rumah pertama. Tapi tim mrproperti dampingi dari pilih unit sampai serah terima kunci. Komunikasinya ramah dan transparan banget!', 5, 0, CURRENT_TIMESTAMP);
INSERT INTO "Testimonial" ("id", "category", "name", "status", "quote", "rating", "position", "updatedAt") VALUES ('testimonial-investor', 'Investor Properti', 'Indah Permatasari', 'Investor Properti', 'mrproperti punya insight pasar yang tajam. Saya dibantu memilih ruko Grand Amarta Cikarang dengan return rental yield yang tinggi. Sangat recommended untuk yang mau investasi!', 5, 1, CURRENT_TIMESTAMP);
INSERT INTO "Testimonial" ("id", "category", "name", "status", "quote", "rating", "position", "updatedAt") VALUES ('testimonial-seller', 'Penjual Properti', 'Ani Suliasih', 'Penjual Properti di Bekasi Timur', 'Rumah saya laku dalam waktu kurang dari sebulan dengan harga yang memuaskan. Strategi pemasaran mrproperti sangat efektif dan profesional.', 5, 2, CURRENT_TIMESTAMP);
