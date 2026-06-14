"use client";
import { useEffect, useMemo, useState } from "react";
import { loadGamesData, dailySeed, rng, type GamePlayer } from "@/lib/games-data";

function age(b: number | null) {
  return b ? new Date().getFullYear() - b : null;
}

export default function GuessThePlayer() {
  const [pool, setPool] = useState<GamePlayer[]>([]);
  const [target, setTarget] = useState<GamePlayer | null>(null);
  const [revealed, setRevealed] = useState(1);
  const [query, setQuery] = useState("");
  const [wrong, setWrong] = useState<string[]>([]);
  const [done, setDone] = useState<"win" | "lose" | null>(null);

  useEffect(() => {
    loadGamesData().then((d) => {
      const notable = d.players.filter((p) => p.fame > 6).slice(0, 280);
      setPool(notable);
      const r = rng(dailySeed("guess"));
      setTarget(notable[Math.floor(r() * notable.length)]);
    });
  }, []);

  const clues = useMemo(() => {
    if (!target) return [];
    return [
      { label: "Nationality", value: target.nat ?? "Unknown" },
      { label: "Position", value: target.pos },
      { label: "Age", value: age(target.born) != null ? `${age(target.born)} years old` : "Unknown" },
      { label: "Club", value: target.team },
      { label: "Shirt number", value: target.shirt != null ? `#${target.shirt}` : "Unknown" },
      { label: "Season goals / assists", value: `${target.g} goals, ${target.a} assists` },
      { label: "Initials", value: target.name.split(" ").map((w) => w[0]).join(". ") + "." },
    ];
  }, [target]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return pool.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, pool]);

  const score = Math.max(10, 100 - (revealed - 1) * 14 - wrong.length * 8);

  const submit = (p: GamePlayer) => {
    if (!target || done) return;
    setQuery("");
    if (p.id === target.id) {
      setDone("win");
      return;
    }
    setWrong((w) => [...w, p.name]);
    if (revealed >= clues.length) setDone("lose");
    else setRevealed((r) => r + 1);
  };

  const revealNext = () => {
    if (revealed >= clues.length) setDone("lose");
    else setRevealed((r) => r + 1);
  };

  if (!target) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="chip">Clues used: {revealed}/{clues.length}</span>
        <span className="chip">Potential score: {done === "win" ? score : score}</span>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {clues.slice(0, revealed).map((c, i) => (
          <div key={i} className="card pop" style={{ padding: ".7rem 1rem", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted)" }}>{c.label}</span>
            <strong>{c.value}</strong>
          </div>
        ))}
      </div>

      {wrong.length > 0 && !done && (
        <div style={{ color: "var(--danger)", fontSize: ".85rem" }}>✗ {wrong.join(", ")}</div>
      )}

      {!done && (
        <>
          <div style={{ position: "relative" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name the player…"
              style={{ width: "100%", padding: ".7rem .9rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
            />
            {suggestions.length > 0 && (
              <div className="card" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, marginTop: 4, overflow: "hidden" }}>
                {suggestions.map((p) => (
                  <button key={p.id} onClick={() => submit(p)} style={{ display: "flex", width: "100%", gap: 10, alignItems: "center", padding: ".5rem .75rem", background: "transparent", border: "none", color: "var(--text)", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: ".78rem" }}>{p.team}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn" onClick={revealNext} style={{ justifySelf: "start" }}>
            Reveal another clue (–points)
          </button>
        </>
      )}

      {done && (
        <div className="card pop" style={{ padding: "1.25rem", textAlign: "center" }}>
          {done === "win" ? (
            <h2 style={{ color: "var(--accent)", margin: 0 }}>✅ Correct — {score} points!</h2>
          ) : (
            <h2 style={{ color: "var(--danger)", margin: 0 }}>❌ It was {target.name}</h2>
          )}
          <p style={{ color: "var(--muted)", margin: ".4rem 0 0" }}>{target.name} · {target.team} · {target.pos}</p>
        </div>
      )}
    </div>
  );
}
