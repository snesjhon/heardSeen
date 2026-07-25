-- RLS is default-deny once enabled: every table below needs explicit
-- policies for the access it should allow. The service role (used only by
-- the seed script and admin server code) bypasses RLS entirely and needs no
-- policies of its own.

alter table public.profiles enable row level security;
alter table public.media_items enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.diary_entries enable row level security;

-- profiles: users can read and update only their own row.
create policy "profiles are viewable by owner"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles are updatable by owner"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- media_items / lists / list_items: public read-only reference data.
-- No write policies -- all writes go through the service-role seed script.
create policy "media_items are publicly readable"
  on public.media_items for select
  to anon, authenticated
  using (true);

create policy "lists are publicly readable"
  on public.lists for select
  to anon, authenticated
  using (true);

create policy "list_items are publicly readable"
  on public.list_items for select
  to anon, authenticated
  using (true);

-- diary_entries: fully scoped to the owning user.
create policy "diary entries are viewable by owner"
  on public.diary_entries for select
  to authenticated
  using (auth.uid() = user_id);

create policy "diary entries are insertable by owner"
  on public.diary_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "diary entries are updatable by owner"
  on public.diary_entries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "diary entries are deletable by owner"
  on public.diary_entries for delete
  to authenticated
  using (auth.uid() = user_id);
