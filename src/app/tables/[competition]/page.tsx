import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TablesView from "@/components/TablesView";
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

  return <TablesView forceSlug={comp.slug} />;
}
