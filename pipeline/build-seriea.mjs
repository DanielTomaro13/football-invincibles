#!/usr/bin/env node
/**
 * Serie A data pipeline (api-sdp.legaseriea.it — Lega Serie A Sports Data Platform).
 *
 * Produces the same shape as the PL/La Liga pipelines so the game and pages stay
 * competition-agnostic:
 *   public/data/seriea/history-index.json  -> { seasons:[{year,label,teams}] }
 *   public/data/seriea/seasons/<year>.json -> { rosters:{ <teamId>:[players] } }
 *   public/data/seriea/strengths.json      -> [{teamId,name,strength}]
 *   public/data/seriea/standings.json      -> current-season table (tables page)
 *
 * Endpoints (no auth; public JSON):
 *   /v1/serie-a/football/competitions/<compId>/seasons?locale=en-GB
 *   /v1/serie-a/football/seasons/<seasonId>/standings/overall?locale=en-GB
 *   /v1/serie-a/football/seasons/<seasonId>/stats/players?category=General&page=N&locale=en-GB
 *
 * Player stats come back as a flat list of {statsId, statsValue}; each player row
 * also carries its team + role (1 GK, 2 DEF, 3 MID, 4 FWD) + identity + imagery,
 * so one paginated call yields the full rateable squad.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { applyRatings } from "./rating.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "data", "seriea");
const SEAS_DIR = join(OUT, "seasons");
const STAND_DIR = join(OUT, "standings");
const B = "https://api-sdp.legaseriea.it/v1/serie-a/football";
const MEDIA = "https://media-sdp.legaseriea.it";
const COMP = "serie-a::Football_Competition::ec93b94f74294dc98ab5bcfd67fc0d88";

// Build full rateable rosters as far back as the API goes (1986/87). Clean
// sheets are derived from match results (available every season), so
// defenders/keepers get a real signal even in older seasons where Opta's
// per-player defensive stats are thin (assists are absent pre-2010, so older
// midfielders lean on goals + games + clean-sheet share).
const FROM_YEAR = 1986;

const POS = { 1: "Goalkeeper", 2: "Defender", 3: "Midfielder", 4: "Forward" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let calls = 0;

async function get(path, tries = 4) {
  for (let i = 0; i <= tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(B + path, { headers: { "User-Agent": "Mozilla/5.0", accept: "application/json" }, signal: ctrl.signal });
      clearTimeout(t);
      calls++;
      if (res.ok) return res.json();
      if (res.status === 404) return null;
      if (i === tries) throw new Error(`${res.status} ${path}`);
    } catch (e) {
      if (i === tries) throw e;
    }
    await sleep(800 * (i + 1));
  }
}

const enc = (s) => encodeURIComponent(s);
const seasonLabel = (y) => `${y}/${String((Number(y) + 1) % 100).padStart(2, "0")}`;
const sm = (stats) => { const m = {}; for (const s of stats || []) m[s.statsId] = s.statsValue; return m; };
const num = (m, ...keys) => { for (const k of keys) { const v = m[k]; if (v != null && v !== "") return Number(v) || 0; } return 0; };
const mediaUrl = (rel) => (rel ? `${MEDIA}/${rel}` : null);

// Identical engine to the PL / La Liga pipelines now that clean sheets exist
// Pull every match in a season and derive per-team clean sheets + games played
// (a clean sheet = the opponent scored 0 in a finished match).
async function fetchMatches(seasonId) {
  const d = await get(`/seasons/${enc(seasonId)}/matches?locale=en-GB`);
  return d?.matches ?? [];
}
const matchWeek = (m) => {
  const pid = m.matchSet?.providerId || "";
  const n = Number(pid.split(":").pop());
  return Number.isFinite(n) && n > 0 ? n : null;
};
function teamDefence(matches) {
  const cs = {}, gp = {};
  for (const m of matches) {
    if (m.status !== "FINISHED") continue;
    const hs = m.providerHomeScore, as = m.providerAwayScore;
    if (hs == null || as == null) continue;
    const h = m.home?.teamId, a = m.away?.teamId;
    if (!h || !a) continue;
    gp[h] = (gp[h] || 0) + 1; gp[a] = (gp[a] || 0) + 1;
    if (as === 0) cs[h] = (cs[h] || 0) + 1;
    if (hs === 0) cs[a] = (cs[a] || 0) + 1;
  }
  return { cs, gp };
}

const playerName = (p) =>
  p.displayName ||
  `${p.mediaFirstName ?? ""} ${p.mediaLastName ?? ""}`.trim() ||
  p.shortName || p.shirtName || "Unknown";

async function allPlayers(seasonId) {
  const out = [];
  const e = enc(seasonId);
  for (let page = 1; page <= 40; page++) {
    const d = await get(`/seasons/${e}/stats/players?category=General&page=${page}&locale=en-GB`);
    const list = d?.players ?? [];
    out.push(...list);
    if (!d?.pagination || d.pagination.isLastPage || page >= (d.pagination.totalPages || 1)) break;
    await sleep(80);
  }
  return out;
}

async function buildSeason(year, seasonId) {
  const stRes = await get(`/seasons/${enc(seasonId)}/standings/overall?locale=en-GB`);
  const rows = stRes?.standings?.[0]?.teams ?? [];
  if (!rows.length) return null;

  const teamMeta = new Map(); // teamId -> {id,name,short,abbr,badge}
  const standings = rows.map((r) => {
    const m = sm(r.stats);
    const badge = mediaUrl(r.imagery?.teamLogo);
    const meta = { id: r.teamId, name: r.mediaName || r.officialName || r.shortName, short: r.shortName || r.mediaShortName || r.officialName, abbr: r.acronymName || "", badge };
    teamMeta.set(r.teamId, meta);
    return {
      team: { id: r.teamId, name: meta.name, shortName: meta.short, abbr: meta.abbr, badge },
      overall: {
        position: num(m, "rank"), played: num(m, "matches-played"), won: num(m, "win"),
        drawn: num(m, "draw"), lost: num(m, "lose"), goalsFor: num(m, "goals-for"),
        goalsAgainst: num(m, "goals-against"), points: num(m, "points"),
        startingPosition: num(m, "rank"),
      },
    };
  }).sort((a, b) => a.overall.position - b.overall.position);

  const matches = await fetchMatches(seasonId);
  const { cs: teamCS, gp: teamGP } = teamDefence(matches);

  const players = await allPlayers(seasonId);
  const rosters = {};
  const all = [];
  const seenByTeam = {};

  for (const p of players) {
    const pos = POS[p.role];
    const tid = p.team?.teamId;
    if (!pos || !tid || !teamMeta.has(tid)) continue;
    const m = sm(p.stats);
    const id = p.playerId || p.providerId;
    (seenByTeam[tid] ??= new Set());
    if (seenByTeam[tid].has(id)) continue;
    seenByTeam[tid].add(id);
    const apps = Math.round(num(m, "games-played", "Games Played"));
    // distribute the team's clean sheets across its players by share of games played
    const tGP = teamGP[tid] || 38;
    const cs = Math.round((teamCS[tid] || 0) * Math.min(1, apps / Math.max(1, tGP)));
    const photo = mediaUrl(p.imagery?.playerImage_home || p.imagery?.playerImage_home_celeb);
    const row = {
      id,
      name: playerName(p),
      pos,
      nat: p.nationalityIsoCode || p.nationality || null,
      born: null,
      shirt: p.bibNumber ?? null,
      photo,
      g: Math.round(num(m, "goals", "Goals")),
      a: Math.round(num(m, "assists", "Goal Assists")),
      apps,
      mins: Math.round(num(m, "minutes-played", "Time Played")),
      cs,
      sot: Math.round(num(m, "on-target-scoring-attempts", "Shots On Target ( inc goals )")),
      kp: Math.round(num(m, "Key Passes (Attempt Assists)", "total-attacking-assist")),
      pas: Math.round(num(m, "Total Passes")),
      tk: Math.round(num(m, "tackles-won", "Tackles Won")),
      tkl: Math.round(num(m, "Total Tackles")),
      intc: Math.round(num(m, "Interceptions")),
      clr: Math.round(num(m, "Total Clearances", "total-cleareance")),
      sv: Math.round(num(m, "saves")),
      gc: Math.round(num(m, "goals-conceded")),
      yc: Math.round(num(m, "yellow-cards", "Yellow Cards")),
    };
    (rosters[tid] ??= []).push(row);
    all.push(row);
  }

  // rate per position from ESPN-style fantasy points (see pipeline/rating.mjs)
  applyRatings(all);
  for (const tid of Object.keys(rosters)) {
    rosters[tid] = rosters[tid].map(({ _c, ...r }) => r).sort((a, b) => b.rating - a.rating);
  }

  const teams = standings.map((s) => teamMeta.get(s.team.id));

  // fixtures/results in the same raw shape the PL feed uses (public/data/fixtures.json)
  const fixtures = matches
    .filter((m) => m.home?.teamId && m.away?.teamId)
    .map((m) => ({
      id: m.matchId,
      mw: matchWeek(m) ?? 0,
      home: m.home.mediaName || m.home.shortName,
      homeId: m.home.teamId,
      hs: m.status === "FINISHED" ? m.providerHomeScore : null,
      away: m.away.mediaName || m.away.shortName,
      awayId: m.away.teamId,
      as: m.status === "FINISHED" ? m.providerAwayScore : null,
      ground: [m.stadiumName, m.cityName].filter(Boolean).join(", "),
      date: m.matchDateUtc || null,
    }))
    .sort((a, b) => a.mw - b.mw);

  return { year, label: seasonLabel(year), teams, rosters, standings, fixtures };
}

async function main() {
  mkdirSync(SEAS_DIR, { recursive: true });
  mkdirSync(STAND_DIR, { recursive: true });
  const seasonsList = await get(`/competitions/${enc(COMP)}/seasons?locale=en-GB`);
  const allSeasons = (seasonsList?.seasons ?? [])
    .map((s) => ({ id: s.seasonId, year: String((s.seasonName || "").slice(0, 4)) }))
    .filter((s) => /^\d{4}$/.test(s.year) && Number(s.year) >= FROM_YEAR && Number(s.year) <= 2025)
    .sort((a, b) => Number(b.year) - Number(a.year)); // newest first
  console.log(`Serie A: building ${allSeasons.length} seasons (${allSeasons.at(-1)?.year}–${allSeasons[0]?.year})`);

  const index = { seasons: [] };
  let currentStandings = null, currentStrengths = null;
  for (const s of allSeasons) {
    try {
      const data = await buildSeason(s.year, s.id);
      if (!data) { console.log(`  ${seasonLabel(s.year)}: no data`); continue; }
      writeFileSync(join(SEAS_DIR, `${s.year}.json`), JSON.stringify({ rosters: data.rosters }));
      writeFileSync(join(STAND_DIR, `${s.year}.json`), JSON.stringify({ standings: data.standings }));
      index.seasons.push({ year: s.year, label: data.label, teams: data.teams });
      const n = Object.values(data.rosters).reduce((a, r) => a + r.length, 0);
      console.log(`  ${data.label}: ${data.teams.length} clubs, ${n} players`);
      if (!currentStandings) {
        currentStandings = data.standings;
        currentStrengths = data.standings.map((e) => ({
          teamId: e.team.id, name: e.team.shortName,
          strength: Math.max(0.12, Math.min(0.92, e.overall.points / (e.overall.played * 3) + (e.overall.goalsFor - e.overall.goalsAgainst) / (e.overall.played * 30))),
        })).sort((a, b) => a.strength - b.strength);
        // current-season fixtures/results power the (now competition-aware) Fixtures page
        writeFileSync(join(OUT, "fixtures.json"), JSON.stringify(data.fixtures));
      }
      // write index/standings/strengths after every season so a partial run is usable
      writeFileSync(join(OUT, "history-index.json"), JSON.stringify(index));
      if (currentStandings) writeFileSync(join(OUT, "standings.json"), JSON.stringify({ standings: currentStandings }));
      if (currentStrengths) writeFileSync(join(OUT, "strengths.json"), JSON.stringify({ strengths: currentStrengths }));
    } catch (e) {
      console.log(`  ${seasonLabel(s.year)}: error ${e.message}`);
    }
  }
  console.log(`\nWrote ${index.seasons.length} Serie A seasons. API calls: ${calls}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
