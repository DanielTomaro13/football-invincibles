import type { Metadata } from "next";
import Link from "next/link";
import StandingsTable from "@/components/StandingsTable";
import JsonLd from "@/components/JsonLd";
import { DEFAULT_COMPETITION, COMPETITIONS, seasonLabel } from "@/lib/competitions";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 600;

export const metadata: Metadata = pageMeta({
  title: `Premier League Table ${seasonLabel(DEFAULT_COMPETITION.currentSeason)}`,
  description: `The live Premier League table for ${seasonLabel(DEFAULT_COMPETITION.currentSeason)} — standings, points, goal difference and form for all 20 clubs.`,
  path: "/tables",
  keywords: ["premier league table", "epl standings", "football league table"],
});

export default function TablesPage() {
  const comp = DEFAULT_COMPETITION;
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Tables", path: "/tables" }])} />
      <div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>
          {comp.name} Table
        </h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          {seasonLabel(comp.currentSeason)} season standings · updated live.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {COMPETITIONS.map((c) => (
          <Link
            key={c.slug}
            href={c.enabled ? `/tables/${c.slug}` : "/competitions"}
            className="chip"
            style={{ color: c.enabled ? "var(--text)" : "var(--muted)", opacity: c.enabled ? 1 : 0.6 }}
          >
            {c.enabled ? "✅" : "🔜"} {c.shortName}
          </Link>
        ))}
      </div>

      <StandingsTable comp={comp} />
    </div>
  );
}
