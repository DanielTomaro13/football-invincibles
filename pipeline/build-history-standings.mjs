#!/usr/bin/env node
/**
 * Per-season final league tables for the History archive.
 *
 * Writes `public/data/<prefix>standings/<year>.json` (shape `{ standings: [...] }`,
 * same as the current-season `standings.json`) for every season we cover, plus
 * refreshes the current-season `standings.json`. Serie A produces its own (in
 * build-seriea.mjs); this covers the leagues we don't fully rebuild each time:
 *
 *   - Premier League  (SDP)            2008/09 → 2025/26
 *   - La Liga         (Azure APIM)     2013/14 → 2025/26
 *
 * Cheap: one standings call per season. Safe to re-run.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "..", "public", "data");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, headers = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", accept: "application/json", ...headers }, signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; } finally { clearTimeout(t); }
}

// ---- Premier League (SDP) ----
const PL_SDP = "https://sdp-prem-prod.premier-league-prod.pulselive.com";
const plBadge = (id) => `https://resources.premierleague.com/premierleague25/badges/${id}.svg`;
async function premierLeague() {
  const dir = join(PUB, "standings");
  mkdirSync(dir, { recursive: true });
  let wrote = 0;
  for (let year = 2025; year >= 2008; year--) {
    const j = await getJson(`${PL_SDP}/api/v5/competitions/8/seasons/${year}/standings?live=false`);
    const entries = j?.tables?.[0]?.entries;
    if (!entries?.length) { console.log(`  PL ${year}: none`); continue; }
    const standings = entries.map((e) => ({
      team: { id: String(e.team.id), name: e.team.name, shortName: e.team.shortName || e.team.name, abbr: e.team.abbr || "", badge: plBadge(e.team.id) },
      overall: {
        position: e.overall.position, played: e.overall.played, won: e.overall.won, drawn: e.overall.drawn,
        lost: e.overall.lost, goalsFor: e.overall.goalsFor, goalsAgainst: e.overall.goalsAgainst,
        points: e.overall.points, startingPosition: e.overall.startingPosition ?? e.overall.position,
      },
    }));
    writeFileSync(join(dir, `${year}.json`), JSON.stringify({ standings }));
    if (year === 2025) writeFileSync(join(PUB, "standings.json"), JSON.stringify({ standings }));
    wrote++;
    await sleep(60);
  }
  console.log(`PL: wrote ${wrote} season tables`);
}

// ---- La Liga (Azure APIM) ----
const LL = "https://apim.laliga.com/public-service";
const LL_KEY = "c13c3a8e2f6b46da9c5c425cf61fab3e";
const llSeasons = [];
for (let y = 2025; y >= 2013; y--) llSeasons.push({ year: y, slug: y >= 2023 ? `laliga-easports-${y}` : `laliga-santander-${y}` });
async function laLiga() {
  const dir = join(PUB, "laliga", "standings");
  mkdirSync(dir, { recursive: true });
  let wrote = 0;
  for (const { year, slug } of llSeasons) {
    const j = await getJson(`${LL}/api/v1/subscriptions/${slug}/standing`, { "Ocp-Apim-Subscription-Key": LL_KEY });
    const entries = j?.standings;
    if (!entries?.length) { console.log(`  LaLiga ${year}: none`); continue; }
    const standings = entries.map((e) => ({
      team: {
        id: String(e.team.id), name: e.team.nickname || e.team.name, shortName: e.team.nickname || e.team.name,
        abbr: e.team.shortname || "", badge: ((e.team.shield || {}).resizes || {}).medium || (e.team.shield || {}).url || null,
      },
      overall: {
        position: e.position, played: e.played, won: e.won, drawn: e.drawn, lost: e.lost,
        goalsFor: e.goals_for, goalsAgainst: e.goals_against, points: e.points, startingPosition: e.previous_position || e.position,
      },
    }));
    writeFileSync(join(dir, `${year}.json`), JSON.stringify({ standings }));
    wrote++;
    await sleep(80);
  }
  console.log(`LaLiga: wrote ${wrote} season tables`);
}

await premierLeague();
await laLiga();
console.log("done");
