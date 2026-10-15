-- One row per call to an AI feature (today: filling the "Publicar partido" form from free text).
-- Used to cap daily use, per account and for the whole deployment: the app counts the rows of the
-- last 24 hours before calling the model. Only the server writes or reads it (service role): RLS on
-- and no policies, so no client can.
--
-- The feature only runs on the public demo, so only the demo database needs this table.

create table if not exists public.ai_requests (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists ai_requests_user_feature_created_idx
  on public.ai_requests (user_id, feature, created_at desc);

alter table public.ai_requests enable row level security;

