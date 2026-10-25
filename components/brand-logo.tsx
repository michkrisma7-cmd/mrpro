import Image from "next/image";

export function BrandLogo({ preload = false }: { preload?: boolean }) {
  return (
    <Image
      className="brand-logo"
      src="/brand/mrproperti-logo.png?v=20261024"
      alt="mrproperti — PARTNER PROPERTI ANDA"
      width={768}
      height={489}
      preload={preload}
      unoptimized
    />
  );
}
