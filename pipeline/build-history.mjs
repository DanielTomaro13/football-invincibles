#!/usr/bin/env node
/**
 * Historical data pipeline.
 *
 * Fetches every available Premier League season (2008/09 → current) and writes,
 * per season, each club's full roster with a rating derived from that player's
 * performance THAT season. Powers the Invincibles "spin a year + club, pick a
 * player" mode.
 *
 *   public/data/history-index.json   -> { seasons: [{ year, label, teams:[...] }] }
 *   public/data/seasons/<year>.json  -> { rosters: { <teamId>: [players] } }
 *
 * Re-runnable; rate-limit aware (SDP allows 300 req / 60s).
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "..", "public", "data");
const SEAS_DIR = join(PUB, "seasons");
const SDP = "https://sdp-prem-prod.premier-league-prod.pulselive.com";
const COMP = "8";
const EARLIEST = Number(process.argv[2] || 2008);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let calls = 0;

async function get(path, tries = 4) {
  for (let i = 0; i <= tries; i++) {
    const res = await fetch(SDP + path, { headers: { accept: "application/json" } });
    calls++;
    const remaining = Number(res.headers.get("x-ratelimit-remaining") ?? "99");
    if (res.status === 429 || remaining < 12) {
      const reset = Number(res.headers.get("x-ratelimit-reset") ?? "5");
      await sleep((reset + 1) * 1000);
    }
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    if (i === tries) throw new Error(`${res.status} ${path}`);
    await sleep(800 * (i + 1));
  }
}

const seasonLabel = (y) => `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
const num = (s, ...keys) => {
  for (const k of keys) if (s?.[k] != null) return s[k];
  return 0;
};

function composite(pos, s) {
  const g = num(s, "goals"),
    a = num(s, "goalAssists", "goal_assists"),
    apps = num(s, "appearances"),
    shots = num(s, "totalShots", "total_shots"),
    passes = num(s, "totalPasses", "total_passes"),
    cs = num(s, "cleanSheets", "clean_sheets");
  switch (pos) {
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

async function seasonStats(year) {
  // one fully-paged leaderboard (sorted by appearances) yields every player's
  // complete stat object for the season
  const byId = new Map();
  let next = null;
  for (let page = 0; page < 12; page++) {
    const q = `?_sort=appearances:desc&_limit=100${next ? `&_next=${next}` : ""}`;
    const lb = await get(`/api/v3/competitions/${COMP}/seasons/${year}/players/stats/leaderboard${q}`);
    for (const row of lb?.data ?? []) byId.set(String(row.playerMetadata?.id), row.stats);
    next = lb?.pagination?._next;
    if (!next) break;
    await sleep(80);
  }
  return byId;
}

async function buildSeason(year) {
  const teamsRes = await get(`/api/v1/competitions/${COMP}/seasons/${year}/teams?_limit=40`);
  const teams = (teamsRes?.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    short: t.shortName,
    abbr: t.abbr,
  }));
  if (!teams.length) return null;

  const stats = await seasonStats(year);
  const rosters = {};

  // gather every player so we can rank within position across the whole season
  const all = [];
  for (const team of teams) {
    const squad = await get(`/api/v2/competitions/${COMP}/seasons/${year}/teams/${team.id}/squad`);
    const players = (squad?.players ?? []).map((p) => {
      const st = stats.get(String(p.id)) ?? {};
      return {
        id: p.id,
        name: p.name?.display ?? `${p.name?.first ?? ""} ${p.name?.last ?? ""}`.trim(),
        pos: p.position ?? "Midfielder",
        nat: p.country?.country ?? null,
        born: p.dates?.birth ? Number(p.dates.birth.slice(0, 4)) : null,
        shirt: p.shirtNum ?? null,
        g: Math.round(num(st, "goals")),
        a: Math.round(num(st, "goalAssists", "goal_assists")),
        apps: Math.round(num(st, "appearances")),
        cs: Math.round(num(st, "cleanSheets", "clean_sheets")),
        _c: composite(p.position, st),
        teamId: team.id,
      };
    });
    rosters[team.id] = players;
    all.push(...players);
    await sleep(70);
  }

  // rate per position via percentile within the season (median ~80, elite ~96)
  const byPos = new Map();
  for (const p of all) {
    if (!byPos.has(p.pos)) byPos.set(p.pos, []);
    byPos.get(p.pos).push(p);
  }
  for (const [, list] of byPos) {
    const sorted = list.map((p) => p._c).sort((a, b) => a - b);
    for (const p of list) {
      let lo = 0,
        hi = sorted.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (sorted[m] < p._c) lo = m + 1;
        else hi = m;
      }
      const pct = sorted.length ? lo / sorted.length : 0.5;
      p.rating = Math.round((62 + pct * 35) * 10) / 10;
    }
  }
  // trim internal fields, sort each roster by rating
  for (const tid of Object.keys(rosters)) {
    rosters[tid] = rosters[tid]
      .map(({ _c, teamId, ...rest }) => rest)
      .sort((a, b) => b.rating - a.rating);
  }

  return { year, label: seasonLabel(year), teams, rosters };
}

async function main() {
  mkdirSync(SEAS_DIR, { recursive: true });
  // merge-safe: start from the existing index so a partial/failed run never
  // shrinks the committed dataset
  const byYear = new Map();
  try {
    const prev = JSON.parse(readFileSync(join(PUB, "history-index.json"), "utf8"));
    for (const s of prev.seasons ?? []) byYear.set(s.year, s);
  } catch {}
  const now = new Date().getFullYear();
  for (let year = now; year >= EARLIEST; year--) {
    try {
      const data = await buildSeason(year);
      if (!data) {
        console.log(`  ${seasonLabel(year)}: no data, skipping`);
        continue;
      }
      writeFileSync(join(SEAS_DIR, `${year}.json`), JSON.stringify({ rosters: data.rosters }));
      byYear.set(String(year), { year: String(year), label: data.label, teams: data.teams });
      const n = Object.values(data.rosters).reduce((a, r) => a + r.length, 0);
      console.log(`  ${data.label}: ${data.teams.length} clubs, ${n} players`);
    } catch (e) {
      console.log(`  ${seasonLabel(year)}: error ${e.message} (keeping existing)`);
    }
  }
  const seasons = [...byYear.values()].sort((a, b) => Number(b.year) - Number(a.year));
  writeFileSync(join(PUB, "history-index.json"), JSON.stringify({ seasons }));
  console.log(`\nWrote ${seasons.length} seasons. API calls: ${calls}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
