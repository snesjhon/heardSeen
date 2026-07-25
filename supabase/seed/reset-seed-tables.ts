// Wipes all seed-managed tables so the next `pnpm run seed` starts from a
// clean slate. Needed one-off whenever a media_item's external_id would
// change between runs (e.g. the placeholder-id -> real-Apple-Music-id
// transition) -- upsert() only updates a row when its conflict key
// (type, external_id) matches, so a changed external_id creates a NEW row
// instead of replacing the old one, leaving orphaned duplicates behind.
// Going forward, once external_ids are real and stable, `pnpm run seed` is
// naturally idempotent via upsert and this reset isn't needed on every run.
//
// Deletes media_items and lists; list_items cascades from both (it has no
// independent data), and diary_entries cascades from media_items -- so this
// also wipes any diary entries logged against seed data. Fine for early
// development; do not wire this into a production reseed once real user
// diary data exists.
import "dotenv/config";
import { createAdminClient } from "../../src/lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  console.log("Resetting seed-managed tables (media_items, lists) ...");
  console.log(
    "This cascades to list_items and any diary_entries referencing them.",
  );

  const { error: mediaError, count: mediaCount } = await supabase
    .from("media_items")
    .delete({ count: "exact" })
    .not("id", "is", null);

  if (mediaError) {
    throw new Error(`Failed to clear media_items: ${mediaError.message}`);
  }
  console.log(
    `  ✓ deleted ${mediaCount ?? 0} media_items (and their list_items/diary_entries)`,
  );

  const { error: listsError, count: listsCount } = await supabase
    .from("lists")
    .delete({ count: "exact" })
    .not("id", "is", null);

  if (listsError) {
    throw new Error(`Failed to clear lists: ${listsError.message}`);
  }
  console.log(`  ✓ deleted ${listsCount ?? 0} lists`);

  console.log(
    "\nDone. Run `pnpm run seed:generate && pnpm run seed` to reload from scratch.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
