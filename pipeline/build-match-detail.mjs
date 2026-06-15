#!/usr/bin/env node
/**
 * Per-match detail for the current season of all three leagues, so results are
 * clickable through to a Match Centre. Writes the SAME normalised shape per
 * league → public/data/<prefix>matches/<safeId>.json:
 *
 *   { id, mw, date, ground,
 *     home:{ id,name,score,formation, xi:[{id,name,num,pos,cap}], bench:[…] },
 *     away:{…},
 *     events:[{min,type,team,player,assist}],     // goals/cards (when available)
 *     stats:[{label,home,away,pct}] }             // team stats (when available)
 *
 * Coverage per league (what each API actually exposes):
 *   - Premier League (SDP):       lineups + events + team stats   (full)
 *   - Serie A (Lega SDP):         lineups + team stats            (no event feed)
 *   - La Liga (webview API):      lineups + events                (no team stats)
 *
 * Usage: node pipeline/build-match-detail.mjs [pl|seriea|laliga|all] [--force]
 * Re-runnable; skips matches whose file already exists unless --force.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "..", "public", "data");
const WHICH = (process.argv[2] && !process.argv[2].startsWith("--")) ? process.argv[2] : "all";
const FORCE = process.argv.includes("--force");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const enc = encodeURIComponent;
const safeId = (id) => (String(id).includes("::") ? String(id).split("::").pop() : String(id));
let calls = 0;

async function getJson(url, headers = {}) {
  for (let i = 0; i < 4; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", accept: "application/json", ...headers }, signal: ctrl.signal });
      clearTimeout(t); calls++;
      if (res.status === 429) { await sleep(6000); continue; }
      if (res.ok) return res.json();
      if (res.status === 404) return null;
    } catch { /* retry */ }
    await sleep(800 * (i + 1));
  }
  return null;
}

function readFixtures(prefix) {
  const j = JSON.parse(readFileSync(join(PUB, prefix, "fixtures.json"), "utf8"));
  const arr = Array.isArray(j) ? j : j.matches || [];
  return arr.filter((m) => m.hs != null && m.as != null);
}
function writeMatch(prefix, fx, home, away, events, stats) {
  const dir = join(PUB, prefix, "matches");
  mkdirSync(dir, { recursive: true });
  const out = {
    id: fx.id, mw: fx.mw, date: fx.date, ground: fx.ground,
    home: { id: String(fx.homeId), name: fx.home, score: fx.hs, ...home },
    away: { id: String(fx.awayId), name: fx.away, score: fx.as, ...away },
    events, stats,
  };
  writeFileSync(join(dir, `${safeId(fx.id)}.json`), JSON.stringify(out));
}

// ─────────────────────────── Premier League ───────────────────────────
const SDP = "https://sdp-prem-prod.premier-league-prod.pulselive.com";
const PL_STATS = [
  ["possessionPercentage", "Possession %", true], ["totalScoringAtt", "Shots", false],
  ["ontargetScoringAtt", "Shots on target", false], ["bigChanceCreated", "Big chances", false],
  ["wonCorners", "Corners", false], ["totalOffside", "Offsides", false],
  ["fkFoulLost", "Fouls", false], ["totalYelCard", "Yellow cards", false],
  ["totalRedCard", "Red cards", false], ["saves", "Saves", false],
];
function plSide(lu) {
  const byId = new Map((lu.players || []).map((p) => [String(p.id), p]));
  const mk = (id) => { const p = byId.get(String(id)) || {}; return { id: String(id), name: p.knownName || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim(), num: p.shirtNum ?? null, pos: p.position ?? null, cap: !!p.isCaptain }; };
  return { side: { formation: lu.formation?.formation || null, xi: (lu.formation?.lineup || []).flat().map(mk), bench: (lu.formation?.subs || []).map(mk) }, byId };
}
async function buildPL() {
  const fixtures = readFixtures("");
  let wrote = 0, skip = 0;
  for (const fx of fixtures) {
    if (!FORCE && existsSync(join(PUB, "matches", `${fx.id}.json`))) { skip++; continue; }
    const [lu, ev, st] = await Promise.all([
      getJson(`${SDP}/api/v3/matches/${fx.id}/lineups`),
      getJson(`${SDP}/api/v1/matches/${fx.id}/events`),
      getJson(`${SDP}/api/v3/matches/${fx.id}/stats`),
    ]);
    if (!lu?.home_team) continue;
    const H = plSide(lu.home_team), A = plSide(lu.away_team);
    const events = [];
    if (ev) {
      const nm = (map, id) => { const p = map.get(String(id)); return p ? (p.knownName || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()) : ""; };
      for (const [side, team, map] of [["home", ev.homeTeam, H.byId], ["away", ev.awayTeam, A.byId]]) {
        for (const g of team?.goals || []) events.push({ min: Number(g.time) || 0, type: g.goalType === "Own Goal" ? "og" : g.goalType === "Penalty" ? "pen" : "goal", team: side, player: nm(map, g.playerId), assist: g.assistPlayerId ? nm(map, g.assistPlayerId) : "" });
        for (const c of team?.cards || []) events.push({ min: Number(c.time) || 0, type: c.type === "Red" ? "red" : "yellow", team: side, player: nm(map, c.playerId) });
      }
      events.sort((a, b) => a.min - b.min);
    }
    let stats = [];
    if (Array.isArray(st) && st.length === 2) {
      const hs = st.find((x) => x.side === "Home")?.stats || {}, as = st.find((x) => x.side === "Away")?.stats || {};
      stats = PL_STATS.map(([k, label, pct]) => ({ label, home: Math.round((hs[k] ?? 0) * 10) / 10, away: Math.round((as[k] ?? 0) * 10) / 10, pct }));
      if (hs.totalPass) stats.splice(7, 0, { label: "Pass accuracy %", home: Math.round((hs.accuratePass / hs.totalPass) * 100), away: Math.round((as.accuratePass / as.totalPass) * 100), pct: true });
    }
    writeMatch("", fx, H.side, A.side, events, stats);
    wrote++; if (wrote % 40 === 0) console.log(`  PL …${wrote}`);
    await sleep(60);
  }
  console.log(`PL: wrote ${wrote}, skipped ${skip}`);
}

// ─────────────────────────── Serie A ───────────────────────────
const SA = "https://api-sdp.legaseriea.it/v1/serie-a/football";
const SA_SEASON = "serie-a::Football_Season::5f0e080fc3a44073984b75b3a8e06a8a";
const SA_STATS = [
  ["possession-perc", "Possession %", true], ["shots", "Shots", false], ["corners", "Corners", false],
  ["fouls", "Fouls", false], ["offsides", "Offsides", false], ["total-passes", "Passes", false],
  ["saves", "Saves", false], ["yellow-cards", "Yellow cards", false], ["red-cards", "Red cards", false],
];
function saSide(team) {
  const mk = (p) => ({ id: p.playerId, name: p.shirtName || p.shortName || `${p.mediaFirstName ?? ""} ${p.mediaLastName ?? ""}`.trim(), num: p.bibNumber ?? null, pos: p.roleLabel ?? null, cap: !!(p.isCaptain || p.captain) });
  return { formation: team.tacticalFormation || null, xi: (team.fielded || []).map(mk), bench: (team.benched || []).map(mk) };
}
async function buildSerieA() {
  const fixtures = readFixtures("seriea/");
  const e = enc(SA_SEASON);
  let wrote = 0, skip = 0;
  for (const fx of fixtures) {
    if (!FORCE && existsSync(join(PUB, "seriea", "matches", `${safeId(fx.id)}.json`))) { skip++; continue; }
    const m = enc(fx.id);
    const [lu, ts] = await Promise.all([
      getJson(`${SA}/seasons/${e}/matches/${m}/lineups?locale=en-GB`),
      getJson(`${SA}/seasons/${e}/match/${m}/teamstats?locale=en-GB`),
    ]);
    if (!lu?.home) continue;
    let stats = [];
    if (ts?.stats) {
      const by = new Map(ts.stats.map((s) => [s.statsId, s]));
      stats = SA_STATS.map(([k, label, pct]) => { const s = by.get(k); return s ? { label, home: s.statsValueHome ?? 0, away: s.statsValueAway ?? 0, pct } : null; })
        .filter(Boolean)
        // drop possession when it's the API's unpopulated 50/50 default
        .filter((s) => !(s.label.startsWith("Possession") && s.home === 50 && s.away === 50));
    }
    writeMatch("seriea/", fx, saSide(lu.home), saSide(lu.away), [], stats);
    wrote++; if (wrote % 40 === 0) console.log(`  Serie A …${wrote}`);
    await sleep(70);
  }
  console.log(`Serie A: wrote ${wrote}, skipped ${skip}`);
}

// ─────────────────────────── La Liga ───────────────────────────
const LLWV = "https://apim.laliga.com/webview/api/web";
const LLKEY = "ee7fcd5c543f4485ba2a48856fc7ece9";
const llGet = (path) => getJson(`${LLWV}${path}?subscription-key=${LLKEY}&contentLanguage=en`);
function llSide(list) {
  // position 0 = coach; 1-11 = starting XI; >11 = bench
  const mk = (p) => ({ id: String(p.id), name: p.person?.nickname || p.person?.name || `${p.person?.firstname ?? ""} ${p.person?.lastname ?? ""}`.trim(), num: p.shirt_number ?? null, pos: null, cap: !!p.captain });
  const players = (list || []).filter((p) => p.position > 0).sort((a, b) => a.position - b.position);
  return { formation: null, xi: players.filter((p) => p.position <= 11).map(mk), bench: players.filter((p) => p.position > 11).map(mk) };
}
async function buildLaLiga() {
  const fixtures = readFixtures("laliga/");
  let wrote = 0, skip = 0;
  for (const fx of fixtures) {
    if (!FORCE && existsSync(join(PUB, "laliga", "matches", `${fx.id}.json`))) { skip++; continue; }
    const [lu, ev] = await Promise.all([llGet(`/matches/${fx.id}/lineups`), llGet(`/matches/${fx.id}/events`)]);
    if (!lu?.home_team_lineups) continue;
    const events = [];
    for (const e of ev?.match_events || []) {
      const kind = e.match_event_kind || {};
      const coll = kind.collection, name = (kind.name || "").toLowerCase();
      let type = null;
      if (coll === "goal") type = name.includes("penalty") ? "pen" : name.includes("own") ? "og" : "goal";
      else if (name.includes("yellow")) type = "yellow";
      else if (name.includes("red")) type = "red";
      if (!type) continue;
      events.push({ min: e.minute ?? e.time ?? 0, type, team: String(e.lineup?.team?.id) === String(fx.homeId) ? "home" : "away", player: e.lineup?.person?.nickname || e.lineup?.person?.name || "" });
    }
    events.sort((a, b) => a.min - b.min);
    writeMatch("laliga/", fx, llSide(lu.home_team_lineups), llSide(lu.away_team_lineups), events, []);
    wrote++; if (wrote % 40 === 0) console.log(`  La Liga …${wrote}`);
    await sleep(70);
  }
  console.log(`La Liga: wrote ${wrote}, skipped ${skip}`);
}

const run = { pl: buildPL, seriea: buildSerieA, laliga: buildLaLiga };
if (WHICH === "all") { for (const f of [buildPL, buildSerieA, buildLaLiga]) await f(); }
else if (run[WHICH]) await run[WHICH]();
else { console.error(`unknown league: ${WHICH}`); process.exit(1); }
console.log(`\nDone. API calls: ${calls}`);
