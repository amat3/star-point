-- Lets an admin keep the draw of one event in their own hands. The automatic draw
-- (/api/cron/generate-draws) only acts on open mixings with auto_draw = true. Every event has it on
-- (the weekly ones too) unless an admin switches it off when creating or editing the event, e.g. a
-- special event with guests whose level is not calibrated yet.
--
-- Apply it BEFORE deploying the code that reads the column: the cron filters by it, and without the
-- column it would fail and no event would be drawn automatically.

alter table public.events add column if not exists auto_draw boolean not null default true;
