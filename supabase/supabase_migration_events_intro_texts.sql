-- Optional texts of a mixing's page header, set in the event form: the line above the title (intro_eyebrow,
-- default "El plan de los <día>") and the sentence under it (intro_subtitle, default "Partidos de nivel y
-- cerveza garantizada."). Null keeps the defaults, so existing events do not change.
--
-- Apply it BEFORE deploying the code that writes them (creating or editing an event sends both columns).

alter table public.events add column if not exists intro_eyebrow text;
alter table public.events add column if not exists intro_subtitle text;
