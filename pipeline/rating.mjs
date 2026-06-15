/**
 * Shared player rating engine for all leagues.
 *
 * Modelled on how SofaScore / WhoScored rate players: a PER-APPEARANCE
 * performance score (not a season total), so output is judged per game and a
 * player on a weak team can't out-rate a star just by racking up volume. Every
 * stat we store contributes, positive or negative, weighted by position:
 * goals/assists/shots-on-target/chances created dominate outfield; defenders add
 * a clean-sheet *rate* (team defensive quality) on top of their defensive
 * actions; keepers are clean-sheet rate + shot-stopping minus goals conceded.
 *
 *  1. perGameScore() — per-appearance quality score (≈ SofaScore's average match
 *     rating before scaling).
 *  2. applyRatings() — rank each player by that score *within their position* in
 *     the league-season, map the percentile through a convex curve, and damp by
 *     reliability (appearances) so cameo samples don't top the list. Because the
 *     rating comes from the percentile, the rating DISTRIBUTION is identical
 *     regardless of the formula — only who's high vs low changes — so game
 *     balance (the "invincible" odds) is preserved.
 *
 * Used by build-history/laliga/seriea (fresh builds) and recompute-ratings
 * (re-score from already-stored data, no API calls).
 */

export function perGameScore(pos, r) {
  const n = (k) => Number(r[k]) || 0;
  const g = n("g"), a = n("a"), apps = n("apps"), sot = n("sot"), kp = n("kp"),
    pas = n("pas"), tk = n("tk"), intc = n("intc"), clr = n("clr"), cs = n("cs"),
    sv = n("sv"), gc = n("gc"), yc = n("yc"), rc = n("rc"), blk = n("blk");
  const games = Math.max(apps, 1);
  const per = (x) => x / games; // per-appearance rate

  if (pos === "Goalkeeper") {
    // clean-sheet rate first, then shot-stopping, minus goals shipped
    return per(cs) * 6 + per(sv) * 0.7 - per(gc) * 2 - per(yc) * 1.5 - per(rc) * 4;
  }

  // outfield: per-game attacking output dominates, then creation + defending
  let s =
    per(g) * 10 + per(a) * 5 + per(sot) * 1.5 + per(kp) * 0.8 +
    per(tk) * 0.35 + per(intc) * 0.35 + per(clr) * 0.2 + per(blk) * 0.35 +
    per(pas) * 0.015 - per(yc) * 1.5 - per(rc) * 4;
  if (pos === "Defender") s += per(cs) * 4; // clean-sheet RATE = team defensive quality
  return s;
}

/**
 * Mutates each player's `rating`. Within each league-season position group, a
 * player is scored by how far their per-game performance sits above the
 * regulars' baseline (a z-score, à la SofaScore/WhoScored "vs average"), so a
 * dominant season (Ronaldo's 48 goals) outranks a modest season-leader — not
 * just "best in the pool = ~98". Centre 72 (output median ≈ 64, matching the old
 * engine so game balance holds), ±1σ ≈ 9 rating points, damped by reliability so
 * cameos don't top out.
 */
export function applyRatings(all) {
  const byPos = new Map();
  for (const p of all) {
    p._c = perGameScore(p.pos, p);
    if (!byPos.has(p.pos)) byPos.set(p.pos, []);
    byPos.get(p.pos).push(p);
  }
  for (const [, list] of byPos) {
    // baseline from regulars (≥8 apps) so cameo noise doesn't skew mean/σ
    const reg = list.filter((p) => (p.apps || 0) >= 8).map((p) => p._c);
    const pool = reg.length >= 5 ? reg : list.map((p) => p._c);
    const mean = pool.reduce((a, b) => a + b, 0) / pool.length;
    const std = Math.max(Math.sqrt(pool.reduce((a, b) => a + (b - mean) ** 2, 0) / pool.length), 1e-6);
    for (const p of list) {
      const z = (p._c - mean) / std;
      const lin = 72 + z * 9;
      // soft ceiling above 88 so elite seasons spread across 88-99 by how
      // dominant they were, instead of everyone clamping to a flat 99
      const base = lin <= 88 ? lin : 88 + (1 - Math.exp(-(lin - 88) / 14)) * 11;
      const reliability = Math.min(1, (p.apps || 0) / 20);
      const rating = 55 + (base - 55) * (0.4 + 0.6 * reliability);
      p.rating = Math.round(Math.max(42, Math.min(99, rating)) * 10) / 10;
    }
  }
}
