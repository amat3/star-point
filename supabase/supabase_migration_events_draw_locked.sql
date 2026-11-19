-- Locks a published draw: no "Rehacer", no "Cambiar parejas" and no edit that would undo it (club, courts, rounds).
-- Set by hand for an event whose draw was agreed outside the generator:
--   update public.events set draw_locked = true where id = '<event id>';
--
-- Apply it BEFORE deploying the code that reads the column.

alter table public.events add column if not exists draw_locked boolean not null default false;
