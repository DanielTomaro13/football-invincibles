"use client";
import { useEffect, useState, useCallback } from "react";
import { recordScore } from "@/lib/progress";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const GAME = "rating-duel";
interface Duel { n: string; ph: string | null; r: number; c: string; l: string; y: string }
const seasonLabel = (y: string) => `${y}/${String((Number(y) + 1) % 100).padStart(2, "0")}`;

export default function RatingDuel() {
  const [pool, setPool] = useState<Duel[]>([]);
  const [left, setLeft] = useState<Duel | null>(null);
  const [right, setRight] = useState<Duel | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [picked, setPicked] = useState<"left" | "right" | null>(null);
  const [over, setOver] = useState(false);
  const [newBest, setNewBest] = useState(false);

  const draw = useCallback((p: Duel[], keep?: Duel) => {
    const rnd = () => p[Math.floor(Math.random() * p.length)];
    const a = keep ?? rnd();
    let b = rnd();
    let guard = 0;
    // distinct player + a meaningful rating gap so there's a right answer
    while ((b.n === a.n || Math.abs(b.r - a.r) < 1) && guard++ < 50) b = rnd();
    if (keep) { setRight(b); } else { setLeft(a); setRight(b); }
    setReveal(false); setPicked(null);
  }, []);

  useEffect(() => {
    fetch("/data/duel.json", { cache: "force-cache" })
      .then((r) => r.json())
      .then((d: Duel[]) => { setPool(d); draw(d); })
      .catch(() => setPool([]));
  }, [draw]);

  const choose = (side: "left" | "right") => {
    if (!left || !right || reveal) return;
    setPicked(side);
    setReveal(true);
    const correct = (side === "left" ? left.r : right.r) >= (side === "left" ? right.r : left.r);
    setTimeout(() => {
      if (correct) {
        const s = streak + 1;
        setStreak(s); setBest((b) => Math.max(b, s));
        const winner = left.r >= right.r ? left : right;
        setLeft(winner); draw(pool, winner);
      } else {
        setOver(true);
        const nb = recordScore(GAME, streak);
        setNewBest(nb && streak > 0);
      }
    }, 1100);
  };

  const restart = () => { setStreak(0); setOver(false); draw(pool); };
  if (!left || !right) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="chip">🔥 Streak: {streak}</span>
        <span className="chip">Best: {best}</span>
      </div>
      <p style={{ textAlign: "center", margin: 0, color: "var(--muted)" }}>
        Tap the player who had the <strong style={{ color: "var(--accent)" }}>higher-rated season</strong>.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
        <Card d={left} reveal={reveal} picked={picked === "left"} win={reveal && left.r >= right.r} disabled={reveal || over} onPick={() => choose("left")} />
        <div style={{ fontWeight: 900, color: "var(--muted)" }}>vs</div>
        <Card d={right} reveal={reveal} picked={picked === "right"} win={reveal && right.r >= left.r} disabled={reveal || over} onPick={() => choose("right")} />
      </div>

      {over && (
        <div className="card pop" style={{ padding: "1.25rem", textAlign: "center" }}>
          <h2 style={{ margin: 0, color: "var(--danger)" }}>Streak over — {streak}</h2>
          {newBest && <div style={{ color: "var(--gold)", fontWeight: 800, marginTop: 6 }}>🏅 New personal best!</div>}
          <p style={{ color: "var(--muted)" }}>{left.n} ({left.r}) vs {right.n} ({right.r}).</p>
          {streak > 0 && <div style={{ marginBottom: 12 }}><ScoreSubmit entries={[{ game: GAME, score: streak }]} /></div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={restart}>Play again</button>
            <a className="btn" href="/leaderboard">🏆 Leaderboard</a>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ d, reveal, picked, win, disabled, onPick }: { d: Duel; reveal: boolean; picked: boolean; win: boolean; disabled: boolean; onPick: () => void }) {
  const border = reveal ? (win ? "var(--accent)" : "var(--danger)") : picked ? "var(--accent)" : "var(--border)";
  return (
    <button onClick={onPick} disabled={disabled} className="card" style={{ padding: "1rem", textAlign: "center", border: `2px solid ${border}`, cursor: disabled ? "default" : "pointer", background: "var(--panel)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={d.ph || ""} alt={d.n} width={72} height={90} loading="lazy" style={{ borderRadius: 10, background: "var(--panel-2)", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
      <div style={{ fontWeight: 800, marginTop: 6 }}>{d.n}</div>
      <div style={{ color: "var(--muted)", fontSize: ".78rem" }}>{d.c} · {seasonLabel(d.y)} · {d.l}</div>
      <div style={{ marginTop: 8, fontSize: "1.8rem", fontWeight: 900, color: reveal ? (win ? "var(--accent)" : "var(--danger)") : "var(--muted)", minHeight: 36 }}>
        {reveal ? d.r : "?"}
      </div>
      <div style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase" }}>season rating</div>
    </button>
  );
}
