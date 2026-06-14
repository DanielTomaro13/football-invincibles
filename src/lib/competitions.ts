/**
 * Competition registry.
 *
 * football-invincibles is multi-competition by design. Today only the Premier
 * League is wired up against live data, but adding another competition is just
 * a matter of adding an entry here (and, if it lives on a different data
 * platform, a matching client in lib/api.ts).
 *
 * `sdpId` is the competition id on the Premier League "SDP" API. Other leagues
 * that are *not* on that platform can set `provider` to a different value and be
 * routed to a different client later.
 */
export type Provider = "pl-sdp" | "laliga";

export interface Competition {
  slug: string; // url segment, e.g. "premier-league"
  name: string;
  shortName: string;
  country: string;
  provider: Provider;
  sdpId: string; // competition id on the SDP API
  /** path prefix under /public/data for this competition's files ("" = PL). */
  dataPrefix: string;
  /** Season ids are the *starting year*: 2025 === the 2025/26 season. */
  currentSeason: string;
  seasons: string[];
  enabled: boolean; // false === "coming soon" (shown but not data-backed yet)
  accent: string; // league colour — themes the whole site when selected
  accentInk: string; // readable text colour on top of `accent`
  badge: string; // emoji/flag for the league switch
}

export const COMPETITIONS: Competition[] = [
  {
    slug: "premier-league",
    name: "Premier League",
    shortName: "Premier League",
    country: "England",
    provider: "pl-sdp",
    sdpId: "8",
    dataPrefix: "",
    currentSeason: "2025",
    seasons: ["2025", "2024", "2023", "2022", "2021"],
    enabled: true,
    accent: "#00e676",
    accentInk: "#04220f",
    badge: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  },
  {
    slug: "la-liga",
    name: "LaLiga",
    shortName: "LaLiga",
    country: "Spain",
    provider: "laliga",
    sdpId: "",
    dataPrefix: "laliga/",
    currentSeason: "2025",
    seasons: ["2025","2024","2023","2022","2021","2020","2019","2018","2017","2016","2015","2014","2013"],
    enabled: true,
    accent: "#ff3b50",
    accentInk: "#ffffff",
    badge: "🇪🇸",
  },
  // ---- Coming soon (UI placeholders; flip `enabled` once data is wired) ----
  { slug: "serie-a", name: "Serie A", shortName: "Serie A", country: "Italy", provider: "pl-sdp", sdpId: "", dataPrefix: "", currentSeason: "2025", seasons: ["2025"], enabled: false, accent: "#38bdf8", accentInk: "#04220f", badge: "🇮🇹" },
  { slug: "bundesliga", name: "Bundesliga", shortName: "Bundesliga", country: "Germany", provider: "pl-sdp", sdpId: "", dataPrefix: "", currentSeason: "2025", seasons: ["2025"], enabled: false, accent: "#ffd166", accentInk: "#04220f", badge: "🇩🇪" },
  { slug: "ligue-1", name: "Ligue 1", shortName: "Ligue 1", country: "France", provider: "pl-sdp", sdpId: "", dataPrefix: "", currentSeason: "2025", seasons: ["2025"], enabled: false, accent: "#a78bfa", accentInk: "#04220f", badge: "🇫🇷" },
  { slug: "champions-league", name: "UEFA Champions League", shortName: "Champions League", country: "Europe", provider: "pl-sdp", sdpId: "", dataPrefix: "", currentSeason: "2025", seasons: ["2025"], enabled: false, accent: "#60a5fa", accentInk: "#04220f", badge: "🏆" },
];

export const DEFAULT_COMPETITION = COMPETITIONS[0];

export function getCompetition(slug: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.slug === slug);
}

export function enabledCompetitions(): Competition[] {
  return COMPETITIONS.filter((c) => c.enabled);
}

export function seasonLabel(season: string): string {
  const start = Number(season);
  const end = (start + 1) % 100;
  return `${start}/${end.toString().padStart(2, "0")}`;
}
