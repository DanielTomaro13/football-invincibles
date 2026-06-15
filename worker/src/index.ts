/**
 * football-invincibles — global leaderboard Worker.
 *
 * A tiny KV-backed leaderboard API for the static site. Deploy with wrangler
 * (see worker/README.md), then set NEXT_PUBLIC_LEADERBOARD_URL to the Worker URL
 * so the site switches from local to global leaderboards.
 *
 *   GET  /leaderboard?game=<game>&limit=<n>   -> ScoreEntry[]
 *   POST /score  { game, name, score, dir }   -> { ok: true }
 */

export interface Env {
  LEADERBOARD: KVNamespace;
  ALLOWED_ORIGIN?: string; // e.g. https://footballinvincibles.com ("*" to allow all)
}

interface ScoreEntry {
  name: string;
  score: number;
  at: number;
}

const GAMES: Record<string, { dir: "high" | "low"; max: number }> = {
  invincibles: { dir: "high", max: 120 },
  undefeated: { dir: "high", max: 120 }, // the Invincibles Wall — unbeaten seasons (points)
  daily: { dir: "high", max: 120 }, // daily challenge (namespaced daily:<comp>:<date>)
  "higher-or-lower": { dir: "high", max: 5000 },
  "rating-duel": { dir: "high", max: 5000 },
  "beat-the-clock": { dir: "high", max: 30 },
  "score-predictor": { dir: "high", max: 50 },
};

const TOP_N = 50;

// A game key may be namespaced per competition, e.g. "invincibles:la-liga".
// Validate the base game against the allow-list; store under the full key.
function gameCfg(game: string) {
  return GAMES[String(game).split(":")[0]];
}

function cors(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
}

function json(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...cors(env) },
  });
}

function clean(name: unknown): string {
  return String(name ?? "Anonymous")
    .replace(/[^\p{L}\p{N} _.\-]/gu, "")
    .trim()
    .slice(0, 16) || "Anonymous";
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { headers: cors(env) });

    if (req.method === "GET" && url.pathname === "/leaderboard") {
      const game = url.searchParams.get("game") || "";
      if (!gameCfg(game)) return json({ error: "unknown game" }, env, 400);
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 10));
      const list = ((await env.LEADERBOARD.get(`lb:${game}`, "json")) as ScoreEntry[]) || [];
      return json(list.slice(0, limit), env);
    }

    if (req.method === "POST" && url.pathname === "/score") {
      let body: any;
      try {
        body = await req.json();
      } catch {
        return json({ error: "bad json" }, env, 400);
      }
      const cfg = gameCfg(body?.game);
      if (!cfg) return json({ error: "unknown game" }, env, 400);
      const score = Number(body.score);
      if (!Number.isFinite(score) || score < 0 || score > cfg.max)
        return json({ error: "invalid score" }, env, 400);

      const key = `lb:${body.game}`;
      const list = ((await env.LEADERBOARD.get(key, "json")) as ScoreEntry[]) || [];
      list.push({ name: clean(body.name), score: Math.round(score), at: Date.now() });
      list.sort((a, b) => (cfg.dir === "high" ? b.score - a.score : a.score - b.score));
      await env.LEADERBOARD.put(key, JSON.stringify(list.slice(0, TOP_N)));
      return json({ ok: true }, env);
    }

    return json({ error: "not found" }, env, 404);
  },
};
