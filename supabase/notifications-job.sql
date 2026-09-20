-- Support for the hourly reminder job (Edge Function notify-hourly). Everything here is for the service role only.
--
-- notification_job is a single row that makes sure the job runs at most once per clock hour, however often it is
-- called, and counts the emails sent today so the free Resend allowance is never exceeded.
create table if not exists public.notification_job (
 id smallint primary key default 1 check (id = 1),
 last_run_at timestamptz,
 emails_day date,
 emails_sent integer not null default 0
);
insert into public.notification_job (id) values (1) on conflict do nothing;
alter table public.notification_job enable row level security;

create or replace function public.notification_begin_run()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.notification_job;
begin
 update public.notification_job set
   emails_sent = case when emails_day = (now() at time zone 'utc')::date then emails_sent else 0 end,
   emails_day = (now() at time zone 'utc')::date,
   last_run_at = now()
  where id = 1 and (last_run_at is null or date_trunc('hour', last_run_at) < date_trunc('hour', now()))
  returning * into v_row;
 if not found then return jsonb_build_object('run', false, 'emails_sent', 0); end if;
 return jsonb_build_object('run', true, 'emails_sent', v_row.emails_sent);
end $$;

create or replace function public.notification_add_emails(p_count integer)
returns void language sql security definer set search_path = '' as $$
 update public.notification_job set emails_sent = emails_sent + greatest(coalesce(p_count, 0), 0) where id = 1;
$$;

-- Everything the job needs about every player who switched at least one reminder on, in one query.
-- Only the parts of the farm it reads are returned (plots, building jobs, daily login).
create or replace function public.notification_candidates()
returns table (player_id uuid, email text, username text, push_crops boolean, push_production boolean, push_daily boolean, email_digest boolean, digest_hour smallint, timezone text,
 unsubscribe_token uuid, last_active_at timestamptz, farm jsonb, crops_seen_at bigint, production_seen_at bigint, last_push_at timestamptz, push_day date, push_count smallint,
 daily_morning_on date, daily_evening_on date, digest_on date, subscriptions jsonb)
language sql stable security definer set search_path = '' as $$
 select s.player_id, u.email::text, ps.username, s.push_crops, s.push_production, s.push_daily, s.email_digest, s.digest_hour, s.timezone,
  s.unsubscribe_token, ps.last_active_at,
  jsonb_build_object('plots', f.state -> 'plots', 'buildings', f.state -> 'buildings', 'login', f.state -> 'login'),
  ns.crops_seen_at, ns.production_seen_at, ns.last_push_at, ns.push_day, coalesce(ns.push_count, 0)::smallint,
  ns.daily_morning_on, ns.daily_evening_on, ns.digest_on,
  coalesce((select jsonb_agg(jsonb_build_object('endpoint', p.endpoint, 'p256dh', p.p256dh, 'auth', p.auth)) from public.push_subscriptions p where p.player_id = s.player_id), '[]'::jsonb)
 from public.notification_settings s
 join auth.users u on u.id = s.player_id
 join public.player_farms f on f.player_id = s.player_id
 left join public.player_stats ps on ps.player_id = s.player_id
 left join public.notification_state ns on ns.player_id = s.player_id
 where (s.push_crops or s.push_production or s.push_daily or s.email_digest);
$$;

revoke all on function public.notification_begin_run() from public, anon, authenticated;
revoke all on function public.notification_add_emails(integer) from public, anon, authenticated;
revoke all on function public.notification_candidates() from public, anon, authenticated;
grant execute on function public.notification_begin_run() to service_role;
grant execute on function public.notification_add_emails(integer) to service_role;
grant execute on function public.notification_candidates() to service_role;
