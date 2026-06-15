export const dynamic = "force-static";

import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";
import { COMPETITIONS } from "@/lib/competitions";
import { safeId } from "@/lib/ids";
import { teamIndex, listMatchIds, notablePlayerIds } from "@/lib/server-data";

const GAMES = ["invincibles", "footle", "higher-or-lower", "rating-duel", "guess-the-player", "career-path", "starting-xi", "score-predictor"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (path: string, priority: number, changeFrequency: "daily" | "weekly" = "daily") => ({ url: SITE.url + path, lastModified: now, changeFrequency, priority });

  const out: MetadataRoute.Sitemap = [
    "", "/tables", "/stats", "/records", "/honours", "/players", "/clubs", "/matches", "/history", "/games", "/leaderboard", "/competitions", "/about", "/contact", "/privacy",
  ].map((p) => entry(p, p === "" ? 1 : 0.8));

  out.push(...GAMES.map((g) => entry(`/games/${g}`, 0.7)));

  // per-league pages: table + every club, player and match (long-tail SEO)
  for (const c of COMPETITIONS.filter((x) => x.enabled)) {
    out.push(entry(`/tables/${c.slug}`, 0.6));
    for (const id of Object.keys(teamIndex(c.dataPrefix))) out.push(entry(`/club/${c.slug}/${safeId(id)}`, 0.55, "weekly"));
    for (const id of notablePlayerIds(c.dataPrefix)) out.push(entry(`/player/${c.slug}/${safeId(id)}`, 0.5, "weekly"));
    for (const id of listMatchIds(c.dataPrefix)) out.push(entry(`/match/${c.slug}/${id}`, 0.45, "weekly"));
  }

  return out;
}
