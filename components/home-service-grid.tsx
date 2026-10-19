import Link from "next/link";
import {
  AirVent,
  PanelsTopLeft,
  Warehouse,
  Fence,
  Zap,
  Construction,
  HousePlus,
  CookingPot,
  PaintRoller,
  Wrench,
} from "lucide-react";
import { homeServices } from "@/lib/home-services";

const icons = {
  ac: AirVent,
  plafon: PanelsTopLeft,
  kanopi: Warehouse,
  pagar: Fence,
  kelistrikan: Zap,
  "baja-ringan": Construction,
  "dak-peningkatan-rumah": HousePlus,
  "kitchen-set": CookingPot,
  pengecatan: PaintRoller,
  "perbaikan-rumah": Wrench,
};

export function HomeServiceGrid() {
  return (
    <div className="home-service-grid">
      {homeServices.map((service) => {
        const Icon = icons[service.slug as keyof typeof icons];
        return (
          <Link
            key={service.slug}
            href={`/layanan/${service.slug}`}
            className="home-service-card"
          >
            <span className="home-service-icon">
              <Icon size={32} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <h3>{service.name}</h3>
          </Link>
        );
      })}
    </div>
  );
}
