-- The comeback chest (Oct 2026): after 3 days or more away, the Welcome back card holds a chest (game/farm-state.js COMEBACK_*). The
-- chest itself needs no database change: farm-api offers it on a load and it lives in the farm's own state (state.comeback).
-- This only lets the hourly reminder job (supabase/functions/notify-hourly) see it, so that on away-day 3 and 6 the 09:00 gift reminder
-- says the chest is waiting instead: the farm jsonb now also carries 'comeback' (state.comeback) and 'seenAt' (player_farms.updated_at,
-- the same "last seen" farm-api counts the days away from).
-- Built from the live definition of 2 Oct 2026 (identical to supabase/notifications-job.sql); same signature and return type, so
-- create or replace is enough and it can be run again safely.
create or replace function public.notification_candidates()
returns table (player_id uuid, email text, username text, push_crops boolean, push_production boolean, push_daily boolean, email_digest boolean, digest_hour smallint, timezone text,
 unsubscribe_token uuid, last_active_at timestamptz, farm jsonb, crops_seen_at bigint, production_seen_at bigint, last_push_at timestamptz, push_day date, push_count smallint,
 daily_morning_on date, daily_evening_on date, digest_on date, subscriptions jsonb)
language sql stable security definer set search_path = '' as $$
 select s.player_id, u.email::text, ps.username, s.push_crops, s.push_production, s.push_daily, s.email_digest, s.digest_hour, s.timezone,
  s.unsubscribe_token, ps.last_active_at,
  jsonb_build_object('plots', f.state -> 'plots', 'buildings', f.state -> 'buildings', 'login', f.state -> 'login', 'comeback', f.state -> 'comeback', 'seenAt', f.updated_at),
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

revoke all on function public.notification_candidates() from public, anon, authenticated;
grant execute on function public.notification_candidates() to service_role;
