/**
 * Shared player rating engine for all leagues.
 *
 * Ratings are derived in two steps:
 *  1. fantasyPoints() — an ESPN-fantasy-style season score that leverages every
 *     stat we store (goals, assists, shots on target, chances created, passes,
 *     tackles, interceptions, clearances, blocks, clean sheets, saves, goals
 *     conceded, cards), weighted per position. Grounded in ESPN's scoring
 *     (goal 10, assist 5, shot on target 2, chance 1, appearance 1, defensive
 *     action 0.5, clean sheet/save for keepers, cards negative). Season totals,
 *     so pass volume is damped to a tie-breaker.
 *  2. applyRatings() — rank each player by fantasyPoints *within their position*
 *     in that league-season, map the percentile through a convex curve, and damp
 *     by reliability (minutes/appearances). Because the rating comes from the
 *     percentile (not the raw points), the rating DISTRIBUTION is identical
 *     regardless of the formula — only who's high vs low changes — so game
 *     balance (the "invincible" odds) is preserved.
 *
 * Used by build-history/laliga/seriea (fresh builds) and recompute-ratings
 * (re-score from already-stored data, no API calls).
 */

export function fantasyPoints(pos, r) {
  const n = (k) => Number(r[k]) || 0;
  const g = n("g"), a = n("a"), apps = n("apps"), sot = n("sot"), kp = n("kp"),
    pas = n("pas"), tk = n("tk"), intc = n("intc"), clr = n("clr"), cs = n("cs"),
    sv = n("sv"), gc = n("gc"), yc = n("yc"), rc = n("rc"), blk = n("blk");

  if (pos === "Goalkeeper") {
    // keepers: clean sheets + shot-stopping, minus goals shipped
    return cs * 10 + sv * 3 + apps + gc * -1 + yc * -2 + rc * -5 + pas * 0.01;
  }

  // outfield: attacking output + creation + defensive actions + availability
  let p =
    g * 10 + a * 5 + sot * 2 + kp * 1 + apps * 1 +
    tk * 0.5 + intc * 0.5 + clr * 0.5 + blk * 0.5 +
    pas * 0.02 + yc * -2 + rc * -5;
  if (pos === "Defender") p += cs * 2; // modest team-defence credit for defenders
  return p;
}

/** Mutates each player's `rating` (and leaves `_c` = fantasyPoints for sorting). */
export function applyRatings(all) {
  const byPos = new Map();
  for (const p of all) {
    p._c = fantasyPoints(p.pos, p);
    if (!byPos.has(p.pos)) byPos.set(p.pos, []);
    byPos.get(p.pos).push(p);
  }
  for (const [, list] of byPos) {
    const sorted = list.map((p) => p._c).sort((x, y) => x - y);
    for (const p of list) {
      let lo = 0, hi = sorted.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < p._c) lo = m + 1; else hi = m; }
      const pct = sorted.length ? lo / sorted.length : 0.5;
      const raw = 45 + Math.pow(pct, 1.5) * 53;
      const reliability = Math.min(1, (p.apps || 0) / 20);
      const rating = 50 + (raw - 50) * (0.35 + 0.65 * reliability);
      p.rating = Math.round(Math.max(42, Math.min(99, rating)) * 10) / 10;
    }
  }
}
