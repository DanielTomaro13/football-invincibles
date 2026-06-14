/**
 * Invincibles season simulator.
 *
 * A faithful port of the AFL-23-0 engine (web/lib/game/sim.ts): the same
 * upset-capped log5 head-to-head model and the same rating→strength mapping,
 * so difficulty is calibrated identically. The one football-specific change:
 * a match can be drawn, and "going invincible" means a season with **zero
 * losses** (draws allowed) — exactly like Arsenal's real 2003/04 Invincibles
 * (26 W, 12 D, 0 L). That keeps an unbeaten season hard but genuinely
 * achievable for a strong XI — never mathematically impossible.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * No team ever exceeds this per-match win chance — the irreducible "any given
 * Saturday" upset factor, as in the AFL engine (there 0.855; football draws
 * give a touch more headroom so unbeaten runs stay reachable).
 */
export const UPSET_CAP = 0.88;

/** An all-star XI can rate above any single real club — the ceiling it tends to. */
const ELITE_CEIL = 0.965;
/** Loss-curve shape (tuned): how fast a favourite's loss risk shrinks. */
const LOSS_SCALE = 0.55;
const LOSS_POW = 1.6;
/** Every match keeps at least this much draw mass. */
const DRAW_MIN = 0.06;

/** log5 head-to-head win probability (win-share units), upset-capped. */
export function winProb(a: number, b: number): number {
  return Math.min(UPSET_CAP, (a * (1 - b)) / (a * (1 - b) + b * (1 - a)) || 0);
}

/** Map team rating (0-100) onto the real league strength distribution. */
export function ratingToStrength(teamRating: number, strengths: number[]): number {
  const n = strengths.length;
  const min = strengths[0];
  const max = strengths[n - 1];
  const q = Math.max(0, (teamRating - 35) / 57) ** 1.25;
  let s: number;
  if (q <= 1) {
    const idx = q * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(n - 1, lo + 1);
    s = strengths[lo] + (strengths[hi] - strengths[lo]) * (idx - lo);
  } else {
    // beyond the best real club: a dream XI climbs toward the elite ceiling
    s = max + (1 - Math.exp(-(q - 1) * 7)) * (ELITE_CEIL - max);
  }
  return Math.max(min, Math.min(0.985, s));
}

export interface MatchProbs {
  pWin: number;
  pDraw: number;
  pLoss: number;
}

/**
 * Win / draw / loss split. A favourite's loss probability falls off steeply
 * (LOSS_POW), the win is upset-capped, and whatever mass is left over lands in
 * the draw column — so dominating sides pile up draws, not defeats, and an
 * unbeaten season is achievable rather than mathematically out of reach.
 */
export function matchProbs(me: number, them: number): MatchProbs {
  const e = (me * (1 - them)) / (me * (1 - them) + them * (1 - me)) || 0.5;
  const pWin = Math.min(UPSET_CAP, e);
  let pLoss = LOSS_SCALE * Math.pow(1 - e, LOSS_POW);
  let pDraw = 1 - pWin - pLoss;
  if (pDraw < DRAW_MIN) {
    pLoss = Math.max(0, pLoss - (DRAW_MIN - pDraw));
    pDraw = DRAW_MIN;
  }
  return { pWin, pDraw, pLoss };
}

export interface Fixture {
  oppId: string;
  oppName: string;
  oppStrength: number;
  home: boolean;
}

export interface SeasonResult {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  /** modal (most-likely) record across the Monte-Carlo runs */
  invinciblePct: number; // % of simulated seasons with zero losses
  userStrength: number;
  realPercentile: number;
  lossDistribution: number[]; // index = losses, value = % of seasons
  story: { round: number; oppName: string; home: boolean; result: "W" | "D" | "L" }[];
}

/**
 * Build a real 38-game fixture list: every other club home & away. The XI you
 * draft "replaces" the weakest club in the data, so you face the other 19
 * twice — an authentic Premier League schedule.
 */
export function buildFixtures(
  clubs: { teamId: string; name: string; strength: number }[]
): Fixture[] {
  const opp = [...clubs].sort((a, b) => b.strength - a.strength).slice(0, 19);
  const fixtures: Fixture[] = [];
  for (const o of opp) {
    fixtures.push({ oppId: o.teamId, oppName: o.name, oppStrength: o.strength, home: true });
    fixtures.push({ oppId: o.teamId, oppName: o.name, oppStrength: o.strength, home: false });
  }
  return fixtures;
}

const HOME_EDGE = 0.03; // small home-advantage bump to win-share

export function simulateSeason(
  teamRating: number,
  strengths: number[], // sorted ascending
  fixtures: Fixture[],
  seed: number,
  runs = 8000
): SeasonResult {
  const n = strengths.length;
  const me = ratingToStrength(teamRating, strengths);
  const realPercentile = (strengths.filter((s) => s < me).length / n) * 100;

  // precompute per-fixture probabilities
  const probs = fixtures.map((f) => {
    const meAdj = Math.min(0.997, me + (f.home ? HOME_EDGE : -HOME_EDGE / 2));
    return matchProbs(meAdj, f.oppStrength);
  });

  const lossCounts = new Array(fixtures.length + 1).fill(0);
  const rand = mulberry32(seed);
  let sumW = 0,
    sumD = 0,
    sumL = 0;
  for (let r = 0; r < runs; r++) {
    let losses = 0,
      w = 0,
      dr = 0;
    for (let g = 0; g < fixtures.length; g++) {
      const x = rand();
      const p = probs[g];
      if (x < p.pWin) w++;
      else if (x < p.pWin + p.pDraw) dr++;
      else {
        losses++;
      }
    }
    sumW += w;
    sumD += dr;
    sumL += fixtures.length - w - dr;
    lossCounts[losses]++;
  }

  const invinciblePct = (lossCounts[0] / runs) * 100;
  const avgW = Math.round(sumW / runs);
  const avgD = Math.round(sumD / runs);
  const avgL = fixtures.length - avgW - avgD;

  // representative story: replay until losses match the modal loss count
  let modalLoss = 0;
  for (let i = 0; i < lossCounts.length; i++)
    if (lossCounts[i] > lossCounts[modalLoss]) modalLoss = i;
  const sRand = mulberry32(seed ^ 0x5eed);
  let story: SeasonResult["story"] = [];
  for (let attempt = 0; attempt < 6000; attempt++) {
    const games: SeasonResult["story"] = [];
    let losses = 0;
    for (let g = 0; g < fixtures.length; g++) {
      const x = sRand();
      const p = probs[g];
      let result: "W" | "D" | "L";
      if (x < p.pWin) result = "W";
      else if (x < p.pWin + p.pDraw) result = "D";
      else {
        result = "L";
        losses++;
      }
      games.push({ round: g + 1, oppName: fixtures[g].oppName, home: fixtures[g].home, result });
    }
    if (losses === modalLoss) {
      story = games;
      break;
    }
  }

  return {
    played: fixtures.length,
    won: avgW,
    drawn: avgD,
    lost: avgL,
    points: avgW * 3 + avgD,
    invinciblePct,
    userStrength: me,
    realPercentile,
    lossDistribution: lossCounts.map((c) => (c / runs) * 100),
    story,
  };
}
