-- A user's personal log of albums heard / movies seen. Letterboxd-style:
-- re-logging the same media_item (a re-watch/re-listen) is allowed, so there
-- is deliberately NO unique constraint on (user_id, media_item_id). "Has this
-- been logged" is an EXISTS(...) query, not a 1:1 lookup.
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  media_item_id uuid not null references public.media_items (id) on delete cascade,
  -- What list the user was browsing when they logged this -- context only,
  -- NEVER the source of truth for list completion. Curated lists overlap
  -- (the same album can appear on both "1001 Albums" and "Rolling Stone 500"),
  -- so progress must be computed by joining against list_items membership,
  -- not by filtering diary_entries.list_id. See 0006_progress_view.sql.
  list_id uuid references public.lists (id) on delete set null,
  rating smallint check (rating between 1 and 5),
  notes text,
  logged_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists diary_entries_user_id_idx on public.diary_entries (user_id);
create index if not exists diary_entries_media_item_id_idx on public.diary_entries (media_item_id);
