import Link from "next/link";
import { buildListHref, type RawSearchParams } from "@/lib/pagination";

type PaginationControlsProps = {
  basePath: string;
  searchParams: RawSearchParams;
  currentPage: number;
  totalPages: number;
};

const linkClass =
  "rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700";
const disabledClass =
  "rounded-md border border-transparent px-3 py-1.5 text-sm text-neutral-300 dark:text-neutral-700";

export function PaginationControls({
  basePath,
  searchParams,
  currentPage,
  totalPages,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="mt-6 flex items-center justify-between gap-4"
      aria-label="Pagination"
    >
      {currentPage > 1 ? (
        <Link
          href={buildListHref(basePath, searchParams, {
            page: currentPage - 1,
          })}
          className={linkClass}
        >
          Previous
        </Link>
      ) : (
        <span className={disabledClass}>Previous</span>
      )}

      <span className="text-sm text-neutral-500 dark:text-neutral-400">
        Page {currentPage} of {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={buildListHref(basePath, searchParams, {
            page: currentPage + 1,
          })}
          className={linkClass}
        >
          Next
        </Link>
      ) : (
        <span className={disabledClass}>Next</span>
      )}
    </nav>
  );
}
