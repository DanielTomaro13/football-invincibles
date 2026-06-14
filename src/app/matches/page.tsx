import type { Metadata } from "next";
import { getMatches, teamBadge, type Match } from "@/lib/api";
import { DEFAULT_COMPETITION, seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";
import { fmtKickoff, fmtTime } from "@/lib/format";

export const revalidate = 300;

export const metadata: Metadata = pageMeta({
  title: "Premier League Fixtures & Results",
  description:
    "Premier League fixtures and results — full match schedule with scores and kick-off times for the current season.",
  path: "/matches",
  keywords: ["premier league fixtures", "epl results", "football scores"],
});

export default async function MatchesPage() {
  const c = DEFAULT_COMPETITION;
  const matches = await getMatches(c.sdpId, c.currentSeason);

  const byWeek = new Map<number, Match[]>();
  for (const m of matches) {
    const wk = m.matchWeek ?? 0;
    if (!byWeek.has(wk)) byWeek.set(wk, []);
    byWeek.get(wk)!.push(m);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b).slice(0, 6);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>Fixtures & Results</h1>
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
            {byWeek.get(wk)!.map((m) => {
              const played = m.homeTeam.score != null && m.period === "FullTime";
              return (
                <div
                  key={m.matchId}
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
                    {m.homeTeam.name}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={teamBadge(m.homeTeam.id)} alt="" width={20} height={20} loading="lazy" />
                  </div>
                  <div
                    style={{
                      minWidth: 86,
                      textAlign: "center",
                      fontWeight: 800,
                      background: "var(--panel-2)",
                      borderRadius: 8,
                      padding: ".25rem .5rem",
                      fontSize: played ? "1rem" : ".78rem",
                      color: played ? "var(--text)" : "var(--muted)",
                    }}
                  >
                    {played ? `${m.homeTeam.score} – ${m.awayTeam.score}` : `${fmtKickoff(m.kickoff)} ${fmtTime(m.kickoff)}`}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={teamBadge(m.awayTeam.id)} alt="" width={20} height={20} loading="lazy" />
                    {m.awayTeam.name}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {matches.length === 0 && (
        <p style={{ color: "var(--muted)" }}>Fixtures appear once the season schedule is released.</p>
      )}
    </div>
  );
}
