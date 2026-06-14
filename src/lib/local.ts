/**
 * Build-time data layer for the static export.
 *
 * GitHub Pages serves static files only — there is no request-time server — so
 * every page reads from the bundled season snapshot (src/data/pl-<season>.json,
 * produced by the pipeline) at build time. To refresh the data, re-run the
 * pipeline and rebuild (the GitHub Action does this on a schedule).
 */
import dataset from "@/data/pl-2025.json";
import fixturesJson from "../../public/data/fixtures.json";
import { slugify } from "@/lib/format";

const num = (stats: Record<string, number> | undefined, ...keys: string[]) => {
  if (!stats) return 0;
  for (const k of keys) if (stats[k] != null) return stats[k];
  return 0;
};

export interface StandingEntry {
  team: { id: string; name: string; shortName: string; abbr: string };
  overall: {
    position: number;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
    startingPosition: number;
  };
}

export function getStandings(): StandingEntry[] {
  return ((dataset as any).standings ?? []) as StandingEntry[];
}

export interface LeaderRow {
  id: number;
  name: string;
  team: string;
  teamId: string;
  position: string;
  value: number;
}

export function getLeaderboard(
  statKeys: string[],
  opts: { position?: string; limit?: number } = {}
): LeaderRow[] {
  const rows = (dataset.players as any[])
    .filter((p) => p.position && (!opts.position || p.position === opts.position))
    .map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team.shortName,
      teamId: p.team.id,
      position: p.position,
      value: Math.round(num(p.stats, ...statKeys)),
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  return rows.slice(0, opts.limit ?? 10);
}

export interface LocalPlayer {
  id: number;
  name: string;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  shirtNum: number | null;
  team: { id: string; name: string; shortName: string; abbr: string };
  country: string | null;
  countryCode: string | null;
  birth: string | null;
  joinedClub: string | null;
  height: number | null;
  weight: number | null;
  preferredFoot: string | null;
  stats: Record<string, number>;
}

export function allPlayers(): LocalPlayer[] {
  return (dataset.players as any[])
    .filter((p) => p.position)
    .map((p) => ({ ...p, slug: slugify(p.name) }));
}

export function getPlayer(id: string): LocalPlayer | undefined {
  const p = (dataset.players as any[]).find((x) => String(x.id) === String(id));
  return p ? { ...p, slug: slugify(p.name) } : undefined;
}

export interface LocalMatch {
  id: string;
  matchWeek: number;
  home: { id: string; name: string; score: number };
  away: { id: string; name: string; score: number };
  ground?: string;
}

export function getMatches(): LocalMatch[] {
  return (fixturesJson as any).matches.map((m: any) => ({
    id: m.id,
    matchWeek: m.mw,
    home: { id: m.homeId, name: m.home, score: m.hs },
    away: { id: m.awayId, name: m.away, score: m.as },
    ground: m.ground,
  }));
}

export const SEASON = (dataset as any).season ?? "2025";
