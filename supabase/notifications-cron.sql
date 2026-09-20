-- Hourly schedule for the reminder job. Apply this AFTER the Edge Function secrets are set (see NOTIFICATIONS-SETUP.md).
-- The job runs at most once per clock hour whatever calls it (notification_begin_run), so a second schedule or a manual call is harmless.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.unschedule('notify-hourly') where exists (select 1 from cron.job where jobname = 'notify-hourly');
select cron.schedule('notify-hourly', '5 * * * *', $job$
 select net.http_post(
  url := 'https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/notify-hourly',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb,
  timeout_milliseconds := 25000);
$job$);
