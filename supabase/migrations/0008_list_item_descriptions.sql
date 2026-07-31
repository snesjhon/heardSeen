-- Per-list-item write-up (e.g. Rolling Stone's blurb on why an album sits at
-- a given rank). Lives on list_items, not media_items, because it's specific
-- to *this list's* curation of the item, not the item's identity in general
-- -- the same album could appear on another list with different commentary.
alter table public.list_items add column if not exists description text;
