"use client";
import { useState } from "react";
import { getName, setName as persistName } from "@/lib/progress";
import { submitScore, isGlobal } from "@/lib/leaderboard";

/**
 * Name + submit control shown on game end screens. Lets the player type the
 * name that goes on the leaderboard (pre-filled with their saved name), then
 * posts the score(s). `entries` is usually one board, but Invincibles also
 * posts to the "undefeated" wall when the season is unbeaten.
 */
export default function ScoreSubmit({
  entries,
  label = "Submit to leaderboard",
}: {
  entries: { game: string; score: number }[];
  label?: string;
}) {
  const [name, setName] = useState(getName());
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const n = (name.trim() || "Anonymous").slice(0, 16);
    setBusy(true);
    persistName(n);
    await Promise.all(entries.map((e) => submitScore(e.game, e.score)));
    setDone(true);
    setBusy(false);
  };

  if (done) {
    return (
      <p style={{ textAlign: "center", color: "var(--accent)", fontWeight: 700, margin: 0 }}>
        ✓ Posted to the {isGlobal() ? "global" : "local"} leaderboard as{" "}
        <strong>{name.trim() || "Anonymous"}</strong>
      </p>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        maxLength={16}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        style={{
          padding: ".6rem .8rem",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          color: "var(--text)",
          minWidth: 160,
        }}
      />
      <button className="btn btn-primary" onClick={submit} disabled={busy}>
        {busy ? "Posting…" : label}
      </button>
    </div>
  );
}
