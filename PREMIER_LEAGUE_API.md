# Premier League Website — Reverse-Engineered API Documentation

> Probed live from `premierleague.com` on **2026-06-14** by capturing the browser's
> network traffic on the Stats, Players, Tables, Matches, Match-centre and Player-profile
> pages, then validating every endpoint directly with `curl`.
>
> This is **unofficial** documentation of the private JSON APIs that power the public
> website. There is no published contract — endpoints can change without notice. All
> endpoints below were confirmed returning `200` at probe time unless stated otherwise.

---

## 1. Hosts overview

The site is a single-page app that pulls from **three** backend hosts:

| Host | Role | Auth |
|------|------|------|
| `https://sdp-prem-prod.premier-league-prod.pulselive.com` | **SDP** ("Sport Data Platform") — the core stats/match/standings/player data API. *This is the main one.* | None |
| `https://api.premierleague.com` | Editorial **content** (articles, video, photos, promos), **broadcasting** schedules, and **personalisation** feeds | None |
| `https://resources.premierleague.com` | Static **assets & config** — club badges, player photos, JSON config blobs | None |

Plus third-party services that are *not* PL data (ignore for data scraping): `optimizely`,
`onetrust`, `clipro.tv` / `blazesdk` (video SDK), `doubleclick`/`google` (ads/analytics),
`firebase*` (app config).

### Key facts about the SDP API
- **No authentication, no API key, no cookies** required. Plain `GET` works from `curl`.
- **CORS:** `vary: Origin` — browser calls are allowed; server-to-server calls have no origin restriction.
- **Rate limit:** `300 requests / 60 seconds` per IP (`x-ratelimit-limit: 300, 300;w=60`).
  Watch `x-ratelimit-remaining` / `x-ratelimit-reset` response headers. Exceeding it returns `429`.
- **Caching:** CloudFront-fronted. `cache-control: max-age=3600, stale-while-revalidate=7200, stale-if-error=86400` on most resources. `x-cache: Hit/Miss from cloudfront`.
- **Allow-listed routes only.** The gateway only exposes a fixed set of routes. A non-enabled
  path returns `400 application/problem+json` with `"detail":"This endpoint is not enabled for API access"`
  or `"No configuration found for request"`. A valid route with a missing entity returns `404`
  `"Could not find requested entity"`.
- **Self-documenting header:** every SDP response includes `x-pulse-sdp-endpoint` echoing the
  canonical route template (e.g. `/v1/competitions/{cid}/teams`). The templates below come
  straight from that header.
- **Geo:** `api.premierleague.com/country` echoes the caller's country (returned `{"country":"AU"}` from this probe). Some editorial/broadcast content is geo-filtered.

### Common conventions (SDP)
- **Path:** all SDP routes are under `/api/v{n}/…`. Version varies per resource (v1–v5).
- **Pagination:** list responses wrap data as `{ "pagination": {...}, "data": [...] }`.
  - `_limit` — page size (query param, e.g. `_limit=20`).
  - `_next` / `_prev` — opaque base64 cursors. Pass back as `_next=<cursor>` to page forward.
- **Sorting:** `_sort=<field>:<asc|desc>` e.g. `_sort=goals:desc`. Multiple stat fields available (see §7).
- **Filtering:** query params like `competition=`, `season=`, `team=`, `matchweek=`, `position=`,
  `period=`, `live=`. The `/v2/matches` route also supports range filters via `kickoff>YYYY-MM-DD` / `kickoff<YYYY-MM-DD` (URL-encode `>` `<`).

### Stable ID reference (Premier League = competition 8)
- **Competition id `8`** = Premier League. (Other competitions exist, e.g. `1`=FA Cup, `10`=Championship.)
- **Season id** = the *starting year*. `2025` = the **2025/26** season; `2026` = **2026/27**.
  The website's URL slug `2026-27` maps to SDP `season=2026`. *(At probe time, 2026/27 fixtures
  weren't published yet, so 2026 match lists returned empty — use 2025 for live examples.)*
- **Team ids** (Opta-style, stable): Arsenal `3`, Aston Villa `7`, Bournemouth `91`,
  Brighton `36`, Fulham `54`, Leeds `2`, Liverpool `14`, Man City `43`, Newcastle `4`,
  Crystal Palace `31`, etc.
- **Player ids:** stable integer, e.g. Tyler Adams `200785`, Erling Haaland `223094`.
- **Match ids:** 7-digit, e.g. `2561895`.

---

## 2. SDP — Competitions, Seasons, Structure

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v1/competitions` | All competitions (paginated). Returns `{code,name,id}`. |
| GET | `/api/v1/competitions/{cid}` | Single competition. |
| GET | `/api/v1/competitions/{cid}/seasons/{sid}/structure` | Season phase/structure (used to resolve phases). |
| GET | `/api/v1/competitions/{cid}/seasons/{sid}/awards` | Season awards (POTM, etc.). |

> ⚠️ `/seasons` *listing* (`/api/v1/competitions/8/seasons`, `/api/v2/competitions/8/seasons`)
> is **not enabled** (400). The list of valid season ids is instead embedded in each team
> object's `seasons[]` array (see `/competitions/{cid}/teams`), and the site hardcodes the
> current season. `…/seasons/{sid}` detail and `…/phases`, `…/matchweeks/current` are also not enabled.

---

## 3. SDP — Teams & Squads

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v1/competitions/{cid}/teams?_limit=60` | All teams that have ever played the competition. Each has `seasons[]`, `stadium`, `name`, `shortName`, `abbr`, `id`. |
| GET | `/api/v1/competitions/{cid}/teams/{tid}` | Single team within competition. |
| GET | `/api/v1/competitions/{cid}/seasons/{sid}/teams?_limit=20` | Teams **in a given season** (the 20 in the table). |
| GET | `/api/v2/teams-by-id?id=14,91,...` | **Batch** team lookup by comma-separated ids. |
| GET | `/api/v2/competitions/{cid}/seasons/{sid}/teams/{tid}/squad` | Full squad: `players[]` with name, shirtNum, position, height/weight, dates, country. |
| GET | `/api/v1/competitions/{cid}/seasons/{sid}/teams/{tid}/form?competitions={cid}&seasons={sid}` | Team's recent form/results. |
| GET | `/api/v1/competitions/{cid}/seasons/{sid}/teamform` | **All teams' form** for the season in one call (used by the table's form guide). |
| GET | `/api/v1/competitions/{cid}/teams/{tid}/stats` | Team aggregate stats (all-time in competition). |
| GET | `/api/v1/competitions/{cid}/seasons/{sid}/teams/{tid}/nextfixture` | Next fixture *(404 when none scheduled)*. |

---

## 4. SDP — Standings / League Table

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v5/competitions/{cid}/seasons/{sid}/standings?live=false` | **The league table.** Returns `{matchweek, tables:[{entries:[…]}]}`. Each entry has `team`, plus `overall`/`home`/`away` blocks with `position, played, won, drawn, lost, goalsFor, goalsAgainst, points, startingPosition`. `live=true` folds in in-progress matches. |

Example:
```
GET https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v5/competitions/8/seasons/2025/standings?live=false
```

---

## 5. SDP — Matches / Fixtures / Results

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v2/matches?competition={cid}&season={sid}&_limit=20` | Primary fixtures/results feed. Filterable. |
| GET | `/api/v2/matches?competition={cid}&season={sid}&matchweek={n}` | Matches for a specific matchweek. |
| GET | `/api/v2/matches?competition={cid}&season={sid}&kickoff>2026-06-14&kickoff<2026-06-15` | Date-range filter (URL-encode `>`→`%3E`, `<`→`%3C`). |
| GET | `/api/v2/matches?season={sid}&competition={cid}&team={tid}&period=PreMatch&_limit=5&_sort=kickoff:asc` | A team's upcoming fixtures (`period=PreMatch`). Other periods: `FullTime`, `Live`. |
| GET | `/api/v1/competitions/{cid}/seasons/{sid}/matchweeks/{mw}/matches?_limit=20` | Matches by matchweek (v1 alt). |
| GET | `/api/v1/competitions/{cid}/seasons/{sid}/phases/{p}/matches?live=false&_limit=100` | Matches by phase. |

**Match object** fields: `matchId, competitionId, competition, season/seasonInfo, matchWeek,
phase, kickoff, kickoffTimezone(String), period, clock, ground, attendance, resultType,
homeTeam{id,name,shortName,abbr,score,halfTimeScore,redCards}, awayTeam{…}`.

### Single match (Match Centre)

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v2/matches/{id}` | Match detail (richer than list item; adds `seasonInfo`). `/api/v1/matches/{id}` also enabled. |
| GET | `/api/v1/matches/{id}/events` | Goals, cards, subs split by `homeTeam`/`awayTeam`, with `playerId`, `time`, `period`, `timestamp`. |
| GET | `/api/v3/matches/{id}/lineups` | Lineups — `home_team`/`away_team` `players[]` + (typically) formation & subs. `/api/v2/.../lineups` and `/api/v1/.../lineups` also enabled (older shapes). |
| GET | `/api/v3/matches/{id}/stats` | Full team match stats — array of `{side:"Home"/"Away", stats:{…}}` (~200 Opta metrics; see §7c). `/api/v1/matches/{id}/stats` also enabled. |
| GET | `/api/v1/matches/{id}/officials` | Referee, assistants, fourth official, VAR. |
| GET | `/api/v1/matches/{id}/commentary?_limit=5&_sort=timestamp:desc` | Live text commentary feed (paginated). |

---

## 6. SDP — Players

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v1/competitions/{cid}/seasons/{sid}/players?_limit=20` | Player directory for a season (paginated; the Players index page). |
| GET | `/api/v1/players/{pid}/basic` | Lightweight: name, position, country, `currentTeam`. |
| GET | `/api/v1/players/{pid}` | **Full career array** — one entry per club/season spell with `id{competitionId,seasonId,playerId}`, dates, height/weight, shirtNum, preferredFoot, etc. |
| GET | `/api/v2/players-by-id?id=200785,223094,...` | **Batch** player lookup by comma-separated ids (used to hydrate lineups/squads). |
| GET | `/api/v1/competitions/{cid}/players/{pid}/stats` | Player's **career stats in the competition** (aggregated). `{stats:{…}}`. |
| GET | `/api/v1/competitions/{cid}/seasons/{sid}/players/{pid}/stats` | Player's stats for **one season**. |
| GET | `/api/v1/competitions/{cid}/seasons/{sid}/playerinfo/{pid}` | Player bio scoped to a season (team/shirt/dates as they were that season). |
| GET | `/api/v1/metadata/{type}/{mid}` | Generic metadata. `type` ∈ `SDP_FOOTBALL_PLAYER`, `SDP_FOOTBALL_TEAM`. e.g. external/fantasy profile URLs. *(`SDP_FOOTBALL_MATCH` returned 404 here.)* |

---

## 7. SDP — Stats Leaderboards (the `/stats` page)

The Stats hub is built almost entirely from two leaderboard routes. Sort by any metric in §7a/§7b.

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v3/competitions/{cid}/seasons/{sid}/players/stats/leaderboard?_sort={metric}:desc` | **Player leaderboard for a season.** Each row: `{playerMetadata{…}, stats{…}}`. Supports `position=Goalkeeper\|Defender\|Midfielder\|Forward`, `_limit`, `_next`. |
| GET | `/api/v2/competitions/{cid}/seasons/{sid}/players/stats/leaderboard?_sort={metric}:desc` | v2 variant (also enabled). |
| GET | `/api/v2/competitions/{cid}/teams/stats/leaderboard?_sort={metric}:desc&season={sid}` | **Team leaderboard.** Note: `season` is a **query param** here, not a path segment. Each row: `{teamMetadata{…}, stats{…}}`. |

Real examples observed on the live Stats page:
```
.../api/v3/competitions/8/seasons/2026/players/stats/leaderboard?_sort=goals:desc
.../api/v3/competitions/8/seasons/2026/players/stats/leaderboard?_sort=goal_assists:desc
.../api/v3/competitions/8/seasons/2026/players/stats/leaderboard?_sort=clean_sheets:desc&position=Goalkeeper
.../api/v3/competitions/8/seasons/2026/players/stats/leaderboard?_sort=total_passes:desc
.../api/v2/competitions/8/teams/stats/leaderboard?_sort=tackles_won:desc&season=2026
.../api/v2/competitions/8/teams/stats/leaderboard?_sort=blocks:desc&season=2026
```
> Note the site sometimes uses **snake_case** sort keys in the URL (`goal_assists`, `total_passes`,
> `tackles_won`) while the JSON *response* keys are **camelCase** (`goalAssists`, `totalPasses`, `tacklesWon`).
> Both snake_case and camelCase are accepted by `_sort` in testing.

### 7a. Player stat metrics (sortable / returned)
`aerialDuels, aerialDuelsLost, aerialDuelsWon, appearances, assistsIntentional, attemptsFromSetPieces, awayGoals, backwardPasses, blockedShots, blocks, catches, cleanSheets, clearancesOffTheLine, cornersTakenIncShortCorners, cornersWon, crossesNotClaimed, drops, duels, duelsLost, duelsWon, expectedAssists, expectedGoals, expectedGoalsFreekick, expectedGoalsOnTarget, expectedGoalsOnTargetConceded, fiftyFifty, forwardPasses, foulWonPenalty, freekickTotal, gamesPlayed, gkSuccessfulDistribution, gkUnsuccessfulDistribution, goalAssists, goalKicks, goalkeeperSmother, goals, goalsConceded, goalsConcededInsideBox, goalsConcededOutsideBox, goalsFromInsideBox, goalsFromOutsideBox, groundDuels(Won/Lost), headedGoals, hitWoodwork, homeGoals, iboxTarget, index, interceptions, keyPassesAttemptAssists, leftFootGoals, offsides, openPlayPasses, ownGoalScored, penaltiesConceded, penaltiesFaced, penaltiesSaved, penaltiesTaken, penaltyGoals, punches, recoveries, redCards2ndYellow, rightFootGoals, savesFromPenalty, savesMade, savesMadeCaught/Parried, savesMadeFrom(Inside/Outside)Box, secondGoalAssists, setPieceGoals, shotsOffTargetIncWoodwork, shotsOnTargetIncGoals, starts, straightRedCards, substituteOn/Off, successfulCrossesOpenPlay, successfulDribbles, successfulLongPasses, successfulPasses(Opposition/Own)Half, successfulShortPasses, tacklesWon, tacklesLost, throughBalls, timePlayed, totalClearances, totalFoulsConceded, totalFoulsWon, totalLossesOfPossession, totalPasses, totalRedCards, totalShots, totalTackles, totalTouchesInOppositionBox, touches, winningGoal, yellowCards` *(≈130 keys — full list in raw probe).*

### 7b. Team stat metrics
Same family as players plus team-level: `crossingAccuracy, goalConversion, passingAccuracy, passingPercentOppHalf, possessionPercentage, pointsDroppedFromWinningPositions, pointsGainedFromLosingPositions, shootingAccuracy, shotsOnConceded(Inside/Outside)Box, tackleSuccess, totalShotsConceded, touchesInOppBox, ownGoalsAccrued, …`.

### 7c. Match stat metrics (`/v3/matches/{id}/stats`)
~200 granular Opta event metrics per side, e.g.: `possessionPercentage, totalScoringAtt, ontargetScoringAtt, expectedGoals, expectedGoalsOnTarget, bigChanceCreated/Scored/Missed, totalPass, accuratePass, fwdPass, backwardPass, totalCross, accurateCross, cornerTaken, totalTackle, wonTackle, interception, totalClearance, ballRecovery, possWon(Att/Mid/Def)3rd, aerialWon/Lost, duelWon/Lost, attemptsIbox/Obox, saves, divingSave, fkFoulWon/Lost, totalDistance, fastestPlayer, finalThirdEntries, penAreaEntries, touches, touchesInOppBox, yellowCard, redCard, …`.

---

## 8. `api.premierleague.com` — Content, Broadcasting, Personalisation

Editorial CMS + broadcast schedule. Path prefix `content/premierleague/`. Supports `detail=DETAILED`.

### Content
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/content/premierleague/{TYPE}/{lang}/{contentId}?detail=DETAILED` | Single content item. `TYPE` ∈ `TEXT, VIDEO, PHOTO, PLAYLIST, PROMO, AUDIO`. e.g. `…/TEXT/en/4406657`. |
| GET | `/content/premierleague/{lang}?contentTypes=TEXT,VIDEO,AUDIO&offset=0&limit=8&onlyRestrictedContent=false&detail=DETAILED` | Content list/search. |
| GET | `/content/premierleague/{lang}?...&references=SDP_FOOTBALL_MATCH:{matchId}&tagExpression="Highlights"or"Match Highlights"` | Content **linked to an entity** via `references` (`SDP_FOOTBALL_MATCH:`, `SDP_FOOTBALL_PLAYER:`, `SDP_FOOTBALL_TEAM:`) + `tagNames`/`tagExpression` filters. |
| GET | `/content/premierleague/TEXT/{lang}?referenceExpression=SDP_FOOTBALL_PLAYER%3A{pid}&tagNames=player_profile_bio&detail=DETAILED` | Player bio text. |
| GET | `/content/premierleague/PROMO/{lang}?referenceExpression=SDP_FOOTBALL_PLAYER%3A{pid}&tagNames=player_profile_promo` | Player promo card. |
| GET | `/content/premierleague/photo/{lang}/{photoId}` | Photo metadata. |
| GET | `/content/premierleague/playlist/{lang}/{playlistId}?detail=DETAILED` | Video playlist. |

### Broadcasting
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/broadcasting/events?pageSize=30&fromDate={ISO}&toDate={ISO}` | TV/broadcast schedule for a date range (ISO 8601 UTC). |
| GET | `/broadcasting/match-events?sportDataId={matchId}&pageSize=20` | Broadcast events for a specific match (`sportDataId` = SDP match id). |

### Personalisation (homepage feeds)
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/personalisation/content/news/latest/smart_order?limit=9&tags=content-type:article,content-format:long-read` | Latest news, smart-ranked. |
| GET | `/personalisation/content/news/popular/smart_order?limit=10&recency=48&includebyall={tagIds}` | Popular news (last `recency` hours). |
| GET | `/personalisation/content/video/latest/smart_order?limit=9&tags=content-type:video` | Latest video. |
| GET | `/personalisation/content/video/popular/smart_order?limit=10&recency=48&includebyany={tagId}` | Popular video. |

### Misc
| GET | `/country` | Echoes caller's geo `{"country":"AU"}` (used for content geo-gating). |

---

## 9. `resources.premierleague.com` — Static assets & config

| Pattern | Notes |
|---------|-------|
| `/premierleague25/config/current-gameweek.json` | `{"matchweek": N}` — the current matchweek. |
| `/premierleague25/config/clubs-metadata.json` | Club metadata (colors, names, etc.) used for theming. |
| `/premierleague25/badges/{teamId}.svg` | Club crest (primary). |
| `/premierleague25/badges-alt/{teamId}.svg` | Club crest (alt/mono). |
| `/premierleague25/photos/players/40x40/{playerId}.png` | Player headshot (also `110x140`, `250x250` size variants exist; some return `403` when missing). |
| `/premierleague25/partners/sponsors-light-theme/{name}.{png\|svg}` | Sponsor logos. |

> The `premierleague25` path segment is the current site build/season namespace. Older
> assets historically lived under `premierleague/...` and `photos/players/{size}/p{id}.png`.

---

## 10. Quick-start recipes

```bash
B=https://sdp-prem-prod.premier-league-prod.pulselive.com

# Current PL table (2025/26)
curl -s "$B/api/v5/competitions/8/seasons/2025/standings?live=false"

# Top scorers (2025/26)
curl -s "$B/api/v3/competitions/8/seasons/2025/players/stats/leaderboard?_sort=goals:desc&_limit=20"

# All Matchweek 1 results
curl -s "$B/api/v2/matches?competition=8&season=2025&matchweek=1&_limit=100"

# Full match centre payload for one game
M=2561895
curl -s "$B/api/v2/matches/$M"
curl -s "$B/api/v3/matches/$M/lineups"
curl -s "$B/api/v3/matches/$M/stats"
curl -s "$B/api/v1/matches/$M/events"
curl -s "$B/api/v1/matches/$M/officials"

# A club's 2025/26 squad + season stats
curl -s "$B/api/v2/competitions/8/seasons/2025/teams/14/squad"     # Liverpool
curl -s "$B/api/v1/competitions/8/teams/14/stats"

# A player's career + this-season stats
P=200785
curl -s "$B/api/v1/players/$P"
curl -s "$B/api/v1/competitions/8/seasons/2025/players/$P/stats"

# Batch hydrate many players/teams
curl -s "$B/api/v2/players-by-id?id=200785,223094"
curl -s "$B/api/v2/teams-by-id?id=14,43"
```

### Pagination example
```bash
# Page 1
curl -s "$B/api/v1/competitions/8/seasons/2025/players?_limit=20"
# -> take pagination._next cursor, then:
curl -s "$B/api/v1/competitions/8/seasons/2025/players?_limit=20&_next=<cursor>"
```

---

## 11. Error model (RFC 7807 `application/problem+json`)

```json
{ "type":"about:blank", "title":"Bad Request", "status":400,
  "detail":"This endpoint is not enabled for API access",
  "instance":"/api/v1/competitions/8/seasons" }
```
| Status | Meaning |
|--------|---------|
| `400` `This endpoint is not enabled for API access` | Route exists upstream but is not allow-listed at the gateway. |
| `400` `No configuration found for request` | Unknown/unsupported route shape. |
| `404` `Could not find requested entity` | Valid route, but the id/entity doesn't exist (or no data yet). |
| `429` | Rate limit exceeded (300/60s). |

---

## 12. Notes, caveats & legal

- **Unofficial / undocumented.** No SLA, no versioning guarantees. The PL has historically
  changed hosts (`footballapi.pulselive.com` → `sdp-*.pulselive.com`) and path schemes.
- **Terms of use.** premierleague.com's terms restrict automated/commercial data use and
  redistribution. This document is for understanding how the site works; for any production
  or commercial use, obtain a proper data licence (official providers: **Opta/Stats Perform**,
  which is the underlying data source). Respect the rate limit and cache aggressively.
- **Underlying data is Opta.** Stat key names (`expectedGoals`, `attIboxTarget`, `possWonAtt3rd`, …)
  are Opta's standard vocabulary, which helps cross-reference with Opta docs.
- All endpoints above were live-verified `200` on 2026-06-14 from country `AU`.
