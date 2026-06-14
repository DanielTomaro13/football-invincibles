import type { Metadata } from "next";
import Link from "next/link";
import { getLeaderboard } from "@/lib/local";
import { playerPhoto } from "@/lib/api-client";
import { DEFAULT_COMPETITION, seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";
import { slugify } from "@/lib/format";

export const metadata: Metadata = pageMeta({
  title: `Premier League Stats ${seasonLabel(DEFAULT_COMPETITION.currentSeason)} — Top Scorers & Assists`,
  description:
    "Premier League stat leaders: top scorers, most assists, clean sheets, passes and shots for the season.",
  path: "/stats",
  keywords: ["premier league top scorers", "most assists", "golden boot", "football stats leaders"],
});

const BOARDS: { key: string; label: string; stats: string[]; position?: string }[] = [
  { key: "goals", label: "Top Scorers", stats: ["goals"] },
  { key: "assists", label: "Assists", stats: ["goalAssists", "goal_assists"] },
  { key: "clean_sheets", label: "Clean Sheets", stats: ["cleanSheets", "clean_sheets"], position: "Goalkeeper" },
  { key: "shots", label: "Shots", stats: ["totalShots", "total_shots"] },
  { key: "passes", label: "Passes", stats: ["totalPasses", "total_passes"] },
  { key: "appearances", label: "Appearances", stats: ["appearances"] },
];

export default function StatsPage() {
  const c = DEFAULT_COMPETITION;
  const boards = BOARDS.map((b) => ({
    ...b,
    rows: getLeaderboard(b.stats, { position: b.position, limit: 10 }),
  }));

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>{c.name} Stats</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          {seasonLabel(c.currentSeason)} stat leaders across the league.
        </p>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))" }}>
        {boards.map((b) => (
          <div key={b.key} className="card" style={{ padding: "1rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 .6rem" }}>{b.label}</h2>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
              {b.rows.map((r, i) => (
                <li key={r.id}>
                  <Link
                    href={`/players/${r.id}/${slugify(r.name)}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", borderRadius: 8 }}
                  >
                    <span style={{ width: 18, color: "var(--muted)", fontWeight: 700 }}>{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={playerPhoto(r.id, "40x40")}
                      alt=""
                      width={26}
                      height={26}
                      loading="lazy"
                      style={{ borderRadius: "50%", background: "var(--panel-2)" }}
                    />
                    <span style={{ flex: 1, fontWeight: 600 }}>{r.name}</span>
                    <span style={{ color: "var(--muted)", fontSize: ".82rem" }}>{r.team}</span>
                    <strong style={{ color: "var(--accent)", minWidth: 28, textAlign: "right" }}>{r.value}</strong>
                  </Link>
                </li>
              ))}
              {b.rows.length === 0 && (
                <li style={{ color: "var(--muted)", fontSize: ".88rem", padding: 6 }}>No data yet.</li>
              )}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
