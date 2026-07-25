// Upserts the enriched JSON files (produced by generate-seed-data.ts) into
// Supabase via the service-role client, bypassing RLS. Idempotent: safe to
// re-run -- lists/media_items/list_items are all upserted on their unique
// keys. Run with: pnpm run seed
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient } from "../../src/lib/supabase/admin";
import { LISTS } from "./lists.config";

const SEED_DIR = __dirname;

async function main() {
  const supabase = createAdminClient();

  for (const list of LISTS) {
    console.log(`\nSeeding "${list.title}"...`);

    const dataPath = join(SEED_DIR, list.outputFile);
    const items = JSON.parse(readFileSync(dataPath, "utf-8"));

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

    for (const [index, item] of items.entries()) {
      const { data: mediaRow, error: mediaError } = await supabase
        .from("media_items")
        .upsert(
          {
            type: item.type,
            external_id: item.external_id,
            title: item.title,
            creator: item.creator,
            artwork_url: item.artwork_url,
            release_year: item.release_year,
            apple_url: item.apple_url,
            raw_metadata: item.raw_metadata,
          },
          { onConflict: "type,external_id" },
        )
        .select("id")
        .single();

      if (mediaError || !mediaRow) {
        throw new Error(
          `Failed to upsert media_item "${item.title}": ${mediaError?.message}`,
        );
      }

      const { error: listItemError } = await supabase.from("list_items").upsert(
        {
          list_id: listRow.id,
          media_item_id: mediaRow.id,
          position: index + 1,
        },
        { onConflict: "list_id,media_item_id" },
      );

      if (listItemError) {
        throw new Error(
          `Failed to upsert list_item for "${item.title}": ${listItemError.message}`,
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
