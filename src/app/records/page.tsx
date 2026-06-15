import type { Metadata } from "next";
import Link from "next/link";
import { COMPETITIONS } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";
import { safeId } from "@/lib/ids";
import { playerIndex } from "@/lib/server-data";

export const metadata: Metadata = pageMeta({
  title: "All-Time Records — Top Scorers & Appearances",
  description: "All-time top scorers, assist-makers and appearance records across the Premier League, LaLiga and Serie A, totalled across every season we cover.",
  path: "/records",
  keywords: ["all time top scorers", "premier league all time scorers", "serie a records", "laliga records", "most appearances"],
});

type Row = { id: string; name: string; v: number; club: string };

function board(prefix: string, pick: (s: any[]) => number): Row[] {
  const idx = playerIndex(prefix);
  return Object.entries(idx)
    .map(([id, e]) => ({ id, name: e.n, v: e.s.reduce((a, s) => a + pick(s), 0), club: e.s[0]?.[2] || "" }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 15);
}

function Board({ slug, title, unit, rows }: { slug: string; title: string; unit: string; rows: Row[] }) {
  return (
    <div className="card" style={{ padding: "1rem" }}>
      <h3 style={{ margin: "0 0 .6rem", fontSize: "1.02rem" }}>{title}</h3>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
        {rows.map((r, i) => (
          <li key={r.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 18, color: "var(--muted)", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
            <Link href={`/player/${slug}/${safeId(r.id)}`} style={{ flex: 1, minWidth: 0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "5px 0" }}>{r.name}</Link>
            <strong style={{ color: "var(--accent)", minWidth: 34, textAlign: "right", flexShrink: 0 }}>{r.v}</strong>
            <span style={{ color: "var(--muted)", fontSize: ".75rem", width: 30, flexShrink: 0 }}>{unit}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function RecordsPage() {
  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>All-Time Records</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>Career totals across every season we cover — top scorers, assist-makers and appearance-makers per league.</p>
      </div>
      {COMPETITIONS.filter((c) => c.enabled).map((c) => (
        <section key={c.slug}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0 0 12px" }}>{c.badge} {c.name} <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: ".85rem" }}>· {c.seasons.length} seasons</span></h2>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
            <Board slug={c.slug} title="🥅 Top scorers" unit="gls" rows={board(c.dataPrefix, (s) => s[4])} />
            <Board slug={c.slug} title="🅰️ Most assists" unit="ast" rows={board(c.dataPrefix, (s) => s[5])} />
            <Board slug={c.slug} title="👕 Most appearances" unit="app" rows={board(c.dataPrefix, (s) => s[3])} />
          </div>
        </section>
      ))}
    </div>
  );
}
