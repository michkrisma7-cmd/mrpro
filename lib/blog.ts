import "server-only";
import { cache } from "react";
import { db, databaseConfigured } from "./db";
export const getBlogPosts = cache(async (take = 30) => {
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
});
export const getBlogPost = cache(async (slug: string) => {
  if (!databaseConfigured) return null;
  return db().blogPost.findFirst({ where: { slug, published: true } });
});
