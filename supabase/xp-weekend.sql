-- The Double XP weekend (27 Oct 2026, the owner: "Double XP weekend, waarbij mensen Double XP hebben, maar geen Double XP extra kunnen
-- kopen in de shop, je kan niet stacken, ook niet in daily rewards"). The admin starts it from the Admin panel (Money, beside the Sale):
-- now or at a time to come (at most 14 days ahead), for 1 to 72 hours. One at a time: starting one ends or cancels the one there is.
-- While it runs every farm earns double XP, from level 1 (the owner, 2B), once: a Double XP of the farm's own adds nothing on top. Double XP
-- is not for sale while it runs, and the farm's own Double XP waits until it is over (the owner, 1A). All of that is game/farm-state.js
-- (setXpWeekend, xpWeekend, holdXpBoost, addBoostTime); farm-api reads this table (xp-weekend-service.js, at most every 30 seconds) and
-- never takes it from the game.
--
-- What this file does (re-runnable; the SQL editor runs it as one transaction, so a stop keeps nothing):
-- 1. table harvest_xp_weekends (only farm-api, with the service role, and the functions below read or write it);
-- 2. the admin's xp_weekend_start(hours, starts_at) / xp_weekend_stop(id) / xp_weekend_list(), guarded exactly like diamond_sale_start
--    (chat_staff_role = 'admin', a Google session);
-- 3. a check at the end.
--
-- Release order: this file first (farm-api without it finds no table and runs no weekend), then the site, then farm-api. Start a
-- weekend only after all three are out.
-- This file holds no characters outside ASCII, so a plain copy is safe.

do $do$
begin
 if to_regprocedure('public.chat_staff_role(uuid)') is null then raise exception 'chat_staff_role is missing'; end if;
end $do$;

-- 1. The weekends. stopped_at: stopped by the admin (before starts_at: cancelled before it began). Its real end is the earlier of
-- ends_at and stopped_at.
create table if not exists public.harvest_xp_weekends(
 id uuid primary key default gen_random_uuid(),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 stopped_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 check (ends_at>starts_at and ends_at<=starts_at+interval '72 hours'));
create index if not exists harvest_xp_weekends_ends on public.harvest_xp_weekends(ends_at desc);
alter table public.harvest_xp_weekends enable row level security;
revoke all on public.harvest_xp_weekends from public, anon, authenticated;
grant select, insert, update on public.harvest_xp_weekends to service_role;

-- 2. The admin's functions (src/chat-client.js startXpWeekend / xpWeekendList / stopXpWeekend; the Admin panel's Double XP weekend card).
-- p_starts_at null (or a moment just past): now.
create or replace function public.xp_weekend_start(p_hours integer, p_starts_at timestamptz default null)
returns uuid language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());hours integer:=p_hours;starts timestamptz:=greatest(coalesce(p_starts_at,now()),now());made uuid;
begin
 if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if hours is null or hours not between 1 and 72 then raise exception 'Choose 1 to 72 hours.' using errcode='22023'; end if;
 if p_starts_at is not null and p_starts_at<now()-interval '10 minutes' then raise exception 'Choose a start that is still to come.' using errcode='22023'; end if;
 if starts>now()+interval '14 days' then raise exception 'Choose a start within 14 days.' using errcode='22023'; end if;
 update public.harvest_xp_weekends set stopped_at=now() where stopped_at is null and ends_at>now();
 insert into public.harvest_xp_weekends(starts_at,ends_at,created_by) values(starts,starts+make_interval(hours=>hours),me) returning id into made;
 return made;
end $f$;

create or replace function public.xp_weekend_stop(p_id uuid) returns void language plpgsql security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 update public.harvest_xp_weekends set stopped_at=now() where id=p_id and stopped_at is null and ends_at>now();
end $f$;

-- The last ten, newest first: when it starts and ends, and whether it is planned, running, over or cancelled.
create or replace function public.xp_weekend_list() returns jsonb language plpgsql stable security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'startsAt',w.starts_at,'endsAt',w.ends_at,'stoppedAt',w.stopped_at,'createdAt',w.created_at,
   'status',case when w.stopped_at is not null and w.stopped_at<=w.starts_at then 'cancelled'
    when least(w.ends_at,coalesce(w.stopped_at,w.ends_at))<=now() then 'over'
    when w.starts_at>now() then 'planned' else 'running' end) order by w.created_at desc)
  from (select * from public.harvest_xp_weekends order by created_at desc limit 10) w),'[]'::jsonb);
end $f$;

do $g$
declare f text;
begin
 foreach f in array array['xp_weekend_start(integer,timestamptz)','xp_weekend_stop(uuid)','xp_weekend_list()'] loop
  execute format('revoke all on function public.%s from public, anon',f);
  execute format('grant execute on function public.%s to authenticated',f);
 end loop;
end $g$;

-- 3. After: everything is there.
do $after$
begin
 if to_regclass('public.harvest_xp_weekends') is null then raise exception 'harvest_xp_weekends is missing'; end if;
 if to_regprocedure('public.xp_weekend_start(integer,timestamptz)') is null or to_regprocedure('public.xp_weekend_stop(uuid)') is null
  or to_regprocedure('public.xp_weekend_list()') is null then
  raise exception 'an xp_weekend function is missing';
 end if;
end $after$;
select 'xp weekend ready' as done;
