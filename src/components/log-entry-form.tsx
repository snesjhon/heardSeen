"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RatingInput } from "@/components/rating-input";
import { createClient } from "@/lib/supabase/client";
import type { DiaryEntry } from "@/lib/types/database";

type LogEntryFormProps = {
  mediaItemId: string;
  // Null when logged from a media item's own detail page, outside the
  // context of any particular list -- list_id on a diary entry is just
  // "what was I browsing," never required.
  listId: string | null;
  userId: string;
  onLogged?: (entry: DiaryEntry) => void;
  onCancel?: () => void;
};

// Inline "log this" form. Inserts directly into diary_entries using the
// browser Supabase client -- RLS requires auth.uid() = user_id, so the
// current user's id (fetched server-side by the parent page) is passed in
// and sent explicitly on the insert.
//
// The date field is blank by default, not pre-filled with today: most items
// are being logged because they were already heard/seen at some unknown
// point in the past, not experienced for the first time right now. Leaving
// it blank records the entry as "added today, date unknown" (logged_at
// null, created_at is the timestamp of record); only fill in a date when
// you actually know when you heard/saw it.
export function LogEntryForm({
  mediaItemId,
  listId,
  userId,
  onLogged,
  onCancel,
}: LogEntryFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loggedAt, setLoggedAt] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("diary_entries")
      .insert({
        user_id: userId,
        media_item_id: mediaItemId,
        list_id: listId,
        rating,
        notes: notes.trim() || null,
        logged_at: loggedAt || null,
      })
      .select()
      .single();

    if (error || !data) {
      setStatus("error");
      return;
    }

    setStatus("idle");
    onLogged?.(data);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
    >
      <RatingInput
        value={rating}
        onChange={setRating}
        disabled={status === "saving"}
      />
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        disabled={status === "saving"}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      <input
        type="date"
        value={loggedAt}
        onChange={(event) => setLoggedAt(event.target.value)}
        disabled={status === "saving"}
        aria-label="Date (leave blank if you don't know when)"
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        Leave the date blank if you don't remember exactly when.
      </p>
      {status === "error" && (
        <p className="text-xs text-red-600">
          Couldn't save that entry. Try again.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={status === "saving"}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-500 disabled:opacity-50 dark:text-neutral-400"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
