-- Rules of one event's draw, set by an admin in the generator (/admin/events/[id]/generate) for a special event:
--  - 'pair': player_a and player_b must be partners once, in a round whose format matches their genders (a woman
--    and a man: a mixed round; two women or two men: a separated round).
--  - 'women_court': player_a, a man, may complete the women's court of the separated rounds. When an event has
--    any, only those men can.
-- Admins only (players never see them). The automatic draw skips events that have rules: it cannot follow them.
--
-- Apply it BEFORE deploying the code that reads the table (the generator loads the rules of the event).

create table if not exists public.event_draw_rules (
  id uuid not null default gen_random_uuid() primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('pair', 'women_court')),
  player_a uuid not null references public.profiles(id) on delete cascade,
  player_b uuid references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamp with time zone not null default now(),
  constraint event_draw_rules_shape check ((kind = 'pair') = (player_b is not null) and player_a is distinct from player_b)
);

-- The same rule only once per event, whatever the order of the two players
create unique index if not exists event_draw_rules_unique on public.event_draw_rules
  (event_id, kind, least(player_a, coalesce(player_b, player_a)), greatest(player_a, coalesce(player_b, player_a)));

alter table public.event_draw_rules enable row level security;

create policy "Admin full access on event_draw_rules" on public.event_draw_rules as permissive for all to authenticated
  using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'))
  with check (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'));
