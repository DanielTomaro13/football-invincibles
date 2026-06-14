/** Client-safe asset URL helpers (no server-only imports). */
export function playerPhoto(playerId: string | number, size = "110x140") {
  return `https://resources.premierleague.com/premierleague25/photos/players/${size}/${playerId}.png`;
}

export function teamBadge(teamId: string | number) {
  return `https://resources.premierleague.com/premierleague25/badges/${teamId}.svg`;
}
