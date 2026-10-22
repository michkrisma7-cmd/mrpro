import Image from "next/image";
import { Star } from "lucide-react";
import type { TestimonialProfile } from "@/lib/testimonial-types";
export function TestimonialSection({
  testimonials,
}: {
  testimonials: TestimonialProfile[];
}) {
  if (!testimonials.length) return null;
  return (
    <section
      className="section container testimonial-section"
      id="testimoni"
      aria-labelledby="testimonial-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">CERITA KONSUMEN</p>
          <h2 id="testimonial-title">Pengalaman bersama mrproperti.</h2>
        </div>
      </div>
      <div className="testimonial-grid">
        {testimonials.map((item) => (
          <figure className="testimonial-card" key={item.id}>
            <div className="testimonial-heading">
              <p className="testimonial-category">{item.category}</p>
              <div
                className="testimonial-stars"
                role="img"
                aria-label={`${item.rating} dari 5 bintang`}
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={15}
                    fill={i < item.rating ? "currentColor" : "none"}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
            <blockquote>“{item.quote}”</blockquote>
            <figcaption>
              <strong>{item.name}</strong>
              <span>{item.status}</span>
            </figcaption>
            <div className="testimonial-avatar">
              {item.photoId ? (
                <Image
                  src={`/api/media/${item.photoId}`}
                  alt={`Foto ${item.name}`}
                  width={56}
                  height={56}
                  unoptimized
                />
              ) : (
                <span aria-hidden="true">
                  {item.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join("")}
                </span>
              )}
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}
