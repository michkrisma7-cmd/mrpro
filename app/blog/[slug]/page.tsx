import type { Metadata } from "next";
import { pageMetadata, breadcrumbs, jsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost } from "@/lib/blog";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPost((await params).slug);
  if (!post)
    return { title: "Artikel tidak ditemukan", robots: { index: false } };
  const metadata = pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
  });
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
  };
}
export default async function BlogDetail({ params }: Props) {
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  return (
    <article className="container section blog-detail">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              description: post.excerpt,
              url: `${siteUrl()}/blog/${post.slug}`,
              mainEntityOfPage: `${siteUrl()}/blog/${post.slug}`,
              datePublished: post.createdAt.toISOString(),
              dateModified: post.updatedAt.toISOString(),
              inLanguage: "id-ID",
              publisher: {
                "@type": "Organization",
                name: "MR Properti",
                url: siteUrl(),
              },
            },
            breadcrumbs([
              { name: "Beranda", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: post.title, path: `/blog/${post.slug}` },
            ]),
          ]),
        }}
      />
      <Link className="text-button" href="/blog">
        ← Semua artikel
      </Link>
      <p className="eyebrow">JURNAL MR PROPERTI</p>
      <h1>{post.title}</h1>
      <time dateTime={post.createdAt.toISOString()}>
        {post.createdAt.toLocaleDateString("id-ID", { dateStyle: "long" })}
      </time>
      <p className="blog-intro">{post.excerpt}</p>
      <div className="blog-content">
        {post.content.split(/\n\s*\n/).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
