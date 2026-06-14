#!/usr/bin/env node
/**
 * Post-processes src/data/pl-<season>.json to:
 *   1. compute a 0–100 player rating per position (percentile-ranked from real
 *      stats, calibrated so a median XI ≈ 80 "mid-table", a hand-picked XI ≈ 95
 *      "chasing invincible" — mirroring the AFL-23-0 rating calibration).
 *   2. derive the real league strength distribution (win-share per club).
 * and rewrites public/data/games.json (used by the games) with that info.
 *
 * Usage: node pipeline/add-ratings.mjs [season]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEASON = process.argv[2] || "2025";
const SRC = join(__dirname, "..", "src", "data", `pl-${SEASON}.json`);
const OUT = join(__dirname, "..", "public", "data", "games.json");

const d = JSON.parse(readFileSync(SRC, "utf8"));
const num = (p, ...keys) => {
  for (const k of keys) {
    const v = p.stats?.[k];
    if (v != null) return v;
  }
  return 0;
};

// ---- 1. composite per-position score from available stats ----
const POS = ["Goalkeeper", "Defender", "Midfielder", "Forward"];
function composite(p) {
  const g = num(p, "goals");
  const a = num(p, "goalAssists", "goal_assists");
  const apps = num(p, "appearances");
  const shots = num(p, "totalShots", "total_shots");
  const passes = num(p, "totalPasses", "total_passes");
  const cs = num(p, "cleanSheets", "clean_sheets");
  switch (p.position) {
    case "Forward":
      return g * 5 + a * 3 + shots * 0.25 + apps * 0.6;
    case "Midfielder":
      return a * 4.5 + g * 3.5 + passes * 0.012 + apps * 0.7;
    case "Defender":
      return cs * 2.5 + passes * 0.013 + apps * 1.1 + a * 2 + g * 2;
    case "Goalkeeper":
      return cs * 4 + apps * 1.4;
    default:
      return apps * 0.6;
  }
}

// percentile within each position
const byPos = new Map(POS.map((p) => [p, []]));
for (const p of d.players) {
  if (!p.position) continue;
  p._c = composite(p);
  if (byPos.has(p.position)) byPos.get(p.position).push(p);
}
for (const [, list] of byPos) {
  const sorted = [...list].map((p) => p._c).sort((a, b) => a - b);
  for (const p of list) {
    let lo = 0,
      hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < p._c) lo = mid + 1;
      else hi = mid;
    }
    const pct = sorted.length ? lo / sorted.length : 0.5;
    // calibration: median (0.5) -> 80, elite (~0.98) -> ~96, fringe -> ~64
    p._rating = Math.round((62 + pct * 35) * 10) / 10;
    p._pct = pct;
  }
}

// ---- 2. real league strength distribution (win share) ----
const strengths = (d.standings ?? [])
  .map((e) => {
    const o = e.overall;
    const played = o.played || 1;
    return {
      teamId: e.team.id,
      name: e.team.shortName,
      // win-share blends points rate with goal difference for a smoother curve
      strength: Math.max(
        0.12,
        Math.min(0.92, o.points / (played * 3) + (o.goalsFor - o.goalsAgainst) / (played * 30))
      ),
    };
  })
  .sort((a, b) => a.strength - b.strength);

// ---- 3. rewrite games.json with ratings + strengths ----
const players = d.players
  .filter((p) => p.position)
  .map((p) => ({
    id: p.id,
    name: p.name,
    team: p.team.shortName,
    teamId: p.team.id,
    pos: p.position,
    nat: p.country,
    natCode: p.countryCode,
    born: p.birth ? Number(p.birth.slice(0, 4)) : null,
    shirt: p.shirtNum,
    height: p.height,
    foot: p.preferredFoot,
    g: Math.round(num(p, "goals")),
    a: Math.round(num(p, "goalAssists", "goal_assists")),
    apps: Math.round(num(p, "appearances")),
    shots: Math.round(num(p, "totalShots", "total_shots")),
    passes: Math.round(num(p, "totalPasses", "total_passes")),
    cs: Math.round(num(p, "cleanSheets", "clean_sheets")),
    rating: p._rating,
    photo: p.photo,
    fame: Math.round(num(p, "goals") * 4 + num(p, "goalAssists", "goal_assists") * 3 + num(p, "appearances")),
  }))
  .sort((a, b) => b.fame - a.fame);

writeFileSync(
  OUT,
  JSON.stringify({
    season: "2025/26",
    competition: "Premier League",
    players,
    strengths,
  })
);

// tiny standalone strengths file for the simulator (fast to load)
writeFileSync(join(__dirname, "..", "public", "data", "strengths.json"), JSON.stringify({ strengths }));

// quick calibration report
const top = (pos) =>
  players.filter((p) => p.pos === pos).sort((a, b) => b.rating - a.rating);
const bestXI = [
  ...top("Goalkeeper").slice(0, 1),
  ...top("Defender").slice(0, 4),
  ...top("Midfielder").slice(0, 3),
  ...top("Forward").slice(0, 3),
];
const avg = (arr) => arr.reduce((s, p) => s + p.rating, 0) / arr.length;
console.log(`Players: ${players.length}  Strength clubs: ${strengths.length}`);
console.log(`Best XI avg rating: ${avg(bestXI).toFixed(1)}  (${bestXI.map((p) => p.name).join(", ")})`);
console.log(`Median rating: ${players.map((p) => p.rating).sort((a, b) => a - b)[Math.floor(players.length / 2)]}`);
console.log(`Strength range: ${strengths[0].strength.toFixed(3)} … ${strengths.at(-1).strength.toFixed(3)}`);
