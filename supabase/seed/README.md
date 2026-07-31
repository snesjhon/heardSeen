# Seed data

This only seeds the lightweight fields (`title`/`creator`/`artwork_url`/`release_year`/`apple_url`)
needed for browsing lists and identifying an item. The rich stuff — an album's tracklist, a movie's
synopsis/cast/crew/runtime — is deliberately **not** seeded; `/albums/[id]` and `/movies/[id]` fetch
that live from Apple Music/TMDB on each visit instead (see `src/lib/apple-music/catalog.ts`'s
`getAlbum` and `src/lib/tmdb/movies.ts`'s `getMovie`). That keeps this pipeline about identity/
membership ("which items are on this list"), not a mirror of Apple Music/TMDB's full catalogs.

Two-step pipeline:

1. **`pnpm run seed:generate`** — reads the small hand-authored source lists in `sources/*.source.json`
   (title + artist/director only) and enriches each entry with real metadata:
   - Albums: the [Apple Music Catalog API](https://developer.apple.com/documentation/applemusicapi)
     (needs `APPLE_TEAM_ID`/`APPLE_KEY_ID`/`APPLE_PRIVATE_KEY_PATH` in `.env`, the last one pointing
     at your downloaded `.p8` key file — an Apple Developer Program membership, ~$99/yr). Without
     these, albums are written as unenriched placeholders (title/artist only, no artwork/`apple_url`)
     so the pipeline still runs end-to-end.
   - Movies: [TMDB](https://www.themoviedb.org/settings/api) (needs `TMDB_API_KEY` in `.env`).
     `apple_url` for movies points at the title's TMDB page (`themoviedb.org/movie/{id}`), not
     directly at Apple — TMDB's "Where to Watch" section links onward to Apple TV/other providers
     when available, which is more reliable than guessing a tv.apple.com search URL (there's no
     official TMDB-id-to-Apple-TV-id mapping). Without a key, movies are written as unenriched
     placeholders (title only, `apple_url` falls back to a `themoviedb.org/search` link) so the
     pipeline still runs end-to-end.

   Output goes to `data/*.json` — **gitignored, local only**. It's a disposable intermediate
   artifact, not a source of truth: once `pnpm run seed` has loaded it into Supabase, the database
   is the source of truth, not this JSON. Regenerate it any time with `seed:generate`.

2. **`pnpm run seed`** — upserts `data/*.json` into Supabase (`lists`, `media_items`, `list_items`)
   via the service-role client, in batches of 50 rows per request rather than one row at a time (a
   500-item list would otherwise mean ~1,000 sequential round trips). Safe to re-run *as long as
   each media_item's `external_id` hasn't changed* since the last run — the upsert conflict key is
   `(type, external_id)`, so a changed id creates a new row instead of replacing the old one.

Some source lists also carry a per-item `description` (e.g. Rolling Stone's own write-up for why an
album is ranked where it is). That's list-specific commentary, not part of an item's identity, so it
lives on `list_items.description` rather than `media_items` — a `{ title, artist, description }`
source entry flows straight through `seed:generate` into that column.

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

`lists.config.ts` currently seeds **~20-item samples** of two lists, not the real full canon:

- 1001 Albums You Must Hear Before You Die
- AFI's 100 Years...100 Movies

Rolling Stone's 500 Greatest Albums of All Time is the exception — `sources/rolling-stone-500.source.json`
has the real, full 500 entries (rank order, with each album's Rolling Stone write-up as `description`).

Compiling the full lists is real research/data-entry work (verifying rank + exact title/artist for
hundreds of entries against a public factual source, e.g. Wikipedia's tables for each list) —
deliberately out of scope for the initial scaffold. To extend a list:

1. Add more `{ title, artist }` (or `{ title }` for movies) entries to the relevant
   `sources/*.source.json` file.
2. Re-run `pnpm run seed:generate` then `pnpm run seed`.

Some titles won't find an exact match on the first try (Apple Music/TMDB search is fuzzy) — check the
`⚠ no match` warnings `seed:generate` prints and adjust the source title/artist spelling as needed.
