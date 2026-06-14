#!/usr/bin/env node
/**
 * La Liga data pipeline (apim.laliga.com — Azure APIM, public subscription key).
 *
 * For every available LaLiga EA SPORTS / Santander season it writes the same
 * shape the PL pipeline produces, so the game and pages stay competition-
 * agnostic:
 *   public/data/laliga/history-index.json   -> { seasons:[{year,label,teams}] }
 *   public/data/laliga/seasons/<year>.json  -> { rosters:{ <teamId>:[players] } }
 *   public/data/laliga/strengths.json       -> { strengths:[{teamId,name,strength}] }
 *   public/data/laliga/standings.json       -> current-season table (tables page)
 *
 * Endpoints (header: Ocp-Apim-Subscription-Key):
 *   /api/v1/subscriptions/{slug}/standing
 *   /api/v1/subscriptions/{slug}/players/stats?limit=100&offset=N   (paginated)
 *   /api/v1/teams/{teamSlug}/squad?subscription={slug}              (roster+photos+person)
 */
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "data", "laliga");
const SEAS_DIR = join(OUT, "seasons");
const B = "https://apim.laliga.com/public-service";
const KEY = "c13c3a8e2f6b46da9c5c425cf61fab3e";

// LaLiga top tier season subscriptions (slug changes with sponsor)
const SEASONS = [
  { year: "2025", slug: "laliga-easports-2025" },
  { year: "2024", slug: "laliga-easports-2024" },
  { year: "2023", slug: "laliga-easports-2023" },
  { year: "2022", slug: "laliga-santander-2022" },
  { year: "2021", slug: "laliga-santander-2021" },
];

const POS = { 1: "Goalkeeper", 2: "Defender", 3: "Midfielder", 4: "Forward" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let calls = 0;

async function get(path, tries = 4) {
  for (let i = 0; i <= tries; i++) {
    const res = await fetch(B + path, { headers: { "Ocp-Apim-Subscription-Key": KEY, accept: "application/json" } });
    calls++;
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    if (i === tries) throw new Error(`${res.status} ${path}`);
    await sleep(700 * (i + 1));
  }
}

const seasonLabel = (y) => `${y}/${String((Number(y) + 1) % 100).padStart(2, "0")}`;
const num = (m, ...keys) => {
  for (const k of keys) if (m[k] != null) return m[k];
  return 0;
};

function composite(pos, s) {
  const g = num(s, "goals"), a = num(s, "goal_assists"), apps = num(s, "appearances"),
    sot = num(s, "shots_on_target_inc_goals"), pas = num(s, "total_passes"), cs = num(s, "clean_sheets"),
    tk = num(s, "tackles_won"), intc = num(s, "interceptions"), clr = num(s, "total_clearances"),
    saves = num(s, "saves");
  switch (pos) {
    case "Forward": return g * 5 + a * 3 + sot * 0.25 + apps * 0.6;
    case "Midfielder": return a * 4.5 + g * 3.5 + pas * 0.012 + tk * 0.3 + intc * 0.3 + apps * 0.6;
    case "Defender": return cs * 8 + tk * 0.22 + intc * 0.22 + clr * 0.07 + (g + a) * 2 + apps * 0.4;
    case "Goalkeeper": return cs * 8 + saves * 0.15 + apps * 0.4;
    default: return apps * 0.6;
  }
}

async function allPlayerStats(slug) {
  const byId = new Map();
  for (let offset = 0; offset < 1200; offset += 100) {
    const d = await get(`/api/v1/subscriptions/${slug}/players/stats?limit=100&offset=${offset}`);
    const list = d?.player_stats ?? [];
    // join key is opta_id — the squad and stats endpoints use different numeric ids
    for (const p of list) if (p.opta_id) byId.set(p.opta_id, Object.fromEntries((p.stats ?? []).map((s) => [s.name, s.stat])));
    if (list.length < 100) break;
    await sleep(80);
  }
  return byId;
}

async function buildSeason({ year, slug }) {
  const st = await get(`/api/v1/subscriptions/${slug}/standing`);
  const entries = st?.standings ?? [];
  if (!entries.length) return null;
  const teams = entries.map((e) => ({
    id: String(e.team.id),
    name: e.team.nickname || e.team.name,
    short: e.team.shortname || e.team.nickname,
    abbr: e.team.shortname || "",
    badge: ((e.team.shield || {}).resizes || {}).medium || (e.team.shield || {}).url || null,
    slug: e.team.slug,
    opta: e.team.opta_id,
  }));

  const stats = await allPlayerStats(slug);
  const rosters = {};
  const all = [];

  for (const team of teams) {
    const sq = await get(`/api/v1/teams/${team.slug}/squad?subscription=${slug}`);
    const players = [];
    for (const e of sq?.squads ?? []) {
      const posName = POS[(e.position || {}).id];
      if (!posName) continue; // skip coaches/unknown
      const person = e.person || {};
      const s = stats.get(e.opta_id) ?? {};
      const photos = (e.photos || {})["001"] || {};
      players.push({
        id: e.opta_id || String(e.id),
        name: person.name || person.nickname || `${person.firstname ?? ""} ${person.lastname ?? ""}`.trim(),
        pos: posName,
        nat: (person.country || {}).id || null,
        born: person.date_of_birth ? Number(String(person.date_of_birth).slice(0, 4)) : null,
        shirt: e.shirt_number ?? null,
        photo: photos["256x278"] || photos["128x139"] || null,
        g: Math.round(num(s, "goals")),
        a: Math.round(num(s, "goal_assists")),
        apps: Math.round(num(s, "appearances")),
        mins: Math.round(num(s, "time_played")),
        cs: Math.round(num(s, "clean_sheets")),
        sot: Math.round(num(s, "shots_on_target_inc_goals")),
        kp: Math.round(num(s, "key_passes_attempt_assists")),
        pas: Math.round(num(s, "total_passes")),
        tk: Math.round(num(s, "tackles_won")),
        tkl: Math.round(num(s, "total_tackles")),
        intc: Math.round(num(s, "interceptions")),
        clr: Math.round(num(s, "total_clearances")),
        sv: Math.round(num(s, "saves")),
        gc: Math.round(num(s, "goals_conceded")),
        yc: Math.round(num(s, "yellow_cards")),
        _c: composite(posName, s),
      });
    }
    // de-dupe within team by id
    const seen = new Set();
    rosters[team.id] = players.filter((p) => !seen.has(p.id) && seen.add(p.id));
    all.push(...rosters[team.id]);
    await sleep(60);
  }

  // rate per position (same engine as PL)
  const byPos = new Map();
  for (const p of all) (byPos.get(p.pos) ?? byPos.set(p.pos, []).get(p.pos)).push(p);
  for (const [, list] of byPos) {
    const sorted = list.map((p) => p._c).sort((a, b) => a - b);
    for (const p of list) {
      let lo = 0, hi = sorted.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < p._c) lo = m + 1; else hi = m; }
      const pct = sorted.length ? lo / sorted.length : 0.5;
      const raw = 45 + Math.pow(pct, 1.5) * 53;
      const reliability = Math.min(1, (p.apps || 0) / 20);
      const rating = 50 + (raw - 50) * (0.35 + 0.65 * reliability);
      p.rating = Math.round(Math.max(42, Math.min(99, rating)) * 10) / 10;
    }
  }
  for (const tid of Object.keys(rosters)) {
    rosters[tid] = rosters[tid].map(({ _c, ...r }) => r).sort((a, b) => b.rating - a.rating);
  }

  const standings = entries.map((e) => ({
    team: { id: String(e.team.id), name: e.team.nickname || e.team.name, shortName: e.team.nickname || e.team.name, abbr: e.team.shortname || "", badge: ((e.team.shield || {}).resizes || {}).medium || (e.team.shield || {}).url || null },
    overall: { position: e.position, played: e.played, won: e.won, drawn: e.drawn, lost: e.lost, goalsFor: e.goals_for, goalsAgainst: e.goals_against, points: e.points, startingPosition: e.previous_position || e.position },
  }));
  return { year, label: seasonLabel(year), teams: teams.map(({ slug, opta, ...t }) => t), rosters, standings };
}

async function main() {
  mkdirSync(SEAS_DIR, { recursive: true });
  const index = { seasons: [] };
  let currentStandings = null, currentStrengths = null;
  for (const s of SEASONS) {
    try {
      const data = await buildSeason(s);
      if (!data) { console.log(`  ${seasonLabel(s.year)}: no data`); continue; }
      writeFileSync(join(SEAS_DIR, `${s.year}.json`), JSON.stringify({ rosters: data.rosters }));
      index.seasons.push({ year: s.year, label: data.label, teams: data.teams });
      const n = Object.values(data.rosters).reduce((a, r) => a + r.length, 0);
      console.log(`  ${data.label}: ${data.teams.length} clubs, ${n} players`);
      if (s.year === SEASONS[0].year) {
        currentStandings = data.standings;
        currentStrengths = data.standings.map((e) => ({
          teamId: e.team.id, name: e.team.shortName,
          strength: Math.max(0.12, Math.min(0.92, e.overall.points / (e.overall.played * 3) + (e.overall.goalsFor - e.overall.goalsAgainst) / (e.overall.played * 30))),
        })).sort((a, b) => a.strength - b.strength);
      }
    } catch (e) {
      console.log(`  ${seasonLabel(s.year)}: error ${e.message}`);
    }
  }
  writeFileSync(join(OUT, "history-index.json"), JSON.stringify(index));
  if (currentStandings) writeFileSync(join(OUT, "standings.json"), JSON.stringify({ standings: currentStandings }));
  if (currentStrengths) writeFileSync(join(OUT, "strengths.json"), JSON.stringify({ strengths: currentStrengths }));
  console.log(`\nWrote ${index.seasons.length} La Liga seasons. API calls: ${calls}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
