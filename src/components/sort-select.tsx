"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";

type SortSelectProps = {
  options: readonly { value: string; label: string }[];
  current: string;
};

// Navigates on change rather than requiring a submit button -- resets `page`
// since a new sort order invalidates whatever page offset was in the URL.
export function SortSelect({ options, current }: SortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", event.target.value);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
      Sort by
      <select
        value={current}
        onChange={handleChange}
        className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
