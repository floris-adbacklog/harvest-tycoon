-- The reminder job every 10 minutes instead of every hour (1 Nov 2026). Run this only AFTER notify-hourly is deployed with the fast run
-- (job.js saveAll, onesignal.js REMINDER_SLOT_MS): the old one takes up to 145 seconds a run and keys the app's reminders by the hour.
-- Only these two pieces of supabase/notifications-job.sql and supabase/notifications-cron.sql, so nothing else of the live job is replaced.
create or replace function public.notification_begin_run()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.notification_job;
begin
 update public.notification_job set
   emails_sent = case when emails_day = (now() at time zone 'utc')::date then emails_sent else 0 end,
   emails_day = (now() at time zone 'utc')::date,
   last_run_at = now()
  where id = 1 and (last_run_at is null or date_bin('10 minutes', last_run_at, timestamptz '2000-01-01') < date_bin('10 minutes', now(), timestamptz '2000-01-01'))
  returning * into v_row;
 if not found then return jsonb_build_object('run', false, 'emails_sent', 0); end if;
 return jsonb_build_object('run', true, 'emails_sent', v_row.emails_sent);
end $$;
revoke all on function public.notification_begin_run() from public, anon, authenticated;
grant execute on function public.notification_begin_run() to service_role;

select cron.alter_job((select jobid from cron.job where jobname = 'notify-hourly'), schedule := '3-59/10 * * * *');

select jobname, schedule from cron.job where jobname = 'notify-hourly';
