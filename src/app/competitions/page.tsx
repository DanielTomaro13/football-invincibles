import type { Metadata } from "next";
import Link from "next/link";
import { COMPETITIONS, seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Competitions",
  description:
    "Football competitions on Football Invincibles. Premier League is live now, with LaLiga, Serie A, Bundesliga, Ligue 1 and the Champions League coming soon.",
  path: "/competitions",
});

export default function CompetitionsPage() {
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>Competitions</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Built to scale across leagues. Live competitions are playable now; the rest are on the way.
        </p>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))" }}>
        {COMPETITIONS.map((c) => (
          <div
            key={c.slug}
            className="card"
            style={{ padding: "1.1rem", display: "grid", gap: 8, borderTop: `3px solid ${c.accent}` }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "1.05rem" }}>{c.name}</strong>
              <span className="chip">{c.enabled ? "Live" : "Soon"}</span>
            </div>
            <span style={{ color: "var(--muted)", fontSize: ".85rem" }}>
              {c.country} · {seasonLabel(c.currentSeason)}
            </span>
            {c.enabled ? (
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Link href={`/tables/${c.slug}`} className="btn" style={{ padding: ".4rem .8rem" }}>
                  Table
                </Link>
                <Link href="/stats" className="btn" style={{ padding: ".4rem .8rem" }}>
                  Stats
                </Link>
              </div>
            ) : (
              <span style={{ color: "var(--muted)", fontSize: ".8rem", marginTop: 4 }}>
                Coming soon — wired through the same engine.
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
