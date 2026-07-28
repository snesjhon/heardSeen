import { notFound } from "next/navigation";
import { MediaLogPanel } from "@/components/media-log-panel";
import type { AlbumDetail } from "@/lib/apple-music/catalog";
import { getAlbum } from "@/lib/apple-music/catalog";
import {
  formatDate,
  formatTrackDuration,
  sanitizeEditorialHtml,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { DiaryEntry } from "@/lib/types/database";

type AlbumPageProps = {
  params: Promise<{ id: string }>;
};

// Rich album page: fetches the full tracklist/genre/label live from the
// Apple Music Catalog API on each visit (cached a day via Next's fetch
// cache -- see getAlbum). Falls back to the lightweight seeded fields
// (title/artist/artwork/year) if the live lookup fails or the item was
// seeded without real credentials.
export default async function AlbumPage({ params }: AlbumPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("media_items")
    .select("*")
    .eq("id", id)
    .eq("type", "album")
    .single();

  if (!item) {
    notFound();
  }

  const isEnriched = !item.external_id.startsWith("unenriched:");

  let detail: AlbumDetail | null = null;
  if (isEnriched) {
    try {
      detail = await getAlbum(item.external_id);
    } catch (error) {
      console.error("Apple Music album lookup failed", error);
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
  const artist = detail?.artist ?? item.creator;
  const artworkUrl = detail?.artworkUrl ?? item.artwork_url;
  const releaseDate = formatDate(detail?.releaseDate ?? null);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="mx-auto aspect-square w-48 shrink-0 overflow-hidden rounded-lg bg-neutral-200 sm:mx-0 dark:bg-neutral-800">
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            {artist}
          </p>
          <p className="mt-2 flex flex-wrap gap-x-2 text-xs text-neutral-400">
            {releaseDate && <span>{releaseDate}</span>}
            {detail?.genres.length ? (
              <span>{detail.genres.join(", ")}</span>
            ) : null}
            {detail?.trackCount ? (
              <span>{detail.trackCount} tracks</span>
            ) : null}
          </p>

          {item.apple_url && (
            <a
              href={item.apple_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              Open in Apple Music
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

      {detail?.editorialNote && (
        <div className="mt-6 text-sm text-neutral-700 dark:text-neutral-300 [&_li]:ml-4 [&_ol]:list-decimal [&_p+p]:mt-3 [&_ul]:list-disc">
          {/* sanitizeEditorialHtml allowlists a handful of text-formatting
              tags and strips every attribute (no href/src/on*), so this is
              safe despite the source being third-party (Apple Music) markup. */}
          <div
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized above via sanitizeEditorialHtml
            dangerouslySetInnerHTML={{
              __html: sanitizeEditorialHtml(detail.editorialNote),
            }}
          />
        </div>
      )}

      {detail && detail.tracks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold">Tracklist</h2>
          <ol className="mt-2 flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
            {detail.tracks.map((track) => (
              <li
                key={track.id}
                className="flex items-center gap-3 py-2 text-sm"
              >
                <span className="w-5 shrink-0 text-right text-neutral-400">
                  {track.number ?? ""}
                </span>
                <span className="min-w-0 flex-1 truncate">{track.name}</span>
                <span className="shrink-0 text-xs text-neutral-400">
                  {formatTrackDuration(track.durationMs)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(detail?.recordLabel || detail?.copyright) && (
        <p className="mt-4 text-xs text-neutral-400">
          {[detail?.recordLabel, detail?.copyright].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="mt-8">
        <MediaLogPanel
          mediaItemId={item.id}
          userId={user?.id ?? null}
          initialEntries={entries}
        />
      </div>
    </main>
  );
}
