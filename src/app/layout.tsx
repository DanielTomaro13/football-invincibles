import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import SisterSites from "@/components/SisterSites";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CompetitionProvider from "@/components/CompetitionProvider";
import JsonLd from "@/components/JsonLd";
import AdUnit from "@/components/AdUnit";
import { SITE } from "@/lib/seo";
import { AD_CLIENT, AD_SLOTS } from "@/lib/ads";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "football stats",
    "premier league table",
    "football games",
    "footle",
    "guess the footballer",
    "higher or lower football",
    "football quiz",
    "fantasy football builder",
    "invincibles",
  ],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
  },
  twitter: { card: "summary_large_image", site: SITE.twitter },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "sports",
  appleWebApp: {
    capable: true,
    title: "Invincibles",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#0a0e1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/players?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <html lang="en">
      <head>
        {/* Google AdSense — static tag so the AdSense crawler can verify the site */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`}
          crossOrigin="anonymous"
        />
        <meta name="google-adsense-account" content={AD_CLIENT} />
      </head>
      <body>
        <JsonLd data={orgLd} />
        <SisterSites active="football" />
        <CompetitionProvider>
          <SiteHeader />
          <main className="container-x" style={{ paddingTop: "1.5rem", minHeight: "70dvh" }}>
            {children}
          </main>
          <div className="container-x">
            <AdUnit slot={AD_SLOTS.inline} />
          </div>
          <SiteFooter />
        </CompetitionProvider>
        {/* Cloudflare Web Analytics */}
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          strategy="afterInteractive"
          data-cf-beacon='{"token": "f7961ccd254a40e8b08f63957734d063"}'
        />
      </body>
    </html>
  );
}
