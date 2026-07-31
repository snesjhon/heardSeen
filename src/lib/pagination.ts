export const DEFAULT_PAGE_SIZE = 48;

export type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(searchParams: RawSearchParams): number {
  const raw = Number(firstValue(searchParams.page));
  return Number.isInteger(raw) && raw >= 1 ? raw : 1;
}

// Supabase's `.range(from, to)` is inclusive on both ends.
export function getPageRange(page: number, pageSize: number): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}

export function getTotalPages(count: number | null, pageSize: number): number {
  if (!count || count <= 0) return 1;
  return Math.max(1, Math.ceil(count / pageSize));
}

export type SortOption = {
  value: string;
  label: string;
  column: string;
  ascending: boolean;
};

export function parseSort<T extends SortOption>(
  options: readonly T[],
  searchParams: RawSearchParams,
): T {
  const raw = firstValue(searchParams.sort);
  return options.find((option) => option.value === raw) ?? options[0];
}

// Builds a query string carrying over every param except `page`/`sort`,
// which callers set explicitly -- keeps pagination/sort links from silently
// dropping other filters a page might add later.
export function buildListHref(
  basePath: string,
  searchParams: RawSearchParams,
  overrides: { page?: number; sort?: string },
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || key === "sort") continue;
    const single = firstValue(value);
    if (single) params.set(key, single);
  }

  const sort = overrides.sort ?? firstValue(searchParams.sort);
  if (sort) params.set("sort", sort);

  const page = overrides.page ?? parsePage(searchParams);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
