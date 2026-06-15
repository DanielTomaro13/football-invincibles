"use client";
import type { ReactNode } from "react";
import { useCompetition } from "@/components/CompetitionProvider";
import LeagueSwitch from "@/components/LeagueSwitch";

/**
 * Shows one league's section at a time with the global league switch. All panes
 * are server-rendered into the HTML (kept for SEO) — the inactive ones are just
 * hidden, so the page isn't a long scroll through every league at once.
 */
export default function LeaguePanes({ panes }: { panes: { slug: string; node: ReactNode }[] }) {
  const { comp } = useCompetition();
  const active = panes.some((p) => p.slug === comp.slug) ? comp.slug : panes[0]?.slug;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <LeagueSwitch />
      </div>
      {panes.map((p) => (
        <div key={p.slug} style={{ display: p.slug === active ? "block" : "none" }}>
          {p.node}
        </div>
      ))}
    </>
  );
}
