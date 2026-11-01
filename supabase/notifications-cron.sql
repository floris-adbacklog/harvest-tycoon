-- Schedule for the reminder job. Apply this AFTER the Edge Function secrets are set (see NOTIFICATIONS-SETUP.md).
-- Every 10 minutes, at :03, :13 … :53 (1 Nov 2026; it was hourly at :05, so "your crops are ready" came up to an hour late). The rules
-- stay the same (functions/notify-hourly/rules.js: one reminder an hour at most, 14 a day, quiet at night). The job runs at most once per
-- 10 minutes whatever calls it (notification_begin_run), so a second schedule or a manual call is harmless.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.unschedule('notify-hourly') where exists (select 1 from cron.job where jobname = 'notify-hourly');
select cron.schedule('notify-hourly', '3-59/10 * * * *', $job$
 select net.http_post(
  url := 'https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/notify-hourly',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb,
  timeout_milliseconds := 25000);
$job$);
