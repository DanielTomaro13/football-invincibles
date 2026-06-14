/**
 * Shared types + loaders for the mini-games dataset (public/data/games.json),
 * produced by pipeline/build-data.mjs from real Premier League data.
 */
export interface GamePlayer {
  id: number;
  name: string;
  team: string;
  teamId: string;
  pos: string; // Goalkeeper | Defender | Midfielder | Forward
  nat: string | null;
  natCode: string | null;
  born: number | null; // birth year
  shirt: number | null;
  height: number | null;
  foot: string | null;
  g: number;
  a: number;
  apps: number;
  shots: number;
  passes: number;
  cs: number;
  rating: number;
  photo: string;
  fame: number;
}

export interface Strength {
  teamId: string;
  name: string;
  strength: number;
}

export interface GamesData {
  season: string;
  competition: string;
  players: GamePlayer[];
  strengths: Strength[];
}

/** Client-side loader (games are interactive client components). */
export async function loadGamesData(): Promise<GamesData> {
  const res = await fetch("/data/games.json", { cache: "force-cache" });
  return res.json();
}

/** Today's UTC date key (YYYY-MM-DD) — the same for everyone, used for daily boards. */
export const dailyDateKey = () => new Date().toISOString().slice(0, 10);

/** Deterministic daily seed so "today's" puzzles are the same for everyone. */
export function dailySeed(salt = ""): number {
  const d = new Date();
  const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${salt}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 seeded PRNG. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickN<T>(arr: T[], n: number, rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
