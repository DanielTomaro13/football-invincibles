"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { COMPETITIONS, DEFAULT_COMPETITION, getCompetition, type Competition } from "@/lib/competitions";

const KEY = "fi.competition";

interface Ctx {
  comp: Competition;
  setComp: (slug: string) => void;
}
const CompetitionCtx = createContext<Ctx>({ comp: DEFAULT_COMPETITION, setComp: () => {} });

export function useCompetition() {
  return useContext(CompetitionCtx);
}

export default function CompetitionProvider({ children }: { children: React.ReactNode }) {
  const [slug, setSlug] = useState(DEFAULT_COMPETITION.slug);

  useEffect(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (saved && getCompetition(saved)?.enabled) setSlug(saved);
  }, []);

  const setComp = useCallback((s: string) => {
    const c = getCompetition(s);
    if (!c || !c.enabled) return;
    setSlug(s);
    try {
      localStorage.setItem(KEY, s);
    } catch {}
  }, []);

  const comp = getCompetition(slug) ?? DEFAULT_COMPETITION;

  // theme the whole site in the active league's colour so it's obvious which is selected
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", comp.accent);
    root.style.setProperty("--accent-ink", comp.accentInk);
  }, [comp.accent, comp.accentInk]);
  return <CompetitionCtx.Provider value={{ comp, setComp }}>{children}</CompetitionCtx.Provider>;
}

export { COMPETITIONS };
