import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Tentang Kami",
  description:
    "Kenali mrproperti, mitra pemasaran properti serta perbaikan dan penataan rumah maupun tempat usaha di Bekasi, Cikarang, Karawang, hingga Cikampek.",
  path: "/tentang-kami",
});

export default function AboutPage() {
  return (
    <article className="container page-wrap legal-page">
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
        <div className="legal-clause">
          <p>
            <strong>
              mrproperti hadir untuk membantu kebutuhan pemasaran properti serta
              perbaikan dan penataan rumah maupun tempat usaha.
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
            Wilayah kerja kami saat ini mencakup{" "}
            <strong>Bekasi, Cikarang, Karawang, hingga Cikampek</strong>.
            Pembatasan wilayah ini membantu kami mengatur survei, koordinasi
            tim, dan pemantauan pekerjaan dengan lebih terarah. Ketersediaan
            layanan di setiap lokasi disesuaikan dengan jenis pekerjaan, akses
            lokasi, dan kesiapan tim.
          </p>
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
