#!/usr/bin/env node
/**
 * Per-match detail for the current Premier League season — lineups, the
 * goals/cards/subs timeline and headline team stats — so results are clickable.
 *
 *   public/data/matches/<matchId>.json
 *
 * Reads the match ids from public/data/fixtures.json (the same feed the Fixtures
 * page uses) and, per match, pulls the SDP lineups + events + stats endpoints.
 * Re-runnable; skips matches whose file already exists unless --force is passed.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "..", "public", "data");
const OUT = join(PUB, "matches");
const SDP = "https://sdp-prem-prod.premier-league-prod.pulselive.com";
const FORCE = process.argv.includes("--force");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let calls = 0;
async function get(path) {
  for (let i = 0; i < 4; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(SDP + path, { headers: { "User-Agent": "Mozilla/5.0", accept: "application/json" }, signal: ctrl.signal });
      clearTimeout(t); calls++;
      if (res.status === 429) { await sleep(6000); continue; }
      if (res.ok) return res.json();
      if (res.status === 404) return null;
    } catch { /* retry */ }
    await sleep(800 * (i + 1));
  }
  return null;
}

const STATS = [
  { key: "possessionPercentage", label: "Possession %", pct: true },
  { key: "totalScoringAtt", label: "Shots" },
  { key: "ontargetScoringAtt", label: "Shots on target" },
  { key: "bigChanceCreated", label: "Big chances" },
  { key: "wonCorners", label: "Corners" },
  { key: "totalOffside", label: "Offsides" },
  { key: "fkFoulLost", label: "Fouls" },
  { key: "totalYelCard", label: "Yellow cards" },
  { key: "totalRedCard", label: "Red cards" },
  { key: "saves", label: "Saves" },
];

function buildSide(lu, players) {
  const byId = new Map((players || []).map((p) => [String(p.id), p]));
  const mk = (id) => {
    const p = byId.get(String(id)) || {};
    return { id: String(id), name: p.knownName || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim(), num: p.shirtNum ?? null, pos: p.position ?? null, cap: !!p.isCaptain };
  };
  const xi = (lu.formation?.lineup || []).flat().map(mk);
  const bench = (lu.formation?.subs || []).map(mk);
  return { formation: lu.formation?.formation || null, xi, bench, _byId: byId };
}

function buildEvents(events, homeMap, awayMap) {
  const out = [];
  const name = (map, id) => { const p = map.get(String(id)); return p ? (p.knownName || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()) : ""; };
  for (const [side, team, map] of [["home", events.homeTeam, homeMap], ["away", events.awayTeam, awayMap]]) {
    for (const g of team?.goals || []) out.push({ min: Number(g.time) || 0, type: g.goalType === "Own Goal" ? "og" : g.goalType === "Penalty" ? "pen" : "goal", team: side, player: name(map, g.playerId), assist: g.assistPlayerId ? name(map, g.assistPlayerId) : "" });
    for (const c of team?.cards || []) out.push({ min: Number(c.time) || 0, type: c.type === "Red" ? "red" : "yellow", team: side, player: name(map, c.playerId) });
  }
  return out.sort((a, b) => a.min - b.min);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const fixtures = JSON.parse(readFileSync(join(PUB, "fixtures.json"), "utf8")).matches || [];
  const played = fixtures.filter((m) => m.hs != null);
  let wrote = 0, skipped = 0;
  for (const fx of played) {
    const file = join(OUT, `${fx.id}.json`);
    if (!FORCE && existsSync(file)) { skipped++; continue; }
    const [lu, ev, st] = await Promise.all([
      get(`/api/v3/matches/${fx.id}/lineups`),
      get(`/api/v1/matches/${fx.id}/events`),
      get(`/api/v3/matches/${fx.id}/stats`),
    ]);
    if (!lu?.home_team) { console.log(`  ${fx.id}: no lineups`); continue; }
    const home = buildSide(lu.home_team, lu.home_team.players);
    const away = buildSide(lu.away_team, lu.away_team.players);
    const events = ev ? buildEvents(ev, home._byId, away._byId) : [];
    let stats = [];
    if (Array.isArray(st) && st.length === 2) {
      const H = st.find((x) => x.side === "Home")?.stats || {};
      const A = st.find((x) => x.side === "Away")?.stats || {};
      const acc = (s) => (s.totalPass ? Math.round((s.accuratePass / s.totalPass) * 100) : null);
      stats = STATS.map((d) => ({ label: d.label, home: Math.round((H[d.key] ?? 0) * 10) / 10, away: Math.round((A[d.key] ?? 0) * 10) / 10, pct: !!d.pct }));
      const ah = acc(H), aa = acc(A);
      if (ah != null) stats.splice(7, 0, { label: "Pass accuracy %", home: ah, away: aa, pct: true });
    }
    const out = {
      id: fx.id, mw: fx.mw, date: fx.date, ground: fx.ground,
      home: { id: fx.homeId, name: fx.home, score: fx.hs, formation: home.formation, xi: home.xi, bench: home.bench },
      away: { id: fx.awayId, name: fx.away, score: fx.as, formation: away.formation, xi: away.xi, bench: away.bench },
      events, stats,
    };
    writeFileSync(file, JSON.stringify(out));
    wrote++;
    if (wrote % 40 === 0) console.log(`  …${wrote} matches`);
    await sleep(60);
  }
  console.log(`PL match detail: wrote ${wrote}, skipped ${skipped} existing. API calls: ${calls}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
