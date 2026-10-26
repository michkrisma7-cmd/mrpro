import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Loading from "./loading";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DeferredChat } from "@/components/deferred-chat";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/format";
import { brand, homeTitle, homeDescription, indexingEnabled } from "@/lib/seo";
import { brandIcons, brandIconUrl } from "@/lib/brand";
const dmSans = localFont({
  src: "../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  display: "swap",
  weight: "100 1000",
});
const manrope = localFont({
  src: "../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope",
  display: "swap",
  weight: "200 800",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${homeTitle} | ${brand}`,
    template: "%s | MR Properti",
  },
  robots: { index: indexingEnabled(), follow: true },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
  description: homeDescription,
  manifest: brandIconUrl("/manifest.webmanifest"),
  icons: {
    icon: brandIcons.map(({ src, ...icon }) => ({ url: src, ...icon })),
    apple: [
      {
        url: brandIconUrl("/apple-touch-icon.png"),
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "MR Properti",
    title: `${homeTitle} | ${brand}`,
    description: homeDescription,
    images: [{ url: "/images/hero.webp", width: 1536, height: 1024 }],
  },
  twitter: { card: "summary_large_image" },
};
async function SiteFooter() {
  await connection();
  const settings = await getSettings();
  return (
    <>
      <Footer />
      <DeferredChat whatsapp={settings.whatsapp} />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${dmSans.variable} ${manrope.variable}`}
    >
      <body>
        <a className="skip-link" href="#konten">
          Langsung ke konten
        </a>
        <Header />
        <main id="konten">
          <Suspense fallback={<Loading />}>
            <RequestContent>{children}</RequestContent>
          </Suspense>
        </main>
        <Suspense>
          <SiteFooter />
        </Suspense>
      </body>
    </html>
  );
}

async function RequestContent({ children }: { children: React.ReactNode }) {
  await connection();
  return children;
}
