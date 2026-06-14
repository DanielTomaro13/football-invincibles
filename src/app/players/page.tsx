import type { Metadata } from "next";
import PlayersView from "@/components/PlayersView";
import { DEFAULT_COMPETITION, seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: `Premier League & LaLiga Players ${seasonLabel(DEFAULT_COMPETITION.currentSeason)}`,
  description:
    "Browse and search every Premier League and LaLiga player — positions, nationalities, goals and assists. Switch leagues with one tap.",
  path: "/players",
  keywords: ["premier league players", "laliga players", "footballer profiles", "player stats"],
});

export default function PlayersPage() {
  return <PlayersView />;
}
