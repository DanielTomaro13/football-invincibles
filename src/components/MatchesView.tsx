"use client";
import { useEffect, useState } from "react";
import { useCompetition } from "@/components/CompetitionProvider";
import { seasonLabel } from "@/lib/competitions";
import { loadHistoryIndex } from "@/lib/history";
import MatchweekView from "@/components/MatchweekView";
import type { LocalMatch } from "@/lib/local";
import CompetitionNote from "@/components/CompetitionNote";

/**
 * Competition-aware Fixtures/Results. Reads /data/<prefix>fixtures.json for the
 * active league (PL = "", Serie A = "seriea/") and renders the same matchweek
 * view used for the Premier League. Leagues without a fixtures feed fall back to
 * the honest "coming soon" note rather than silently showing another league.
 */
export default function MatchesView() {
  const { comp } = useCompetition();
  const [matches, setMatches] = useState<LocalMatch[] | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    setMatches(null);
    setMissing(false);
    Promise.all([
      fetch(`/data/${comp.dataPrefix}fixtures.json`, { cache: "force-cache" }).then((r) => (r.ok ? r.json() : Promise.reject())),
      loadHistoryIndex(comp.dataPrefix).catch(() => null),
    ])
      .then(([j, idx]) => {
        if (!alive) return;
        // teamId -> badge, from the current season's team list
        const badges = new Map<string, string>();
        for (const t of idx?.seasons?.[0]?.teams ?? []) if (t.badge) badges.set(String(t.id), t.badge);
        const raw: any[] = Array.isArray(j) ? j : j.matches ?? [];
        const played: LocalMatch[] = raw
          .filter((m) => m.hs != null && m.as != null)
          .map((m) => ({
            id: String(m.id),
            matchWeek: m.mw,
            home: { id: String(m.homeId), name: m.home, score: m.hs, badge: badges.get(String(m.homeId)) },
            away: { id: String(m.awayId), name: m.away, score: m.as, badge: badges.get(String(m.awayId)) },
            ground: m.ground,
          }));
        if (played.length) setMatches(played);
        else setMissing(true);
      })
      .catch(() => alive && setMissing(true));
    return () => { alive = false; };
  }, [comp.dataPrefix]);

  if (missing) {
    return (
      <div style={{ display: "grid", gap: "1.25rem" }}>
        <CompetitionNote section="Fixtures" />
      </div>
    );
  }

  const weeks = matches ? new Set(matches.map((m) => m.matchWeek)).size : 0;

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>{comp.name} Results</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          {comp.name} · {seasonLabel(comp.currentSeason)} · {weeks} matchweeks
        </p>
      </div>
      {matches ? <MatchweekView matches={matches} detailSlug={comp.slug === "premier-league" ? comp.slug : undefined} /> : <p style={{ color: "var(--muted)" }}>Loading fixtures…</p>}
    </div>
  );
}
