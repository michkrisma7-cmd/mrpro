import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/blog";
import { BlogList } from "@/components/blog-list";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tips properti, inspirasi rumah, dan panduan perawatan dari MR Properti.",
  alternates: { canonical: "/blog" },
};
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
