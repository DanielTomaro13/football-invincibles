# Global leaderboard Worker

A tiny Cloudflare Worker + KV that stores top scores for the games. The site
works without it (scores fall back to per-browser localStorage); deploy this to
make leaderboards **global**.

## Deploy

```bash
cd worker
npm install

# 1. create the KV namespace and copy the id into wrangler.toml
npx wrangler kv namespace create LEADERBOARD

# 2. deploy
npx wrangler deploy
```

Wrangler prints a URL like `https://football-invincibles-leaderboard.<you>.workers.dev`.

## Wire it to the site

Set the env var the site reads, then redeploy the site:

- **Local:** add `NEXT_PUBLIC_LEADERBOARD_URL=<worker url>` to `.env.local`.
- **GitHub Pages:** repo **Settings → Secrets and variables → Actions → Variables**,
  add `LEADERBOARD_URL = <worker url>` (the deploy workflow passes it through as
  `NEXT_PUBLIC_LEADERBOARD_URL`).

## API

- `GET /leaderboard?game=<game>&limit=10` → `[{ name, score, at }]`
- `POST /score` `{ game, name, score }` → `{ ok: true }`

Games: `invincibles`, `higher-or-lower`, `beat-the-clock`, `score-predictor`.
Scores are validated and capped server-side; the top 50 per game are kept.
