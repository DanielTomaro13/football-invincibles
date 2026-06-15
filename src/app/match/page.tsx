import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMeta } from "@/lib/seo";
import MatchDetail from "@/components/MatchDetail";

export const metadata: Metadata = pageMeta({
  title: "Match Centre",
  description: "Lineups, goals, cards and team stats for the match.",
  path: "/match",
});

export default function MatchPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--muted)" }}>Loading…</p>}>
      <MatchDetail />
    </Suspense>
  );
}
