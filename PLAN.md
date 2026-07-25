# heardSeen — architecture & workstreams

## What this is

A personal diary of albums heard and movies seen, browsed through curated lists (e.g. *1001 Albums
You Must Hear Before You Die*, *Rolling Stone's 500 Greatest Albums*) rather than free-form logging.
Users log entries (date + rating + notes) against items in a list and see per-list completion
progress. Tapping an album/movie opens it in the native Apple Music / Apple TV app via a stored
deep link. Ships as a responsive, installable PWA — one codebase for iPhone, iPad, and web.

## Key decisions and why

- **PWA, not React Native or a separate native app.** Single codebase, no App Store review cycle,
  matches "webapp that works on iPhone, iPad, web."
- **No live Apple Music/movie API calls at runtime, at all.** MVP logging is scoped to items already
  in the seeded lists, not ad hoc search. So every media item's metadata is fetched once, offline, by
  a seed script and stored in Postgres — the running app only ever queries Supabase.
- **Albums: free, keyless iTunes Search API (`entity=album`).** Confirmed live — returns title,
  artist, artwork, and a `collectionViewUrl` deep link (`music.apple.com/...`) with zero
  authentication. No Apple Developer Program membership needed for the MVP.
- **Movies: TMDB, not the iTunes Search API.** Confirmed live: `entity=movie` on the iTunes Search
  API returns 0 results for every title tested (Jaws, Casablanca, Toy Story, Interstellar, The
  Matrix, Inception) — Apple has emptied that index as part of its shift to the Apple TV app /
  tv.apple.com. There is no official Apple catalog API for movies/TV at any price, paid or free — the
  $99/yr Apple Developer Program only unlocks MusicKit (music), not a TV/movies equivalent. TMDB
  (free API key) is the reliable alternative for title/director/poster/year. Since there's no
  official mapping from a TMDB id to an Apple TV catalog id, the movie deep link is a best-effort
  `tv.apple.com/search?term=...` link rather than an exact per-title page — flagged clearly in code
  and in `supabase/seed/README.md`.
- **`diary_entries` has no unique constraint on `(user_id, media_item_id)`.** Re-watches/re-listens
  are allowed (Letterboxd-style) — "has this been logged" is `EXISTS(...)`, not a 1:1 lookup.
- **Per-list progress is a Postgres view (`list_progress`), not a synced table.** Computed by joining
  `diary_entries` against `list_items` membership — deliberately **not** filtered by
  `diary_entries.list_id`, because curated lists overlap (the same album can be on both "1001
  Albums" and "Rolling Stone 500"); `list_id` on a diary entry is just "what was I browsing"
  context, never the source of truth for completion.
- **RLS is public-read on `lists`/`list_items`/`media_items`, owner-only on `profiles`/
  `diary_entries`.** All writes to the public-read tables go through the service-role seed script —
  there are deliberately no INSERT/UPDATE policies for them.

## Data model

See `supabase/migrations/0001` through `0006` — each file has an inline comment explaining its
non-obvious decisions (the `handle_new_user` trigger, the `list_media_type` vs `media_type` enum
split, the progress view's join logic, the RLS default-deny gotcha).

## Repo layout

```
heardSeen/
├── .env.example
├── biome.json
├── next.config.ts            (Serwist PWA wiring)
├── src/
│   ├── app/
│   │   ├── layout.tsx          (manifest link, PWA meta, install banner)
│   │   ├── page.tsx             (dashboard: list_progress)
│   │   ├── (auth)/login, (auth)/callback   (magic-link auth)
│   │   ├── lists/, lists/[slug]/, diary/
│   │   └── sw.ts                (Serwist service worker source)
│   ├── components/             (media-card, rating-input, list-progress-bar, install-banner)
│   ├── lib/
│   │   ├── supabase/{client,server,admin}.ts
│   │   ├── itunes/albums.ts     (free iTunes Search wrapper — albums)
│   │   ├── tmdb/movies.ts       (TMDB wrapper — movies)
│   │   └── types/database.ts    (hand-written; regenerate via `supabase gen types` once a real project exists)
│   └── middleware.ts            (Supabase session refresh)
├── supabase/
│   ├── migrations/0001–0006
│   └── seed/
│       ├── lists.config.ts      (which lists get seeded)
│       ├── sources/*.source.json (hand-authored title/artist lists, ~20 items each)
│       ├── generate-seed-data.ts (enriches sources → data/*.json via iTunes/TMDB)
│       ├── seed-runner.ts        (upserts data/*.json into Supabase)
│       └── README.md             (sample-vs-full-list scope, how to extend)
└── README.md
```

## Workstreams (what ran, and what's left)

Built in this pass, using a mix of direct implementation and parallel background agents for the
independent pieces:

- **Bootstrap** — Next.js/Tailwind/Biome/pnpm scaffold, Supabase CLI init, `.env.example`.
- **Schema & migrations** — all 6 migrations, RLS, progress view.
- **Auth** — Supabase clients (browser/server/admin), session-refresh middleware, magic-link
  login + callback.
- **Data integration** — `lib/itunes/albums.ts`, `lib/tmdb/movies.ts`, both smoke-tested live.
- **Seed pipeline** — 3 sample lists (~20 items each: 1001 Albums, Rolling Stone 500, AFI's 100
  Movies), enriched via the real APIs where credentials allow (albums fully enriched now; movies
  need `TMDB_API_KEY` to enrich beyond title-only placeholders).
- **Core UI** — dashboard, lists browse/detail, diary, media cards with Apple deep links.
- **PWA polish** — manifest, icon set, Serwist service worker, iOS "Add to Home Screen" banner.

### What's still open (needs your input or real credentials — see README)

1. **Full list compilation.** The seeded lists are ~20-item *samples*, not the real 500-1001-item
   canon. Extending them is research/data-entry work (verify rank + exact title/artist against a
   public factual source per list) — see `supabase/seed/README.md` for the extension process.
2. **A real Supabase project.** Migrations are written but unverified against a live/local Postgres
   (no Docker in this environment) — run `pnpm exec supabase db push` (linked) or
   `supabase start && supabase db reset` (local, needs Docker) once you're ready, and sanity-check
   the `list_progress` view's output against real data.
3. **TMDB key.** Movies are currently seeded as unenriched placeholders. Add `TMDB_API_KEY` and
   re-run `pnpm run seed:generate && pnpm run seed`.
4. **Deployment.** Vercel project + env vars — last-mile, needs your real credentials.
