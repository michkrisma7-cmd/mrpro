import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getBlogPosts } from "@/lib/blog";
import { BlogList } from "@/components/blog-list";
export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  title: "Tips Jual Beli Properti, KPR & Renovasi Rumah",
  description:
    "Baca panduan jual beli dan sewa properti, perencanaan KPR, renovasi, serta perawatan rumah di jurnal MR Properti.",
  path: "/blog",
});
export default async function Blog() {
  return (
    <section className="container section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">JURNAL MR PROPERTI</p>
          <h1>Tips Properti dan Panduan Rumah</h1>
          <p>
            Panduan memilih, menjual, dan menyewakan properti, merencanakan KPR,
            serta merawat rumah.
          </p>
        </div>
      </div>
      <BlogList posts={await getBlogPosts()} />
    </section>
  );
}
