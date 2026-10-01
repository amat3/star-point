-- Hourly job that calls the auto-close endpoint.
-- Run it in the Supabase SQL editor AFTER deploying the app, replacing <CRON_SECRET>
-- with the same value as the CRON_SECRET env var in Vercel. Do not commit the real value.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'close-pending-matches',
  '0 * * * *',
  $$
  select net.http_get(
    url := 'https://star-point.vercel.app/api/cron/close-pending-matches',
    headers := jsonb_build_object('authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);

-- Check runs:   select * from cron.job_run_details order by start_time desc limit 5;
-- Check calls:  select id, status_code, content from net._http_response order by created desc limit 5;
-- Remove job:   select cron.unschedule('close-pending-matches');
