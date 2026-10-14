-- One row per call to an AI feature (today: filling the "Publicar partido" form from free text).
-- Used to cap each person's daily use: the app counts the rows of the last 24 hours before calling the
-- model. Only the server writes or reads it (service role): RLS on and no policies, so no client can.
--
-- Apply it BEFORE deploying the code that uses it.

create table if not exists public.ai_requests (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists ai_requests_user_feature_created_idx
  on public.ai_requests (user_id, feature, created_at desc);

alter table public.ai_requests enable row level security;

-- Who can use the AI features: off by default, switched on per player (admins always can).
-- Players cannot flip it themselves: it is not among the columns granted to them
-- (see supabase_migration_profiles_column_grants.sql, which must be applied first).
alter table public.profiles add column if not exists ai_enabled boolean not null default false;
