import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import TablesView from "@/components/TablesView";
import { DEFAULT_COMPETITION, seasonLabel } from "@/lib/competitions";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: `Premier League & LaLiga Tables ${seasonLabel(DEFAULT_COMPETITION.currentSeason)}`,
  description: `Live league tables for the Premier League and LaLiga — standings, points, goal difference and form. Swap leagues with one tap.`,
  path: "/tables",
  keywords: ["premier league table", "laliga table", "la liga standings", "football league table"],
});

export default function TablesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Tables", path: "/tables" }])} />
      <TablesView />
    </>
  );
}
