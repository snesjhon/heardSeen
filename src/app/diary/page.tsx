import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DiaryEntry, MediaItem } from "@/lib/types/database";

type DiaryEntryWithMediaItem = DiaryEntry & { media_item: MediaItem | null };

export default async function DiaryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Relationships: [] on diary_entries/media_items means postgrest-js can't
  // infer embedded-select shapes, so the row shape is asserted by hand here
  // rather than cast around a `never` -- it matches the actual query exactly.
  const { data: entries, error } = (await supabase
    .from("diary_entries")
    .select("*, media_item:media_items(*)")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .order("created_at", { ascending: false })) as {
    data: DiaryEntryWithMediaItem[] | null;
    error: { message: string } | null;
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="text-2xl font-semibold">Your diary</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Everything you've logged, newest first.
      </p>

      {error && (
        <p className="mt-6 text-sm text-red-600">Couldn't load your diary.</p>
      )}

      {!error && entries?.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          Nothing logged yet.{" "}
          <Link href="/lists" className="underline">
            Browse lists
          </Link>{" "}
          to log your first entry.
        </p>
      )}

      <ul className="mt-6 flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
        {entries?.map((entry) => {
          const mediaItem = entry.media_item;
          return (
            <li key={entry.id} className="flex gap-3 py-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-800">
                {mediaItem?.artwork_url ? (
                  <img
                    src={mediaItem.artwork_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {mediaItem?.title ?? "Unknown item"}
                </p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {mediaItem?.creator}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span>{entry.logged_at}</span>
                  {entry.rating && <span>{"★".repeat(entry.rating)}</span>}
                </div>
                {entry.notes && (
                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                    {entry.notes}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
