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

/** Current matchweek = the latest one in the played fixtures. */
export function currentMatchweek(): number {
  return Math.max(0, ...(fixturesJson as any).matches.map((m: any) => m.mw));
}

/**
 * League table built from the matches actually played (up to the latest
 * matchweek), so the standings stay consistent with the fixtures/results shown
 * rather than implying a finished 38-game season.
 */
export function getStandings(): StandingEntry[] {
  const tbl = new Map<string, any>();
  const ensure = (id: string, name: string) => {
    if (!tbl.has(id)) tbl.set(id, { id, name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });
  };
  for (const m of (fixturesJson as any).matches) {
    ensure(m.homeId, m.home);
    ensure(m.awayId, m.away);
    const h = tbl.get(m.homeId), a = tbl.get(m.awayId);
    h.played++; a.played++;
    h.gf += m.hs; h.ga += m.as; a.gf += m.as; a.ga += m.hs;
    if (m.hs > m.as) { h.won++; h.points += 3; a.lost++; }
    else if (m.hs < m.as) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }
  const arr = [...tbl.values()].sort(
    (x, y) => y.points - x.points || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.name.localeCompare(y.name)
  );
  return arr.map((t, i) => ({
    team: { id: t.id, name: t.name, shortName: t.name, abbr: "" },
    overall: {
      position: i + 1, played: t.played, won: t.won, drawn: t.drawn, lost: t.lost,
      goalsFor: t.gf, goalsAgainst: t.ga, points: t.points, startingPosition: i + 1,
    },
  }));
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
