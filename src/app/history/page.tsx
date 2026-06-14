import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import HistoryView from "@/components/HistoryView";

export const metadata: Metadata = pageMeta({
  title: "Season Archive — Historical Tables & Top XIs",
  description:
    "Browse historical football seasons: final league tables and the top-rated XI for every season, across the Premier League, LaLiga and Serie A.",
  path: "/history",
  keywords: ["historical football tables", "premier league archive", "serie a history", "laliga past seasons", "final league table"],
});

export default function HistoryPage() {
  return <HistoryView />;
}
