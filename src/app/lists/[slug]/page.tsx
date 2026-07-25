import { notFound } from "next/navigation";
import { MediaListItem } from "@/components/media-list-item";
import { createClient } from "@/lib/supabase/server";
import type { DiaryEntry, MediaItem } from "@/lib/types/database";

type ListDetailPageProps = {
  params: Promise<{ slug: string }>;
};

// Public browse -- signed-out visitors can view a list's items; only
// logged-in users get logged-state + the ability to log entries.
export default async function ListDetailPage({ params }: ListDetailPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: list } = await supabase
    .from("lists")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!list) {
    notFound();
  }

  // Relationships: [] on list_items/media_items means postgrest-js can't
  // infer embedded-select shapes, so the row shape is asserted by hand here
  // rather than cast around a `never` -- it matches the actual query exactly.
  const { data: listItems } = (await supabase
    .from("list_items")
    .select("position, media_item:media_items(*)")
    .eq("list_id", list.id)
    .order("position")) as {
    data: { position: number; media_item: MediaItem | null }[] | null;
    error: unknown;
  };

  const items = (listItems ?? [])
    .map((row) => row.media_item)
    .filter((item): item is MediaItem => item !== null);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const entriesByMediaItemId = new Map<string, DiaryEntry>();
  if (user && items.length > 0) {
    const { data: entries } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("user_id", user.id)
      .in(
        "media_item_id",
        items.map((item) => item.id),
      )
      .order("logged_at", { ascending: false });

    // Most recent entry per media item wins when re-logged more than once
    // (entries are ordered newest-first, so the first occurrence sticks).
    for (const entry of entries ?? []) {
      if (!entriesByMediaItemId.has(entry.media_item_id)) {
        entriesByMediaItemId.set(entry.media_item_id, entry);
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="text-2xl font-semibold">{list.title}</h1>
      {list.description && (
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {list.description}
        </p>
      )}
      {list.source_attribution && (
        <p className="mt-2 text-xs text-neutral-400">
          {list.source_attribution}
        </p>
      )}

      {!user && (
        <p className="mt-4 rounded-md bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          Sign in to log entries against this list.
        </p>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <MediaListItem
              item={item}
              listId={list.id}
              userId={user?.id ?? null}
              existingEntry={entriesByMediaItemId.get(item.id) ?? null}
            />
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          This list has no items yet.
        </p>
      )}
    </main>
  );
}
