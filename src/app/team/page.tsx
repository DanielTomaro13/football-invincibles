import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMeta } from "@/lib/seo";
import TeamProfile from "@/components/TeamProfile";

export const metadata: Metadata = pageMeta({
  title: "Club Profile",
  description: "Season-by-season league finishes and squads for any club across the Premier League, LaLiga and Serie A.",
  path: "/team",
});

export default function TeamPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--muted)" }}>Loading…</p>}>
      <TeamProfile />
    </Suspense>
  );
}
