import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";
import { COMPETITIONS } from "@/lib/competitions";

const GAMES = [
  "invincibles",
  "footle",
  "higher-or-lower",
  "guess-the-player",
  "career-path",
  "starting-xi",
  "score-predictor",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPaths = [
    "",
    "/tables",
    "/stats",
    "/players",
    "/matches",
    "/games",
    "/competitions",
    "/about",
  ].map((p) => ({
    url: SITE.url + p,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.8,
  }));

  const gamePaths = GAMES.map((g) => ({
    url: `${SITE.url}/games/${g}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  const compPaths = COMPETITIONS.filter((c) => c.enabled).map((c) => ({
    url: `${SITE.url}/tables/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...staticPaths, ...gamePaths, ...compPaths];
}
