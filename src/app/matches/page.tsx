import type { Metadata } from "next";
import { getMatches, type LocalMatch } from "@/lib/local";
import { teamBadge } from "@/lib/api-client";
import { DEFAULT_COMPETITION, seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Premier League Fixtures & Results",
  description:
    "Premier League results — match scores across the season, grouped by matchweek.",
  path: "/matches",
  keywords: ["premier league fixtures", "epl results", "football scores"],
});

export default function MatchesPage() {
  const c = DEFAULT_COMPETITION;
  const matches = getMatches();

  const byWeek = new Map<number, LocalMatch[]>();
  for (const m of matches) {
    if (!byWeek.has(m.matchWeek)) byWeek.set(m.matchWeek, []);
    byWeek.get(m.matchWeek)!.push(m);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>Results</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          {c.name} · {seasonLabel(c.currentSeason)}
        </p>
      </div>

      {weeks.map((wk) => (
        <section key={wk}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>
            Matchweek {wk}
          </h2>
          <div className="card" style={{ overflow: "hidden" }}>
            {byWeek.get(wk)!.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  alignItems: "center",
                  gap: 10,
                  padding: ".7rem 1rem",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", fontWeight: 600 }}>
                  {m.home.name}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={teamBadge(m.home.id)} alt="" width={20} height={20} loading="lazy" />
                </div>
                <div
                  style={{
                    minWidth: 70,
                    textAlign: "center",
                    fontWeight: 800,
                    background: "var(--panel-2)",
                    borderRadius: 8,
                    padding: ".25rem .5rem",
                  }}
                >
                  {m.home.score} – {m.away.score}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={teamBadge(m.away.id)} alt="" width={20} height={20} loading="lazy" />
                  {m.away.name}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {matches.length === 0 && <p style={{ color: "var(--muted)" }}>No results yet.</p>}
    </div>
  );
}
