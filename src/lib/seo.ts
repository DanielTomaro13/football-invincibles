import type { Metadata } from "next";

export const SITE = {
  name: "Football Invincibles",
  domain: "footballinvincibles.com",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://footballinvincibles.com",
  tagline:
    "Football stats, tables & addictive mini-games. Build your Invincible XI.",
  description:
    "Live football stats, league tables, fixtures and player profiles plus a vault of football mini-games — Footle, Higher or Lower, Guess the Player, Career Path and the Invincibles squad-builder. Premier League now, more competitions soon.",
  twitter: "@footyinvincible",
};

/** Build page metadata with sensible SEO defaults + Open Graph/Twitter cards. */
export function pageMeta(opts: {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  image?: string;
}): Metadata {
  const url = SITE.url + (opts.path ?? "");
  const description = opts.description ?? SITE.description;
  const title = opts.title;
  return {
    title,
    description,
    keywords: opts.keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      type: "website",
      images: opts.image ? [{ url: opts.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: SITE.twitter,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: SITE.url + it.path,
    })),
  };
}
