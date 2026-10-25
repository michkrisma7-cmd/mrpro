import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db, databaseConfigured } from "./db";

export const getTeamMembers = cache(
  unstable_cache(
    async () =>
      databaseConfigured
        ? db().teamMember.findMany({
            where: { active: true },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              name: true,
              expertise: true,
              experience: true,
              description: true,
              fullProfile: true,
              photoId: true,
            },
          })
        : [],
    ["public-team"],
    { revalidate: 300, tags: ["team"] },
  ),
);
