import Link from "next/link";
import { redirect } from "next/navigation";
import { ListProgressBar } from "@/components/list-progress-bar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: progress, error } = await supabase
    .from("list_progress")
    .select("*")
    .order("title");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="text-2xl font-semibold">Your progress</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        How far you've made it through each list.
      </p>

      {error && (
        <p className="mt-6 text-sm text-red-600">
          Couldn't load your progress right now.
        </p>
      )}

      {!error && progress?.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          No lists yet.{" "}
          <Link href="/lists" className="underline">
            Browse lists
          </Link>{" "}
          to get started.
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {progress?.map((list) => (
          <li key={list.list_id}>
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
    </main>
  );
}
