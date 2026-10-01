-- The partner programme (1 Oct 2026), apart from Invite a friend. Partners are not players: they make an account with an email and
-- a password on /partners and get their own link at once (harvesttycoon.com/?ref=CODE). A new farm that starts with that link
-- belongs to that partner for good (farm-api, partner-service.js). The partner earns 25% of what those players pay, without VAT
-- (21%), for as long as they play; test purchases and a partner's own purchases do not count. Payouts are never automatic: from
-- €20 the partner asks for one with a form (an email to info@harvesttycoon.com, supabase/functions/partner-api), and the admin
-- marks it paid or rejected in the Admin dashboard. A rejected request goes back to what can be asked for. Only partner-api and
-- farm-api (service_role) read and write these tables; the admin uses the two admin functions at the end.

create table if not exists public.partners (
 user_id uuid primary key references auth.users(id) on delete cascade,
 code text not null unique check (code ~ '^[A-Z0-9]{4,12}$'),
 name text not null check (char_length(name) between 1 and 80),
 website text check (website is null or char_length(website)<=200),
 created_at timestamptz not null default now()
);
create table if not exists public.partner_referrals (
 player_id uuid primary key references auth.users(id) on delete cascade,
 partner_id uuid not null references public.partners(user_id) on delete cascade,
 code text not null,
 created_at timestamptz not null default now(),
 check (player_id<>partner_id)
);
create index if not exists partner_referrals_partner on public.partner_referrals(partner_id);
create table if not exists public.partner_payouts (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.partners(user_id) on delete cascade,
 amount_cents integer not null check (amount_cents>0),
 status text not null default 'requested' check (status in ('requested','paid','rejected')),
 requested_at timestamptz not null default now(),
 handled_at timestamptz,
 handled_by uuid
);
-- One open request at a time.
create unique index if not exists partner_payouts_open on public.partner_payouts(partner_id) where status='requested';
alter table public.partners enable row level security;
alter table public.partner_referrals enable row level security;
alter table public.partner_payouts enable row level security;
revoke all on public.partners, public.partner_referrals, public.partner_payouts from anon, authenticated;

-- What a partner has brought in: farmers, how many of them paid, and the money, all in cents. 25% of the price without 21% VAT.
create or replace function public.partner_stats(p_partner uuid)
 returns jsonb language sql stable security definer set search_path to '' as $f$
 with refs as (select r.player_id from public.partner_referrals r where r.partner_id=p_partner),
 paid as (select h.player_id, h.amount_cents from public.harvest_purchases h join refs on refs.player_id=h.player_id
          where h.status='credited' and h.livemode and h.player_id<>p_partner),
 money as (select coalesce(sum(amount_cents),0)::numeric as gross from paid),
 out as (select coalesce(sum(amount_cents) filter (where status='requested'),0) as requested, coalesce(sum(amount_cents) filter (where status='paid'),0) as paid
         from public.partner_payouts where partner_id=p_partner)
 select jsonb_build_object('players',(select count(*) from refs),'payingPlayers',(select count(distinct player_id) from paid),'purchases',(select count(*) from paid),
  'netCents',round(money.gross/1.21)::int,'earnedCents',floor(money.gross/1.21*0.25)::int,'requestedCents',out.requested,'paidCents',out.paid,
  'availableCents',greatest(0,floor(money.gross/1.21*0.25)::int-out.requested-out.paid))
 from money, out;
$f$;

-- A payout request for everything that can be asked for, from p_min cents; one at a time.
create or replace function public.partner_request_payout(p_partner uuid, p_min integer)
 returns jsonb language plpgsql security definer set search_path to '' as $f$
declare available int; made uuid;
begin
 if not exists(select 1 from public.partners where user_id=p_partner) then raise exception 'Sign up as a partner first.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('partner-payout:'||p_partner::text,0));
 if exists(select 1 from public.partner_payouts where partner_id=p_partner and status='requested') then raise exception 'Your payout request is already with us.' using errcode='22023'; end if;
 available:=(public.partner_stats(p_partner)->>'availableCents')::int;
 if available<p_min then raise exception 'You can ask for a payout from €%.', p_min/100 using errcode='22023'; end if;
 insert into public.partner_payouts(partner_id,amount_cents) values(p_partner,available) returning id into made;
 return jsonb_build_object('id',made,'amountCents',available);
end $f$;

revoke all on function public.partner_stats(uuid) from public, anon, authenticated;
revoke all on function public.partner_request_payout(uuid,integer) from public, anon, authenticated;

-- The admin: every partner with what they brought in, and the payout requests (newest first).
create or replace function public.partner_admin_list()
 returns jsonb language plpgsql stable security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 return jsonb_build_object(
  'partners',coalesce((select jsonb_agg(jsonb_build_object('id',p.user_id,'name',p.name,'website',p.website,'code',p.code,'email',u.email,'createdAt',p.created_at,'stats',public.partner_stats(p.user_id)) order by p.created_at desc)
   from public.partners p left join auth.users u on u.id=p.user_id),'[]'::jsonb),
  'payouts',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'partner',p.name,'email',u.email,'amountCents',x.amount_cents,'status',x.status,'requestedAt',x.requested_at,'handledAt',x.handled_at) order by x.requested_at desc)
   from (select * from public.partner_payouts order by requested_at desc limit 50) x join public.partners p on p.user_id=x.partner_id left join auth.users u on u.id=x.partner_id),'[]'::jsonb));
end $f$;

create or replace function public.partner_admin_payout(p_id uuid, p_status text)
 returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());
begin
 if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_status not in ('paid','rejected') then raise exception 'Choose paid or rejected.' using errcode='22023'; end if;
 update public.partner_payouts set status=p_status,handled_at=now(),handled_by=me where id=p_id and status='requested';
 if not found then raise exception 'This request was already handled.' using errcode='22023'; end if;
end $f$;
revoke all on function public.partner_admin_list() from public, anon;
grant execute on function public.partner_admin_list() to authenticated;
revoke all on function public.partner_admin_payout(uuid,text) from public, anon;
grant execute on function public.partner_admin_payout(uuid,text) to authenticated;

-- As live on 1 Oct 2026: the dashboard's signups (retention, players) leave out partners who never opened a farm.
create or replace function public.admin_auth_signups(p_since timestamp with time zone, p_limit integer default 1000)
 returns table(player_id uuid, created_at timestamp with time zone) language sql security definer set search_path to '' as $function$
  select id, created_at from auth.users
  where created_at >= p_since and coalesce(is_anonymous, false) = false
   and not exists(select 1 from public.partners p where p.user_id=auth.users.id and not exists(select 1 from public.player_farms f where f.player_id=auth.users.id))
  order by created_at desc
  limit greatest(1, least(p_limit, 5000));
$function$;
