# Seed data

Two-step pipeline:

1. **`pnpm run seed:generate`** — reads the small hand-authored source lists in `sources/*.source.json`
   (title + artist/director only) and enriches each entry with real metadata:
   - Albums: the [Apple Music Catalog API](https://developer.apple.com/documentation/applemusicapi)
     (needs `APPLE_TEAM_ID`/`APPLE_KEY_ID`/`APPLE_PRIVATE_KEY_PATH` in `.env`, the last one pointing
     at your downloaded `.p8` key file — an Apple Developer Program membership, ~$99/yr). Without
     these, albums are written as unenriched placeholders (title/artist only, no artwork/`apple_url`)
     so the pipeline still runs end-to-end.
   - Movies: [TMDB](https://www.themoviedb.org/settings/api) (needs `TMDB_API_KEY` in `.env`). Without a key,
     movies are written as unenriched placeholders (title only, `apple_url` falls back to a
     `tv.apple.com/search` link) so the pipeline still runs end-to-end.

   Output goes to `data/*.json`, which is checked into git so the repo is immediately seedable
   without re-running network calls — **currently these are all unenriched placeholders**, since no
   real credentials exist in this environment. Re-run once you've added yours.

2. **`pnpm run seed`** — upserts `data/*.json` into Supabase (`lists`, `media_items`, `list_items`)
   via the service-role client. Safe to re-run *as long as each media_item's `external_id` hasn't
   changed* since the last run — the upsert conflict key is `(type, external_id)`, so a changed id
   creates a new row instead of replacing the old one.

If you've previously seeded placeholder data (no credentials yet) and are now reloading with real
Apple Music/TMDB data, `external_id` changes (placeholder ids look like `unenriched:...`, real ones
are the actual catalog ids) — upserting won't clean up the old placeholder rows. Run
**`pnpm run seed:reset`** first to wipe `media_items`/`lists` (cascades to `list_items` and any
`diary_entries` referencing them — fine pre-launch, not something to run once real user data
exists), then `seed:generate` and `seed` again:

```bash
pnpm run seed:reset
pnpm run seed:generate
pnpm run seed
```

## Current scope: samples, not the full lists

`lists.config.ts` currently seeds **~20-item samples** of three lists, not the real 500-1001-item
canon:

- 1001 Albums You Must Hear Before You Die
- Rolling Stone's 500 Greatest Albums of All Time
- AFI's 100 Years...100 Movies

Compiling the full lists is real research/data-entry work (verifying rank + exact title/artist for
hundreds of entries against a public factual source, e.g. Wikipedia's tables for each list) —
deliberately out of scope for the initial scaffold. To extend a list:

1. Add more `{ title, artist }` (or `{ title }` for movies) entries to the relevant
   `sources/*.source.json` file.
2. Re-run `pnpm run seed:generate` then `pnpm run seed`.

Some titles won't find an exact match on the first try (Apple Music/TMDB search is fuzzy) — check the
`⚠ no match` warnings `seed:generate` prints and adjust the source title/artist spelling as needed.
