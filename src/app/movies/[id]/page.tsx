import { notFound } from "next/navigation";
import { MediaLogPanel } from "@/components/media-log-panel";
import { formatDate, formatRuntime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { MovieDetail } from "@/lib/tmdb/movies";
import { getMovie } from "@/lib/tmdb/movies";
import type { DiaryEntry } from "@/lib/types/database";

type MoviePageProps = {
  params: Promise<{ id: string }>;
};

// Rich, Letterboxd-style movie page: fetches synopsis/cast/crew/runtime
// live from TMDB on each visit (cached a day via Next's fetch cache -- see
// getMovie). Falls back to the lightweight seeded fields (title/creator/
// artwork/year) if the live lookup fails or the item was seeded without a
// TMDB key.
export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("media_items")
    .select("*")
    .eq("id", id)
    .eq("type", "movie")
    .single();

  if (!item) {
    notFound();
  }

  const isEnriched = !item.external_id.startsWith("unenriched:");

  let detail: MovieDetail | null = null;
  if (isEnriched) {
    try {
      detail = await getMovie(item.external_id);
    } catch (error) {
      console.error("TMDB movie lookup failed", error);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let entries: DiaryEntry[] = [];
  if (user) {
    const { data } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("media_item_id", item.id)
      .order("logged_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    entries = data ?? [];
  }

  const title = detail?.title ?? item.title;
  const posterUrl = detail?.posterUrl ?? item.artwork_url;
  const releaseDate = formatDate(detail?.releaseDate ?? null);
  const runtime = formatRuntime(detail?.runtimeMinutes ?? null);
  const director = detail?.director ?? item.creator;

  return (
    <main className="flex-1">
      {detail?.backdropUrl && (
        <div className="relative h-64 w-full overflow-hidden sm:h-80">
          <img
            src={detail.backdropUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          {/* Only the bottom edge fades into the page background -- the rest
              of the image stays vivid, unlike a full-height wash. */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent sm:h-32 dark:from-neutral-950" />
        </div>
      )}

      {/* relative (no z-index): the backdrop above is `relative` (for its
          absolute gradient overlay), which alone promotes it into CSS's
          "positioned" paint layer -- that layer always paints above
          non-positioned static content, regardless of DOM order. Adding
          `relative` here (both z-index:auto) puts this div in the same
          layer, where DOM order correctly makes it win. An explicit z-index
          isn't needed for that -- and would be wrong here, since `<main>`
          doesn't establish its own stacking context, so any z-index we set
          would compete directly with SiteNav's `z-10` at the body level and
          could cover the nav instead. */}
      <div className="relative mx-auto w-full max-w-3xl px-4 pb-6">
        {/* The whole row (poster + text) shifts up together by the same
            amount, so their relative alignment never changes -- items-end
            then pins both to the row's bottom edge, which keeps the text
            comfortably below the backdrop regardless of how far the
            (taller) poster pokes up into it. */}
        <div
          className={`flex items-end gap-6 ${
            detail?.backdropUrl ? "-mt-20 sm:-mt-28" : "pt-6"
          }`}
        >
          {/* Fixed width+height (not aspect-ratio) -- a nested aspect-ratio
              box here was rendering shorter than its width × 1.5 in this
              items-end flex row, cropping the top of the poster. Explicit
              dimensions sidestep whatever sizing quirk caused that. */}
          <div className="h-[216px] w-36 shrink-0 overflow-hidden rounded-lg bg-neutral-200 shadow-xl sm:h-[264px] sm:w-44 dark:bg-neutral-800">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="text-xl font-bold sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {item.release_year && <span>{item.release_year}</span>}
              {item.release_year && director && <span> · </span>}
              {director && <span>Directed by {director}</span>}
            </p>
            {detail?.tagline && (
              <p className="mt-3 text-xs font-medium tracking-wide text-neutral-400 uppercase">
                {detail.tagline}
              </p>
            )}
            <p className="mt-3 flex flex-wrap gap-x-2 text-xs text-neutral-400">
              {releaseDate && <span>{releaseDate}</span>}
              {runtime && <span>{runtime}</span>}
              {detail?.genres.length ? (
                <span>{detail.genres.join(", ")}</span>
              ) : null}
              {detail?.voteAverage ? (
                <span>★ {detail.voteAverage.toFixed(1)}</span>
              ) : null}
            </p>

            {item.apple_url && (
              <a
                href={item.apple_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                View on TMDB
              </a>
            )}

            {!detail && (
              <p className="mt-3 text-xs text-neutral-400">
                Extended details aren't available right now — showing saved info
                only.
              </p>
            )}
          </div>
        </div>

        {detail?.overview && (
          <p className="mt-6 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {detail.overview}
          </p>
        )}

        {detail && detail.cast.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold">Cast</h2>
            <ul className="mt-2 flex gap-3 overflow-x-auto pb-2">
              {detail.cast.map((member) => (
                <li key={member.id} className="w-20 shrink-0 text-center">
                  <div className="aspect-[2/3] w-full overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-800">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-[11px] font-medium">
                    {member.name}
                  </p>
                  <p className="truncate text-[10px] text-neutral-400">
                    {member.character}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8">
          <MediaLogPanel
            mediaItemId={item.id}
            userId={user?.id ?? null}
            initialEntries={entries}
          />
        </div>
      </div>
    </main>
  );
}
