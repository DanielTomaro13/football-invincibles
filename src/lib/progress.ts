/**
 * Local progress, streaks & personal bests (localStorage).
 *
 * Works on a fully static site — no backend needed. Daily games track a
 * Wordle-style streak (consecutive days solved) and a guess distribution;
 * score games track a personal best. The Hall of Fame and the per-game stats
 * modals read from here. Global leaderboards live in lib/leaderboard.ts.
 */
const KEY = "fi:progress:v1";

export interface DailyStats {
  played: number;
  wins: number;
  cur: number; // current streak
  max: number; // best streak
  dist: Record<number, number>; // guesses -> count
  lastDate: string | null; // YYYY-MM-DD of last completion
  lastResult: { date: string; won: boolean; guesses: number } | null;
}

export interface ScoreStats {
  best: number;
  plays: number;
  lastScore: number;
}

type Store = {
  daily: Record<string, DailyStats>;
  score: Record<string, ScoreStats>;
  name: string | null;
};

function load(): Store {
  if (typeof window === "undefined") return { daily: {}, score: {}, name: null };
  try {
    return { daily: {}, score: {}, name: null, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { daily: {}, score: {}, name: null };
  }
}

function save(s: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

const emptyDaily = (): DailyStats => ({ played: 0, wins: 0, cur: 0, max: 0, dist: {}, lastDate: null, lastResult: null });

export function getDaily(game: string): DailyStats {
  return load().daily[game] ?? emptyDaily();
}

/** Already completed today? Returns the stored result if so. */
export function todaysResult(game: string): DailyStats["lastResult"] {
  const d = getDaily(game);
  return d.lastResult && d.lastResult.date === todayKey() ? d.lastResult : null;
}

export function recordDaily(game: string, won: boolean, guesses: number): DailyStats {
  const s = load();
  const d = s.daily[game] ?? emptyDaily();
  const today = todayKey();
  if (d.lastResult?.date === today) return d; // already recorded today
  d.played++;
  if (won) {
    d.wins++;
    d.cur = d.lastDate && dayDiff(d.lastDate, today) === 1 ? d.cur + 1 : 1;
    d.max = Math.max(d.max, d.cur);
    d.dist[guesses] = (d.dist[guesses] ?? 0) + 1;
  } else {
    d.cur = 0;
  }
  d.lastDate = today;
  d.lastResult = { date: today, won, guesses };
  s.daily[game] = d;
  save(s);
  return d;
}

export function getScore(game: string): ScoreStats {
  return load().score[game] ?? { best: 0, plays: 0, lastScore: 0 };
}

/** Returns true if this is a new personal best. */
export function recordScore(game: string, value: number, higherIsBetter = true): boolean {
  const s = load();
  const cur = s.score[game] ?? { best: 0, plays: 0, lastScore: 0 };
  cur.plays++;
  cur.lastScore = value;
  const isBest = cur.plays === 1 || (higherIsBetter ? value > cur.best : value < cur.best);
  if (isBest) cur.best = value;
  s.score[game] = cur;
  save(s);
  return isBest;
}

export function getName(): string {
  return load().name || "";
}

export function setName(name: string) {
  const s = load();
  s.name = name.slice(0, 16);
  save(s);
}

export function msUntilTomorrowUTC(): number {
  const now = new Date();
  const t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return t - now.getTime();
}

export function countdownString(): string {
  const ms = msUntilTomorrowUTC();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}
