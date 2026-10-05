-- Names of the players the organizer of a match already has settled outside the app
-- (a match is 4 players; max_spots only counts the organizer plus the ones still missing).
alter table public.events add column if not exists known_players text[] not null default '{}';

-- Free comment of a match ("necesitamos una chica", "buscamos jugador de revés"…).
alter table public.events add column if not exists notes text;
