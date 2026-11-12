import { connection } from "next/server";
import { business, businessPhone, workAreaDescription } from "@/lib/business";
import { getSettings } from "@/lib/data";
import Link from "next/link";
import { breadcrumbs, jsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Tentang Kami",
  description:
    "Kenali Mr Properti, platform jual beli over kredit properti di seluruh Indonesia dengan layanan pekerjaan dan perbaikan rumah tempat usaha di Bekasi, Cikarang, Karawang, dan Cikampek.",
  descriptionLimit: null,
  path: "/tentang-kami",
});

export default async function AboutPage() {
  await connection();
  const phone = businessPhone((await getSettings()).whatsapp);
  return (
    <article className="container page-wrap legal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbs([
              { name: "Beranda", path: "/" },
              { name: "Tentang Kami", path: "/tentang-kami" },
            ]),
          ),
        }}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <span aria-current="page">Tentang Kami</span>
      </nav>
      <header className="page-heading">
        <p className="eyebrow">MR PROPERTI</p>
        <h1>Tentang Kami</h1>
      </header>
      <div className="legal-content">
        {phone && (
          <section className="legal-clause">
            <h2>Kontak {business.name}</h2>
            <p>
              <a href={`tel:${phone}`}>{phone}</a>
            </p>
          </section>
        )}
        <div className="legal-clause">
          <p>
            <strong>
              MR Properti hadir untuk membantu kebutuhan pemasaran properti
              serta perbaikan dan penataan rumah maupun tempat usaha.
            </strong>{" "}
            Kami mengutamakan komunikasi yang jelas, kesepakatan yang terbuka,
            dan pekerjaan yang disesuaikan dengan kebutuhan pelanggan.
          </p>
          <p>
            Dalam layanan perbaikan bangunan, saat ini kami berfokus pada{" "}
            <strong>pekerjaan berskala ringan hingga menengah</strong>, sesuai
            kemampuan dan bidang keahlian tim. Kami ingin setiap pekerjaan yang
            kami terima memiliki ruang lingkup yang jelas dan dapat ditangani
            secara bertanggung jawab.
          </p>
          <p>
            Layanan kami meliputi perbaikan rumah, pengecatan, pekerjaan plafon,
            kanopi, pagar, baja ringan, kelistrikan, AC, kitchen set, serta
            pekerjaan dak dan peningkatan rumah. Untuk pekerjaan yang
            membutuhkan perhitungan struktur atau keahlian khusus, kelayakan dan
            kebutuhan tenaga ahli perlu ditinjau terlebih dahulu sebelum kami
            menyatakan kesanggupan.
          </p>
          <p>
            Selain layanan perbaikan, kami membantu pemasaran properti untuk
            kebutuhan jual, beli, dan sewa rumah maupun ruko. Dalam peran
            sebagai agen pemasaran, kami membantu mempertemukan pemilik dengan
            calon pembeli atau penyewa, menyampaikan informasi objek secara
            jelas, serta mendampingi komunikasi dan proses negosiasi.
          </p>
        </div>
        <section className="legal-clause" aria-labelledby="about-service-area">
          <h2 id="about-service-area">Wilayah Layanan</h2>
          <p>
            Platform listing Mr Properti melayani jual, beli, sewa, dan over
            kredit properti di seluruh Indonesia.
          </p>
          <p>{workAreaDescription}</p>
        </section>
        <section className="legal-clause" aria-labelledby="about-how-we-work">
          <h2 id="about-how-we-work">Cara Kami Bekerja</h2>
          <p>
            Kami memulai dengan memahami kebutuhan pelanggan. Jika diperlukan,
            survei dilakukan untuk melihat kondisi lokasi dan menentukan
            penanganan yang sesuai. Ruang lingkup pekerjaan, pilihan material,
            biaya, serta perkiraan waktu dibahas sebelum pekerjaan dimulai.
          </p>
          <p>
            Kami memahami bahwa kondisi bangunan dapat berbeda dari gambaran
            awal. Apabila ditemukan kebutuhan tambahan atau perubahan di
            lapangan, kami mengutamakan pembahasan dan persetujuan pelanggan
            sebelum perubahan tersebut dilaksanakan.
          </p>
          <p>
            Kami tidak menjanjikan semua pekerjaan dapat kami tangani. Apabila
            suatu kebutuhan berada di luar kemampuan atau kapasitas tim, kami
            akan menyampaikannya secara terbuka. Bagi kami, kepercayaan dibangun
            melalui penjelasan yang jujur, kesepakatan yang dipahami bersama,
            dan tanggung jawab terhadap pekerjaan yang telah disepakati.
          </p>
          <p>
            <strong>
              Kami ingin menjadi mitra yang mudah diajak berdiskusi, memahami
              kebutuhan Anda, dan membantu mewujudkan rumah maupun tempat usaha
              yang lebih nyaman serta berfungsi dengan baik.
            </strong>
          </p>
        </section>
      </div>
    </article>
  );
}
