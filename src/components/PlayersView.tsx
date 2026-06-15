"use client";
import { useEffect, useMemo, useState } from "react";
import { useCompetition } from "@/components/CompetitionProvider";
import LeagueSwitch from "@/components/LeagueSwitch";
import PlayersBrowser, { type BrowsePlayer } from "@/components/PlayersBrowser";
import { loadHistoryIndex, loadSeasonRosters, type HistPlayer } from "@/lib/history";
import { seasonLabel } from "@/lib/competitions";

const plPhoto = (id: string | number) => `https://resources.premierleague.com/premierleague25/photos/players/40x40/${id}.png`;

export default function PlayersView() {
  const { comp } = useCompetition();
  const [players, setPlayers] = useState<BrowsePlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    Promise.all([loadHistoryIndex(comp.dataPrefix), loadSeasonRosters(comp.currentSeason, comp.dataPrefix)])
      .then(([idx, rosters]) => {
        if (!live) return;
        const teams = idx.seasons.find((s) => s.year === comp.currentSeason)?.teams ?? [];
        const teamName: Record<string, string> = {};
        for (const t of teams) teamName[t.id] = t.short || t.name;
        const out: BrowsePlayer[] = [];
        for (const [tid, list] of Object.entries(rosters)) {
          for (const p of list as HistPlayer[]) {
            out.push({
              id: p.id,
              name: p.name,
              team: teamName[tid] ?? "",
              pos: p.pos,
              nat: p.nat ?? null,
              g: p.g,
              a: p.a,
              apps: p.apps,
              photo: p.photo || plPhoto(p.id),
            });
          }
        }
        out.sort((a, b) => b.g - a.g || a.name.localeCompare(b.name));
        setPlayers(out);
        setLoading(false);
      })
      .catch(() => { if (live) { setPlayers([]); setLoading(false); } });
    return () => { live = false; };
  }, [comp.dataPrefix, comp.currentSeason]);

  const subtitle = useMemo(
    () => `${players.length} ${comp.shortName} players · ${seasonLabel(comp.currentSeason)}`,
    [players.length, comp.shortName, comp.currentSeason]
  );

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "0 0 .25rem" }}>Players</h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>{loading ? "Loading…" : subtitle}.</p>
        </div>
        <LeagueSwitch />
      </div>
      <PlayersBrowser players={players} linkable compSlug={comp.slug} />
    </div>
  );
}
