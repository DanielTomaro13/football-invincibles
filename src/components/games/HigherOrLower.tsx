"use client";
import { useEffect, useState, useCallback } from "react";
import { loadGamesData, type GamePlayer } from "@/lib/games-data";
import { recordScore } from "@/lib/progress";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const GAME = "higher-or-lower";

const METRICS: { key: keyof GamePlayer; label: string; noun: string }[] = [
  { key: "g", label: "goals", noun: "goals" },
  { key: "a", label: "assists", noun: "assists" },
  { key: "apps", label: "appearances", noun: "appearances" },
];

export default function HigherOrLower() {
  const [pool, setPool] = useState<GamePlayer[]>([]);
  const [metric, setMetric] = useState(METRICS[0]);
  const [left, setLeft] = useState<GamePlayer | null>(null);
  const [right, setRight] = useState<GamePlayer | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [over, setOver] = useState(false);
  const [newBest, setNewBest] = useState(false);

  const pick = useCallback(
    (exclude: number[], p: GamePlayer[] = pool) => {
      const cand = p.filter((x) => !exclude.includes(x.id));
      return cand[Math.floor(Math.random() * cand.length)];
    },
    [pool]
  );

  const newRound = useCallback(
    (p: GamePlayer[]) => {
      const m = METRICS[Math.floor(Math.random() * METRICS.length)];
      setMetric(m);
      const a = p[Math.floor(Math.random() * p.length)];
      let b = p[Math.floor(Math.random() * p.length)];
      while (b.id === a.id) b = p[Math.floor(Math.random() * p.length)];
      setLeft(a);
      setRight(b);
      setReveal(false);
    },
    []
  );

  useEffect(() => {
    loadGamesData().then((d) => {
      const notable = d.players.filter((p) => p.apps >= 5).slice(0, 220);
      setPool(notable);
      newRound(notable);
    });
  }, [newRound]);

  const guess = (higher: boolean) => {
    if (!left || !right || reveal) return;
    const lv = left[metric.key] as number;
    const rv = right[metric.key] as number;
    const correct = higher ? rv >= lv : rv <= lv;
    setReveal(true);
    setTimeout(() => {
      if (correct) {
        const s = streak + 1;
        setStreak(s);
        setBest((b) => Math.max(b, s));
        // shift right -> left, draw new right
        const nl = right;
        let nr = pick([nl.id]);
        const m = METRICS[Math.floor(Math.random() * METRICS.length)];
        setMetric(m);
        setLeft(nl);
        setRight(nr);
        setReveal(false);
      } else {
        setOver(true);
        const nb = recordScore(GAME, streak);
        setNewBest(nb && streak > 0);
      }
    }, 900);
  };

  const restart = () => {
    setStreak(0);
    setOver(false);
    newRound(pool);
  };

  if (!left || !right) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="chip">🔥 Streak: {streak}</span>
        <span className="chip">Best: {best}</span>
      </div>

      <p style={{ textAlign: "center", margin: 0, color: "var(--muted)" }}>
        Did <strong style={{ color: "var(--text)" }}>{right.name}</strong> get{" "}
        <strong style={{ color: "var(--accent)" }}>more</strong> or{" "}
        <strong style={{ color: "var(--danger)" }}>fewer</strong> {metric.label} than{" "}
        <strong style={{ color: "var(--text)" }}>{left.name}</strong>?
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
        <PlayerSide p={left} metric={metric} reveal />
        <div style={{ fontWeight: 900, color: "var(--muted)" }}>vs</div>
        <PlayerSide p={right} metric={metric} reveal={reveal} />
      </div>

      {!over && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-primary" disabled={reveal} onClick={() => guess(true)}>▲ More</button>
          <button className="btn" disabled={reveal} onClick={() => guess(false)}>▼ Fewer / same</button>
        </div>
      )}

      {over && (
        <div className="card pop" style={{ padding: "1.25rem", textAlign: "center" }}>
          <h2 style={{ margin: 0, color: "var(--danger)" }}>Streak over — {streak}</h2>
          {newBest && <div style={{ color: "var(--gold)", fontWeight: 800, marginTop: 6 }}>🏅 New personal best!</div>}
          <p style={{ color: "var(--muted)" }}>
            {right.name} had {right[metric.key] as number} {metric.label} vs {left.name}&apos;s {left[metric.key] as number}.
          </p>
          {streak > 0 && (
            <div style={{ marginBottom: 12 }}>
              <ScoreSubmit entries={[{ game: GAME, score: streak }]} />
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={restart}>Play again</button>
            <a className="btn" href="/leaderboard">🏆 Leaderboard</a>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerSide({
  p,
  metric,
  reveal,
}: {
  p: GamePlayer;
  metric: { key: keyof GamePlayer; label: string };
  reveal: boolean;
}) {
  return (
    <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.photo} alt={p.name} width={64} height={80} loading="lazy" style={{ borderRadius: 10, background: "var(--panel-2)", objectFit: "cover" }} />
      <div style={{ fontWeight: 800, marginTop: 6 }}>{p.name}</div>
      <div style={{ color: "var(--muted)", fontSize: ".8rem" }}>{p.team}</div>
      <div style={{ marginTop: 8, fontSize: "1.8rem", fontWeight: 900, color: reveal ? "var(--accent)" : "var(--muted)", minHeight: 36 }}>
        {reveal ? (p[metric.key] as number) : "?"}
      </div>
      <div style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase" }}>{metric.label}</div>
    </div>
  );
}
