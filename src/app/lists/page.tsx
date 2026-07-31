import Link from "next/link";
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
    value: "media_type-asc",
    label: "Media type",
    column: "media_type",
    ascending: true,
  },
] as const satisfies readonly SortOption[];

type ListsPageProps = {
  searchParams: Promise<RawSearchParams>;
};

// Public read -- no auth required to browse the catalog of curated lists.
export default async function ListsPage({ searchParams }: ListsPageProps) {
  const supabase = await createClient();

  const resolvedSearchParams = await searchParams;
  const page = parsePage(resolvedSearchParams);
  const sort = parseSort(SORT_OPTIONS, resolvedSearchParams);
  const [from, to] = getPageRange(page, DEFAULT_PAGE_SIZE);

  const {
    data: lists,
    error,
    count,
  } = await supabase
    .from("lists")
    .select("*", { count: "exact" })
    .order(sort.column, { ascending: sort.ascending })
    .range(from, to);

  const totalPages = getTotalPages(count, DEFAULT_PAGE_SIZE);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="text-2xl font-semibold">Lists</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Curated lists of albums and movies to work through.
      </p>

      {error && (
        <p className="mt-6 text-sm text-red-600">Couldn't load lists.</p>
      )}

      {!error && (lists?.length ?? 0) > 0 && (
        <div className="mt-6 flex justify-end">
          <SortSelect options={SORT_OPTIONS} current={sort.value} />
        </div>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {lists?.map((list) => (
          <li key={list.id}>
            <Link
              href={`/lists/${list.slug}`}
              className="block rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium">{list.title}</h2>
                <span className="shrink-0 text-xs uppercase tracking-wide text-neutral-400">
                  {list.media_type}
                </span>
              </div>
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
            </Link>
          </li>
        ))}
      </ul>

      <PaginationControls
        basePath="/lists"
        searchParams={resolvedSearchParams}
        currentPage={page}
        totalPages={totalPages}
      />
    </main>
  );
}
