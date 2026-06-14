#!/usr/bin/env node
/**
 * football-invincibles — data pipeline
 * -------------------------------------
 * Fetches a real snapshot from the Premier League "SDP" API and writes a
 * games-ready dataset to src/data/. Re-runnable; rate-limit friendly
 * (the SDP API allows 300 requests / 60s per IP).
 *
 * Usage:  node pipeline/build-data.mjs [competitionId] [seasonId]
 *   defaults: competitionId=8 (Premier League), seasonId=2025 (2025/26)
 *
 * Output:  src/data/<competition>-<season>.json
 *
 * Designed to be competition-agnostic — point it at any SDP competition id.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "data");
const PUBLIC_DATA = join(__dirname, "..", "public", "data");
const SDP = "https://sdp-prem-prod.premier-league-prod.pulselive.com";

const COMPETITION = process.argv[2] || "8";
const SEASON = process.argv[3] || "2025";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let calls = 0;
async function get(path, { retries = 3 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(SDP + path, {
      headers: { accept: "application/json" },
    });
    calls++;
    // be polite: keep well under 300/60s
    const remaining = Number(res.headers.get("x-ratelimit-remaining") ?? "99");
    if (res.status === 429 || remaining < 10) {
      const reset = Number(res.headers.get("x-ratelimit-reset") ?? "5");
      console.log(`  …rate limit, sleeping ${reset + 1}s`);
      await sleep((reset + 1) * 1000);
    }
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    if (attempt === retries) throw new Error(`${res.status} ${path}`);
    await sleep(1000 * (attempt + 1));
  }
}

async function main() {
  console.log(`Building dataset for competition=${COMPETITION} season=${SEASON}`);
  mkdirSync(OUT_DIR, { recursive: true });

  // 1. teams in the season
  const teamsRes = await get(
    `/api/v1/competitions/${COMPETITION}/seasons/${SEASON}/teams?_limit=50`
  );
  const teams = (teamsRes?.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    abbr: t.abbr,
    stadium: t.stadium ?? null,
  }));
  console.log(`  ${teams.length} teams`);

  // 2. standings
  let standings = null;
  try {
    const s = await get(
      `/api/v5/competitions/${COMPETITION}/seasons/${SEASON}/standings?live=false`
    );
    standings = s?.tables?.[0]?.entries ?? null;
  } catch {}

  // 3. squads → players (dob, position, country, shirt, height/weight)
  const players = [];
  for (const team of teams) {
    const squad = await get(
      `/api/v2/competitions/${COMPETITION}/seasons/${SEASON}/teams/${team.id}/squad`
    );
    for (const p of squad?.players ?? []) {
      players.push({
        id: p.id,
        name: p.name?.display ?? `${p.name?.first ?? ""} ${p.name?.last ?? ""}`.trim(),
        firstName: p.name?.first ?? null,
        lastName: p.name?.last ?? null,
        position: p.position ?? null,
        shirtNum: p.shirtNum ?? null,
        team: { id: team.id, name: team.name, shortName: team.shortName, abbr: team.abbr },
        country: p.country?.country ?? null,
        countryCode: p.country?.isoCode ?? null,
        birth: p.dates?.birth ?? null,
        joinedClub: p.dates?.joinedClub ?? null,
        height: p.height ?? null,
        weight: p.weight ?? null,
        preferredFoot: p.preferredFoot ?? null,
        photo: `https://resources.premierleague.com/premierleague25/photos/players/110x140/${p.id}.png`,
        stats: {},
      });
    }
    console.log(`  ${team.shortName}: ${squad?.players?.length ?? 0} players`);
    await sleep(120);
  }

  // 4. enrich with headline stats from leaderboards (cheap: a handful of calls)
  const byId = new Map(players.map((p) => [String(p.id), p]));
  const metrics = [
    "goals",
    "goal_assists",
    "appearances",
    "clean_sheets",
    "total_passes",
    "total_shots",
  ];
  for (const metric of metrics) {
    let next = null;
    for (let page = 0; page < 10; page++) {
      const q = `?_sort=${metric}:desc&_limit=100${next ? `&_next=${next}` : ""}`;
      const lb = await get(
        `/api/v3/competitions/${COMPETITION}/seasons/${SEASON}/players/stats/leaderboard${q}`
      );
      for (const row of lb?.data ?? []) {
        const p = byId.get(String(row.playerMetadata?.id));
        if (p) Object.assign(p.stats, row.stats);
      }
      next = lb?.pagination?._next;
      if (!next) break;
      await sleep(100);
    }
    console.log(`  enriched: ${metric}`);
  }

  const out = {
    competition: COMPETITION,
    season: SEASON,
    generatedAt: new Date().toISOString(),
    teams,
    players,
    standings,
  };
  const file = join(OUT_DIR, `pl-${SEASON}.json`);
  writeFileSync(file, JSON.stringify(out));
  console.log(`\nWrote ${players.length} players, ${teams.length} teams → ${file}`);

  // current league table → public/data/standings.json (the Tables/Home table)
  if (COMPETITION === "8" && Array.isArray(standings) && standings.length) {
    const table = standings.map((e) => ({
      team: { id: String(e.team.id), name: e.team.name, shortName: e.team.shortName || e.team.name, abbr: e.team.abbr || "", badge: `https://resources.premierleague.com/premierleague25/badges/${e.team.id}.svg` },
      overall: {
        position: e.overall.position, played: e.overall.played, won: e.overall.won, drawn: e.overall.drawn,
        lost: e.overall.lost, goalsFor: e.overall.goalsFor, goalsAgainst: e.overall.goalsAgainst,
        points: e.overall.points, startingPosition: e.overall.startingPosition ?? e.overall.position,
      },
    }));
    writeFileSync(join(PUBLIC_DATA, "standings.json"), JSON.stringify({ standings: table }));
    console.log(`Wrote current table (${table.length}) → public/data/standings.json`);
  }

  // 5. full fixtures/results for the season → public/data/fixtures.json
  //    (the Fixtures page reads this; loop every matchweek so it never truncates)
  const allMatches = [];
  for (let mw = 1; mw <= 38; mw++) {
    const j = await get(`/api/v2/matches?competition=${COMPETITION}&season=${SEASON}&matchweek=${mw}&_limit=20`);
    allMatches.push(...(j?.data ?? []));
    await sleep(40);
  }
  const fixtures = allMatches
    .filter((m) => m.homeTeam?.id && m.awayTeam?.id)
    .map((m) => ({
      id: String(m.matchId),
      mw: m.matchWeek,
      home: m.homeTeam.name,
      homeId: String(m.homeTeam.id),
      hs: m.period === "FullTime" ? m.homeTeam.score : null,
      away: m.awayTeam.name,
      awayId: String(m.awayTeam.id),
      as: m.period === "FullTime" ? m.awayTeam.score : null,
      ground: m.ground || "",
      date: m.kickoff || null,
    }))
    .sort((a, b) => a.mw - b.mw || a.id.localeCompare(b.id));
  if (fixtures.length) {
    writeFileSync(join(PUBLIC_DATA, "fixtures.json"), JSON.stringify({ matches: fixtures }));
    console.log(`Wrote ${fixtures.length} fixtures (${[...new Set(fixtures.map((f) => f.mw))].length} matchweeks) → public/data/fixtures.json`);
  }
  console.log(`Total API calls: ${calls}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
