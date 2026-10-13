-- Every-15-minutes job that makes the draw of each open mixing that starts in 3 hours or less.
-- Run it in the Supabase SQL editor of PRODUCTION, replacing <CRON_SECRET> with the same value as the
-- CRON_SECRET env var in Vercel. Do not commit the real value.
--
-- Why pg_cron and not Vercel cron: on the Hobby plan Vercel cron only runs once a day and with ±59 min
-- of precision. The endpoint is idempotent (an event with its draw published is no longer "open"), so
-- calling it often is harmless. An event that has ever had a draw (events.draw_published_at, see
-- supabase_migration_events_draw_published_at.sql) is never drawn again by it: "Rehacer" hands it back to the admin. Switch it off without redeploying with the env var AUTO_DRAW=false.
--
-- timeout_milliseconds: pg_net gives up after 5 s by default and the draw (several attempts + inserts)
-- can take longer. The endpoint keeps working either way, but a longer timeout keeps the response in
-- net._http_response. The same applies to the hourly 'close-pending-matches' job.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'generate-draws',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://star-point.vercel.app/api/cron/generate-draws',
    headers := jsonb_build_object('authorization', 'Bearer <CRON_SECRET>'),
    timeout_milliseconds := 30000
  );
  $$
);

-- Check the job:   select jobid, jobname, schedule, active from cron.job where jobname = 'generate-draws';
-- Check runs:      select * from cron.job_run_details order by start_time desc limit 5;
-- Check calls:     select id, status_code, timed_out, content from net._http_response order by created desc limit 5;
-- Remove the job:  select cron.unschedule('generate-draws');
