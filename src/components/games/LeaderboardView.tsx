"use client";
import { useEffect, useState } from "react";
import { topScores, isGlobal, type ScoreEntry } from "@/lib/leaderboard";
import { getName, setName as persistName, getDaily, getScore } from "@/lib/progress";

const BOARDS = [
  { game: "invincibles", label: "Invincibles", unit: "pts", emoji: "🏆" },
  { game: "higher-or-lower", label: "Higher or Lower", unit: "streak", emoji: "⚖️" },
  { game: "beat-the-clock", label: "Beat the Clock", unit: "named", emoji: "⏱️" },
  { game: "score-predictor", label: "Score Predictor", unit: "pts", emoji: "🎯" },
];

const DAILIES = [
  { game: "footle", label: "Footle", emoji: "🟩" },
  { game: "guess-the-player", label: "Guess the Player", emoji: "🕵️" },
];

export default function LeaderboardView() {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [boards, setBoards] = useState<Record<string, ScoreEntry[]>>({});
  const [bests, setBests] = useState<Record<string, number>>({});
  const [streaks, setStreaks] = useState<Record<string, { cur: number; max: number }>>({});
  const global = isGlobal();

  useEffect(() => {
    setName(getName());
    Promise.all(BOARDS.map((b) => topScores(b.game, true, 10))).then((res) => {
      const m: Record<string, ScoreEntry[]> = {};
      BOARDS.forEach((b, i) => (m[b.game] = res[i]));
      setBoards(m);
    });
    const pb: Record<string, number> = {};
    BOARDS.forEach((b) => (pb[b.game] = getScore(b.game).best));
    setBests(pb);
    const st: Record<string, { cur: number; max: number }> = {};
    DAILIES.forEach((d) => {
      const s = getDaily(d.game);
      st[d.game] = { cur: s.cur, max: s.max };
    });
    setStreaks(st);
  }, []);

  const saveName = () => {
    persistName(name);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* name + mode */}
      <div className="card" style={{ padding: "1rem", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: "var(--muted)" }}>Your leaderboard name:</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pick a name…"
          maxLength={16}
          style={{ padding: ".5rem .7rem", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)" }}
        />
        <button className="btn btn-primary" onClick={saveName}>{saved ? "Saved!" : "Save"}</button>
        <span className="chip" style={{ marginLeft: "auto" }}>
          {global ? "🌍 Global leaderboards" : "💾 Local (this browser)"}
        </span>
      </div>

      {!global && (
        <p style={{ color: "var(--muted)", fontSize: ".85rem", margin: 0 }}>
          A global backend isn&apos;t configured yet, so scores are saved in this browser. Set{" "}
          <code>NEXT_PUBLIC_LEADERBOARD_URL</code> (see <code>/worker</code>) to go global.
        </p>
      )}

      {/* daily streaks */}
      <section>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 10 }}>Your daily streaks</h2>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
          {DAILIES.map((d) => (
            <div key={d.game} className="card" style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{d.emoji} {d.label}</div>
                <div style={{ color: "var(--muted)", fontSize: ".8rem" }}>Current / best</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--accent)" }}>🔥 {streaks[d.game]?.cur ?? 0}</div>
                <div style={{ color: "var(--muted)", fontSize: ".8rem" }}>best {streaks[d.game]?.max ?? 0}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* score leaderboards */}
      <section>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 10 }}>Top scores</h2>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
          {BOARDS.map((b) => (
            <div key={b.game} className="card" style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>{b.emoji} {b.label}</h3>
                <span className="chip">your best: {bests[b.game] ?? 0} {b.unit}</span>
              </div>
              <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
                {(boards[b.game] ?? []).map((e, i) => (
                  <li key={i} style={{ display: "flex", gap: 8, padding: "4px 2px", fontSize: ".9rem" }}>
                    <span style={{ width: 18, color: "var(--muted)", fontWeight: 700 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontWeight: 600 }}>{e.name}</span>
                    <strong style={{ color: "var(--accent)" }}>{e.score}</strong>
                  </li>
                ))}
                {(boards[b.game] ?? []).length === 0 && (
                  <li style={{ color: "var(--muted)", fontSize: ".85rem" }}>No scores yet — be the first!</li>
                )}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
