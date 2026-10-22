import "server-only";
import { cache } from "react";
import { db, databaseConfigured } from "./db";
import initial from "./testimonials.json";
import type { TestimonialProfile } from "./testimonial-types";
export const initialTestimonials: TestimonialProfile[] = initial.map(
  (item) => ({ ...item, photoId: null, active: true }),
);
export const getTestimonials = cache(
  async (): Promise<TestimonialProfile[]> => {
    if (!databaseConfigured) return initialTestimonials;
    return db().testimonial.findMany({
      where: { active: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
  },
);
