# ⚽ Football Invincibles

> Football stats, tables & addictive mini-games. Build your Invincible XI.
> Live at **footballinvincibles.com** (soon). Multi-competition — starting with the Premier League.

A football stats hub + games arcade — the football counterpart to my AFL project
[23-0](https://afl23-0.com) — designed from day one to scale across competitions.

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

The season engine (`src/lib/invincible-sim.ts`) uses an upset-capped **log5**
head-to-head probability and a **rating → real-strength-distribution** mapping.
A match can be won, drawn or lost, and going *invincible* means a season with
**zero losses** (draws allowed), exactly like Arsenal's real 2003/04 Invincibles
(26 W, 12 D, 0 L). It is deliberately tough — the unbeaten chance is **hard-capped
at 5%** even for a theoretical best XI, and you have to build a genuinely elite
side to get anywhere near it.

## Tech

- **Next.js (App Router) + TypeScript + React 19**, exported as a **static site** for GitHub Pages
- **Tailwind v4** + a small CSS design system
- **SEO**: per-page metadata, Open Graph/Twitter, `sitemap.ts`, `robots.ts`,
  `manifest.ts`, JSON-LD (`WebSite`, `BreadcrumbList`, `Person`, `VideoGame`, `ItemList`)
- A data **pipeline** snapshots each league's (reverse-engineered) API into JSON
  the pages read at build time. One doc per source:
  [`PREMIER_LEAGUE_API.md`](./PREMIER_LEAGUE_API.md),
  [`LALIGA_API.md`](./LALIGA_API.md),
  [`SERIE_A_API.md`](./SERIE_A_API.md). A daily GitHub Action refreshes the
  Premier League; La Liga and Serie A are committed snapshots (manual rebuilds)

## Project layout

```
src/app/            # routes (pages, games, sitemap/robots/manifest)
src/components/      # UI + games/ (client game components)
src/lib/            # competitions registry, API clients, sim engine, SEO
src/data/           # generated season snapshot (pl-2025.json)
public/data/        # PL: games.json, fixtures.json, history-index.json …
                    #   plus per-league dirs: laliga/, seriea/ (same shape)
pipeline/           # data pipeline (fetch API → datasets, compute ratings)
```

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export to ./out

# regenerate the dataset from the live API
npm run data                 # = node pipeline/build-data.mjs 8 2025  (Premier League)
node pipeline/add-ratings.mjs 2025
node pipeline/build-laliga.mjs   # La Liga snapshot  -> public/data/laliga/
node pipeline/build-seriea.mjs   # Serie A snapshot  -> public/data/seriea/
```

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the static
export and publishes it to GitHub Pages. A daily cron rebuild keeps the data
fresh. One-time setup: **Settings → Pages → Source: GitHub Actions**, then add the
custom domain (`footballinvincibles.com`) and point Cloudflare DNS at
`<user>.github.io`.

## Roadmap

- [x] More competitions — LaLiga (13 seasons), Serie A (21 seasons) live
- [ ] Remaining competitions (Bundesliga, Ligue 1, UCL)
- [x] Daily challenges, streaks & shareable result cards
- [x] Global leaderboards (Hall of Fame)
- [ ] Multi-season player history & xG views
- [x] Buy `footballinvincibles.com` (on Cloudflare)
- [x] Deploy via GitHub Pages

---

Independent project. Not affiliated with or endorsed by the Premier League or any club.
Data is for informational and entertainment use.
