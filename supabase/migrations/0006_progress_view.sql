-- Per-list progress for the CURRENT user, computed on the fly rather than
-- stored -- at this scale (lists capped around 1000 rows, a handful of
-- users) a synced counter table would only risk drifting from reality.
--
-- Deliberately joins against list_items (list membership), NOT
-- diary_entries.list_id, because curated lists overlap: logging an album
-- while browsing "1001 Albums" must still count toward "Rolling Stone 500"
-- progress if that album is on both lists.
--
-- security_invoker makes this view respect the querying user's own RLS
-- (Postgres 15+), rather than running with the view owner's privileges.
create view public.list_progress
with (security_invoker = true)
as
select
  l.id as list_id,
  l.slug,
  l.title,
  l.media_type,
  count(distinct li.media_item_id) as total_items,
  count(distinct de.media_item_id) as completed_items
from public.lists l
join public.list_items li on li.list_id = l.id
left join public.diary_entries de
  on de.media_item_id = li.media_item_id
  and de.user_id = auth.uid()
group by l.id, l.slug, l.title, l.media_type;

grant select on public.list_progress to anon, authenticated;
