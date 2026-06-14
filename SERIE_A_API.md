# Serie A (Lega Serie A) Website — Reverse-Engineered API

> Probed from `legaseriea.it` on 2026-06-15. The site is **Next.js**; data comes
> from the Lega Serie A **"SDP" (Sports Data Platform)**, a public JSON API with
> **no authentication**. Unofficial — for understanding only. Underlying stats
> are **Opta**.

## Hosts & auth

- **Stats/data base:** `https://api-sdp.legaseriea.it/v1/serie-a/football` — **no auth** (send a normal `User-Agent`).
- **Content/CMS (articles, photos, tags):** `https://dapi.legaseriea.it/v2/content/en-gb/…` (not used by the pipeline).
- **Imagery base:** `https://media-sdp.legaseriea.it` + the relative path from any `imagery` object, e.g. `clubLogos/{teamHex}.webp`, `clubLogos/{teamHex}_light.webp`, `playerImages/…_celeb.webp`.
- Add `?locale=en-GB` to every call for English labels.

## Key concepts

- **Competition id:** `serie-a::Football_Competition::ec93b94f74294dc98ab5bcfd67fc0d88`.
- **Season id:** `serie-a::Football_Season::{hex}` — the `::` is literal and **must be URL-encoded** (`%3A%3A`). 41 seasons are available, **1986/87 → 2026/27**; `seasonName` is like `"2025/2026"` (the pipeline keys on the starting year, `2025` = 2025/26).
- **id vs providerId** — every entity carries both the SDP id (`serie-a::Football_*::…`) and the raw `opta:*` providerId. Join everything on the SDP `teamId` / `seasonId`.
- The player-stats endpoint returns identity **and** stats in one call, so (unlike PL/La Liga) **no separate squad endpoint is needed**.

## Endpoints used

| Endpoint | Returns |
|----------|---------|
| `GET /competitions/{compId}/seasons` | all 41 seasons (`seasonId`, `seasonName`, `startDateUtc`, imagery) |
| `GET /seasons/{seasonId}` | season detail |
| `GET /seasons/{seasonId}/standings/overall` | `standings[0].teams[]` — 20 rows, each with `stats[]` keyed by `statsId` (`rank`, `points`, `matches-played`, `win`, `draw`, `lose`, `goals-for`, `goals-against`, `goal-difference`) + team identity + `imagery.teamLogo` |
| `GET /seasons/{seasonId}/stats/players?category=General&page=N` | **every player, paginated 30/page** (`pagination.totalPages` / `isLastPage`; a `pageSize` param is **ignored**). Each row: `team`, `role`, identity, `nationalityIsoCode`, `imagery`, and `stats[]` (≈279 Opta `{statsId, statsValue}` pairs). `category=Goalkeeping` is the only other valid category; `Attack`/`Defence`/etc. return 400. |
| `GET /seasons/{seasonId}/matches` | all 380 matches: `home`/`away` team objects, `providerHomeScore`/`providerAwayScore`, `status` (`FINISHED`), `matchDateUtc`, `stadiumName`, and `matchSet.providerId` = `opta:MatchDay:N` (the matchweek) |

## Useful `statsId`s (note the inconsistent casing)

Kebab-case: `games-played`, `minutes-played`, `goals`, `assists`,
`on-target-scoring-attempts`, `tackles-won`, `goals-conceded`,
`goals-against-average`, `yellow-cards`, `saves` *(Goalkeeping category only)*.
Title-case: `Interceptions`, `Total Tackles`, `Total Clearances`,
`Total Passes`, `Key Passes (Attempt Assists)`, `Goal Assists`,
`Shots On Target ( inc goals )`. Read with multi-key fallbacks.

> **There is no per-player clean-sheets or per-player saves stat in `General`.**
> Clean sheets are **derived from `/matches`** (a team keeps a clean sheet when
> the opponent scores 0 in a `FINISHED` match) and distributed across each squad
> by share of games played — that's what drives the clean-sheet-dominant DEF/GK
> rating, keeping the engine identical to the PL/La Liga pipelines.

## Positions

`role`: **1 = Goalkeeper, 2 = Defender, 3 = Midfielder, 4 = Forward**
(`roleLabel` is the localised text; the numeric `role` is stable — same mapping as La Liga).

## Player name & photo

- **Name** fallback chain: `displayName` → `mediaFirstName + mediaLastName` → `shortName` → `shirtName` (older seasons often have `displayName: null`).
- **Photo:** `media-sdp.legaseriea.it/{imagery.playerImage_home}` (or `playerImage_home_celeb`). Frequently empty for pre-2015 seasons.

## Recipe (per season)

```bash
B=https://api-sdp.legaseriea.it/v1/serie-a/football
C='serie-a::Football_Competition::ec93b94f74294dc98ab5bcfd67fc0d88'
S='serie-a::Football_Season::5f0e080fc3a44073984b75b3a8e06a8a'   # 2025/26
ua='User-Agent: Mozilla/5.0'
enc(){ python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$1"; }

curl -s -H "$ua" "$B/competitions/$(enc "$C")/seasons?locale=en-GB"
curl -s -H "$ua" "$B/seasons/$(enc "$S")/standings/overall?locale=en-GB"
curl -s -H "$ua" "$B/seasons/$(enc "$S")/stats/players?category=General&page=1&locale=en-GB"
curl -s -H "$ua" "$B/seasons/$(enc "$S")/matches?locale=en-GB"
```

## Coverage built

`pipeline/build-seriea.mjs` builds **2005/06 → 2025/26 (21 seasons)** into
`public/data/seriea/` — same shape as the PL/La Liga pipelines
(`history-index.json`, `seasons/<year>.json`, `standings.json`, `strengths.json`)
**plus `fixtures.json`** (current-season matchday/scores/ground for the
competition-aware Fixtures page). Rating engine is identical to the other
leagues. See `pipeline/build-seriea.mjs` for the full implementation.
