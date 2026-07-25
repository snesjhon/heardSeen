-- Shared cache/normalization table for anything sourced from the Apple Music
-- Catalog API (albums) or the iTunes Search API (movies). Populated only by
-- the service-role seed script in MVP -- never written to by end users.
create type public.media_type as enum ('album', 'movie');

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  type public.media_type not null,
  external_id text not null,
  title text not null,
  creator text not null, -- artist for albums, director for movies
  artwork_url text,
  release_year int,
  -- Canonical music.apple.com / tv.apple.com link (Catalog API `attributes.url`
  -- or iTunes Search `trackViewUrl`). Tapping a card opens this directly --
  -- Apple's universal links launch the native Apple Music / Apple TV app on
  -- iOS/iPadOS automatically when installed, otherwise fall back to web.
  apple_url text,
  raw_metadata jsonb,
  created_at timestamptz not null default now(),
  unique (type, external_id)
);

create index if not exists media_items_type_idx on public.media_items (type);
