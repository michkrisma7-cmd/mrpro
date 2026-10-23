import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Loading from "./loading";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ChatWidget } from "@/components/chat-widget";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/format";
import { brand, homeTitle, homeDescription, indexingEnabled } from "@/lib/seo";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${homeTitle} | ${brand}`,
    template: "%s | MR Properti",
  },
  robots: { index: indexingEnabled(), follow: true },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
  description: homeDescription,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
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
      <ChatWidget whatsapp={settings.whatsapp} />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
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
