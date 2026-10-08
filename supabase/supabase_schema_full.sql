-- starpoint · full database schema (structure only, no data).
--
-- Snapshot of the production database taken on 2026-10-07, after every migration in this
-- folder had been applied, with the security hardening included. Use it to bootstrap a
-- new Supabase project (for example the demo one): run it once in the SQL editor of an
-- EMPTY project. It does NOT replace the incremental migrations (`supabase_migration_*.sql`),
-- which stay as the history of how production got here.
--
-- Not included on purpose: data (clubs, courts, profiles... go in a seed), the hourly
-- pg_cron job (`supabase/supabase_cron_close_pending_matches.sql`, it carries a secret) and anything
-- Supabase creates by itself (auth, storage and realtime schemas).

-- 1. Extensions -----------------------------------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
-- Only needed for the automatic closing of pending matches:
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;

-- 2. Tables ---------------------------------------------------------------------------------
create table public.clubs (
  id uuid not null default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table public.courts (
  id uuid not null default gen_random_uuid(),
  club_id uuid not null,
  name text not null,
  "position" integer not null default 0,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table public.profiles (
  id uuid not null,
  email text not null,
  full_name text,
  avatar_url text,
  rating double precision default 1.5,
  role text default 'player'::text,
  matches_played bigint default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  matches_won integer default 0,
  win_ratio double precision default 0,
  gender text,
  preferred_hand text,
  court_position text,
  is_guest boolean not null default false
);

create table public.events (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  title text not null,
  start_time timestamp with time zone not null,
  max_spots integer not null default 12,
  status text not null default 'open'::text,
  created_by uuid not null,
  rounds integer default 1,
  duration_minutes integer default 90,
  is_test boolean not null default false,
  club_id uuid,
  kind text not null default 'mixing'::text,
  known_players text[] not null default '{}'::text[],
  notes text
);

create table public.event_participants (
  event_id uuid not null,
  user_id uuid not null,
  joined_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table public.matches (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  creator_id uuid not null,
  player_a1 uuid not null,
  player_a2 uuid not null,
  player_b1 uuid not null,
  player_b2 uuid not null,
  sets_a smallint,
  sets_b smallint,
  status text default 'pending'::text,
  validated_by uuid,
  rating_change double precision,
  score_details text,
  match_type text default 'match'::text,
  event_id uuid,
  last_updated_by uuid,
  court_number integer,
  round_number integer default 1,
  court_name text,
  court_id uuid,
  result_updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table public.rating_history (
  id uuid not null default gen_random_uuid(),
  player_id uuid not null,
  match_id uuid,
  rating_before double precision not null,
  rating_after double precision not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.notifications (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  event_id uuid,
  type text not null default 'promoted_to_starter'::text,
  message text not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table public.push_subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table public.mixing_exclusions (
  id uuid not null default gen_random_uuid(),
  player_a uuid not null,
  player_b uuid not null,
  type text not null,
  note text,
  created_by uuid not null,
  created_at timestamp with time zone not null default now()
);

-- Not used by the interface any more, kept because the table exists in production.
create table public.mixing_incentives (
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  winner_id uuid not null,
  target_id uuid,
  relation text,
  status text not null default 'pending_choice'::text,
  created_by uuid not null,
  drawn_at timestamp with time zone not null default now(),
  chosen_at timestamp with time zone,
  resolved_at timestamp with time zone
);

-- 3. Constraints ----------------------------------------------------------------------------
alter table public.clubs add constraint clubs_pkey primary key (id);
alter table public.clubs add constraint clubs_name_key unique (name);

alter table public.courts add constraint courts_pkey primary key (id);
alter table public.courts add constraint courts_club_id_name_key unique (club_id, name);
alter table public.courts add constraint courts_club_id_fkey foreign key (club_id) references public.clubs(id) on delete cascade;

alter table public.profiles add constraint profiles_pkey primary key (id);
alter table public.profiles add constraint profiles_email_key unique (email);
alter table public.profiles add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;
alter table public.profiles add constraint profiles_court_position_check check (court_position = any (array['reves'::text, 'drive'::text, 'ambos'::text]));
alter table public.profiles add constraint profiles_gender_check check (gender = any (array['masculino'::text, 'femenino'::text, 'otro'::text]));
alter table public.profiles add constraint profiles_preferred_hand_check check (preferred_hand = any (array['diestro'::text, 'zurdo'::text, 'ambidiestro'::text]));
alter table public.profiles add constraint profiles_role_check check (role = any (array['admin'::text, 'player'::text]));

alter table public.events add constraint events_pkey primary key (id);
alter table public.events add constraint events_club_id_fkey foreign key (club_id) references public.clubs(id);
alter table public.events add constraint events_created_by_fkey foreign key (created_by) references auth.users(id);
alter table public.events add constraint events_kind_check check (kind = any (array['mixing'::text, 'match'::text]));

alter table public.event_participants add constraint event_participants_pkey primary key (event_id, user_id);
alter table public.event_participants add constraint event_participants_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;
alter table public.event_participants add constraint event_participants_user_id_fkey foreign key (user_id) references auth.users(id);

alter table public.matches add constraint matches_pkey primary key (id);
alter table public.matches add constraint matches_court_id_fkey foreign key (court_id) references public.courts(id);
alter table public.matches add constraint matches_creator_id_fkey foreign key (creator_id) references public.profiles(id);
alter table public.matches add constraint matches_event_id_fkey foreign key (event_id) references public.events(id) on delete set null;
alter table public.matches add constraint matches_last_updated_by_fkey foreign key (last_updated_by) references auth.users(id);
alter table public.matches add constraint matches_player_a1_fkey foreign key (player_a1) references public.profiles(id);
alter table public.matches add constraint matches_player_a2_fkey foreign key (player_a2) references public.profiles(id);
alter table public.matches add constraint matches_player_b1_fkey foreign key (player_b1) references public.profiles(id);
alter table public.matches add constraint matches_player_b2_fkey foreign key (player_b2) references public.profiles(id);
alter table public.matches add constraint matches_validated_by_fkey foreign key (validated_by) references public.profiles(id);
alter table public.matches add constraint matches_match_type_check check (match_type = any (array['match'::text, 'mixing'::text]));
alter table public.matches add constraint matches_status_check check (status = any (array['pending'::text, 'confirmed'::text, 'disputed'::text, 'expired'::text]));

alter table public.rating_history add constraint rating_history_pkey primary key (id);
alter table public.rating_history add constraint rating_history_match_id_fkey foreign key (match_id) references public.matches(id) on delete cascade;
alter table public.rating_history add constraint rating_history_player_id_fkey foreign key (player_id) references public.profiles(id) on delete cascade;

alter table public.notifications add constraint notifications_pkey primary key (id);
alter table public.notifications add constraint notifications_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;
alter table public.notifications add constraint notifications_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.push_subscriptions add constraint push_subscriptions_pkey primary key (id);
alter table public.push_subscriptions add constraint push_subscriptions_user_id_endpoint_key unique (user_id, endpoint);
alter table public.push_subscriptions add constraint push_subscriptions_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.mixing_exclusions add constraint mixing_exclusions_pkey primary key (id);
alter table public.mixing_exclusions add constraint unique_exclusion_pair unique (player_a, player_b);
alter table public.mixing_exclusions add constraint mixing_exclusions_created_by_fkey foreign key (created_by) references public.profiles(id);
alter table public.mixing_exclusions add constraint mixing_exclusions_player_a_fkey foreign key (player_a) references public.profiles(id) on delete cascade;
alter table public.mixing_exclusions add constraint mixing_exclusions_player_b_fkey foreign key (player_b) references public.profiles(id) on delete cascade;
alter table public.mixing_exclusions add constraint mixing_exclusions_type_check check (type = any (array['no_partner'::text, 'no_opponent'::text, 'no_contact'::text]));
alter table public.mixing_exclusions add constraint no_self_exclusion check (player_a <> player_b);

alter table public.mixing_incentives add constraint mixing_incentives_pkey primary key (id);
alter table public.mixing_incentives add constraint mixing_incentives_created_by_fkey foreign key (created_by) references public.profiles(id);
alter table public.mixing_incentives add constraint mixing_incentives_event_id_fkey foreign key (event_id) references public.events(id);
alter table public.mixing_incentives add constraint mixing_incentives_target_id_fkey foreign key (target_id) references public.profiles(id);
alter table public.mixing_incentives add constraint mixing_incentives_winner_id_fkey foreign key (winner_id) references public.profiles(id);
alter table public.mixing_incentives add constraint mixing_incentives_relation_check check (relation = any (array['partner'::text, 'opponent'::text]));
alter table public.mixing_incentives add constraint mixing_incentives_status_check check (status = any (array['pending_choice'::text, 'chosen'::text, 'applied'::text, 'expired'::text, 'cancelled'::text]));

-- 4. Indexes --------------------------------------------------------------------------------
create index courts_club_id_idx on public.courts using btree (club_id);
create index events_club_id_idx on public.events using btree (club_id);
create index idx_matches_event_id on public.matches using btree (event_id);
create index matches_court_id_idx on public.matches using btree (court_id);
create index matches_pending_close_idx on public.matches using btree (result_updated_at) where (status = 'pending'::text);
create unique index mixing_incentives_event_active_uidx on public.mixing_incentives using btree (event_id) where (status <> 'cancelled'::text);
create unique index profiles_full_name_unique on public.profiles using btree (full_name) where (is_guest = false);

-- 5. Functions and triggers -----------------------------------------------------------------
-- Creates the profile row of every new auth user (guests and real players alike).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, full_name, role, rating)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Jugador Nuevo'),
    'player',
    1.5
  );
  return new;
end;
$function$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The score changed: the rival's 24 h window to answer starts here.
create or replace function public.set_matches_result_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' or new.score_details is distinct from old.score_details then
    new.result_updated_at := timezone('utc', now());
  end if;
  return new;
end;
$function$;

create trigger matches_result_updated_at
  before insert or update on public.matches
  for each row execute function public.set_matches_result_updated_at();

-- The ONLY writer of ratings and statistics: atomic, with a row lock and a double-confirmation guard.
-- Anonymous callers are rejected; the service role (cron, server) is trusted.
create or replace function public.confirm_match_atomic(p_match_id uuid, p_rating_change double precision, p_player_updates jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_update jsonb;
  v_match record;
  v_is_admin boolean;
begin
  if auth.uid() is null and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select status, creator_id, player_a1, player_a2, player_b1, player_b2
  into v_match
  from matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'MATCH_NOT_FOUND';
  end if;

  if v_match.status = 'confirmed' then
    raise exception 'ALREADY_CONFIRMED';
  end if;

  -- Users must be admin or take part in the match; the service role is trusted.
  if auth.uid() is not null then
    select exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    ) into v_is_admin;

    if not (
      v_is_admin
      or auth.uid() = v_match.creator_id
      or auth.uid() = v_match.player_a1
      or auth.uid() = v_match.player_a2
      or auth.uid() = v_match.player_b1
      or auth.uid() = v_match.player_b2
    ) then
      raise exception 'NOT_AUTHORIZED';
    end if;
  end if;

  for v_update in select * from jsonb_array_elements(p_player_updates)
  loop
    update profiles set
      rating         = (v_update->>'new_rating')::double precision,
      matches_played = (v_update->>'new_matches_played')::bigint,
      matches_won    = (v_update->>'new_matches_won')::integer,
      win_ratio      = (v_update->>'new_win_ratio')::double precision
    where id = (v_update->>'player_id')::uuid;
  end loop;

  insert into rating_history (player_id, match_id, rating_before, rating_after)
  select
    (v->>'player_id')::uuid,
    p_match_id,
    (v->>'rating_before')::double precision,
    (v->>'new_rating')::double precision
  from jsonb_array_elements(p_player_updates) as v;

  update matches set
    status        = 'confirmed',
    rating_change = p_rating_change
  where id = p_match_id;
end;
$function$;

-- Leaving an event: removes the participant and promotes the first reserve (with a notification).
create or replace function public.leave_event_atomic(p_event_id uuid, p_user_id uuid, out promoted_user_id uuid, out promoted_event_id uuid, out promoted_event_title text, out promoted_event_start_time timestamp with time zone)
returns record
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_max_spots int;
  v_title text;
  v_start_time timestamptz;
  v_leaving_rank int;
  v_local_promoted_user_id uuid;
  v_promoted_is_guest boolean;
  v_is_admin boolean;
begin
  if auth.uid() is null and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Unauthorized';
  end if;

  if auth.uid() is not null and p_user_id <> auth.uid() then
    select (role = 'admin') into v_is_admin from public.profiles where id = auth.uid();
    if not coalesce(v_is_admin, false) then
      raise exception 'Unauthorized';
    end if;
  end if;

  select max_spots, title, start_time into v_max_spots, v_title, v_start_time
  from public.events where id = p_event_id;

  if v_max_spots is null then
    raise exception 'Event not found';
  end if;

  select rank - 1 into v_leaving_rank
  from (
    select user_id, row_number() over (order by joined_at asc) as rank
    from public.event_participants where event_id = p_event_id
  ) ranked
  where user_id = p_user_id;

  if v_leaving_rank is not null and v_leaving_rank < v_max_spots then
    select user_id into v_local_promoted_user_id
    from (
      select user_id, row_number() over (order by joined_at asc) as rank
      from public.event_participants where event_id = p_event_id
    ) ranked
    where rank = v_max_spots + 1;
  end if;

  delete from public.event_participants
  where event_id = p_event_id and user_id = p_user_id;

  if v_local_promoted_user_id is not null then
    select is_guest into v_promoted_is_guest from public.profiles where id = v_local_promoted_user_id;
    if not coalesce(v_promoted_is_guest, false) then
      insert into public.notifications (user_id, event_id, type, message)
      values (
        v_local_promoted_user_id,
        p_event_id,
        'promoted_to_starter',
        'Has pasado a titular en "' || v_title || '" (' ||
          to_char(v_start_time at time zone 'Europe/Madrid', 'DD Mon HH24:MI') || ')'
      );

      promoted_user_id := v_local_promoted_user_id;
      promoted_event_id := p_event_id;
      promoted_event_title := v_title;
      promoted_event_start_time := v_start_time;
    end if;
  end if;
end;
$function$;

-- Execution privileges: no anonymous callers (see the security hardening migration).
revoke execute on function public.confirm_match_atomic(uuid, double precision, jsonb) from public, anon;
revoke execute on function public.leave_event_atomic(uuid, uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 6. Row Level Security ---------------------------------------------------------------------
-- Note: `matches` has no DELETE policy for users on purpose. A user delete returns no error but
-- removes nothing: the app deletes matches with the service role after authorizing the caller.
alter table public.clubs enable row level security;
alter table public.courts enable row level security;
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.matches enable row level security;
alter table public.rating_history enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.mixing_exclusions enable row level security;
alter table public.mixing_incentives enable row level security;

-- clubs / courts: public read, admin write
create policy "Everyone can view clubs" on public.clubs as permissive for select to public using (true);
create policy "Admins can insert clubs" on public.clubs as permissive for insert to public
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));
create policy "Admins can update clubs" on public.clubs as permissive for update to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));
create policy "Admins can delete clubs" on public.clubs as permissive for delete to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));

create policy "Everyone can view courts" on public.courts as permissive for select to public using (true);
create policy "Admins can insert courts" on public.courts as permissive for insert to public
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));
create policy "Admins can update courts" on public.courts as permissive for update to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));
create policy "Admins can delete courts" on public.courts as permissive for delete to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));

-- profiles: readable by signed-in users only (visitors get nothing)
create policy profiles_select_authenticated on public.profiles as permissive for select to authenticated using (true);
create policy profiles_update_own on public.profiles as permissive for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- events: public read (the public home needs counts), admin write
create policy "Everyone can view events" on public.events as permissive for select to public using (true);
create policy "Admins can insert events" on public.events as permissive for insert to public
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'::text));
create policy "Admins can update events" on public.events as permissive for update to public
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'::text));
create policy "Admins can delete events" on public.events as permissive for delete to public
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'::text));

-- event_participants
create policy "Everyone can view participants" on public.event_participants as permissive for select to public using (true);
create policy "Users can join events" on public.event_participants as permissive for insert to public
  with check (auth.uid() = user_id);
create policy "Users can leave events" on public.event_participants as permissive for delete to public
  using (auth.uid() = user_id);

-- matches: signed-in users read; the creator, the players and admins update
create policy "Allow authenticated select on matches" on public.matches as permissive for select to authenticated using (true);
create policy "Usuarios logueados pueden crear partidos" on public.matches as permissive for insert to public
  with check (auth.role() = 'authenticated'::text and auth.uid() = creator_id);
create policy "Admins o implicados pueden actualizar partidos" on public.matches as permissive for update to public
  using (auth.uid() = creator_id or auth.uid() = player_a1 or auth.uid() = player_a2 or auth.uid() = player_b1 or auth.uid() = player_b2
    or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'::text));

-- rating_history: signed-in users read (only confirm_match_atomic writes)
create policy rating_history_select_authenticated on public.rating_history as permissive for select to authenticated using (true);

-- notifications
create policy "Users can view own notifications" on public.notifications as permissive for select to public
  using (auth.uid() = user_id);
create policy "Users can mark own notifications read" on public.notifications as permissive for update to public
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- push_subscriptions
create policy push_subscriptions_select_own on public.push_subscriptions as permissive for select to public using (auth.uid() = user_id);
create policy push_subscriptions_insert_own on public.push_subscriptions as permissive for insert to public with check (auth.uid() = user_id);
create policy push_subscriptions_update_own on public.push_subscriptions as permissive for update to public
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy push_subscriptions_delete_own on public.push_subscriptions as permissive for delete to public using (auth.uid() = user_id);

-- mixing_exclusions / mixing_incentives
create policy "Admin full access on mixing_exclusions" on public.mixing_exclusions as permissive for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'::text));
create policy "Admin full access on mixing_incentives" on public.mixing_incentives as permissive for all to public
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'::text));
create policy "Winner can view own incentive" on public.mixing_incentives as permissive for select to public
  using (winner_id = auth.uid());
create policy "Winner can choose target" on public.mixing_incentives as permissive for update to public
  using (winner_id = auth.uid() and status = 'pending_choice'::text)
  with check (winner_id = auth.uid() and status = 'chosen'::text and target_id is not null
    and relation = any (array['partner'::text, 'opponent'::text]) and target_id <> winner_id);

-- 7. Realtime -------------------------------------------------------------------------------
alter publication supabase_realtime add table public.events, public.event_participants, public.matches, public.notifications;

-- 8. Storage: profile photos ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 10485760, array['image/jpeg'])
on conflict (id) do nothing;

create policy avatars_select_own on storage.objects as permissive for select to authenticated
  using (bucket_id = 'avatars'::text and name = (auth.uid())::text || '/avatar.jpg'::text);
create policy avatars_insert_own on storage.objects as permissive for insert to authenticated
  with check (bucket_id = 'avatars'::text and name = (auth.uid())::text || '/avatar.jpg'::text);
create policy avatars_update_own on storage.objects as permissive for update to authenticated
  using (bucket_id = 'avatars'::text and name = (auth.uid())::text || '/avatar.jpg'::text)
  with check (bucket_id = 'avatars'::text and name = (auth.uid())::text || '/avatar.jpg'::text);
