-- Invite a friend. Re-runnable. Only farm-api (service_role) reads and writes these tables.
-- player_invite_codes: one short personal code per farmer (made the first time they open Invite a friend).
-- referrals: one row per farm that started with someone's code; qualified_at is when the friend reached level 10, and
-- referrer_diamonds what the inviter earns for it (150, or 0 once they already earned for 10 friends).
create table if not exists public.player_invite_codes (
 player_id uuid primary key references auth.users(id) on delete cascade,
 code text not null unique check (code ~ '^[A-Z0-9]{4,12}$'),
 created_at bigint not null
);
create table if not exists public.referrals (
 invitee_id uuid primary key references auth.users(id) on delete cascade,
 referrer_id uuid not null references auth.users(id) on delete cascade,
 code text not null,
 created_at bigint not null,
 qualified_at bigint,
 referrer_diamonds integer not null default 0 check (referrer_diamonds>=0),
 check (invitee_id<>referrer_id)
);
create index if not exists referrals_referrer on public.referrals(referrer_id,qualified_at);
alter table public.player_invite_codes enable row level security;
alter table public.referrals enable row level security;
revoke all on public.player_invite_codes,public.referrals from anon,authenticated;

-- A friend reached level 10: mark it once and decide the inviter's reward, counting the inviter's earlier rewards under a
-- per-inviter lock so two friends reaching level 10 at the same moment cannot both be the 11th.
create or replace function public.harvest_referral_qualify(p_invitee uuid,p_now bigint,p_reward integer,p_limit integer)
returns integer language plpgsql security definer set search_path=public as $fn$
declare r public.referrals%rowtype; earned integer; reward integer;
begin
 select * into r from public.referrals where invitee_id=p_invitee for update;
 if not found or r.qualified_at is not null then return null; end if;
 perform pg_advisory_xact_lock(hashtextextended('referrer:'||r.referrer_id::text,0));
 select count(*) into earned from public.referrals where referrer_id=r.referrer_id and referrer_diamonds>0;
 reward:=case when earned<p_limit then p_reward else 0 end;
 update public.referrals set qualified_at=p_now,referrer_diamonds=reward where invitee_id=p_invitee;
 return reward;
end $fn$;
revoke execute on function public.harvest_referral_qualify(uuid,bigint,integer,integer) from public,anon,authenticated;
grant execute on function public.harvest_referral_qualify(uuid,bigint,integer,integer) to service_role;
