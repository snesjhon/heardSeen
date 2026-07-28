-- Some entries are logged well after the fact with no known date (e.g.
-- "I've definitely heard this album, just not sure when") -- logged_at is
-- now optional. Keep the current_date default for the common case (logging
-- something today); a null means "date unknown," not "today."
alter table public.diary_entries alter column logged_at drop not null;
