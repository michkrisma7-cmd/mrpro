import Link from "next/link";
import type { getBlogPosts } from "@/lib/blog";
export function BlogList({
  posts,
}: {
  posts: Awaited<ReturnType<typeof getBlogPosts>>;
}) {
  return posts.length ? (
    <div className="blog-grid">
      {posts.map((post) => (
        <article className="blog-card" key={post.id}>
          <time dateTime={post.createdAt.toISOString()}>
            {post.createdAt.toLocaleDateString("id-ID", { dateStyle: "long" })}
          </time>
          <h3>
            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
          </h3>
          <p>{post.excerpt}</p>
          <Link className="text-button" href={`/blog/${post.slug}`}>
            Baca artikel →
          </Link>
        </article>
      ))}
    </div>
  ) : (
    <div className="empty-state">
      <p>Artikel terbaru segera hadir.</p>
    </div>
  );
}
