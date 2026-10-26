import Link from "next/link";
import { homeServices } from "@/lib/home-services";
import { HomeServiceIcon } from "./home-service-icon";

export function HomeServiceGrid({ detailed = false }: { detailed?: boolean }) {
  return (
    <div
      className={
        detailed
          ? "home-service-grid home-service-directory"
          : "home-service-grid"
      }
    >
      {homeServices.map((service) => (
        <Link
          key={service.slug}
          href={`/layanan/${service.slug}`}
          prefetch={false}
          aria-label={service.name}
          className="home-service-card"
        >
          {detailed ? (
            <>
              <div className="home-service-identity">
                <HomeServiceIcon slug={service.slug} />
                <h3>{service.name}</h3>
              </div>
              <div className="home-service-copy">
                <p className="home-service-summary">{service.summary}</p>
                <div className="home-service-description">
                  {service.description.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <HomeServiceIcon slug={service.slug} />
              <h3>{service.name}</h3>
              <p className="home-service-card-summary">{service.summary}</p>
            </>
          )}
        </Link>
      ))}
    </div>
  );
}
