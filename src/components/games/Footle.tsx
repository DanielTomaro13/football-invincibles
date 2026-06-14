"use client";
import { useEffect, useMemo, useState } from "react";
import { loadGamesData, dailySeed, rng, type GamePlayer } from "@/lib/games-data";
import { recordDaily, todaysResult } from "@/lib/progress";
import DailyStatsPanel from "@/components/games/DailyStats";
import Confetti from "@/components/Confetti";

const MAX = 8;
const GAME = "footle";
const dayNumber = () => Math.floor((Date.now() - Date.UTC(2024, 0, 1)) / 86400000);
type Cell = { text: string; state: "hit" | "near" | "miss"; arrow?: "▲" | "▼" };

function age(born: number | null) {
  return born ? new Date().getFullYear() - born : null;
}

function compare(guess: GamePlayer, target: GamePlayer): Cell[] {
  const ga = age(guess.born);
  const ta = age(target.born);
  const cmp = (a: number | null, b: number | null, near: number) => {
    if (a == null || b == null) return { state: "miss" as const };
    if (a === b) return { state: "hit" as const };
    const within = Math.abs(a - b) <= near;
    return { state: within ? ("near" as const) : ("miss" as const), arrow: (a < b ? "▲" : "▼") as "▲" | "▼" };
  };
  const ageC = cmp(ga, ta, 2);
  const shirtC = cmp(guess.shirt, target.shirt, 3);
  return [
    { text: guess.pos.slice(0, 3), state: guess.pos === target.pos ? "hit" : "miss" },
    { text: guess.team, state: guess.team === target.team ? "hit" : "miss" },
    { text: guess.nat ?? "—", state: guess.nat === target.nat ? "hit" : "miss" },
    { text: ga != null ? String(ga) : "—", state: ageC.state, arrow: ageC.arrow },
    { text: guess.shirt != null ? `#${guess.shirt}` : "—", state: shirtC.state, arrow: shirtC.arrow },
  ];
}

const HEADERS = ["Pos", "Club", "Nation", "Age", "Shirt"];

export default function Footle() {
  const [pool, setPool] = useState<GamePlayer[]>([]);
  const [target, setTarget] = useState<GamePlayer | null>(null);
  const [guesses, setGuesses] = useState<GamePlayer[]>([]);
  const [query, setQuery] = useState("");
  const [done, setDone] = useState<"win" | "lose" | null>(null);
  const [playedEarlier, setPlayedEarlier] = useState(false);

  useEffect(() => {
    loadGamesData().then((d) => {
      const notable = d.players.filter((p) => p.fame > 6).slice(0, 280);
      setPool(notable);
      const r = rng(dailySeed("footle"));
      setTarget(notable[Math.floor(r() * notable.length)]);
      const prior = todaysResult(GAME);
      if (prior) {
        setDone(prior.won ? "win" : "lose");
        setPlayedEarlier(true);
      }
    });
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const guessed = new Set(guesses.map((g) => g.id));
    return pool
      .filter((p) => !guessed.has(p.id) && p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, pool, guesses]);

  const submit = (p: GamePlayer) => {
    if (done || !target) return;
    const next = [...guesses, p];
    setGuesses(next);
    setQuery("");
    if (p.id === target.id) {
      setDone("win");
      recordDaily(GAME, true, next.length);
    } else if (next.length >= MAX) {
      setDone("lose");
      recordDaily(GAME, false, 0);
    }
  };

  const shareText = useMemo(() => {
    if (!done) return "";
    const grid = guesses
      .map((g) =>
        target
          ? compare(g, target)
              .map((c) => (c.state === "hit" ? "🟩" : c.state === "near" ? "🟨" : "⬛"))
              .join("")
          : ""
      )
      .join("\n");
    const score = done === "win" ? `${guesses.length}/${MAX}` : `X/${MAX}`;
    return `Footle #${dayNumber()} ${score}\n${grid}\nfootballinvincibles.com/games/footle`;
  }, [done, guesses, target]);

  if (!target) return <p style={{ color: "var(--muted)" }}>Loading today&apos;s player…</p>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="chip">Guess {guesses.length}/{MAX}</span>
        <span className="chip">Daily player · resets at midnight UTC</span>
      </div>

      {/* header row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr repeat(5, 1fr)", gap: 6, fontSize: ".7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em", paddingInline: 4 }}>
        <span>Player</span>
        {HEADERS.map((h) => <span key={h} style={{ textAlign: "center" }}>{h}</span>)}
      </div>

      {/* guesses */}
      <div style={{ display: "grid", gap: 6 }}>
        {guesses.map((g) => {
          const cells = compare(g, target);
          return (
            <div key={g.id} className="pop" style={{ display: "grid", gridTemplateColumns: "1.6fr repeat(5, 1fr)", gap: 6 }}>
              <div className="card" style={{ padding: ".4rem .6rem", fontWeight: 700, display: "flex", alignItems: "center", fontSize: ".82rem" }}>
                {g.name}
              </div>
              {cells.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: ".8rem",
                    color: c.state === "miss" ? "var(--text)" : "#04220f",
                    background:
                      c.state === "hit" ? "var(--accent)" : c.state === "near" ? "var(--gold)" : "var(--panel-2)",
                  }}
                >
                  {c.text} {c.arrow ?? ""}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* input */}
      {!done && (
        <div style={{ position: "relative" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a player's name…"
            autoFocus
            style={{ width: "100%", padding: ".7rem .9rem", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
          />
          {suggestions.length > 0 && (
            <div className="card" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, marginTop: 4, overflow: "hidden" }}>
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => submit(p)}
                  style={{ display: "flex", width: "100%", gap: 10, alignItems: "center", padding: ".5rem .75rem", background: "transparent", border: "none", color: "var(--text)", cursor: "pointer", textAlign: "left" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt="" width={24} height={24} loading="lazy" style={{ borderRadius: "50%", background: "var(--panel-2)" }} />
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: ".78rem" }}>{p.team}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* legend */}
      <div style={{ display: "flex", gap: 14, fontSize: ".78rem", color: "var(--muted)", flexWrap: "wrap" }}>
        <Legend color="var(--accent)" label="Exact match" />
        <Legend color="var(--gold)" label="Close (age ±2, shirt ±3)" />
        <span>▲ higher · ▼ lower</span>
      </div>

      {done && (
        <>
          {done === "win" && !playedEarlier && <Confetti />}
          <div className="card pop" style={{ padding: "1.25rem", textAlign: "center" }}>
            {playedEarlier ? (
              <h2 style={{ margin: 0 }}>You&apos;ve already played today</h2>
            ) : done === "win" ? (
              <h2 style={{ color: "var(--accent)", margin: 0 }}>✅ Got it in {guesses.length}!</h2>
            ) : (
              <h2 style={{ color: "var(--danger)", margin: 0 }}>❌ Out of guesses</h2>
            )}
            <p style={{ margin: ".5rem 0 0" }}>
              Today&apos;s player was <strong>{target.name}</strong> ({target.team}).
            </p>
          </div>
          <DailyStatsPanel game={GAME} shareText={shareText} />
        </>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}
