export const dynamic = "force-static";

import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";
import { COMPETITIONS } from "@/lib/competitions";
import { allPlayers } from "@/lib/local";

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
    "/leaderboard",
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

  // every player profile — big internal-linking / long-tail SEO win
  const playerPaths = allPlayers().map((p) => ({
    url: `${SITE.url}/players/${p.id}/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticPaths, ...gamePaths, ...compPaths, ...playerPaths];
}
