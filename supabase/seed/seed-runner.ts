// Upserts the enriched JSON files (produced by generate-seed-data.ts) into
// Supabase via the service-role client, bypassing RLS. lists/media_items/
// list_items are all upserted on their unique keys, so re-running is safe
// AS LONG AS a media_item's external_id hasn't changed since the last run.
// If it has (e.g. you're moving off placeholder data -- see
// reset-seed-tables.ts), upsert() creates a new row instead of replacing the
// old one, since the conflict key no longer matches; run
// `pnpm run seed:reset` first in that case. Run with: pnpm run seed
//
// media_items/list_items are upserted in chunks rather than one row (and one
// round trip) at a time -- a 500-item list would otherwise mean ~1,000
// sequential requests to Supabase.
//
// Run standalone via tsx, outside of Next.js -- unlike Next, plain Node
// doesn't auto-load .env, so this loads it explicitly.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient } from "../../src/lib/supabase/admin";
import { LISTS } from "./lists.config";

const SEED_DIR = __dirname;
const BATCH_SIZE = 50;

// Shape written by generate-seed-data.ts's NormalizedAlbum/NormalizedMovie
// (plus the optional Rolling Stone-style per-item write-up).
type SeedItem = {
  type: "album" | "movie";
  external_id: string;
  title: string;
  creator: string;
  artwork_url: string | null;
  release_year: number | null;
  apple_url: string | null;
  raw_metadata: Record<string, unknown>;
  description?: string | null;
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  const supabase = createAdminClient();

  for (const list of LISTS) {
    console.log(`\nSeeding "${list.title}"...`);

    const dataPath = join(SEED_DIR, list.outputFile);
    const items = JSON.parse(readFileSync(dataPath, "utf-8")) as SeedItem[];

    if (items.length === 0) {
      console.warn(
        `  ⚠ ${list.outputFile} is empty -- run "pnpm run seed:generate" first`,
      );
      continue;
    }

    const { data: listRow, error: listError } = await supabase
      .from("lists")
      .upsert(
        {
          slug: list.slug,
          title: list.title,
          description: list.description,
          media_type: list.mediaType,
          source_attribution: list.sourceAttribution,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (listError || !listRow) {
      throw new Error(
        `Failed to upsert list "${list.slug}": ${listError?.message}`,
      );
    }

    // media_items keyed by "type:external_id" (the upsert conflict key) so
    // the list_items batch below can look up the id each item resolved to,
    // without a per-item round trip.
    const mediaItemIds = new Map<string, string>();

    for (const batch of chunk(items, BATCH_SIZE)) {
      const { data: mediaRows, error: mediaError } = await supabase
        .from("media_items")
        .upsert(
          batch.map((item) => ({
            type: item.type,
            external_id: item.external_id,
            title: item.title,
            creator: item.creator,
            artwork_url: item.artwork_url,
            release_year: item.release_year,
            apple_url: item.apple_url,
            raw_metadata: item.raw_metadata,
          })),
          { onConflict: "type,external_id" },
        )
        .select("id, type, external_id");

      if (mediaError || !mediaRows) {
        throw new Error(
          `Failed to upsert media_items batch: ${mediaError?.message}`,
        );
      }

      for (const row of mediaRows) {
        mediaItemIds.set(`${row.type}:${row.external_id}`, row.id);
      }
      console.log(
        `  ✓ upserted ${mediaItemIds.size}/${items.length} media_items`,
      );
    }

    const listItemRows = items.map((item, index) => {
      const mediaItemId = mediaItemIds.get(`${item.type}:${item.external_id}`);
      if (!mediaItemId) {
        throw new Error(
          `Missing media_item id for "${item.title}" after upsert`,
        );
      }
      return {
        list_id: listRow.id,
        media_item_id: mediaItemId,
        position: index + 1,
        description: item.description ?? null,
      };
    });

    for (const batch of chunk(listItemRows, BATCH_SIZE)) {
      const { error: listItemError } = await supabase
        .from("list_items")
        .upsert(batch, { onConflict: "list_id,media_item_id" });

      if (listItemError) {
        throw new Error(
          `Failed to upsert list_items batch: ${listItemError.message}`,
        );
      }
    }

    console.log(`  ✓ seeded ${items.length} items`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
