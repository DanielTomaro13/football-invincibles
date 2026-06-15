import "server-only";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { safeId } from "@/lib/ids";

/**
 * Build-time data accessors that read the JSON under /public/data directly from
 * disk (memoised), for statically-generated player / club / match pages. Never
 * imported by client components.
 */
const DATA = join(process.cwd(), "public", "data");
const cache = new Map<string, unknown>();
function read<T>(rel: string, fallback: T): T {
  if (cache.has(rel)) return cache.get(rel) as T;
  const p = join(DATA, rel);
  const v = existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : fallback;
  cache.set(rel, v);
  return v;
}

export interface PlayerEntry { n: string; p: string; ph: string | null; na: string | null; s: [string, string, string, number, number, number, number, number, number | null][] }
export interface TeamEntry { n: string; sh: string; b: string | null; s: [string, number, number, number, number, number, number, number, number][] }

// merge the 32 player-index shards into one map (once per build)
export function playerIndex(prefix: string): Record<string, PlayerEntry> {
  const key = `${prefix}__players`;
  if (cache.has(key)) return cache.get(key) as Record<string, PlayerEntry>;
  const dir = join(DATA, prefix, "players-index");
  const merged: Record<string, PlayerEntry> = {};
  if (existsSync(dir)) for (const f of readdirSync(dir)) if (f.endsWith(".json")) Object.assign(merged, JSON.parse(readFileSync(join(dir, f), "utf8")));
  cache.set(key, merged);
  return merged;
}
export function teamIndex(prefix: string): Record<string, TeamEntry> {
  return read(`${prefix}teams-index.json`, {} as Record<string, TeamEntry>);
}

// Players with real playing time get a static page (the index also lists squad
// members who never appeared — pure noise + would blow past GitHub Pages' 1 GB
// site limit). Sub-threshold players still surface inside profiles/squads, just
// without their own page. Keep this used by BOTH the route and the sitemap.
export const MIN_PLAYER_APPS = 5;
export function notablePlayerIds(prefix: string): string[] {
  const idx = playerIndex(prefix);
  return Object.keys(idx).filter((id) => idx[id].s.reduce((a, s) => a + s[3], 0) >= MIN_PLAYER_APPS);
}

// safeId -> full id maps (route param is the safe id; data is keyed by full id)
function safeMap(prefix: string, kind: "p" | "t"): Map<string, string> {
  const key = `${prefix}__safe_${kind}`;
  if (cache.has(key)) return cache.get(key) as Map<string, string>;
  const ids = Object.keys(kind === "p" ? playerIndex(prefix) : teamIndex(prefix));
  const m = new Map(ids.map((id) => [safeId(id), id]));
  cache.set(key, m);
  return m;
}
export const fullPlayerId = (prefix: string, sid: string) => safeMap(prefix, "p").get(sid);
export const fullTeamId = (prefix: string, sid: string) => safeMap(prefix, "t").get(sid);

export function seasonRosters(prefix: string, year: string): Record<string, any[]> {
  return read(`${prefix}seasons/${year}.json`, { rosters: {} } as any).rosters || {};
}
export function matchFile(prefix: string, sid: string): any | null {
  return read(`${prefix}matches/${sid}.json`, null);
}
export function listMatchIds(prefix: string): string[] {
  const dir = join(DATA, prefix, "matches");
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : [];
}
