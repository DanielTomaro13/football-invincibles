import type { Metadata } from "next";
import PlayersBrowser, { type BrowsePlayer } from "@/components/PlayersBrowser";
import { DEFAULT_COMPETITION, seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";
import dataset from "@/data/pl-2025.json";

export const metadata: Metadata = pageMeta({
  title: "Premier League Players — Profiles & Stats",
  description:
    "Browse and search every Premier League player. Profiles, positions, nationalities, goals and assists for the current season.",
  path: "/players",
  keywords: ["premier league players", "footballer profiles", "player stats"],
});

export default function PlayersPage() {
  const players: BrowsePlayer[] = (dataset.players as any[])
    .map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team.shortName,
      pos: p.position ?? "—",
      nat: p.country ?? null,
      g: Math.round(p.stats?.goals ?? 0),
      a: Math.round(p.stats?.goalAssists ?? p.stats?.goal_assists ?? 0),
      apps: Math.round(p.stats?.appearances ?? 0),
      photo: `https://resources.premierleague.com/premierleague25/photos/players/40x40/${p.id}.png`,
    }))
    .sort((a, b) => b.g - a.g || a.name.localeCompare(b.name));

  const c = DEFAULT_COMPETITION;
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>Players</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          {players.length} {c.name} players · {seasonLabel(c.currentSeason)}.
        </p>
      </div>
      <PlayersBrowser players={players} />
    </div>
  );
}
