-- Where new farmers come from (2 Oct 2026). Once per account, when its farm is created, farm-api records how the farmer found the
-- game (supabase/functions/farm-api/source-service.js): our own ?src= tag, the ad's utm_source / utm_medium / utm_campaign /
-- utm_content, whether an ad click id came along (only yes or no, never the id itself), the website that linked (only the domain),
-- the app whose browser handed the visit on to Chrome or Safari, the page they landed on, the game language and the device. Nothing
-- for this is stored on the device (src/source-link.js keeps it in memory). The first record stays. Only farm-api (service_role)
-- reads and writes it; the admin sees totals per source in the Admin dashboard (Growth, "Where new farmers come from").
-- Accounts from before this have no row and show as "Not recorded".

create table if not exists public.player_attribution (
 player_id uuid primary key references auth.users(id) on delete cascade,
 src text check (src ~ '^[a-z0-9][a-z0-9_.-]{0,47}$'),
 utm_source text check (char_length(utm_source)<=100),
 utm_medium text check (char_length(utm_medium)<=100),
 utm_campaign text check (char_length(utm_campaign)<=100),
 utm_content text check (char_length(utm_content)<=100),
 referrer_host text check (referrer_host ~ '^[a-z0-9.-]{1,100}$'),
 has_fbclid boolean not null default false,
 has_ttclid boolean not null default false,
 has_gclid boolean not null default false,
 in_app text check (in_app in ('facebook','instagram','threads','tiktok')),
 landing_path text check (landing_path ~ '^/[A-Za-z0-9/_.-]{0,63}$'),
 language text check (language ~ '^[a-z]{2}$'),
 device text check (char_length(device)<=60),
 created_at timestamptz not null default now()
);
create index if not exists player_attribution_created on public.player_attribution(created_at);
alter table public.player_attribution enable row level security;
revoke all on public.player_attribution from anon, authenticated;

-- The Admin dashboard's "Where new farmers come from" (farm-api admin_sources, the admin only): every real account made since
-- p_since, per source, with how many opened their farm, came back on day 1 (Amsterdam days, from their last activity, as the
-- retention card counts it; d1_due is how many signed up long enough ago), reached level 5, 10 and 14, started a checkout, paid,
-- and what they paid in cents. Test payments do not count. One source per farmer, the first that applies: our ?src= tag, a
-- partner's link, a friend's invite, the ad's utm_source / campaign, an ad click (Meta, TikTok, Google), the website that linked,
-- Direct. 'unknown': no record (joined before this, or never opened a farm). A partner's own account without a farm is no signup
-- (as in admin_auth_signups).
create or replace function public.admin_source_stats(p_since timestamptz)
returns table(source text, signups int, played int, d1_due int, d1_kept int, l5 int, l10 int, l14 int, checkout_players int, paid_players int, revenue_cents bigint)
language sql stable security definer set search_path to '' as $f$
 with money as (
  select h.player_id, count(*) as checkouts, count(*) filter (where h.status='credited') as paid,
   coalesce(sum(h.amount_cents) filter (where h.status='credited'),0) as cents
  from public.harvest_purchases h where h.livemode group by h.player_id),
 base as (
  select u.id, s.level, s.last_active_at, s.player_id is not null as played, m.checkouts, m.paid, m.cents,
   coalesce('src:'||a.src, 'partner:'||pr.code, case when r.invitee_id is not null then 'invite' end,
    'utm:'||lower(a.utm_source)||coalesce(' / '||a.utm_campaign,''),
    case when a.has_fbclid then 'ad:meta' when a.has_ttclid then 'ad:tiktok' when a.has_gclid then 'ad:google' end,
    'site:'||a.referrer_host,
    case when a.player_id is not null then 'direct' end,
    'unknown') as source,
   ((date_trunc('day', u.created_at at time zone 'Europe/Amsterdam') + interval '1 day') at time zone 'Europe/Amsterdam') as d1_start
  from auth.users u
  left join public.player_attribution a on a.player_id=u.id
  left join public.partner_referrals pr on pr.player_id=u.id
  left join public.referrals r on r.invitee_id=u.id
  left join public.player_stats s on s.player_id=u.id
  left join money m on m.player_id=u.id
  where u.created_at>=p_since and coalesce(u.is_anonymous,false)=false
   and not exists(select 1 from public.partners p where p.user_id=u.id and not exists(select 1 from public.player_farms f where f.player_id=u.id)))
 select source, count(*)::int, count(*) filter (where played)::int,
  count(*) filter (where now()>=d1_start)::int, count(*) filter (where now()>=d1_start and last_active_at>=d1_start)::int,
  count(*) filter (where level>=5)::int, count(*) filter (where level>=10)::int, count(*) filter (where level>=14)::int,
  count(*) filter (where checkouts>0)::int, count(*) filter (where paid>0)::int, coalesce(sum(cents),0)::bigint
 from base group by source order by 2 desc, 1
$f$;
revoke all on function public.admin_source_stats(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_source_stats(timestamptz) to service_role;
