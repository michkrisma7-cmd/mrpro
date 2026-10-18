import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost } from "@/lib/blog";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPost((await params).slug);
  if (!post)
    return { title: "Artikel tidak ditemukan", robots: { index: false } };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
    },
  };
}
export default async function BlogDetail({ params }: Props) {
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  return (
    <article className="container section blog-detail">
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
