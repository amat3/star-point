-- Security hardening.
--  1. SECURITY DEFINER functions were executable by anon (and PUBLIC) and their
--     authorization checks were bypassed when auth.uid() is NULL (NULL comparisons
--     make `IF NOT (...)` / `IF a <> b` evaluate to NULL, i.e. "not true").
--  2. Public (anon) read access to profiles (includes email), matches and rating_history.
--     Logged-in users keep reading them through the existing `authenticated` policies.
-- The service role (cron / server admin client) keeps working: auth.uid() is NULL
-- for it, so it is allowed explicitly via auth.role() = 'service_role'.

-- 1a. confirm_match_atomic: reject anonymous callers, allow service_role.
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

-- 1b. leave_event_atomic: reject anonymous callers, allow service_role.
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

-- 1c. Execution privileges: no anonymous callers.
revoke execute on function public.confirm_match_atomic(uuid, double precision, jsonb) from public, anon;
revoke execute on function public.leave_event_atomic(uuid, uuid) from public, anon;
-- handle_new_user is a trigger function; nobody needs to call it through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2. Remove anonymous read access (authenticated policies already exist).
drop policy "Public profiles are viewable by everyone" on public.profiles;
drop policy "Cualquiera puede ver partidos" on public.matches;
drop policy "Cualquiera puede ver historial de niveles" on public.rating_history;
