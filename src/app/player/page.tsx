import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMeta } from "@/lib/seo";
import PlayerProfile from "@/components/PlayerProfile";

export const metadata: Metadata = pageMeta({
  title: "Player Profile",
  description: "Season-by-season record for any player across the Premier League, LaLiga and Serie A.",
  path: "/player",
});

export default function PlayerPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--muted)" }}>Loading…</p>}>
      <PlayerProfile />
    </Suspense>
  );
}
