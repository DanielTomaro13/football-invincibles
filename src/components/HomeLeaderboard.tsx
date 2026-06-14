"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { topScores, type ScoreEntry } from "@/lib/leaderboard";
import { useCompetition } from "@/components/CompetitionProvider";
import LeagueSwitch from "@/components/LeagueSwitch";
import DailyLeaderboard from "@/components/DailyLeaderboard";

export default function HomeLeaderboard() {
  const { comp } = useCompetition();
  const [wall, setWall] = useState<ScoreEntry[]>([]);
  const [inv, setInv] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    topScores(`undefeated:${comp.slug}`, true, 6).then(setWall);
    topScores(`invincibles:${comp.slug}`, true, 6).then(setInv);
  }, [comp.slug]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <LeagueSwitch compact />
      </div>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <DailyLeaderboard />
        <Board
          title={`🛡️ ${comp.shortName} Invincibles Wall`}
          subtitle="Managers who went a season unbeaten"
          rows={wall}
          unit="pts"
          gold
          emptyHref="/games/invincibles"
          emptyText="Be the first to go unbeaten →"
        />
        <Board
          title="🏆 Invincibles — top points"
          subtitle={`Best simulated ${comp.shortName} seasons`}
          rows={inv}
          unit="pts"
          emptyHref="/games/invincibles"
          emptyText="Play Invincibles →"
        />
      </div>
    </div>
  );
}

function Board({
  title,
  subtitle,
  rows,
  unit,
  gold,
  emptyHref,
  emptyText,
}: {
  title: string;
  subtitle: string;
  rows: ScoreEntry[];
  unit: string;
  gold?: boolean;
  emptyHref: string;
  emptyText: string;
}) {
  return (
    <div className="card" style={{ padding: "1rem", borderColor: gold ? "var(--gold)" : "var(--border)" }}>
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{title}</h3>
        <div style={{ color: "var(--muted)", fontSize: ".8rem" }}>{subtitle}</div>
      </div>
      {rows.length === 0 ? (
        <Link href={emptyHref} style={{ color: "var(--accent)", fontWeight: 600, fontSize: ".9rem" }}>
          {emptyText}
        </Link>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
          {rows.map((e, i) => (
            <li key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 2px", fontSize: ".9rem" }}>
              <span style={{ width: 20, textAlign: "center", fontWeight: 800, color: i === 0 && gold ? "var(--gold)" : "var(--muted)" }}>
                {i === 0 && gold ? "👑" : i + 1}
              </span>
              <span style={{ flex: 1, fontWeight: 600 }}>
                {e.name} {gold && e.score >= 114 && "⭐"}
              </span>
              <strong style={{ color: gold ? "var(--gold)" : "var(--accent)" }}>
                {e.score} {unit}
              </strong>
            </li>
          ))}
        </ol>
      )}
      <Link href="/leaderboard" style={{ display: "inline-block", marginTop: 10, color: "var(--accent)", fontSize: ".85rem", fontWeight: 600 }}>
        Full Hall of Fame →
      </Link>
    </div>
  );
}
