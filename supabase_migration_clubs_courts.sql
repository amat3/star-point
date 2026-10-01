-- Clubs and their courts.
-- events.club_id: which club hosts the event.
-- matches.court_id: which court a match is played on.
-- matches.court_number / court_name are kept (round-local number + historic text).

begin;

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (club_id, name)
);

create index courts_club_id_idx on public.courts (club_id);

alter table public.events  add column club_id  uuid references public.clubs(id);
alter table public.matches add column court_id uuid references public.courts(id);

create index events_club_id_idx  on public.events  (club_id);
create index matches_court_id_idx on public.matches (court_id);

-- RLS: readable by everyone (the public home shows the venue), writable by admins only.
alter table public.clubs  enable row level security;
alter table public.courts enable row level security;

create policy "Everyone can view clubs"  on public.clubs  for select using (true);
create policy "Everyone can view courts" on public.courts for select using (true);

create policy "Admins can insert clubs" on public.clubs for insert
  with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admins can update clubs" on public.clubs for update
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admins can delete clubs" on public.clubs for delete
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

create policy "Admins can insert courts" on public.courts for insert
  with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admins can update courts" on public.courts for update
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admins can delete courts" on public.courts for delete
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

-- Backfill: default club with the courts from COURT_NAMES (src/lib/constants.ts).
-- Padel Indoor has 9 courts but COURT_NAMES lists 8: the 9th is a generic "Pista 9" until its name is known.
insert into public.clubs (name) values ('Padel Indoor');

insert into public.courts (club_id, name, position)
select c.id, v.name, v.position
from public.clubs c,
     (values
       ('CLITECSA', 1),
       ('JAFRISUR', 2),
       ('DENTAL CLINIC', 3),
       ('JOYERIA POSITO', 4),
       ('BLANCA IMPRESORES', 5),
       ('HACIENDA LA LAGUNA', 6),
       ('SERVIMAIN', 7),
       ('ESTRELLA DAMM (exterior)', 8),
       ('Pista 9', 9)
     ) as v(name, position)
where c.name = 'Padel Indoor';

update public.events
set club_id = (select id from public.clubs where name = 'Padel Indoor');

-- Link historic matches by name (case-insensitive) plus the short aliases used in the past.
update public.matches m
set court_id = ct.id
from public.courts ct
where m.court_name is not null
  and ct.club_id = (select id from public.clubs where name = 'Padel Indoor')
  and lower(ct.name) = case lower(m.court_name)
        when 'posito'   then 'joyeria posito'
        when 'hacienda' then 'hacienda la laguna'
        when 'blanca'   then 'blanca impresores'
        else lower(m.court_name)
      end;

-- Other clubs in Jaén; their courts are generic ("Pista 1", "Pista 2", ...).
insert into public.clubs (name) values
  ('Padel Premium'),
  ('Padel Akademia'),
  ('Salobreja'),
  ('Hotel HO Ciudad de Jaén'),
  ('C.D. Forus'),
  ('Universidad'),
  ('Provalsan');

insert into public.courts (club_id, name, position)
select c.id, 'Pista ' || n, n
from public.clubs c
join (values
  ('Padel Premium', 8),
  ('Padel Akademia', 5),
  ('Salobreja', 4),
  ('Hotel HO Ciudad de Jaén', 5),
  ('C.D. Forus', 5),
  ('Universidad', 4),
  ('Provalsan', 2)
) as v(name, courts) on v.name = c.name
cross join lateral generate_series(1, v.courts) as n;

commit;

-- events.club_id stays nullable on purpose: events with an unknown venue show "Club por confirmar".
