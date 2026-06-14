"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  loadHistoryIndex,
  loadSeasonRosters,
  loadStrengths,
  type HistoryIndex,
  type HistPlayer,
  type SeasonTeam,
} from "@/lib/history";
import { simulateSeason, buildFixtures, type SeasonResult } from "@/lib/invincible-sim";
import { recordScore } from "@/lib/progress";
import { submitScore } from "@/lib/leaderboard";
import Confetti from "@/components/Confetti";

const GAME = "invincibles";

export function salaryOf(rating: number): number {
  return Math.round(Math.pow(Math.max(0, rating - 58) / 42, 2.6) * 78 + 1);
}

type Mode = "five" | "full" | "cap";
const MODES: Record<Mode, { label: string; sub: string; starters: number; subs: number; cap?: number }> = {
  five: { label: "5-a-side", sub: "5 starters + 1 sub", starters: 5, subs: 1 },
  full: { label: "Full squad", sub: "11 starters + 5 subs", starters: 11, subs: 5 },
  cap: { label: "Salary cap", sub: "16 players · £400m budget", starters: 11, subs: 5, cap: 400 },
};
const CLUB_RESPINS = 3;
const YEAR_RESPINS = 3;
const POS_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

interface Pick extends HistPlayer {
  fromYear: string;
  fromTeam: string;
}

function tier(r: number) {
  if (r >= 94) return { label: "Generational", color: "#ffd166" };
  if (r >= 90) return { label: "Title-class", color: "#00e676" };
  if (r >= 86) return { label: "Top-four", color: "#38bdf8" };
  if (r >= 81) return { label: "European push", color: "#a78bfa" };
  if (r >= 76) return { label: "Mid-table", color: "#93a0bd" };
  return { label: "Battling drop", color: "#ff5d73" };
}

export default function InvinciblesGame() {
  const [mode, setMode] = useState<Mode>("full");
  const [index, setIndex] = useState<HistoryIndex | null>(null);
  const [strengths, setStrengths] = useState<{ teamId: string; name: string; strength: number }[]>([]);
  const [year, setYear] = useState<string>("");
  const [team, setTeam] = useState<SeasonTeam | null>(null);
  const [roster, setRoster] = useState<HistPlayer[]>([]);
  const [squad, setSquad] = useState<Pick[]>([]);
  const [clubRe, setClubRe] = useState(CLUB_RESPINS);
  const [yearRe, setYearRe] = useState(YEAR_RESPINS);
  const [result, setResult] = useState<SeasonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const seenIds = useRef<Set<number>>(new Set());

  const cfg = MODES[mode];
  const total = cfg.starters + cfg.subs;

  const spin = useCallback(
    async (idx: HistoryIndex, keepYear: string | null) => {
      setSpinning(true);
      const yr = keepYear ?? idx.seasons[Math.floor(Math.random() * idx.seasons.length)].year;
      const season = idx.seasons.find((s) => s.year === yr)!;
      const tm = season.teams[Math.floor(Math.random() * season.teams.length)];
      const rosters = await loadSeasonRosters(yr);
      setYear(yr);
      setTeam(tm);
      setRoster(rosters[tm.id] ?? []);
      setSpinning(false);
    },
    []
  );

  useEffect(() => {
    Promise.all([loadHistoryIndex(), loadStrengths()]).then(([idx, st]) => {
      setIndex(idx);
      setStrengths(st);
      setLoading(false);
      spin(idx, null);
    });
  }, [spin]);

  const full = squad.length >= total;

  const pick = (p: HistPlayer) => {
    if (full || !index || seenIds.current.has(p.id)) return;
    seenIds.current.add(p.id);
    setSquad((s) => [...s, { ...p, fromYear: year, fromTeam: team?.short ?? "" }]);
    setResult(null);
    if (squad.length + 1 < total) spin(index, null); // free fresh spin for the next pick
  };

  const respinClub = () => {
    if (clubRe <= 0 || !index) return;
    setClubRe((n) => n - 1);
    spin(index, year);
  };
  const respinYear = () => {
    if (yearRe <= 0 || !index) return;
    setYearRe((n) => n - 1);
    spin(index, null);
  };
  const undo = () => {
    setSquad((s) => {
      const last = s[s.length - 1];
      if (last) seenIds.current.delete(last.id);
      return s.slice(0, -1);
    });
    setResult(null);
  };
  const reset = () => {
    seenIds.current.clear();
    setSquad([]);
    setClubRe(CLUB_RESPINS);
    setYearRe(YEAR_RESPINS);
    setResult(null);
    if (index) spin(index, null);
  };

  // weighted team rating: starters full, subs count for depth at 0.35
  const rating = useMemo(() => {
    if (!squad.length) return 0;
    let w = 0,
      sum = 0;
    squad.forEach((p, i) => {
      const weight = i < cfg.starters ? 1 : 0.35;
      sum += p.rating * weight;
      w += weight;
    });
    return sum / w;
  }, [squad, cfg.starters]);

  const spend = useMemo(() => squad.reduce((a, p) => a + salaryOf(p.rating), 0), [squad]);
  const overBudget = mode === "cap" && spend > (cfg.cap ?? Infinity);
  const t = tier(rating);

  const simulate = () => {
    if (!full || !strengths.length || overBudget) return;
    const sorted = strengths.map((s) => s.strength).sort((a, b) => a - b);
    const fixtures = buildFixtures(strengths);
    const res = simulateSeason(rating, sorted, fixtures, (Math.random() * 1e9) | 0);
    setResult(res);
    const unbeaten = res.story.every((g) => g.result !== "L");
    const perfect = res.story.every((g) => g.result === "W");
    recordScore(GAME, res.story.filter((g) => g.result === "W").length * 3 + res.story.filter((g) => g.result === "D").length);
    submitScore(GAME, res.story.filter((g) => g.result === "W").length * 3 + res.story.filter((g) => g.result === "D").length);
    if (unbeaten) submitScore("undefeated", res.story.filter((g) => g.result === "W").length * 3 + res.story.filter((g) => g.result === "D").length);
    void perfect;
  };

  function changeMode(m: Mode) {
    setMode(m);
    reset();
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading 18 seasons of history…</p>;

  const starters = squad.slice(0, cfg.starters);
  const subs = squad.slice(cfg.starters);
  const rows = POS_ORDER.map((pos) => starters.filter((p) => p.pos === pos)).filter((r) => r.length);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {/* mode selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => changeMode(m)}
            className="card"
            style={{
              padding: ".6rem .9rem",
              cursor: "pointer",
              flex: "1 1 160px",
              textAlign: "left",
              borderColor: mode === m ? "var(--accent)" : "var(--border)",
              background: mode === m ? "rgba(0,230,118,.1)" : undefined,
              color: "var(--text)",
            }}
          >
            <div style={{ fontWeight: 800 }}>{MODES[m].label}</div>
            <div style={{ fontSize: ".78rem", color: "var(--muted)" }}>{MODES[m].sub}</div>
          </button>
        ))}
      </div>

      {/* squad pitch */}
      <div
        style={{
          background: "radial-gradient(120% 100% at 50% 0%, #0e7a46 0%, #0a5e36 60%, #084c2c 100%)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: "1.25rem .75rem",
          position: "relative",
          minHeight: 200,
        }}
      >
        {/* subtle centre line + circle, no stripes */}
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,.14)" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 84, height: 84, transform: "translate(-50%,-50%)", border: "1px solid rgba(255,255,255,.14)", borderRadius: "50%" }} />
        <div style={{ position: "relative", display: "grid", gap: 12 }}>
          {rows.length === 0 && (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,.7)", padding: "2rem 0" }}>
              Pick players below to build your XI.
            </div>
          )}
          {rows.map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              {row.map((p) => (
                <PlayerChip key={p.id} p={p} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* subs bench */}
      {subs.length > 0 && (
        <div>
          <div style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
            Bench
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {subs.map((p) => (
              <PlayerChip key={p.id} p={p} small />
            ))}
          </div>
        </div>
      )}

      {/* status bar */}
      <div className="card" style={{ padding: ".8rem 1rem", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: ".68rem", color: "var(--muted)", textTransform: "uppercase" }}>Squad</div>
          <div style={{ fontWeight: 800 }}>{squad.length}/{total}</div>
        </div>
        <div>
          <div style={{ fontSize: ".68rem", color: "var(--muted)", textTransform: "uppercase" }}>Rating</div>
          <div style={{ fontWeight: 900, fontSize: "1.2rem", color: t.color }}>{rating ? rating.toFixed(1) : "—"}</div>
        </div>
        {mode === "cap" && (
          <div>
            <div style={{ fontSize: ".68rem", color: "var(--muted)", textTransform: "uppercase" }}>Spend</div>
            <div style={{ fontWeight: 800, color: overBudget ? "var(--danger)" : "var(--text)" }}>£{spend}/{cfg.cap}m</div>
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {squad.length > 0 && !full && <button className="btn" onClick={undo}>↶ Undo</button>}
          <button className="btn" onClick={reset}>↺ Reset</button>
          {full && (
            <button className="btn btn-primary" onClick={simulate} disabled={overBudget}>
              ▶ Simulate season
            </button>
          )}
        </div>
      </div>

      {overBudget && (
        <div style={{ color: "var(--danger)", fontWeight: 700, textAlign: "center" }}>
          £{spend - (cfg.cap ?? 0)}m over budget — Undo and pick cheaper players.
        </div>
      )}

      {/* spin / pick panel */}
      {!full && (
        <div className="card" style={{ padding: "1rem", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="chip" style={{ fontWeight: 800, fontSize: ".9rem" }}>📅 {year ? `${year}/${(Number(year) + 1) % 100}` : "…"}</span>
              {team && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://resources.premierleague.com/premierleague25/badges/${team.id}.svg`} alt="" width={22} height={22} />
                  {team.name}
                </span>
              )}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button className="btn" onClick={respinClub} disabled={clubRe <= 0 || spinning}>
                🔄 Club ({clubRe})
              </button>
              <button className="btn" onClick={respinYear} disabled={yearRe <= 0 || spinning}>
                📅 Year ({yearRe})
              </button>
            </div>
          </div>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: ".85rem" }}>
            Pick <strong>one</strong> player from this squad — they join your team rated on their {year}/{(Number(year) + 1) % 100} season.
          </p>
          <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", maxHeight: 320, overflowY: "auto" }}>
            {roster.map((p) => (
              <button
                key={p.id}
                onClick={() => pick(p)}
                disabled={seenIds.current.has(p.id)}
                className="card"
                style={{
                  padding: ".5rem .6rem",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  cursor: seenIds.current.has(p.id) ? "not-allowed" : "pointer",
                  opacity: seenIds.current.has(p.id) ? 0.4 : 1,
                  textAlign: "left",
                  color: "var(--text)",
                }}
              >
                <span style={{ fontWeight: 900, color: "var(--accent)", minWidth: 30 }}>{p.rating.toFixed(0)}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 700, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                  <span style={{ color: "var(--muted)", fontSize: ".72rem" }}>{p.pos.slice(0, 3)} · {p.g}G {p.a}A{mode === "cap" ? ` · £${salaryOf(p.rating)}m` : ""}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {rating > 0 && !result && (
        <div style={{ textAlign: "center", color: t.color, fontWeight: 700 }}>{t.label} side</div>
      )}

      {result && <ResultPanel result={result} rating={rating} strengths={strengths} squad={squad} mode={mode} />}
    </div>
  );
}

function PlayerChip({ p, small }: { p: Pick; small?: boolean }) {
  return (
    <div
      className="card"
      style={{ padding: small ? ".3rem .5rem" : ".4rem .6rem", textAlign: "center", minWidth: small ? 92 : 104, background: "rgba(10,14,26,.78)" }}
      title={`${p.name} — ${p.fromTeam} ${p.fromYear}`}
    >
      <div style={{ fontWeight: 900, color: "var(--accent)", fontSize: small ? ".9rem" : "1rem" }}>{p.rating.toFixed(0)}</div>
      <div style={{ fontWeight: 700, fontSize: small ? ".7rem" : ".76rem", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: small ? 84 : 96 }}>{p.name}</div>
      <div style={{ color: "var(--muted)", fontSize: ".64rem" }}>{p.fromTeam} {String(p.fromYear).slice(2)}</div>
    </div>
  );
}

function ResultPanel({
  result,
  rating,
  squad,
  mode,
}: {
  result: SeasonResult;
  rating: number;
  strengths: any[];
  squad: Pick[];
  mode: Mode;
}) {
  const story = result.story;
  const W = story.filter((g) => g.result === "W").length;
  const D = story.filter((g) => g.result === "D").length;
  const L = story.filter((g) => g.result === "L").length;
  const unbeaten = L === 0;
  const perfect = L === 0 && D === 0;
  const inv = result.invinciblePct;
  const invLabel = inv >= 1 ? `${inv.toFixed(1)}%` : inv >= 0.05 ? `${inv.toFixed(2)}%` : "<0.05%";

  const share = () => {
    const txt = `My ${MODES[mode].label} Invincibles XI (${rating.toFixed(1)}): ${W}W ${D}D ${L}L${perfect ? " — PERFECT SEASON! 🌟" : unbeaten ? " — INVINCIBLE! 🏆" : ""}\nfootballinvincibles.com/games/invincibles`;
    navigator.clipboard?.writeText(txt).catch(() => {});
  };

  return (
    <div className="card pop" style={{ padding: "1.25rem", display: "grid", gap: 14 }}>
      {unbeaten && <Confetti />}
      <div style={{ textAlign: "center" }}>
        {perfect ? (
          <h2 style={{ fontSize: "2rem", margin: 0, color: "var(--gold)", fontWeight: 900 }}>🌟 PERFECT SEASON! 🌟</h2>
        ) : unbeaten ? (
          <h2 style={{ fontSize: "2rem", margin: 0, color: "var(--gold)", fontWeight: 900 }}>🏆 INVINCIBLE! 🏆</h2>
        ) : (
          <h2 style={{ fontSize: "1.5rem", margin: 0, fontWeight: 900 }}>{L} defeat{L === 1 ? "" : "s"} — not quite</h2>
        )}
        <p style={{ color: "var(--muted)", margin: ".25rem 0 0" }}>A representative season for your {rating.toFixed(1)}-rated squad.</p>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Stat label="Won" value={W} />
        <Stat label="Drawn" value={D} />
        <Stat label="Lost" value={L} color="var(--danger)" />
        <Stat label="Points" value={W * 3 + D} />
        <Stat label="Unbeaten odds" value={invLabel} />
      </div>

      <div>
        <div style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>The 38-game story</div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {story.map((g, i) => (
            <span
              key={i}
              title={`MW${g.round}: ${g.home ? "vs" : "@"} ${g.oppName} — ${g.result}`}
              style={{
                width: 22, height: 22, display: "grid", placeItems: "center", borderRadius: 5, fontSize: ".62rem", fontWeight: 800,
                color: g.result === "L" ? "#fff" : "#04220f",
                background: g.result === "W" ? "var(--accent)" : g.result === "D" ? "var(--gold)" : "var(--danger)",
              }}
            >
              {g.result}
            </span>
          ))}
        </div>
      </div>

      <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>
        An XI this strong goes a whole season unbeaten about <strong style={{ color: "var(--accent)" }}>{invLabel}</strong> of the time
        {unbeaten ? " — and you just did it!" : "."}
      </p>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={share}>📋 Share</button>
        <a className="btn" href="/leaderboard">🏆 Hall of Fame</a>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="card" style={{ padding: ".6rem 1rem", textAlign: "center", minWidth: 80 }}>
      <div style={{ fontSize: "1.4rem", fontWeight: 900, color: color ?? "var(--text)" }}>{value}</div>
      <div style={{ fontSize: ".66rem", color: "var(--muted)", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
