"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { loadGamesData, type GamePlayer } from "@/lib/games-data";
import {
  simulateSeason,
  buildFixtures,
  ratingToStrength,
  type SeasonResult,
} from "@/lib/invincible-sim";
import { recordScore } from "@/lib/progress";
import { submitScore } from "@/lib/leaderboard";
import Confetti from "@/components/Confetti";

type Strength = { teamId: string; name: string; strength: number };

const GAME = "invincibles";
const SALARY_CAP = 240; // £m, for Salary Cap mode
/** Star players cost exponentially more — forces trade-offs under the cap. */
export function salaryOf(rating: number): number {
  return Math.round(Math.pow(Math.max(0, rating - 58) / 42, 2.6) * 78 + 1);
}

const FORMATION: { slot: string; pos: string }[] = [
  { slot: "GK", pos: "Goalkeeper" },
  { slot: "LB", pos: "Defender" },
  { slot: "CB", pos: "Defender" },
  { slot: "CB", pos: "Defender" },
  { slot: "RB", pos: "Defender" },
  { slot: "CM", pos: "Midfielder" },
  { slot: "CM", pos: "Midfielder" },
  { slot: "CM", pos: "Midfielder" },
  { slot: "LW", pos: "Forward" },
  { slot: "ST", pos: "Forward" },
  { slot: "RW", pos: "Forward" },
];

const START_REROLLS = 8;

interface SlotState {
  slot: string;
  pos: string;
  player: GamePlayer | null;
  locked: boolean;
}

function tier(rating: number): { label: string; color: string } {
  if (rating >= 94) return { label: "Generational", color: "#ffd166" };
  if (rating >= 90) return { label: "Title-class", color: "#00e676" };
  if (rating >= 86) return { label: "Top-four", color: "#38bdf8" };
  if (rating >= 81) return { label: "European push", color: "#a78bfa" };
  if (rating >= 76) return { label: "Mid-table", color: "#93a0bd" };
  return { label: "Scrapping it out", color: "#ff5d73" };
}

export default function InvinciblesGame() {
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [strengths, setStrengths] = useState<Strength[]>([]);
  const [squad, setSquad] = useState<SlotState[]>(
    FORMATION.map((f) => ({ ...f, player: null, locked: false }))
  );
  const [rerolls, setRerolls] = useState(START_REROLLS);
  const [result, setResult] = useState<SeasonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [simming, setSimming] = useState(false);
  const [mode, setMode] = useState<"free" | "cap">("free");

  const poolByPos = useMemo(() => {
    const m: Record<string, GamePlayer[]> = {};
    for (const p of players) {
      if (!m[p.pos]) m[p.pos] = [];
      m[p.pos].push(p);
    }
    return m;
  }, [players]);

  useEffect(() => {
    loadGamesData().then((d) => {
      setPlayers(d.players);
      setStrengths((d as any).strengths ?? []);
      setLoading(false);
    });
  }, []);

  const usedIds = useMemo(
    () => new Set(squad.map((s) => s.player?.id).filter(Boolean)),
    [squad]
  );

  const drawForPos = useCallback(
    (pos: string, exclude: Set<number>): GamePlayer | null => {
      const pool = poolByPos[pos] ?? [];
      if (!pool.length) return null;
      for (let i = 0; i < 40; i++) {
        const p = pool[Math.floor(Math.random() * pool.length)];
        if (!exclude.has(p.id)) return p;
      }
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [poolByPos]
  );

  const spinAll = useCallback(() => {
    setResult(null);
    const taken = new Set<number>();
    setSquad((prev) =>
      prev.map((s) => {
        if (s.locked && s.player) {
          taken.add(s.player.id);
          return s;
        }
        const p = drawForPos(s.pos, taken);
        if (p) taken.add(p.id);
        return { ...s, player: p };
      })
    );
  }, [drawForPos]);

  const rerollSlot = (idx: number) => {
    if (rerolls <= 0) return;
    setResult(null);
    setSquad((prev) => {
      const taken = new Set(prev.map((s, i) => (i === idx ? -1 : s.player?.id)).filter(Boolean) as number[]);
      const p = drawForPos(prev[idx].pos, taken);
      if (!p) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], player: p };
      return next;
    });
    setRerolls((r) => r - 1);
  };

  const toggleLock = (idx: number) => {
    setSquad((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], locked: !next[idx].locked };
      return next;
    });
  };

  const reset = () => {
    setSquad(FORMATION.map((f) => ({ ...f, player: null, locked: false })));
    setRerolls(START_REROLLS);
    setResult(null);
  };

  const full = squad.every((s) => s.player);
  const rating = useMemo(() => {
    const ps = squad.map((s) => s.player).filter(Boolean) as GamePlayer[];
    if (!ps.length) return 0;
    return ps.reduce((a, p) => a + p.rating, 0) / ps.length;
  }, [squad]);
  const t = tier(rating);
  const spend = useMemo(
    () => squad.reduce((a, s) => a + (s.player ? salaryOf(s.player.rating) : 0), 0),
    [squad]
  );
  const overBudget = mode === "cap" && spend > SALARY_CAP;

  const simulate = () => {
    if (!full || !strengths.length || overBudget) return;
    setSimming(true);
    setTimeout(() => {
      const sorted = strengths.map((s) => s.strength).sort((a, b) => a - b);
      const fixtures = buildFixtures(strengths);
      const res = simulateSeason(rating, sorted, fixtures, (Math.random() * 1e9) | 0);
      setResult(res);
      setSimming(false);
      recordScore(GAME, res.points);
      submitScore(GAME, res.points);
    }, 30);
  };

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading squad pool…</p>;

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {/* control bar */}
      <div className="card" style={{ padding: "1rem", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn btn-primary" onClick={spinAll}>
          🎰 {squad.some((s) => s.player) ? "Re-spin XI" : "Spin XI"}
        </button>
        <button className="btn" onClick={simulate} disabled={!full || simming || overBudget}>
          {simming ? "Simulating…" : "▶ Simulate season"}
        </button>
        <button className="btn" onClick={reset}>↺ Reset</button>
        <button
          className="btn"
          onClick={() => setMode((m) => (m === "free" ? "cap" : "free"))}
          title="Toggle Salary Cap mode"
        >
          {mode === "cap" ? `💷 Cap: £${spend}/${SALARY_CAP}m` : "💷 Free spin"}
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: ".7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Re-rolls</div>
            <div style={{ fontWeight: 800 }}>{rerolls}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: ".7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>Team rating</div>
            <div style={{ fontWeight: 900, fontSize: "1.3rem", color: t.color }}>
              {rating ? rating.toFixed(1) : "—"}
            </div>
          </div>
        </div>
      </div>

      {rating > 0 && (
        <div style={{ textAlign: "center", color: t.color, fontWeight: 700 }}>
          {t.label} side · projected to finish around the {ordinalFinish(rating, strengths)}.
        </div>
      )}
      {overBudget && (
        <div style={{ textAlign: "center", color: "var(--danger)", fontWeight: 700 }}>
          💷 Over budget by £{spend - SALARY_CAP}m — re-roll cheaper players to get under the £{SALARY_CAP}m cap.
        </div>
      )}

      {/* pitch */}
      <div
        style={{
          background:
            "repeating-linear-gradient(0deg,#0b6e3b,#0b6e3b 44px,#0a623454 44px,#0a623454 88px)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: "1.25rem .5rem",
          display: "grid",
          gap: 14,
        }}
      >
        {[
          squad.slice(8, 11), // forwards
          squad.slice(5, 8), // mids
          squad.slice(1, 5), // defenders
          squad.slice(0, 1), // gk
        ].map((row, ri) => (
          <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {row.map((s) => {
              const idx = squad.indexOf(s);
              return (
                <PlayerCard
                  key={idx}
                  s={s}
                  canReroll={rerolls > 0 && !!s.player}
                  onReroll={() => rerollSlot(idx)}
                  onLock={() => toggleLock(idx)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <p style={{ color: "var(--muted)", fontSize: ".85rem", textAlign: "center", margin: 0 }}>
        Lock 🔒 the players you want to keep, then re-spin or re-roll individual slots to build the strongest XI you can.
        An unbeaten season is deliberately rare — only a near-perfect side gets a real shot.
      </p>

      {result && <ResultPanel result={result} rating={rating} />}
    </div>
  );
}

function PlayerCard({
  s,
  canReroll,
  onReroll,
  onLock,
}: {
  s: SlotState;
  canReroll: boolean;
  onReroll: () => void;
  onLock: () => void;
}) {
  return (
    <div
      className="card pop"
      style={{
        width: 132,
        padding: ".5rem",
        textAlign: "center",
        borderColor: s.locked ? "var(--accent)" : "var(--border)",
        background: s.player ? undefined : "rgba(0,0,0,.25)",
        position: "relative",
      }}
    >
      <div style={{ fontSize: ".66rem", color: "var(--muted)", fontWeight: 700, letterSpacing: ".05em" }}>{s.slot}</div>
      {s.player ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.player.photo}
            alt={s.player.name}
            width={52}
            height={66}
            loading="lazy"
            style={{ borderRadius: 8, background: "var(--panel-2)", objectFit: "cover", margin: "4px auto" }}
          />
          <div style={{ fontWeight: 700, fontSize: ".8rem", lineHeight: 1.1, minHeight: 30 }}>{s.player.name}</div>
          <div style={{ color: "var(--muted)", fontSize: ".68rem" }}>{s.player.team}</div>
          <div style={{ fontWeight: 900, color: "var(--accent)" }}>{s.player.rating.toFixed(0)}</div>
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 4 }}>
            <button
              onClick={onReroll}
              disabled={!canReroll}
              className="chip"
              style={{ cursor: canReroll ? "pointer" : "not-allowed", padding: ".15rem .4rem" }}
              title="Re-roll this slot"
            >
              🔄
            </button>
            <button
              onClick={onLock}
              className="chip"
              style={{ cursor: "pointer", padding: ".15rem .4rem", borderColor: s.locked ? "var(--accent)" : undefined }}
              title={s.locked ? "Unlock" : "Lock"}
            >
              {s.locked ? "🔒" : "🔓"}
            </button>
          </div>
        </>
      ) : (
        <div style={{ height: 120, display: "grid", placeItems: "center", color: "var(--muted)" }}>—</div>
      )}
    </div>
  );
}

function ResultPanel({ result, rating }: { result: SeasonResult; rating: number }) {
  const invincible = result.story.every((g) => g.result !== "L");
  const inv = result.invinciblePct;
  const invLabel = inv >= 1 ? `${inv.toFixed(1)}%` : inv >= 0.05 ? `${inv.toFixed(2)}%` : "<0.05%";
  const story = result.story;

  const wins = story.filter((g) => g.result === "W").length;
  const draws = story.filter((g) => g.result === "D").length;
  const losses = story.filter((g) => g.result === "L").length;
  const share = () => {
    const txt = `My Invincibles XI (${rating.toFixed(1)} rated): ${wins}W ${draws}D ${losses}L${invincible ? " — INVINCIBLE! 🏆" : ""}\nfootballinvincibles.com/games/invincibles`;
    navigator.clipboard?.writeText(txt).catch(() => {});
  };

  return (
    <div className="card pop" style={{ padding: "1.25rem", display: "grid", gap: 14 }}>
      {invincible && <Confetti />}
      <div style={{ textAlign: "center" }}>
        {invincible ? (
          <h2 style={{ fontSize: "2rem", margin: 0, color: "var(--gold)", fontWeight: 900 }}>
            🏆 INVINCIBLE! 🏆
          </h2>
        ) : (
          <h2 style={{ fontSize: "1.5rem", margin: 0, fontWeight: 900 }}>
            {result.story.filter((g) => g.result === "L").length} defeat
            {result.story.filter((g) => g.result === "L").length === 1 ? "" : "s"} — so close
          </h2>
        )}
        <p style={{ color: "var(--muted)", margin: ".25rem 0 0" }}>
          A representative season for your {rating.toFixed(1)}-rated XI.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Stat label="Won" value={story.filter((g) => g.result === "W").length} />
        <Stat label="Drawn" value={story.filter((g) => g.result === "D").length} />
        <Stat label="Lost" value={story.filter((g) => g.result === "L").length} color="var(--danger)" />
        <Stat
          label="Points"
          value={story.filter((g) => g.result === "W").length * 3 + story.filter((g) => g.result === "D").length}
        />
        <Stat label="Invincible odds" value={invLabel} />
      </div>

      {/* season timeline */}
      <div>
        <div style={{ fontSize: ".75rem", color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
          The 38-game story
        </div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {story.map((g, i) => (
            <span
              key={i}
              title={`MW${g.round}: ${g.home ? "vs" : "@"} ${g.oppName} — ${g.result}`}
              style={{
                width: 22,
                height: 22,
                display: "grid",
                placeItems: "center",
                borderRadius: 5,
                fontSize: ".62rem",
                fontWeight: 800,
                color: g.result === "W" ? "#04220f" : g.result === "D" ? "#04220f" : "#fff",
                background:
                  g.result === "W" ? "var(--accent)" : g.result === "D" ? "var(--gold)" : "var(--danger)",
              }}
            >
              {g.result}
            </span>
          ))}
        </div>
      </div>

      <p style={{ color: "var(--muted)", fontSize: ".82rem", margin: 0 }}>
        Over thousands of simulated seasons, an XI this strong goes a whole campaign unbeaten about{" "}
        <strong style={{ color: "var(--accent)" }}>{invLabel}</strong> of the time. Re-roll for a stronger
        side to shorten the odds.
      </p>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={share}>📋 Share result</button>
        <a className="btn" href="/leaderboard">🏆 Leaderboard</a>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="card" style={{ padding: ".6rem 1rem", textAlign: "center", minWidth: 84 }}>
      <div style={{ fontSize: "1.4rem", fontWeight: 900, color: color ?? "var(--text)" }}>{value}</div>
      <div style={{ fontSize: ".68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
    </div>
  );
}

function ordinalFinish(rating: number, strengths: Strength[]): string {
  if (!strengths.length) return "table";
  const sorted = strengths.map((s) => s.strength).sort((a, b) => a - b);
  const me = ratingToStrength(rating, sorted);
  const better = strengths.filter((s) => s.strength > me).length;
  const pos = Math.max(1, Math.min(20, better + 1));
  const sfx = pos % 10 === 1 && pos !== 11 ? "st" : pos % 10 === 2 && pos !== 12 ? "nd" : pos % 10 === 3 && pos !== 13 ? "rd" : "th";
  return `${pos}${sfx} place`;
}
