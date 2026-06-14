/**
 * Server-side client for the Premier League "SDP" API.
 *
 * Documented in PREMIER_LEAGUE_API.md. No auth required. We use Next.js fetch
 * caching (ISR) so pages are statically fast and SEO-friendly while staying
 * fresh. All functions are server-only (call from Server Components / route
 * handlers), keeping the upstream API and its rate limit off the client.
 */
import "server-only";

const SDP = "https://sdp-prem-prod.premier-league-prod.pulselive.com";
const CONTENT = "https://api.premierleague.com";

type Json = any;

async function sdp<T = Json>(
  path: string,
  revalidate = 60 * 30
): Promise<T | null> {
  try {
    const res = await fetch(SDP + path, {
      headers: { accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface StandingEntry {
  team: { id: string; name: string; shortName: string; abbr: string };
  overall: {
    position: number;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
    startingPosition: number;
  };
}

export async function getStandings(
  cid: string,
  season: string
): Promise<StandingEntry[]> {
  const data = await sdp<{ tables: { entries: StandingEntry[] }[] }>(
    `/api/v5/competitions/${cid}/seasons/${season}/standings?live=false`
  );
  return data?.tables?.[0]?.entries ?? [];
}

export interface Match {
  matchId: string;
  kickoff: string;
  period: string;
  matchWeek?: number;
  ground?: string;
  homeTeam: { id: string; name: string; shortName: string; abbr?: string; score?: number };
  awayTeam: { id: string; name: string; shortName: string; abbr?: string; score?: number };
}

export async function getMatches(
  cid: string,
  season: string,
  matchweek?: number
): Promise<Match[]> {
  const mw = matchweek ? `&matchweek=${matchweek}` : "";
  const data = await sdp<{ data: Match[] }>(
    `/api/v2/matches?competition=${cid}&season=${season}${mw}&_limit=100`,
    60 * 5
  );
  return data?.data ?? [];
}

export interface LeaderRow {
  playerMetadata: {
    id: string;
    name: string;
    position?: string;
    currentTeam?: { id: string; name: string; shortName: string };
    country?: { country: string; isoCode: string };
  };
  stats: Record<string, number>;
}

export async function getPlayerLeaderboard(
  cid: string,
  season: string,
  sort: string,
  opts: { position?: string; limit?: number } = {}
): Promise<LeaderRow[]> {
  const pos = opts.position ? `&position=${opts.position}` : "";
  const data = await sdp<{ data: LeaderRow[] }>(
    `/api/v3/competitions/${cid}/seasons/${season}/players/stats/leaderboard?_sort=${sort}:desc&_limit=${opts.limit ?? 20}${pos}`
  );
  return data?.data ?? [];
}

export async function getTeamLeaderboard(
  cid: string,
  season: string,
  sort: string,
  limit = 20
) {
  const data = await sdp<{ data: { teamMetadata: any; stats: Record<string, number> }[] }>(
    `/api/v2/competitions/${cid}/teams/stats/leaderboard?_sort=${sort}:desc&season=${season}&_limit=${limit}`
  );
  return data?.data ?? [];
}

export async function getPlayer(playerId: string) {
  // career array — most recent spell last
  const data = await sdp<any[]>(`/api/v1/players/${playerId}`);
  return Array.isArray(data) ? data[data.length - 1] : data;
}

export async function getPlayerCareer(playerId: string) {
  return (await sdp<any[]>(`/api/v1/players/${playerId}`)) ?? [];
}

export async function getPlayerSeasonStats(
  cid: string,
  season: string,
  playerId: string
): Promise<Record<string, number>> {
  const data = await sdp<{ stats: Record<string, number> }>(
    `/api/v1/competitions/${cid}/seasons/${season}/players/${playerId}/stats`
  );
  return data?.stats ?? {};
}

export async function getSeasonPlayers(
  cid: string,
  season: string,
  next?: string,
  limit = 30
) {
  const cursor = next ? `&_next=${next}` : "";
  return await sdp<{ pagination: { _next: string | null }; data: any[] }>(
    `/api/v1/competitions/${cid}/seasons/${season}/players?_limit=${limit}${cursor}`
  );
}

export function playerPhoto(playerId: string | number, size = "110x140") {
  return `https://resources.premierleague.com/premierleague25/photos/players/${size}/${playerId}.png`;
}

export function teamBadge(teamId: string | number) {
  return `https://resources.premierleague.com/premierleague25/badges/${teamId}.svg`;
}

export { CONTENT };
