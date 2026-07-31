import Link from "next/link";
import { redirect } from "next/navigation";
import { PaginationControls } from "@/components/pagination-controls";
import { SortSelect } from "@/components/sort-select";
import {
  DEFAULT_PAGE_SIZE,
  getPageRange,
  getTotalPages,
  parsePage,
  parseSort,
  type RawSearchParams,
  type SortOption,
} from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import type { DiaryEntry, MediaItem } from "@/lib/types/database";

type DiaryEntryWithMediaItem = DiaryEntry & { media_item: MediaItem | null };

const SORT_OPTIONS = [
  {
    value: "logged_at-desc",
    label: "Newest logged",
    column: "logged_at",
    ascending: false,
  },
  {
    value: "logged_at-asc",
    label: "Oldest logged",
    column: "logged_at",
    ascending: true,
  },
  {
    value: "rating-desc",
    label: "Highest rated",
    column: "rating",
    ascending: false,
  },
  {
    value: "rating-asc",
    label: "Lowest rated",
    column: "rating",
    ascending: true,
  },
] as const satisfies readonly SortOption[];

type DiaryPageProps = {
  searchParams: Promise<RawSearchParams>;
};

export default async function DiaryPage({ searchParams }: DiaryPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const page = parsePage(resolvedSearchParams);
  const sort = parseSort(SORT_OPTIONS, resolvedSearchParams);
  const [from, to] = getPageRange(page, DEFAULT_PAGE_SIZE);

  // Relationships: [] on diary_entries/media_items means postgrest-js can't
  // infer embedded-select shapes, so the row shape is asserted by hand here
  // rather than cast around a `never` -- it matches the actual query exactly.
  const {
    data: entries,
    error,
    count,
  } = (await supabase
    .from("diary_entries")
    .select("*, media_item:media_items(*)", { count: "exact" })
    .eq("user_id", user.id)
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to)) as {
    data: DiaryEntryWithMediaItem[] | null;
    error: { message: string } | null;
    count: number | null;
  };

  const totalPages = getTotalPages(count, DEFAULT_PAGE_SIZE);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="text-2xl font-semibold">Your diary</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Everything you've logged, newest first.
      </p>

      {error && (
        <p className="mt-6 text-sm text-red-600">Couldn't load your diary.</p>
      )}

      {!error && entries?.length === 0 && page === 1 && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          Nothing logged yet.{" "}
          <Link href="/lists" className="underline">
            Browse lists
          </Link>{" "}
          to log your first entry.
        </p>
      )}

      {!error && (entries?.length ?? 0) > 0 && (
        <div className="mt-6 flex justify-end">
          <SortSelect options={SORT_OPTIONS} current={sort.value} />
        </div>
      )}

      <ul className="mt-3 flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
        {entries?.map((entry) => {
          const mediaItem = entry.media_item;
          const href = mediaItem
            ? `/${mediaItem.type === "album" ? "albums" : "movies"}/${mediaItem.id}`
            : null;
          const artwork = (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-800">
              {mediaItem?.artwork_url ? (
                <img
                  src={mediaItem.artwork_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          );
          const title = (
            <p className="truncate text-sm font-medium">
              {mediaItem?.title ?? "Unknown item"}
            </p>
          );
          return (
            <li key={entry.id} className="flex gap-3 py-3">
              {href ? (
                <Link href={href} className="shrink-0">
                  {artwork}
                </Link>
              ) : (
                artwork
              )}
              <div className="min-w-0 flex-1">
                {href ? <Link href={href}>{title}</Link> : title}
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {mediaItem?.creator}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span>{entry.logged_at ?? "Date unknown"}</span>
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

      <PaginationControls
        basePath="/diary"
        searchParams={resolvedSearchParams}
        currentPage={page}
        totalPages={totalPages}
      />
    </main>
  );
}
