import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db, databaseConfigured } from "./db";
const cachedBlogPosts = cache(
  unstable_cache(
    async (take = 30) => {
      if (!databaseConfigured) return [];
      return db().blogPost.findMany({
        where: { published: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          createdAt: true,
        },
      });
    },
    ["blog-posts"],
    { revalidate: 300, tags: ["blog"] },
  ),
);
const cachedBlogPost = cache(
  unstable_cache(
    async (slug: string) => {
      if (!databaseConfigured) return null;
      return db().blogPost.findFirst({ where: { slug, published: true } });
    },
    ["blog-post"],
    { revalidate: 300, tags: ["blog"] },
  ),
);

// The persistent data cache serializes Date objects as ISO strings.
export const getBlogPosts = cache(async (take = 30) =>
  (await cachedBlogPosts(take)).map((post) => ({
    ...post,
    createdAt: new Date(post.createdAt),
  })),
);
export const getBlogPost = cache(async (slug: string) => {
  const post = await cachedBlogPost(slug);
  return post
    ? {
        ...post,
        createdAt: new Date(post.createdAt),
        updatedAt: new Date(post.updatedAt),
      }
    : null;
});
