#!/usr/bin/env node
/**
 * Build compact per-competition indexes that power the clickable player & team
 * profile pages — derived entirely from the season files we already wrote (no
 * network). Re-run after any roster/standings rebuild.
 *
 *   public/data/<prefix>players-index.json
 *     { [playerId]: { n:name, p:pos, ph:photo, na:nat,
 *                     s:[[year, teamId, teamName, apps, g, a, cs, mins, rating]] } }
 *   public/data/<prefix>teams-index.json
 *     { [teamId]: { n:name, sh:short, b:badge,
 *                   s:[[year, position, played, won, drawn, lost, gf, ga, pts]] } }
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "..", "public", "data");

// The players index is split into 32 shards so a player page downloads ~1/32 of
// it (the Serie A index alone is ~3 MB). The client uses the SAME hash to pick a
// shard — keep playerShard() in lib/history.ts identical to this.
const SHARDS = 32;
function shardOf(id) {
  let h = 0; const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % SHARDS).toString(16).padStart(2, "0");
}

const COMPS = [
  { name: "Premier League", short: "PL", prefix: "" },
  { name: "La Liga", short: "LaLiga", prefix: "laliga/" },
  { name: "Serie A", short: "Serie A", prefix: "seriea/" },
];

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

// Cross-league pool for the Rating Duel game — strong, recognisable player-
// seasons (rating >= 78, apps >= 18), capped per league.
const duelPool = [];

function buildComp({ name, short, prefix }) {
  const base = join(PUB, prefix);
  const index = readJson(join(base, "history-index.json"));
  if (!index?.seasons?.length) { console.log(`${name}: no history-index, skipped`); return; }

  const players = {};
  const teams = {};

  for (const season of index.seasons) {
    const year = season.year;
    const teamName = new Map((season.teams || []).map((t) => [String(t.id), t.short || t.name]));
    const teamBadge = new Map((season.teams || []).map((t) => [String(t.id), t.badge || null]));

    // ---- teams index (identity + per-season final position) ----
    const standings = readJson(join(base, "standings", `${year}.json`))?.standings || [];
    for (const e of standings) {
      const id = String(e.team.id);
      const o = e.overall;
      (teams[id] ??= { n: e.team.name, sh: e.team.shortName || e.team.name, b: e.team.badge || teamBadge.get(id) || null, s: [] });
      teams[id].s.push([year, o.position, o.played, o.won, o.drawn, o.lost, o.goalsFor, o.goalsAgainst, o.points]);
    }

    // ---- players index (per-season record) ----
    const rosters = readJson(join(base, "seasons", `${year}.json`))?.rosters || {};
    for (const [tid, list] of Object.entries(rosters)) {
      for (const p of list) {
        const id = String(p.id);
        const rec = (players[id] ??= { n: p.name, p: p.pos, ph: p.photo || null, na: p.nat || null, s: [] });
        // keep the most recent name/photo/position (seasons iterate newest-first)
        if (p.photo && !rec.ph) rec.ph = p.photo;
        rec.s.push([year, tid, teamName.get(String(tid)) || "", p.apps ?? 0, p.g ?? 0, p.a ?? 0, p.cs ?? 0, p.mins ?? 0, p.rating ?? null]);
      }
    }
  }

  // sort each entity's seasons newest-first
  for (const v of Object.values(players)) v.s.sort((a, b) => Number(b[0]) - Number(a[0]));
  for (const v of Object.values(teams)) v.s.sort((a, b) => Number(b[0]) - Number(a[0]));

  // Flag which players get a static page (>=5 career apps — must match
  // MIN_PLAYER_APPS in lib/server-data.ts) back into the season rosters, so
  // client lists (squads, players grid, history XI) only link players that
  // actually have a page and never produce a 404.
  const MIN_APPS = 5;
  const linkable = new Set(Object.keys(players).filter((id) => players[id].s.reduce((a, s) => a + s[3], 0) >= MIN_APPS));
  for (const season of index.seasons) {
    const f = join(base, "seasons", `${season.year}.json`);
    const data = readJson(f);
    if (!data?.rosters) continue;
    let changed = false;
    for (const list of Object.values(data.rosters))
      for (const p of list) {
        const want = linkable.has(String(p.id)) ? 1 : undefined;
        if (p.lk !== want) { if (want) p.lk = 1; else delete p.lk; changed = true; }
      }
    if (changed) writeFileSync(f, JSON.stringify(data));
  }

  // write the players index as 32 shards; drop the old monolithic file
  const shardDir = join(base, "players-index");
  rmSync(shardDir, { recursive: true, force: true });
  mkdirSync(shardDir, { recursive: true });
  rmSync(join(base, "players-index.json"), { force: true });
  const buckets = {};
  for (const [id, rec] of Object.entries(players)) (buckets[shardOf(id)] ??= {})[id] = rec;
  for (let i = 0; i < SHARDS; i++) {
    const b = i.toString(16).padStart(2, "0");
    writeFileSync(join(shardDir, `${b}.json`), JSON.stringify(buckets[b] || {}));
  }
  writeFileSync(join(base, "teams-index.json"), JSON.stringify(teams));

  // collect this league's Rating Duel entries (top-rated recognisable seasons).
  // PL history rosters often lack a photo url — reconstruct it from the id.
  const plPhoto = (id) => (prefix === "" ? `https://resources.premierleague.com/premierleague25/photos/players/110x140/${id}.png` : null);
  const entries = [];
  for (const [id, e] of Object.entries(players))
    for (const s of e.s) if (s[8] != null && s[8] >= 78 && s[3] >= 18) entries.push({ n: e.n, ph: e.ph || plPhoto(id), r: s[8], c: s[2], l: short, y: s[0] });
  entries.sort((a, b) => b.r - a.r);
  duelPool.push(...entries.slice(0, 1000));

  const maxKb = Math.max(...Object.values(buckets).map((b) => JSON.stringify(b).length)) / 1024;
  console.log(`${name}: ${Object.keys(players).length} players (32 shards, max ${maxKb.toFixed(0)} KB), ${Object.keys(teams).length} teams, ${Math.min(entries.length, 1000)} duel`);
}

for (const c of COMPS) buildComp(c);

// shuffle-friendly: keep as-is; the game samples randomly
writeFileSync(join(PUB, "duel.json"), JSON.stringify(duelPool));
console.log(`duel pool: ${duelPool.length} player-seasons -> public/data/duel.json`);
console.log("done");
