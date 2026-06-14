"use client";
import { useEffect, useState } from "react";
import { teamBadge } from "@/lib/api-client";

interface Fixture {
  id: string;
  mw: number;
  home: string;
  homeId: string;
  hs: number;
  away: string;
  awayId: string;
  as: number;
}

const ROUNDS = 10;

export default function ScorePredictor() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [i, setI] = useState(0);
  const [h, setH] = useState(0);
  const [a, setA] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [points, setPoints] = useState(0);
  const [log, setLog] = useState<{ exact: boolean; outcome: boolean }[]>([]);

  useEffect(() => {
    fetch("/data/fixtures.json", { cache: "force-cache" })
      .then((r) => r.json())
      .then((d) => {
        const shuffled = [...d.matches].sort(() => Math.random() - 0.5).slice(0, ROUNDS);
        setFixtures(shuffled);
      });
  }, []);

  if (!fixtures.length) return <p style={{ color: "var(--muted)" }}>Loading fixtures…</p>;

  const done = i >= fixtures.length;
  const f = fixtures[Math.min(i, fixtures.length - 1)];

  const reveal = () => {
    if (revealed) return;
    const exact = h === f.hs && a === f.as;
    const sign = (x: number, y: number) => (x > y ? 1 : x < y ? -1 : 0);
    const outcome = sign(h, a) === sign(f.hs, f.as);
    setPoints((p) => p + (exact ? 5 : outcome ? 2 : 0));
    setLog((l) => [...l, { exact, outcome }]);
    setRevealed(true);
  };

  const next = () => {
    setI((x) => x + 1);
    setH(0);
    setA(0);
    setRevealed(false);
  };

  if (done) {
    const exacts = log.filter((l) => l.exact).length;
    const outcomes = log.filter((l) => l.outcome && !l.exact).length;
    return (
      <div className="card pop" style={{ padding: "1.5rem", textAlign: "center" }}>
        <h2 style={{ margin: 0 }}>Final score: {points} pts</h2>
        <p style={{ color: "var(--muted)" }}>
          {exacts} exact scoreline{exacts === 1 ? "" : "s"} (5pts) · {outcomes} correct result{outcomes === 1 ? "" : "s"} (2pts)
        </p>
        <button className="btn btn-primary" onClick={() => { setI(0); setPoints(0); setLog([]); setRevealed(false); }}>
          Play again
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="chip">Match {i + 1}/{fixtures.length}</span>
        <span className="chip">Points: {points}</span>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "center" }}>
          <Team name={f.home} id={f.homeId} />
          <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Stepper value={h} set={setH} disabled={revealed} />
              <span style={{ fontWeight: 900 }}>–</span>
              <Stepper value={a} set={setA} disabled={revealed} />
            </div>
            {revealed && (
              <div className="pop" style={{ fontSize: ".82rem", color: "var(--muted)" }}>
                Actual: <strong style={{ color: "var(--text)" }}>{f.hs}–{f.as}</strong>
              </div>
            )}
          </div>
          <Team name={f.away} id={f.awayId} right />
        </div>
      </div>

      {!revealed ? (
        <button className="btn btn-primary" onClick={reveal} style={{ justifySelf: "center" }}>Lock in prediction</button>
      ) : (
        <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
          <div style={{ fontWeight: 800, color: log.at(-1)?.exact ? "var(--gold)" : log.at(-1)?.outcome ? "var(--accent)" : "var(--danger)" }}>
            {log.at(-1)?.exact ? "🎯 Exact! +5" : log.at(-1)?.outcome ? "✅ Right result +2" : "❌ Wrong +0"}
          </div>
          <button className="btn" onClick={next}>Next match →</button>
        </div>
      )}
    </div>
  );
}

function Team({ name, id, right }: { name: string; id: string; right?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={teamBadge(id)} alt={name} width={44} height={44} loading="lazy" />
      <strong style={{ textAlign: "center", fontSize: ".9rem" }}>{name}</strong>
    </div>
  );
}

function Stepper({ value, set, disabled }: { value: number; set: (n: number) => void; disabled: boolean }) {
  return (
    <div style={{ display: "grid", gap: 4, justifyItems: "center" }}>
      <button className="chip" disabled={disabled} style={{ cursor: disabled ? "default" : "pointer", padding: ".1rem .5rem" }} onClick={() => set(Math.min(9, value + 1))}>▲</button>
      <div style={{ width: 44, height: 44, display: "grid", placeItems: "center", background: "var(--panel-2)", borderRadius: 10, fontSize: "1.5rem", fontWeight: 900 }}>{value}</div>
      <button className="chip" disabled={disabled} style={{ cursor: disabled ? "default" : "pointer", padding: ".1rem .5rem" }} onClick={() => set(Math.max(0, value - 1))}>▼</button>
    </div>
  );
}
