-- Curated lists (e.g. "1001 Albums You Must Hear Before You Die",
-- "Rolling Stone's 500 Greatest Albums"). Read-only for end users in MVP --
-- writes only happen via the service-role seed script.
-- Distinct from media_items.type: a list can be 'mixed' (both albums and
-- movies) even though every individual media_item is exactly one or the other.
create type public.list_media_type as enum ('album', 'movie', 'mixed');

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  media_type public.list_media_type not null,
  source_attribution text,
  created_at timestamptz not null default now()
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  media_item_id uuid not null references public.media_items (id) on delete cascade,
  position int not null,
  unique (list_id, media_item_id)
);

create index if not exists list_items_list_id_idx on public.list_items (list_id);
create index if not exists list_items_media_item_id_idx on public.list_items (media_item_id);
