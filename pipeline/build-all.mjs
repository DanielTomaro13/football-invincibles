#!/usr/bin/env node
/**
 * Full data refresh orchestrator — runs every pipeline in dependency order so a
 * complete rebuild is one command (the leagues/match-detail/indexes are
 * otherwise hand-run snapshots). HEAVY (~1h: full multi-league history + 1,140
 * match files). For a routine PL-only refresh use `npm run data`.
 *
 *   node pipeline/build-all.mjs
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const steps = [
  ["build-data.mjs", ["8", "2025"]],          // PL current season + fixtures + table
  ["add-ratings.mjs", ["2025"]],              // PL current-season ratings
  ["build-history.mjs", []],                  // PL historical rosters
  ["build-laliga.mjs", []],                   // La Liga (rosters from players/stats)
  ["build-seriea.mjs", []],                   // Serie A (1986→)
  ["build-history-standings.mjs", []],        // PL + La Liga per-season tables
  ["build-match-detail.mjs", ["all"]],        // match centres (all 3 leagues)
  ["build-search-index.mjs", []],             // player/team indexes (reads the above)
  ["check-data.mjs", []],                     // integrity guard
];

for (const [script, args] of steps) {
  console.log(`\n━━ ${script} ${args.join(" ")} ━━`);
  const r = spawnSync(process.execPath, [join(here, script), ...args], { stdio: "inherit" });
  if (r.status !== 0) { console.error(`\n✗ ${script} failed (exit ${r.status}) — stopping.`); process.exit(r.status || 1); }
}
console.log("\n✓ Full data refresh complete.");
