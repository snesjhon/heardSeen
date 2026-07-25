# Seed data

Two-step pipeline:

1. **`pnpm run seed:generate`** — reads the small hand-authored source lists in `sources/*.source.json`
   (title + artist/director only) and enriches each entry with real metadata:
   - Albums: the free, keyless iTunes Search API (`entity=album`). No credentials needed.
   - Movies: [TMDB](https://www.themoviedb.org/settings/api) (needs `TMDB_API_KEY` in `.env`). Without a key,
     movies are written as unenriched placeholders (title only, `apple_url` falls back to a
     `tv.apple.com/search` link) so the pipeline still runs end-to-end.

   Output goes to `data/*.json`, which is checked into git so the repo is immediately seedable
   without re-running network calls.

2. **`pnpm run seed`** — upserts `data/*.json` into Supabase (`lists`, `media_items`, `list_items`)
   via the service-role client. Idempotent — safe to re-run after regenerating.

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

Some titles won't find an exact match on the first try (iTunes/TMDB search is fuzzy) — check the
`⚠ no match` warnings `seed:generate` prints and adjust the source title/artist spelling as needed.
