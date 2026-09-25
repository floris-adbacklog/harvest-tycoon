-- Admin dashboard: player insights (25 Sep 2026). Where and on what a farmer last opened the game: the country Cloudflare reads
-- from the IP address (the cf-ipcountry header on every request), the IP address and the browser's user agent. farm-api writes
-- one row per farmer on every load (the previous visit is replaced, no history); nobody but the server can read or write it.
create table if not exists public.player_seen(
 player_id uuid primary key references auth.users(id) on delete cascade,
 country text check (country ~ '^[A-Z]{2}$'),
 ip inet,
 device text check (char_length(device)<=300),
 seen_at timestamptz not null default now()
);
alter table public.player_seen enable row level security;
revoke all on public.player_seen from anon, authenticated;

-- Every real account (or one): when it was made, how it signs in, its last sign-in, and the last visit above. A farmer who has not
-- opened the game since this table exists still shows the IP address and browser of their newest sign-in session.
create or replace function public.admin_player_accounts(p_player uuid default null)
returns table(player_id uuid, created_at timestamptz, provider text, last_sign_in_at timestamptz, country text, ip text, device text, seen_at timestamptz)
language sql stable security definer set search_path to '' as $f$
 select u.id, u.created_at, coalesce(u.raw_app_meta_data->>'provider','email'), u.last_sign_in_at,
  s.country, coalesce(host(s.ip), host(latest.ip)), coalesce(s.device, left(latest.user_agent,300)), s.seen_at
 from auth.users u
 left join public.player_seen s on s.player_id=u.id
 left join lateral (select x.ip, x.user_agent from auth.sessions x where x.user_id=u.id
  order by coalesce(x.refreshed_at::timestamptz, x.updated_at, x.created_at) desc nulls last limit 1) latest on true
 where coalesce(u.is_anonymous,false)=false and (p_player is null or u.id=p_player)
 order by u.created_at desc
 limit 5000
$f$;
revoke all on function public.admin_player_accounts(uuid) from public, anon, authenticated;
grant execute on function public.admin_player_accounts(uuid) to service_role;
