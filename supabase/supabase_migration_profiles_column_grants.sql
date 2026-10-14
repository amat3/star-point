-- Players could edit ANY column of their own profile row: the policy profiles_update_own only checks
-- auth.uid() = id, and the table-level UPDATE grant covers role, rating, is_guest and the stats. So any
-- signed-in player could call the API with their own token and make themselves admin or change their rating.
--
-- Fix: keep the policy (which row) and restrict the grant (which columns) to what the profile page edits.
-- Everything else (role, rating, stats, is_guest, email…) is only written by the server with the
-- service role or by SECURITY DEFINER functions, which are not affected by these grants.
--
-- The signup used to fix the rating from the browser (the trigger gave 1.5, the app uses 3.5). The trigger
-- now inserts 3.5 itself, so that client-side update is no longer needed.
--
-- Apply it BEFORE deploying the code that drops the client-side rating update (the old code just gets an
-- ignored error on signup after this migration, so the order is safe either way).

revoke update on public.profiles from anon, authenticated;
-- A table-level revoke leaves column-level grants in place, so drop those explicitly too
revoke update (id, email, full_name, avatar_url, rating, role, matches_played, updated_at, matches_won,
  win_ratio, gender, preferred_hand, court_position, is_guest) on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, gender, preferred_hand, court_position, updated_at)
  on public.profiles to authenticated;

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
    3.5
  );
  return new;
end;
$function$;
