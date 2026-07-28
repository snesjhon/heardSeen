"use client";

import { useState } from "react";
import { LogEntryForm } from "@/components/log-entry-form";
import type { DiaryEntry } from "@/lib/types/database";

type MediaLogPanelProps = {
  mediaItemId: string;
  userId: string | null;
  initialEntries: DiaryEntry[];
};

// Shown on a media item's own detail page: past logs by the current user
// (re-logs are allowed, so this can be a short list, not just one entry)
// plus a form to log another. Not tied to any particular list -- see the
// listId comment in LogEntryForm.
export function MediaLogPanel({
  mediaItemId,
  userId,
  initialEntries,
}: MediaLogPanelProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [open, setOpen] = useState(false);

  if (!userId) {
    return (
      <p className="rounded-md bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
        Sign in to log this.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Your log</h2>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-medium text-neutral-600 underline underline-offset-2 dark:text-neutral-300"
          >
            {entries.length > 0 ? "Log again" : "Log this"}
          </button>
        )}
      </div>

      {entries.length === 0 && !open && (
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Not logged yet.
        </p>
      )}

      {entries.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-md border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800"
            >
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                <span>{entry.logged_at ?? "Date unknown"}</span>
                {entry.rating && <span>{"★".repeat(entry.rating)}</span>}
              </div>
              {entry.notes && (
                <p className="mt-1 text-neutral-700 dark:text-neutral-300">
                  {entry.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <LogEntryForm
          mediaItemId={mediaItemId}
          listId={null}
          userId={userId}
          onLogged={(logged) => {
            setEntries((prev) => [logged, ...prev]);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </div>
  );
}
