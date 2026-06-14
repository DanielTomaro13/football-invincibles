/**
 * Client loaders for the historical season data (public/data/*).
 * Season rosters are loaded on demand and cached, so the game stays fast.
 */
export interface HistPlayer {
  id: number;
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
  rating: number;
}

export interface SeasonTeam {
  id: string;
  name: string;
  short: string;
  abbr: string;
}

export interface SeasonMeta {
  year: string;
  label: string;
  teams: SeasonTeam[];
}

export interface HistoryIndex {
  seasons: SeasonMeta[];
}

let indexCache: HistoryIndex | null = null;
const seasonCache = new Map<string, Record<string, HistPlayer[]>>();

// Bump when the dataset/calibration changes so cached files are re-fetched.
const DATA_VERSION = "4";

export async function loadHistoryIndex(): Promise<HistoryIndex> {
  if (indexCache) return indexCache;
  const r = await fetch(`/data/history-index.json?v=${DATA_VERSION}`, { cache: "force-cache" });
  indexCache = await r.json();
  return indexCache!;
}

export async function loadSeasonRosters(year: string): Promise<Record<string, HistPlayer[]>> {
  if (seasonCache.has(year)) return seasonCache.get(year)!;
  const r = await fetch(`/data/seasons/${year}.json?v=${DATA_VERSION}`, { cache: "force-cache" });
  const j = await r.json();
  seasonCache.set(year, j.rosters);
  return j.rosters;
}

let strengthsCache: { teamId: string; name: string; strength: number }[] | null = null;
export async function loadStrengths() {
  if (strengthsCache) return strengthsCache;
  const r = await fetch(`/data/strengths.json?v=${DATA_VERSION}`, { cache: "force-cache" });
  strengthsCache = (await r.json()).strengths;
  return strengthsCache!;
}
