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
  const [wall, setWall] = useState<ScoreEntry[]>([]);
  const [bests, setBests] = useState<Record<string, number>>({});
  const [streaks, setStreaks] = useState<Record<string, { cur: number; max: number }>>({});
  const global = isGlobal();

  useEffect(() => {
    setName(getName());
    topScores("undefeated", true, 25).then(setWall);
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

      {/* The Invincibles Wall — unbeaten seasons */}
      <section>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: 4 }}>🛡️ The Invincibles Wall</h2>
        <p style={{ color: "var(--muted)", fontSize: ".88rem", margin: "0 0 10px" }}>
          Managers who built a side that went a whole season <strong>unbeaten</strong> — no losses. Ranked by points,
          so the closer to a perfect, all-win campaign, the higher you climb. ⭐ marks a flawless 38-win season.
        </p>
        <div className="card" style={{ padding: "1rem", borderColor: "var(--gold)" }}>
          {wall.length === 0 ? (
            <p style={{ color: "var(--muted)", margin: 0 }}>
              No one&apos;s gone unbeaten yet. Build a title-class XI in the{" "}
              <a href="/games/invincibles" style={{ color: "var(--accent)" }}>Invincibles</a> game and etch your name here.
            </p>
          ) : (
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
              {wall.map((e, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 4px", borderBottom: i < wall.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ width: 26, fontWeight: 900, color: i === 0 ? "var(--gold)" : "var(--muted)", textAlign: "center" }}>
                    {i === 0 ? "👑" : i + 1}
                  </span>
                  <span style={{ flex: 1, fontWeight: 700 }}>
                    {e.name} {e.score >= 114 && <span title="Perfect season">⭐</span>}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: ".82rem" }}>{Math.round(e.score / 3)}W</span>
                  <strong style={{ color: "var(--gold)", minWidth: 48, textAlign: "right" }}>{e.score} pts</strong>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

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
