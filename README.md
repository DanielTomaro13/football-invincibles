# ⚽ Football Invincibles

> Football stats, tables & addictive mini-games. Build your Invincible XI.
> Live at **football-invincibles.com** (soon). Multi-competition — starting with the Premier League.

A football stats hub + games arcade, inspired by the AFL [23-0](https://afl23-0.com) /
[`DanielTomaro13/AFL-23-0`](https://github.com/DanielTomaro13/AFL-23-0) project, rebuilt for football
and designed from day one to scale across competitions.

## What's inside

**Stats & data (SEO-optimised, server-rendered)**
- League **tables** with live standings, GD and movement
- **Stat leaders** — top scorers, assists, clean sheets, shots, passes
- **Player profiles** with season stats + structured data
- **Fixtures & results**
- A competition-agnostic engine (`src/lib/competitions.ts`) — adding LaLiga/Serie A/etc. is a config change

**The Games Vault**
| Game | What it is |
|------|-----------|
| 🏆 **Invincibles** | Spin a real XI, lock & re-roll, simulate a 38-game season chasing an *unbeaten* record |
| 🟩 **Footle** | The footballer Wordle — daily mystery player in 8 guesses |
| ⚖️ **Higher or Lower** | More or fewer goals/assists? Build a streak |
| 🕵️ **Guess the Player** | Clues revealed one at a time; fewer = more points |
| 🧭 **Career Path** | Name the player from their profile (multiple choice) |
| ⏱️ **Beat the Clock** | Name the top scorers in 60 seconds |
| 🎯 **Score Predictor** | Call the scoreline on real fixtures |

## The Invincibles simulation

The season engine is a faithful port of the AFL-23-0 model
(`src/lib/invincible-sim.ts`) — the same upset-capped **log5** head-to-head
probability and the same **rating → real-strength-distribution** mapping, so the
difficulty is calibrated the same way. The football twist: a match can be **drawn**,
and going *invincible* means a season with **zero losses** (draws allowed), exactly
like Arsenal's real 2003/04 Invincibles (26 W, 12 D, 0 L).

That keeps an unbeaten season **hard but genuinely achievable** — never
mathematically impossible:

| XI rating | Typical record | Invincible chance |
|-----------|----------------|-------------------|
| 80 (mid-table) | 21W 11D 6L | ~0.1% |
| 88 (top-four) | 26W 8D 3L | ~2.4% |
| 92 (title-class) | 30W 6D 2L | ~14% |
| 96+ (dream XI) | 32W 5D 1L | ~44% |

## Tech

- **Next.js (App Router) + TypeScript + React 19**
- **Tailwind v4** + a small CSS design system
- **SEO**: per-page metadata, Open Graph/Twitter, `sitemap.ts`, `robots.ts`,
  `manifest.ts`, JSON-LD (`WebSite`, `BreadcrumbList`, `Person`, `VideoGame`, `ItemList`)
- ISR/SSG data fetching against the documented Premier League API (see
  [`PREMIER_LEAGUE_API.md`](./PREMIER_LEAGUE_API.md))

## Project layout

```
src/app/            # routes (pages, games, sitemap/robots/manifest)
src/components/      # UI + games/ (client game components)
src/lib/            # competitions registry, API clients, sim engine, SEO
src/data/           # generated season snapshot (pl-2025.json)
public/data/        # games.json (players+ratings+strengths), fixtures.json
pipeline/           # data pipeline (fetch API → datasets, compute ratings)
```

## Develop

```bash
npm install
npm run dev        # http://localhost:3000

# regenerate the dataset from the live API
npm run data                 # = node pipeline/build-data.mjs 8 2025
node pipeline/add-ratings.mjs 2025
```

## Roadmap

- [ ] More competitions (LaLiga, Serie A, Bundesliga, Ligue 1, UCL)
- [ ] Daily streaks / shareable result cards
- [ ] Multi-season player history & xG views
- [ ] Buy `football-invincibles.com` + deploy

---

Independent project. Not affiliated with or endorsed by the Premier League or any club.
Data is for informational and entertainment use.
