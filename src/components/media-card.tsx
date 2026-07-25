import type { MediaItem } from "@/lib/types/database";

type MediaCardProps = {
  item: MediaItem;
  logged?: boolean;
};

// Album/movie card. The whole card links out to apple_url (universal link on
// iOS opens the native Apple Music/TV app, falls back to web) when present.
// Falls back to a plain, non-clickable card when there's no apple_url.
export function MediaCard({ item, logged }: MediaCardProps) {
  const content = (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
        {item.artwork_url ? (
          <img
            src={item.artwork_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400 dark:text-neutral-600">
            <span className="text-xs">
              {item.type === "album" ? "No artwork" : "No poster"}
            </span>
          </div>
        )}
        {logged && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white shadow">
            Logged
          </span>
        )}
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {item.title}
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
          {item.creator}
          {item.release_year ? ` · ${item.release_year}` : ""}
        </p>
      </div>
    </>
  );

  if (item.apple_url) {
    return (
      <a
        href={item.apple_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-left"
      >
        {content}
      </a>
    );
  }

  return <div className="w-full">{content}</div>;
}
