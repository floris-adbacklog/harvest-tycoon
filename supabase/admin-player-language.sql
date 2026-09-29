-- Admin dashboard: the language each farmer plays in (29 Sep 2026). farm-api saves it with every farm load next to the country and
-- device (admin-analytics-service.js recordSeen: the game's language, "en", "nl", ...), and admin_player_accounts returns it. Its
-- return type changes, so it is dropped and made again with the same rights; farm-api keeps calling it the same way.
alter table public.player_seen add column if not exists language text check (language ~ '^[a-z]{2}$');

drop function if exists public.admin_player_accounts(uuid, text);
create function public.admin_player_accounts(p_player uuid default null, p_ip text default null)
returns table(player_id uuid, username text, created_at timestamptz, provider text, last_sign_in_at timestamptz, country text, ip text, device text, seen_at timestamptz, language text)
language sql stable security definer set search_path to '' as $f$
 select a.player_id, a.username, a.created_at, a.provider, a.last_sign_in_at, a.country, a.ip, a.device, a.seen_at, a.language from (
  select u.id as player_id, ps.username, u.created_at, coalesce(u.raw_app_meta_data->>'provider','email') as provider, u.last_sign_in_at,
   s.country, coalesce(host(s.ip), host(latest.ip)) as ip, coalesce(s.device, left(latest.user_agent,300)) as device, s.seen_at, s.language
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
