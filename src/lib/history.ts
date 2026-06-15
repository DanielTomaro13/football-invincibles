/**
 * Client loaders for the historical season data (public/data/*).
 * Season rosters are loaded on demand and cached, so the game stays fast.
 */
export interface HistPlayer {
  id: number | string;
  name: string;
  pos: string;
  nat: string | null;
  born: number | null;
  shirt: number | null;
  g: number;
  a: number;
  apps: number;
  cs: number;
  mins?: number;
  // attacking
  sh?: number; sot?: number; xg?: number; xa?: number; kp?: number; hw?: number; off?: number;
  // passing
  pas?: number; cr?: number; tb?: number;
  // defending
  tk?: number; tkl?: number; intc?: number; clr?: number; blk?: number; rec?: number; aer?: number;
  // goalkeeping
  sv?: number; svp?: number; gc?: number;
  // discipline
  yc?: number; rc?: number;
  photo?: string | null; // present for La Liga; PL builds the URL from id
  rating: number;
}

export interface SeasonTeam {
  id: string;
  name: string;
  short: string;
  abbr: string;
  badge?: string | null;
}

export interface SeasonMeta {
  year: string;
  label: string;
  teams: SeasonTeam[];
}

export interface HistoryIndex {
  seasons: SeasonMeta[];
}

const indexCache = new Map<string, HistoryIndex>();
const seasonCache = new Map<string, Record<string, HistPlayer[]>>();
const strengthsCache = new Map<string, { teamId: string; name: string; strength: number }[]>();
const standingsCache = new Map<string, any[]>();

// Bump when the dataset/calibration changes so cached files are re-fetched.
const DATA_VERSION = "5";

// `prefix` is the competition's dataPrefix: "" for the Premier League,
// "laliga/" for La Liga, etc. — all live under /public/data/<prefix>.

export async function loadHistoryIndex(prefix = ""): Promise<HistoryIndex> {
  if (indexCache.has(prefix)) return indexCache.get(prefix)!;
  const r = await fetch(`/data/${prefix}history-index.json?v=${DATA_VERSION}`, { cache: "force-cache" });
  const j = await r.json();
  indexCache.set(prefix, j);
  return j;
}

export async function loadSeasonRosters(year: string, prefix = ""): Promise<Record<string, HistPlayer[]>> {
  const key = prefix + year;
  if (seasonCache.has(key)) return seasonCache.get(key)!;
  const r = await fetch(`/data/${prefix}seasons/${year}.json?v=${DATA_VERSION}`, { cache: "force-cache" });
  const j = await r.json();
  seasonCache.set(key, j.rosters);
  return j.rosters;
}

export async function loadStrengths(prefix = "") {
  if (strengthsCache.has(prefix)) return strengthsCache.get(prefix)!;
  const r = await fetch(`/data/${prefix}strengths.json?v=${DATA_VERSION}`, { cache: "force-cache" });
  const s = (await r.json()).strengths;
  strengthsCache.set(prefix, s);
  return s;
}

export async function loadStandings(prefix = ""): Promise<any[]> {
  if (standingsCache.has(prefix)) return standingsCache.get(prefix)!;
  const r = await fetch(`/data/${prefix}standings.json?v=${DATA_VERSION}`, { cache: "force-cache" });
  const s = (await r.json()).standings;
  standingsCache.set(prefix, s);
  return s;
}

// Player search index is sharded into 32 buckets (see pipeline/build-search-index.mjs).
// Keep this hash identical to shardOf() there.
export function playerShard(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 32).toString(16).padStart(2, "0");
}
const playerIdxCache = new Map<string, any>();
export async function loadPlayerIndexEntry(id: string, prefix = ""): Promise<any | null> {
  const shard = playerShard(id);
  const key = prefix + shard;
  let bucket = playerIdxCache.get(key);
  if (!bucket) {
    const r = await fetch(`/data/${prefix}players-index/${shard}.json?v=${DATA_VERSION}`, { cache: "force-cache" });
    bucket = r.ok ? await r.json() : {};
    playerIdxCache.set(key, bucket);
  }
  return bucket[id] ?? null;
}

// Final table for one past season — /data/<prefix>standings/<year>.json (History archive).
const seasonStandingsCache = new Map<string, any[]>();
export async function loadSeasonStandings(year: string, prefix = ""): Promise<any[]> {
  const key = prefix + year;
  if (seasonStandingsCache.has(key)) return seasonStandingsCache.get(key)!;
  const r = await fetch(`/data/${prefix}standings/${year}.json?v=${DATA_VERSION}`, { cache: "force-cache" });
  if (!r.ok) { seasonStandingsCache.set(key, []); return []; }
  const s = (await r.json()).standings ?? [];
  seasonStandingsCache.set(key, s);
  return s;
}
