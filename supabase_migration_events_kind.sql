-- Events come in two kinds:
--   'mixing': the weekly mixing (draw, rounds, results)
--   'match':  a match a player publishes to look for players (4 players, 90 min,
--             no draw and no results). max_spots = organizer + players still needed.
alter table public.events
  add column kind text not null default 'mixing'
  check (kind in ('mixing', 'match'));
