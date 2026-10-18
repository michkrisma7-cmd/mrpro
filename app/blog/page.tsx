import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { getBlogPosts } from "@/lib/blog";
import { BlogList } from "@/components/blog-list";
export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
  title: "Tips Properti & Panduan Rumah Cikarang dan Bekasi",
  description:
    "Baca tips memilih properti, inspirasi renovasi, dan panduan perawatan rumah untuk rencana hunian Anda di Cikarang dan Bekasi.",
  path: "/blog",
});
export default async function Blog() {
  return (
    <section className="container section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">JURNAL MR PROPERTI</p>
          <h1>Inspirasi & panduan rumah.</h1>
          <p>Tips properti dan cerita untuk langkah baru Anda.</p>
        </div>
      </div>
      <BlogList posts={await getBlogPosts()} />
    </section>
  );
}
