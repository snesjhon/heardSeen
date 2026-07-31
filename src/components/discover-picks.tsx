"use client";

import { useEffect, useRef, useState } from "react";
import { MediaListItem } from "@/components/media-list-item";
import { createClient } from "@/lib/supabase/client";
import type { MediaItem } from "@/lib/types/database";

export type DiscoverCandidate = {
  item: MediaItem;
  listId: string;
  listTitle: string;
};

type DiscoverPicksProps = {
  userId: string;
  pickCount?: number;
};

// Safety ceiling on the broad "give me something random" query -- current
// seed scope is ~540 items across all lists combined; this only needs to
// stay above however many items exist across all lists put together, since
// it's not a random sample (see fetchPool below).
const POOL_LIMIT = 1000;

// `raw_metadata` is deliberately left out -- it's unused by any of the
// discover-picks UI and can be a large JSON blob per item, not worth
// fetching hundreds of times over.
const LIST_ITEM_SELECT =
  "list_id, media_item:media_items!inner(id, type, external_id, title, creator, artwork_url, release_year, apple_url, created_at), list:lists!inner(title)";

type ListItemRow = {
  list_id: string;
  media_item: Omit<MediaItem, "raw_metadata">;
  list: { title: string };
};

function storageKey(userId: string) {
  return `heardSeen:discoverPicks:${userId}`;
}

function readStoredIds(userId: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : null;
  } catch {
    return null;
  }
}

function writeStoredIds(userId: string, ids: string[]) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(ids));
  } catch {
    // Private browsing / storage disabled / quota exceeded -- picks just
    // won't persist across loads, not worth surfacing to the user.
  }
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toCandidates(
  rows: ListItemRow[],
  loggedIds: Set<string>,
): DiscoverCandidate[] {
  const seen = new Set<string>();
  const candidates: DiscoverCandidate[] = [];
  for (const row of rows) {
    const itemId = row.media_item.id;
    if (loggedIds.has(itemId) || seen.has(itemId)) {
      continue;
    }
    seen.add(itemId);
    candidates.push({
      item: { ...row.media_item, raw_metadata: null },
      listId: row.list_id,
      listTitle: row.list.title,
    });
  }
  return candidates;
}

// The full unlogged pool, across every list -- only fetched when a fresh
// random pick actually needs to be made (first-ever visit, or Shuffle),
// never on a normal reload where picks are just being restored by id.
async function fetchPool(userId: string): Promise<DiscoverCandidate[]> {
  const supabase = createClient();
  const [{ data: loggedRows }, { data: itemRows }] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("media_item_id")
      .eq("user_id", userId),
    supabase
      .from("list_items")
      .select(LIST_ITEM_SELECT)
      .limit(POOL_LIMIT) as unknown as Promise<{ data: ListItemRow[] | null }>,
  ]);

  const loggedIds = new Set((loggedRows ?? []).map((row) => row.media_item_id));
  return toCandidates(itemRows ?? [], loggedIds);
}

// Just the items already persisted by id -- a handful of rows, run on every
// normal page load instead of pulling the whole catalog. Drops any id
// that's since been logged (or no longer exists on a list) rather than
// erroring on it.
async function fetchByIds(
  userId: string,
  ids: string[],
): Promise<DiscoverCandidate[]> {
  const supabase = createClient();
  const [{ data: loggedRows }, { data: itemRows }] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("media_item_id")
      .eq("user_id", userId)
      .in("media_item_id", ids),
    supabase
      .from("list_items")
      .select(LIST_ITEM_SELECT)
      .in("media_item_id", ids) as unknown as Promise<{
      data: ListItemRow[] | null;
    }>,
  ]);

  const loggedIds = new Set((loggedRows ?? []).map((row) => row.media_item_id));
  const byId = new Map(
    toCandidates(itemRows ?? [], loggedIds).map((c) => [c.item.id, c]),
  );

  // Preserve the persisted order rather than whatever order Postgres hands
  // back, and silently drop anything that no longer resolves.
  return ids
    .map((id) => byId.get(id))
    .filter((c): c is DiscoverCandidate => c !== undefined);
}

// A handful of random unlogged picks, to help decide what to hear/see next
// instead of scrolling a full list. Picks are persisted by id in
// localStorage so Home stays put across reloads -- only "Shuffle" draws a
// new set. All fetching happens client-side (this is a "use client"
// component with no server-passed data), which also sidesteps any
// server/client hydration mismatch: both the server-rendered pass and the
// pre-effect client pass render the same "loading" state below.
export function DiscoverPicks({ userId, pickCount = 6 }: DiscoverPicksProps) {
  const [displayed, setDisplayed] = useState<DiscoverCandidate[] | null>(null);
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
  // Caches the broad pool in memory for the rest of the session once it's
  // been fetched, so repeated Shuffles don't re-fetch the whole catalog.
  const poolRef = useRef<DiscoverCandidate[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const storedIds = readStoredIds(userId);
      const restored =
        storedIds && storedIds.length > 0
          ? await fetchByIds(userId, storedIds)
          : [];
      if (cancelled) return;

      if (restored.length > 0) {
        setDisplayed(restored);
        return;
      }

      if (!poolRef.current) {
        poolRef.current = await fetchPool(userId);
      }
      if (cancelled) return;

      const fresh = shuffle(poolRef.current).slice(0, pickCount);
      setDisplayed(fresh);
      writeStoredIds(
        userId,
        fresh.map((c) => c.item.id),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, pickCount]);

  async function handleShuffle() {
    if (!poolRef.current) {
      poolRef.current = await fetchPool(userId);
    }
    const fresh = shuffle(poolRef.current).slice(0, pickCount);
    setDisplayed(fresh);
    setLoggedIds(new Set());
    writeStoredIds(
      userId,
      fresh.map((c) => c.item.id),
    );
  }

  if (displayed === null) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Loading picks…
      </p>
    );
  }

  if (displayed.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Nothing left to pick from — you've logged everything across your lists.
      </p>
    );
  }

  const picks = displayed.filter((c) => !loggedIds.has(c.item.id));

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          A few unlogged picks to help you decide.
        </p>
        <button
          type="button"
          onClick={handleShuffle}
          className="shrink-0 text-xs font-medium text-neutral-600 underline underline-offset-2 dark:text-neutral-300"
        >
          Shuffle
        </button>
      </div>

      {picks.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          All logged.{" "}
          <button
            type="button"
            onClick={handleShuffle}
            className="underline underline-offset-2"
          >
            Shuffle
          </button>{" "}
          for more.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {picks.map(({ item, listId, listTitle }) => (
            <li key={item.id}>
              <p className="mb-1 truncate text-[11px] uppercase tracking-wide text-neutral-400">
                {listTitle}
              </p>
              <MediaListItem
                item={item}
                listId={listId}
                userId={userId}
                existingEntry={null}
                onLogged={() =>
                  setLoggedIds((prev) => new Set(prev).add(item.id))
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
