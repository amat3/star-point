-- Auto-close of pending matches after 24 h.
-- result_updated_at: when the score last changed (the rival's 24 h window starts here).
-- status 'expired': match closed without a result and without touching ratings.

alter table public.matches add column result_updated_at timestamptz;

-- Existing rows: best available approximation.
update public.matches set result_updated_at = created_at where result_updated_at is null;

alter table public.matches alter column result_updated_at set not null;
alter table public.matches alter column result_updated_at set default timezone('utc', now());

create or replace function public.set_matches_result_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.score_details is distinct from old.score_details then
    new.result_updated_at := timezone('utc', now());
  end if;
  return new;
end;
$$;

create trigger matches_result_updated_at
before insert or update on public.matches
for each row execute function public.set_matches_result_updated_at();

alter table public.matches drop constraint matches_status_check;
alter table public.matches add constraint matches_status_check
  check (status = any (array['pending'::text, 'confirmed'::text, 'disputed'::text, 'expired'::text]));

create index matches_pending_close_idx on public.matches (result_updated_at) where status = 'pending';
