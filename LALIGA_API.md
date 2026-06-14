# LaLiga Website — Reverse-Engineered API

> Probed from `laliga.com` on 2026-06-14. The site is **Next.js**; data is
> server-rendered from **Azure API Management** and also reachable directly.
> Unofficial — for understanding only. Underlying stats are **Opta**.

## Host & auth

- **Base:** `https://apim.laliga.com/public-service`
- **Auth:** a public Azure APIM subscription key (lifted from the page's
  `runtimeConfig.backendSubscription`), sent as header:
  `Ocp-Apim-Subscription-Key: c13c3a8e2f6b46da9c5c425cf61fab3e`
  *(keys rotate — re-read `__NEXT_DATA__` → `props.runtimeConfig.backendSubscription` if it 401s)*
- Assets (badges, player photos): `https://assets.laliga.com/…`

## Key concepts

- **Competition** — `primera-division` (id 1, LALIGA EA SPORTS), `segunda-division` (2), `primera-division-femenina` (15).
- **Subscription** — a *season instance* of a competition, slug `laliga-easports-{year}` (2023+) or `laliga-santander-{year}` (≤2022). The pipeline uses ids 375/351/329/305/116 = seasons 2025…2021.
- **Season id = starting year:** `2025` = 2025/26.
- **opta_id** — the stable player/team join key across endpoints (`p60772`, `t186`). The numeric `id` differs per endpoint — **join on opta_id**.

## Endpoints used

| Endpoint | Returns |
|----------|---------|
| `GET /api/v1/competitions` | all competitions |
| `GET /api/v1/subscriptions` | season instances (paginated, 20/page, `?offset=`) |
| `GET /api/v1/subscriptions/{slug}/standing` | full league table (20 teams: played/points/won/drawn/lost/goals_for/goals_against/position + team object w/ `shield`) |
| `GET /api/v1/subscriptions/{slug}/players/stats?limit=100&offset=N` | **every player** (≈749) with full Opta `stats[]` (name/stat pairs) + position + team + opta_id. Max `limit`=100. |
| `GET /api/v1/teams/{teamSlug}/squad?subscription={slug}` | a club's squad: `person` (name, date_of_birth, country, height), `photos`, position id, shirt, opta_id |
| `GET /api/v1/subscriptions/{slug}/rounds` | rounds/matchweeks |
| `GET /api/v1/matches?subscription={slug}` | matches |

## Useful stat names (snake_case)

`goals`, `goal_assists`, `appearances`, `time_played`, `clean_sheets`,
`shots_on_target_inc_goals`, `key_passes_attempt_assists`, `total_passes`,
`tackles_won`, `total_tackles`, `interceptions`, `total_clearances`,
`goals_conceded`, `yellow_cards`, `headed_goals`, `penalty_goals`, `saves` …
(≈100 distinct Opta metrics per player).

## Positions

`position.id`: **1 = Goalkeeper, 2 = Defender, 3 = Midfielder, 4 = Forward**
(`name`/`slug` come localised — id is stable).

## Player photo pattern

From the squad `photos["001"]`: e.g.
`https://assets.laliga.com/squad/{year}/{teamOpta}/p{pid}/256x278/p{pid}_{teamOpta}_{year}_1_001_000.png`

## Recipe (per season)

```bash
B=https://apim.laliga.com/public-service
H="Ocp-Apim-Subscription-Key: c13c3a8e2f6b46da9c5c425cf61fab3e"
curl -s -H "$H" "$B/api/v1/subscriptions/laliga-easports-2025/standing"
curl -s -H "$H" "$B/api/v1/subscriptions/laliga-easports-2025/players/stats?limit=100&offset=0"
curl -s -H "$H" "$B/api/v1/teams/real-madrid/squad?subscription=laliga-easports-2025"
```

See `pipeline/build-laliga.mjs` for the full implementation.
