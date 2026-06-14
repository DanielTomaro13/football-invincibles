"use client";
import { useEffect, useState, useCallback } from "react";
import { loadGamesData, type GamePlayer } from "@/lib/games-data";

function age(b: number | null) {
  return b ? new Date().getFullYear() - b : null;
}

export default function CareerPath() {
  const [pool, setPool] = useState<GamePlayer[]>([]);
  const [target, setTarget] = useState<GamePlayer | null>(null);
  const [options, setOptions] = useState<GamePlayer[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);

  const newRound = useCallback((p: GamePlayer[]) => {
    const t = p[Math.floor(Math.random() * p.length)];
    const distractors: GamePlayer[] = [];
    while (distractors.length < 3) {
      const d = p[Math.floor(Math.random() * p.length)];
      if (d.id !== t.id && !distractors.find((x) => x.id === d.id)) distractors.push(d);
    }
    const opts = [t, ...distractors].sort(() => Math.random() - 0.5);
    setTarget(t);
    setOptions(opts);
    setPicked(null);
  }, []);

  useEffect(() => {
    loadGamesData().then((d) => {
      const notable = d.players.filter((p) => p.fame > 8).slice(0, 240);
      setPool(notable);
      newRound(notable);
    });
  }, [newRound]);

  const choose = (id: number) => {
    if (picked != null || !target) return;
    setPicked(id);
    if (id === target.id) setScore((s) => s + 1);
    setRound((r) => r + 1);
    setTimeout(() => newRound(pool), 1100);
  };

  if (!target) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  const facts = [
    { label: "Club", value: target.team },
    { label: "Position", value: target.pos },
    { label: "Nationality", value: target.nat ?? "—" },
    { label: "Shirt", value: target.shirt != null ? `#${target.shirt}` : "—" },
    { label: "Age", value: age(target.born) != null ? `${age(target.born)}` : "—" },
    { label: "Preferred foot", value: target.foot ?? "—" },
  ];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="chip">Round {round + 1}</span>
        <span className="chip">Score: {score}</span>
      </div>

      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ color: "var(--muted)", fontSize: ".8rem", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>
          Who is this player?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
          {facts.map((f) => (
            <div key={f.label} style={{ background: "var(--panel-2)", borderRadius: 10, padding: ".6rem .8rem" }}>
              <div style={{ fontSize: ".68rem", color: "var(--muted)", textTransform: "uppercase" }}>{f.label}</div>
              <div style={{ fontWeight: 800 }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        {options.map((o) => {
          const isTarget = o.id === target.id;
          const state = picked == null ? "idle" : isTarget ? "correct" : o.id === picked ? "wrong" : "idle";
          return (
            <button
              key={o.id}
              onClick={() => choose(o.id)}
              disabled={picked != null}
              className="card"
              style={{
                padding: ".9rem",
                fontWeight: 700,
                cursor: picked == null ? "pointer" : "default",
                borderColor: state === "correct" ? "var(--accent)" : state === "wrong" ? "var(--danger)" : "var(--border)",
                background: state === "correct" ? "rgba(0,230,118,.12)" : state === "wrong" ? "rgba(255,93,115,.12)" : undefined,
                color: "var(--text)",
              }}
            >
              {o.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
