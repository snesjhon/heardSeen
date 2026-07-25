// Offline enrichment pass: reads the small hand-authored source lists
// (title/artist or title only) and looks up real metadata (artwork, apple
// deep link, release year) from the Apple Music Catalog API (albums,
// requires APPLE_TEAM_ID/APPLE_KEY_ID/APPLE_PRIVATE_KEY) and TMDB (movies,
// requires TMDB_API_KEY). Writes enriched JSON that seed-runner.ts then
// upserts into Supabase. Run with: pnpm run seed:generate
//
// Run standalone via tsx, outside of Next.js -- unlike Next, plain Node
// doesn't auto-load .env, so this loads it explicitly.
import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  type NormalizedAlbum,
  searchAlbum,
} from "../../src/lib/apple-music/catalog";
import { type NormalizedMovie, searchMovie } from "../../src/lib/tmdb/movies";
import { LISTS } from "./lists.config";

const SEED_DIR = __dirname;

function hasAppleMusicCredentials(): boolean {
  return Boolean(
    process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY,
  );
}

async function enrichAlbums(
  sources: Array<{ title: string; artist: string }>,
): Promise<NormalizedAlbum[]> {
  if (!hasAppleMusicCredentials()) {
    console.warn(
      "  ⚠ APPLE_TEAM_ID/APPLE_KEY_ID/APPLE_PRIVATE_KEY not set -- writing unenriched " +
        "album placeholders. Add your Apple Developer Program MusicKit credentials and " +
        "re-run to fill in artwork/year/apple_url from the real Catalog API.",
    );
    return sources.map((source) => ({
      type: "album" as const,
      external_id: `unenriched:${source.artist}:${source.title}`,
      title: source.title,
      creator: source.artist,
      artwork_url: null,
      release_year: null,
      apple_url: null,
      raw_metadata: {
        id: "",
        attributes: { name: source.title, artistName: source.artist, url: "" },
      },
    }));
  }

  const enriched: NormalizedAlbum[] = [];

  for (const source of sources) {
    const result = await searchAlbum(source.title, source.artist);
    if (!result) {
      console.warn(
        `  ⚠ no Apple Music match for "${source.title}" by ${source.artist}`,
      );
      continue;
    }
    enriched.push(result);
    // Be polite to the Catalog API.
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return enriched;
}

async function enrichMovies(
  sources: Array<{ title: string }>,
): Promise<NormalizedMovie[]> {
  if (!process.env.TMDB_API_KEY) {
    console.warn(
      "  ⚠ TMDB_API_KEY not set -- writing unenriched movie placeholders. " +
        "Set the key and re-run to fill in artwork/year/director/apple_url.",
    );
    return sources.map((source) => ({
      type: "movie" as const,
      external_id: `unenriched:${source.title}`,
      title: source.title,
      creator: "Unknown",
      artwork_url: null,
      release_year: null,
      apple_url: `https://tv.apple.com/search?term=${encodeURIComponent(source.title)}`,
      raw_metadata: { id: -1, title: source.title, director: null },
    }));
  }

  const enriched: NormalizedMovie[] = [];
  for (const source of sources) {
    const result = await searchMovie(source.title);
    if (!result) {
      console.warn(`  ⚠ no TMDB match for "${source.title}"`);
      continue;
    }
    enriched.push(result);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return enriched;
}

async function main() {
  for (const list of LISTS) {
    console.log(`\nEnriching "${list.title}"...`);

    const sourcePath = join(SEED_DIR, list.sourceFile);
    const sources = JSON.parse(readFileSync(sourcePath, "utf-8"));

    const enriched =
      list.mediaType === "album"
        ? await enrichAlbums(sources)
        : await enrichMovies(sources);

    const outputPath = join(SEED_DIR, list.outputFile);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(enriched, null, 2));

    console.log(
      `  ✓ wrote ${enriched.length}/${sources.length} items to ${list.outputFile}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
