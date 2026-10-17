import Link from "next/link";
import { ArrowUpRight, Hammer, Zap, PaintRoller, Droplets } from "lucide-react";
import type { Service } from "@/lib/types";
import { money } from "@/lib/format";
const icons = [Hammer, Zap, PaintRoller, Droplets];
export function ServiceCard({
  service: s,
  index = 0,
}: {
  service: Service;
  index?: number;
}) {
  const Icon = icons[index % icons.length];
  return (
    <Link href={`/layanan/${s.slug}`} className="service-card">
      <div className="service-top">
        <span className="service-icon">
          <Icon size={24} strokeWidth={1.6} />
        </span>
        <ArrowUpRight size={20} />
      </div>
      <h3>{s.type}</h3>
      <p>{s.description}</p>
      <div className="worker">
        <span className="worker-avatar">
          {s.workerName.replace(/^Pak /, "").slice(0, 1)}
        </span>
        <span>
          {s.workerName}
          <small>{s.skills.slice(0, 2).join(" · ")}</small>
        </span>
      </div>
      <div className="service-price">
        <span>Mulai dari</span>
        <strong>
          {money(s.minPrice)}
          <small> / {s.unit}</small>
        </strong>
      </div>
    </Link>
  );
}
