import type { Testimonial } from "@prisma/client";
export type TestimonialProfile = Omit<Testimonial, "createdAt" | "updatedAt">;
