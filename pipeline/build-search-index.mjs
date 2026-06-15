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
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "..", "public", "data");

const COMPS = [
  { name: "Premier League", prefix: "" },
  { name: "La Liga", prefix: "laliga/" },
  { name: "Serie A", prefix: "seriea/" },
];

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

function buildComp({ name, prefix }) {
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

  writeFileSync(join(base, "players-index.json"), JSON.stringify(players));
  writeFileSync(join(base, "teams-index.json"), JSON.stringify(teams));
  const pBytes = (JSON.stringify(players).length / 1024).toFixed(0);
  console.log(`${name}: ${Object.keys(players).length} players, ${Object.keys(teams).length} teams (${pBytes} KB player index)`);
}

for (const c of COMPS) buildComp(c);
console.log("done");
