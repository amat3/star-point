-- Remembers that an event has had its draw published (by an admin or by the automatic draw).
-- The automatic draw (/api/cron/generate-draws) only acts on open events where this is null, so
-- pressing "Rehacer" inside the 3-hour window does not make it draw again behind the admin's back.
--
-- Apply it BEFORE deploying the code that writes the column: publishing a draw sets it.

alter table public.events add column if not exists draw_published_at timestamptz;

-- Events that already have a draw: mark them, so a later "Rehacer" is not redrawn automatically either
update public.events
set draw_published_at = now()
where status = 'in_progress' and draw_published_at is null;
