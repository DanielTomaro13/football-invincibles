#!/usr/bin/env node
/**
 * Pre-deploy data integrity guard. Verifies every league's data files exist,
 * parse, and aren't empty, so a half-finished pipeline run can't ship a broken
 * site. Exits non-zero on any problem. Run before `npm run build` in CI.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");
const LEAGUES = [
  { name: "Premier League", prefix: "" },
  { name: "La Liga", prefix: "laliga/" },
  { name: "Serie A", prefix: "seriea/" },
];
const errors = [];
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

for (const { name, prefix } of LEAGUES) {
  const base = join(PUB, prefix);
  try {
    const idx = readJson(join(base, "history-index.json"));
    if (!idx.seasons?.length) { errors.push(`${name}: history-index has no seasons`); continue; }
    let emptySeasons = 0;
    for (const s of idx.seasons) {
      const f = join(base, "seasons", `${s.year}.json`);
      if (!existsSync(f)) { errors.push(`${name} ${s.year}: missing season file`); continue; }
      const n = Object.values(readJson(f).rosters || {}).reduce((a, r) => a + r.length, 0);
      if (n === 0) emptySeasons++;
    }
    if (emptySeasons) errors.push(`${name}: ${emptySeasons} season(s) with empty rosters`);
    // standings + fixtures (enabled leagues serve these)
    for (const f of ["standings.json", "fixtures.json"]) {
      const p = join(base, f);
      if (!existsSync(p)) { errors.push(`${name}: missing ${f}`); continue; }
      const arr = (() => { const j = readJson(p); return j.standings || (Array.isArray(j) ? j : j.matches) || []; })();
      if (!arr.length) errors.push(`${name}: ${f} is empty`);
    }
    console.log(`✓ ${name}: ${idx.seasons.length} seasons OK`);
  } catch (e) {
    errors.push(`${name}: ${e.message}`);
  }
}

if (errors.length) {
  console.error("\n✗ Data integrity check FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("\n✓ All league data OK");
