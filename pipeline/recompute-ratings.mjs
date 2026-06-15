#!/usr/bin/env node
/**
 * Re-score every player in every season from the already-stored stats using the
 * shared rating engine — NO API calls. Run after changing pipeline/rating.mjs.
 * Re-sorts each roster by the new rating. Follow with build-search-index.mjs.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { applyRatings } from "./rating.mjs";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");
const LEAGUES = [{ name: "Premier League", prefix: "" }, { name: "La Liga", prefix: "laliga/" }, { name: "Serie A", prefix: "seriea/" }];
const read = (p) => JSON.parse(readFileSync(p, "utf8"));

for (const { name, prefix } of LEAGUES) {
  const base = join(PUB, prefix);
  const index = read(join(base, "history-index.json"));
  let seasons = 0, players = 0;
  for (const s of index.seasons) {
    const f = join(base, "seasons", `${s.year}.json`);
    if (!existsSync(f)) continue;
    const data = read(f);
    const all = [];
    for (const list of Object.values(data.rosters || {})) all.push(...list);
    applyRatings(all); // sets p.rating (+ temporary p._c)
    for (const tid of Object.keys(data.rosters)) {
      data.rosters[tid] = data.rosters[tid]
        .map(({ _c, ...r }) => r)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    writeFileSync(f, JSON.stringify({ rosters: data.rosters }));
    seasons++; players += all.length;
  }
  console.log(`${name}: re-rated ${players} players across ${seasons} seasons`);
}
console.log("done — now run build-search-index.mjs");
