-- Away too long (17 Oct 2026, the owner; a family stays at most 10 farmers): a member who has not played for the family's number of
-- days leaves the family automatically, and can join it again from Welcome back. Re-runnable: every part checks whether it is done.
--  1. families.idle_days: 7, 14, 30, 60 or 90 days, 30 for every family, new and old (game/farm-state.js FAMILY_IDLE_DAYS). The
--     leader or a co-leader picks it in Family settings.
--  2. family_members.left_reason ('idle'), left_family and left_days: written by the hourly job only, on a leave for being away, so
--     Welcome back can name the family and the days and offer "Join again". They are cleared as soon as the farmer is in a family
--     again (any family, any way in), by a trigger, so a later leave never brings the offer back.
--  3. harvest_family_commit, changed in place (read live on 17 Oct 2026, md5 061d7043ecb234be779202cf07e72543): it saves idle_days
--     with the family, and a family that a farm-api from before this saves without it (a new family) gets 30, so the new column can be
--     NOT NULL while that farm-api still runs. Nothing else in it changes: every check stays (it stops when it is not as expected).
--  4. harvest_family_rejoin: the small read for Welcome back (farm-api's load, family-service.js familyRejoinRead).
--  5. harvest_family_idle_leave, every hour (pg_cron, minute 47): the leaves themselves, set-based, in one statement.
-- The rule, the same as familyIdleLeaves in game/farm-state.js: a farmer in a family who is not its leader, whose last played
-- (player_stats.last_active_at: every saved farm action and every return after 30 minutes or more, not an admin gift, admin-service.js
-- puts it back; what the online dot, the list of families and the admin read), or the moment they joined if that is later, is the family's idle_days or more ago. Never the leader
-- (no automatic handover, the owner): a family always keeps its leader, so it never ends this way. Co-leaders and honorary members
-- leave like members. For the family it is a normal leave: the seat frees, this week's chest and order points stay with the family
-- (nothing of them is touched), family_revision moves on so a family action that read before it retries; no chat card (family_join_chat
-- and family_rank_chat only write for a farmer still in the family) and no push. For the farmer: no wait to join any family (a block
-- from a family that removed them earlier stays as it was), and one line in their own log ("Left the family after 31 days away": no
-- family name in it, the page would translate a name that is also a word, and take its digits for the number).
-- Release order: this file first, then farm-api, then the site. With this file run, the farm-api live now (dc42a45) and old pages
-- keep working: every family has 30, a family that farm-api makes gets 30 from the commit (3.), and its family reads return whole
-- rows, so it saves idle_days back as it was. The new farm-api before this file would be safe too (it shows no choice and saves none
-- while no family row has idle_days, game/farm-state.js), but nobody would leave and nothing would offer Join again. The site shows
-- nothing new without the new farm-api's fields.

-- 1. The family's choice.
alter table public.families add column if not exists idle_days integer not null default 30;
alter table public.families drop constraint if exists families_idle_days_check;
alter table public.families add constraint families_idle_days_check check (idle_days in (7,14,30,60,90));

-- 2. Why and from which family a farmer left, kept only for a leave for being away.
alter table public.family_members add column if not exists left_reason text;
alter table public.family_members add column if not exists left_family uuid;
alter table public.family_members add column if not exists left_days integer;
alter table public.family_members drop constraint if exists family_members_left_reason_check;
alter table public.family_members add constraint family_members_left_reason_check check (left_reason is null or (left_reason='idle' and left_family is not null and left_days>=0));

create or replace function public.family_members_back() returns trigger language plpgsql set search_path to '' as $f$
begin
 new.left_reason:=null;new.left_family:=null;new.left_days:=null;
 return new;
end $f$;
revoke all on function public.family_members_back() from public, anon, authenticated;
drop trigger if exists family_members_back on public.family_members;
create trigger family_members_back before insert or update on public.family_members for each row
 when (new.family_id is not null and (new.left_reason is not null or new.left_family is not null or new.left_days is not null))
 execute function public.family_members_back();

-- 3. harvest_family_commit saves idle_days (only these two places change; it stops if either is not there exactly once).
do $patch$
declare
 fn regprocedure:='public.harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean)'::regprocedure;
 live text:=pg_get_functiondef(fn); def text:=live;
 times int;
begin
 if position('idle_days=excluded.idle_days' in def)=0 then
  times:=(length(def)-length(replace(def,'min_level=excluded.min_level;','')))/length('min_level=excluded.min_level;');
  if times<>1 then raise exception 'harvest_family_commit is not as expected: it should save min_level once (family-min-level.sql); add idle_days by hand'; end if;
  def:=replace(def,'min_level=excluded.min_level;','min_level=excluded.min_level,idle_days=excluded.idle_days;');
 end if;
 if position('jsonb_populate_record(null::public.families,' in def)=0 then
  times:=(length(def)-length(replace(def,'jsonb_populate_recordset(null::public.families,','')))/length('jsonb_populate_recordset(null::public.families,');
  if times<>1 then raise exception 'harvest_family_commit is not as expected: it should read the families once; give idle_days its 30 by hand'; end if;
  def:=replace(def,'jsonb_populate_recordset(null::public.families,','jsonb_populate_recordset(jsonb_populate_record(null::public.families,jsonb_build_object(''idle_days'',30)),');
 end if;
 if def=live then return; end if;
 -- The checks it has live stay as they are (the changes above touch none of them).
 if position('count(*)>10' in def)=0 or position('Invalid family membership' in def)=0 or position('Order overflow' in def)=0 or position('Invalid contribution change' in def)=0
  or position('blocked_family=excluded.blocked_family' in def)=0 or position('join_mode=excluded.join_mode' in def)=0 then
  raise exception 'harvest_family_commit is not as expected: a check is missing, look at it before adding idle_days';
 end if;
 execute def;
end $patch$;

-- 4. Join again in Welcome back: the farmer's own member row, the family they left for being away with the farmers in it now (for its
-- room) and the family they are in, if any. farm-api applies the rule (familyRejoinOffer). One small read, only on a return.
create or replace function public.harvest_family_rejoin(p_player uuid) returns json language sql stable set search_path to '' as $f$
 with me as (select m.family_id, m.left_family from public.family_members m where m.player_id=p_player)
 select json_build_object(
  'now',floor(extract(epoch from statement_timestamp())*1000)::bigint,
  'members',coalesce((select json_agg(t) from public.family_members t
    where t.player_id=p_player or (t.left_at is null and t.family_id=(select me.left_family from me))),'[]'::json),
  'families',coalesce((select json_agg(t) from public.families t
    where t.id=(select me.left_family from me) or t.id=(select me.family_id from me)),'[]'::json))
$f$;
revoke all on function public.harvest_family_rejoin(uuid) from public, anon, authenticated;
grant execute on function public.harvest_family_rejoin(uuid) to service_role;

-- 5. The leaves, every hour. The family lock first, as harvest_family_commit and harvest_delete_account take it: a family action that
-- is saving now finishes first, and one that read the family before this retries on the new revision (farm-api's revision loop), so
-- it never puts a farmer back. Only when someone left does the revision move. Returns how many left.
create or replace function public.harvest_family_idle_leave() returns integer language plpgsql security definer set search_path to '' as $f$
declare now_ms bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint; gone integer;
begin
 perform 1 from public.family_revision where id for update;
 with idle as (
  select m.player_id, m.family_id,
   ((now_ms-greatest(coalesce(floor(extract(epoch from ps.last_active_at)*1000)::bigint,0),m.joined_at))/86400000)::integer as days
  from public.family_members m
  join public.families f on f.id=m.family_id and f.deleted_at is null
  left join public.player_stats ps on ps.player_id=m.player_id
  where m.left_at is null and m.family_id is not null and m.role<>'leader'
   and greatest(coalesce(floor(extract(epoch from ps.last_active_at)*1000)::bigint,0),m.joined_at)<=now_ms-f.idle_days*86400000::bigint
 ), left_now as (
  update public.family_members m set family_id=null,left_at=now_ms,role='member',left_reason='idle',left_family=idle.family_id,left_days=idle.days
  from idle where m.player_id=idle.player_id and m.left_at is null
  returning m.player_id, idle.days
 )
 insert into public.player_logs(player_id,category,action,text)
 select l.player_id,'social','family_idle_leave',format('Left the family after %s days away',l.days) from left_now l;
 get diagnostics gone=row_count;
 if gone>0 then update public.family_revision set revision=revision+1 where id; end if;
 return gone;
end $f$;
revoke all on function public.harvest_family_idle_leave() from public, anon, authenticated;

select cron.unschedule('harvest-family-idle-leave') where exists(select 1 from cron.job where jobname='harvest-family-idle-leave');
select cron.schedule('harvest-family-idle-leave','47 * * * *','select public.harvest_family_idle_leave()');
