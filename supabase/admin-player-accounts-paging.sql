-- Admin dashboard: every account, however many there are (25 Sep 2026). admin_player_accounts (admin-player-insights.sql) stopped at
-- 5,000 accounts; now it has no cap and a fixed order, so farm-api reads it a page at a time (PostgREST returns at most 1,000 rows per
-- request). p_ip returns only the accounts that last played from that IP address (one farmer's "same network"), and each row carries
-- the player name, so that needs no second lookup. Replaced in one go: farm-api keeps calling it with p_player only.
drop function if exists public.admin_player_accounts(uuid);
create or replace function public.admin_player_accounts(p_player uuid default null, p_ip text default null)
returns table(player_id uuid, username text, created_at timestamptz, provider text, last_sign_in_at timestamptz, country text, ip text, device text, seen_at timestamptz)
language sql stable security definer set search_path to '' as $f$
 select a.player_id, a.username, a.created_at, a.provider, a.last_sign_in_at, a.country, a.ip, a.device, a.seen_at from (
  select u.id as player_id, ps.username, u.created_at, coalesce(u.raw_app_meta_data->>'provider','email') as provider, u.last_sign_in_at,
   s.country, coalesce(host(s.ip), host(latest.ip)) as ip, coalesce(s.device, left(latest.user_agent,300)) as device, s.seen_at
  from auth.users u
  left join public.player_seen s on s.player_id=u.id
  left join public.player_stats ps on ps.player_id=u.id
  left join lateral (select x.ip, x.user_agent from auth.sessions x where x.user_id=u.id
   order by coalesce(x.refreshed_at::timestamptz, x.updated_at, x.created_at) desc nulls last limit 1) latest on true
  where coalesce(u.is_anonymous,false)=false and (p_player is null or u.id=p_player)
 ) a
 where p_ip is null or a.ip=p_ip
 order by a.created_at desc, a.player_id
$f$;
revoke all on function public.admin_player_accounts(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_player_accounts(uuid, text) to service_role;
