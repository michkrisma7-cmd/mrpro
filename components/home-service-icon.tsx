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

export function HomeServiceIcon({ slug }: { slug: string }) {
  const Icon = icons[slug as keyof typeof icons];
  return (
    <span className="home-service-icon">
      <Icon size={32} strokeWidth={1.6} aria-hidden="true" />
    </span>
  );
}
