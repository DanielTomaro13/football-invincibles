import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import MatchesView from "@/components/MatchesView";

export const metadata: Metadata = pageMeta({
  title: "Football Fixtures & Results",
  description:
    "Results matchweek by matchweek — every score this season, filterable by round. Switch competition to see the Premier League or Serie A.",
  path: "/matches",
  keywords: ["football fixtures", "premier league results", "serie a results", "football scores", "matchweek"],
});

export default function MatchesPage() {
  return <MatchesView />;
}
