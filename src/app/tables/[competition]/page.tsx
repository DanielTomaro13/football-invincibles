import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StandingsTable from "@/components/StandingsTable";
import { COMPETITIONS, getCompetition, seasonLabel } from "@/lib/competitions";
import { pageMeta } from "@/lib/seo";

export function generateStaticParams() {
  return COMPETITIONS.filter((c) => c.enabled).map((c) => ({ competition: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competition: string }>;
}): Promise<Metadata> {
  const { competition } = await params;
  const comp = getCompetition(competition);
  if (!comp) return {};
  return pageMeta({
    title: `${comp.name} Table ${seasonLabel(comp.currentSeason)}`,
    description: `Live ${comp.name} standings for ${seasonLabel(comp.currentSeason)}.`,
    path: `/tables/${comp.slug}`,
  });
}

export default async function CompetitionTable({
  params,
}: {
  params: Promise<{ competition: string }>;
}) {
  const { competition } = await params;
  const comp = getCompetition(competition);
  if (!comp || !comp.enabled) notFound();

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: 0 }}>{comp.name} Table</h1>
      <p style={{ color: "var(--muted)", margin: 0 }}>{seasonLabel(comp.currentSeason)} season.</p>
      <StandingsTable comp={comp} />
    </div>
  );
}
