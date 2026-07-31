import Link from "next/link";
import { redirect } from "next/navigation";
import { DiscoverPicks } from "@/components/discover-picks";
import { ListProgressBar } from "@/components/list-progress-bar";
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

const SORT_OPTIONS = [
  {
    value: "title-asc",
    label: "Title (A-Z)",
    column: "title",
    ascending: true,
  },
  {
    value: "title-desc",
    label: "Title (Z-A)",
    column: "title",
    ascending: false,
  },
  {
    value: "completed-desc",
    label: "Most complete",
    column: "completed_items",
    ascending: false,
  },
  {
    value: "completed-asc",
    label: "Least complete",
    column: "completed_items",
    ascending: true,
  },
] as const satisfies readonly SortOption[];

type HomePageProps = {
  searchParams: Promise<RawSearchParams>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
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

  const {
    data: progress,
    error,
    count,
  } = await supabase
    .from("list_progress")
    .select("*", { count: "exact" })
    .order(sort.column, { ascending: sort.ascending })
    .range(from, to);

  const totalPages = getTotalPages(count, DEFAULT_PAGE_SIZE);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="text-2xl font-semibold">Home</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Decide what's next, log it, and track your progress.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Decide &amp; log
        </h2>
        <div className="mt-3">
          <DiscoverPicks userId={user.id} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Your progress
        </h2>

        {error && (
          <p className="mt-4 text-sm text-red-600">
            Couldn't load your progress right now.
          </p>
        )}

        {!error && progress?.length === 0 && page === 1 && (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            No lists yet.{" "}
            <Link href="/lists" className="underline">
              Browse lists
            </Link>{" "}
            to get started.
          </p>
        )}

        {!error && (progress?.length ?? 0) > 0 && (
          <div className="mt-4 flex justify-end">
            <SortSelect options={SORT_OPTIONS} current={sort.value} />
          </div>
        )}

        <ul className="mt-3 flex flex-col gap-3">
          {progress?.map((list) => (
            <li key={list.list_id}>
              <Link
                href={`/lists/${list.slug}`}
                className="block rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">{list.title}</h3>
                  <span className="shrink-0 text-xs uppercase tracking-wide text-neutral-400">
                    {list.media_type}
                  </span>
                </div>
                <div className="mt-3">
                  <ListProgressBar
                    completedItems={list.completed_items}
                    totalItems={list.total_items}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <PaginationControls
          basePath="/"
          searchParams={resolvedSearchParams}
          currentPage={page}
          totalPages={totalPages}
        />
      </section>
    </main>
  );
}
