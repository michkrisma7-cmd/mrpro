import Image from "next/image";
import logo from "@/public/brand/mrproperti-logo.png";

export function BrandLogo({ preload = false }: { preload?: boolean }) {
  return (
    <Image
      className="brand-logo"
      src={logo}
      alt="mrproperti — PARTNER PROPERTI ANDA"
      width={768}
      height={489}
      preload={preload}
      sizes="118px"
    />
  );
}
