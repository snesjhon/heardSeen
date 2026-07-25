"use client";

import { useState } from "react";
import { LogEntryForm } from "@/components/log-entry-form";
import { MediaCard } from "@/components/media-card";
import type { DiaryEntry, MediaItem } from "@/lib/types/database";

type MediaListItemProps = {
  item: MediaItem;
  listId: string;
  userId: string | null;
  existingEntry: DiaryEntry | null;
};

// One item within a list detail page: artwork/card, logged state, and (for
// signed-in users who haven't logged it yet) a toggleable log-entry form.
export function MediaListItem({
  item,
  listId,
  userId,
  existingEntry,
}: MediaListItemProps) {
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState(existingEntry);

  return (
    <div>
      <MediaCard item={item} logged={Boolean(entry)} />

      {entry && (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Logged {entry.logged_at}
          {entry.rating ? ` · ${entry.rating}★` : ""}
        </p>
      )}

      {!entry && userId && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1 text-xs font-medium text-neutral-600 underline underline-offset-2 dark:text-neutral-300"
        >
          Log this
        </button>
      )}

      {!entry && userId && open && (
        <LogEntryForm
          mediaItemId={item.id}
          listId={listId}
          userId={userId}
          onLogged={(logged) => {
            setEntry(logged);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </div>
  );
}
