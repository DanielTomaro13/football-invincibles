import type { Metadata } from "next";
import StatsView from "@/components/StatsView";
import { DEFAULT_COMPETITION, seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: `Premier League & LaLiga Stats ${seasonLabel(DEFAULT_COMPETITION.currentSeason)} — Top Scorers`,
  description:
    "Top scorers, assists, clean sheets and appearances for the Premier League and LaLiga. Switch leagues instantly.",
  path: "/stats",
  keywords: ["premier league top scorers", "laliga top scorers", "pichichi", "golden boot", "football stats"],
});

export default function StatsPage() {
  return <StatsView />;
}
