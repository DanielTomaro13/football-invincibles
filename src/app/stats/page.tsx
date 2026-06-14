import type { Metadata } from "next";
import { getPlayerLeaderboard, playerPhoto, type LeaderRow } from "@/lib/api";
import { DEFAULT_COMPETITION, seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";
import { slugify } from "@/lib/format";
import Link from "next/link";

export const revalidate = 1800;

export const metadata: Metadata = pageMeta({
  title: `Premier League Stats ${seasonLabel(DEFAULT_COMPETITION.currentSeason)} — Top Scorers & Assists`,
  description:
    "Premier League stat leaders: top scorers, most assists, clean sheets, passes and shots for the current season.",
  path: "/stats",
  keywords: ["premier league top scorers", "most assists", "golden boot", "football stats leaders"],
});

const BOARDS: { key: string; label: string; stat: string; position?: string }[] = [
  { key: "goals", label: "Top Scorers", stat: "goals" },
  { key: "goal_assists", label: "Assists", stat: "goalAssists" },
  { key: "clean_sheets", label: "Clean Sheets", stat: "cleanSheets", position: "Goalkeeper" },
  { key: "total_shots", label: "Shots", stat: "totalShots" },
  { key: "total_passes", label: "Passes", stat: "totalPasses" },
];

export default async function StatsPage() {
  const c = DEFAULT_COMPETITION;
  const boards = await Promise.all(
    BOARDS.map(async (b) => ({
      ...b,
      rows: await getPlayerLeaderboard(c.sdpId, c.currentSeason, b.key, {
        position: b.position,
        limit: 10,
      }),
    }))
  );

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>
          {c.name} Stats
        </h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          {seasonLabel(c.currentSeason)} stat leaders across the league.
        </p>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))" }}>
        {boards.map((b) => (
          <div key={b.key} className="card" style={{ padding: "1rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 .6rem" }}>{b.label}</h2>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
              {b.rows.map((r: LeaderRow, i: number) => (
                <li key={r.playerMetadata.id}>
                  <Link
                    href={`/players/${r.playerMetadata.id}/${slugify(r.playerMetadata.name)}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", borderRadius: 8 }}
                  >
                    <span style={{ width: 18, color: "var(--muted)", fontWeight: 700 }}>{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={playerPhoto(r.playerMetadata.id, "40x40")}
                      alt=""
                      width={26}
                      height={26}
                      loading="lazy"
                      style={{ borderRadius: "50%", background: "var(--panel-2)" }}
                    />
                    <span style={{ flex: 1, fontWeight: 600 }}>{r.playerMetadata.name}</span>
                    <span style={{ color: "var(--muted)", fontSize: ".82rem" }}>
                      {r.playerMetadata.currentTeam?.shortName}
                    </span>
                    <strong style={{ color: "var(--accent)", minWidth: 28, textAlign: "right" }}>
                      {Math.round(r.stats[b.stat] ?? 0)}
                    </strong>
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
