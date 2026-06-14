/**
 * Global leaderboard client.
 *
 * Posts/reads scores from a Cloudflare Worker (see /worker) at
 * NEXT_PUBLIC_LEADERBOARD_URL. If that env var isn't set, everything falls back
 * to a per-browser localStorage leaderboard so the UI still works on a plain
 * static deploy — it's just "local" rather than "global".
 */
import { getName } from "@/lib/progress";

const ENDPOINT = process.env.NEXT_PUBLIC_LEADERBOARD_URL?.replace(/\/$/, "");
const LKEY = "fi:lb:v1";

export interface ScoreEntry {
  name: string;
  score: number;
  at: number;
}

export const isGlobal = () => Boolean(ENDPOINT);

// ---- local fallback ----
function localAll(): Record<string, ScoreEntry[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LKEY) || "{}");
  } catch {
    return {};
  }
}
function localSave(all: Record<string, ScoreEntry[]>) {
  if (typeof window !== "undefined") localStorage.setItem(LKEY, JSON.stringify(all));
}

export async function submitScore(
  game: string,
  score: number,
  higherIsBetter = true
): Promise<void> {
  const name = getName() || "Anonymous";
  if (ENDPOINT) {
    try {
      await fetch(`${ENDPOINT}/score`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ game, score, name, dir: higherIsBetter ? "high" : "low" }),
      });
      return;
    } catch {
      /* fall through to local */
    }
  }
  const all = localAll();
  const list = all[game] ?? [];
  list.push({ name, score, at: Date.now() });
  list.sort((a, b) => (higherIsBetter ? b.score - a.score : a.score - b.score));
  all[game] = list.slice(0, 50);
  localSave(all);
}

export async function topScores(
  game: string,
  higherIsBetter = true,
  limit = 10
): Promise<ScoreEntry[]> {
  if (ENDPOINT) {
    try {
      const r = await fetch(`${ENDPOINT}/leaderboard?game=${encodeURIComponent(game)}&limit=${limit}`);
      if (r.ok) return await r.json();
    } catch {
      /* fall through */
    }
  }
  const list = localAll()[game] ?? [];
  return [...list]
    .sort((a, b) => (higherIsBetter ? b.score - a.score : a.score - b.score))
    .slice(0, limit);
}
