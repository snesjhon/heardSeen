# heardSeen

A personal diary of albums heard and movies seen — driven by curated lists like
*1001 Albums You Must Hear Before You Die* and *Rolling Stone's 500 Greatest Albums*, not free-form
logging. Browse a list, mark an item off with a rating/notes/date, watch your progress per list.
Tapping an item opens it in the native Apple Music or Apple TV app.

Ships as a responsive, installable PWA — one codebase for iPhone, iPad, and web.

See [`PLAN.md`](./PLAN.md) for the full architecture and workstream breakdown.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4, pnpm
- Supabase (Postgres + Auth + RLS), managed via the Supabase CLI
- Biome (lint/format)
- `@serwist/next` (PWA service worker)
- Album metadata: the Apple Music Catalog API (MusicKit). Movie metadata: TMDB (see note below).

## Getting started

```bash
pnpm install
cp .env.example .env
```

Fill in `.env`:

- **Supabase**: create a project at [supabase.com](https://supabase.com), copy the URL/anon
  key/service-role key from Settings > API.
- **Apple Music**: requires an Apple Developer Program membership (~$99/yr). Create a MusicKit key
  under Certificates, Identifiers & Profiles > Keys, and set `APPLE_TEAM_ID`/`APPLE_KEY_ID`/
  `APPLE_PRIVATE_KEY`. Only needed to (re)generate album seed data — the app itself never calls the
  Catalog API at runtime.
- **TMDB**: free key from [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).
  Only needed to (re)generate movie seed data — the app itself never calls TMDB at runtime.

Apply the schema (requires the [Supabase CLI](https://supabase.com/docs/guides/cli) and either
Docker for local dev, or a linked remote project):

```bash
pnpm exec supabase link --project-ref <your-project-ref>
pnpm exec supabase db push
```

Load the seed data (three sample curated lists — see `supabase/seed/README.md` for scope):

```bash
pnpm run seed:generate   # enrich from the real Apple Music/TMDB APIs (needs the credentials above)
pnpm run seed            # upsert into Supabase
```

`data/*.json` is committed as-is, but currently holds **unenriched placeholders** (title/artist or
title only, no artwork/deep link) since no real Apple Music or TMDB credentials exist in this
environment — re-run `seed:generate` once you've added yours.

Run the app:

```bash
pnpm dev
```

## Why no MusicKit JS / no live external API calls at runtime

MVP browsing/logging is scoped to items already in the seeded lists, not ad hoc search — so all
metadata is fetched once, offline, by the seed script, and the running app only ever queries
Supabase. Album metadata comes from the real Apple Music Catalog REST API (`api.music.apple.com`),
called server-side with a signed developer-token JWT — **not** MusicKit JS, so there's no browser
SDK, no end-user Apple Music subscription, and no `authorize()` consent flow; those are only needed
for playback/personalized-library features, not catalog search. See `PLAN.md` for the full
reasoning, including why movies are sourced from TMDB instead of any Apple API (Apple has no public
movies/TV catalog API at any price, and the iTunes Search API's movie index is effectively empty as
of 2026).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / run |
| `pnpm lint` / `pnpm lint:fix` | Biome check / auto-fix |
| `pnpm run seed:generate` | Enrich `supabase/seed/sources/*.json` from Apple Music/TMDB |
| `pnpm run seed` | Upsert enriched seed data into Supabase |

## Deploying

Target is Vercel. Set the same env vars from `.env` in the Vercel project settings (the Apple Music
and TMDB credentials are only needed if you plan to regenerate seed data from Vercel, not for the
running app).
