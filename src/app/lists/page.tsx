import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Public read -- no auth required to browse the catalog of curated lists.
export default async function ListsPage() {
  const supabase = await createClient();

  const { data: lists, error } = await supabase
    .from("lists")
    .select("*")
    .order("title");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="text-2xl font-semibold">Lists</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Curated lists of albums and movies to work through.
      </p>

      {error && (
        <p className="mt-6 text-sm text-red-600">Couldn't load lists.</p>
      )}

      <ul className="mt-6 flex flex-col gap-3">
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
    </main>
  );
}
