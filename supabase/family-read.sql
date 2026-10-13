-- Family reads, small (13 Oct 2026). harvest_family_context was the heaviest frequent database call after Realtime: about 239,000
-- calls since 16 Sep at about 46 ms (82 ms and 504 KB on 13 Oct, growing every week). 97% of them are reads: the Family window asks
-- every 30 seconds while the game is in view (open or not), plus the family profile and chat's @mention list. Each read sent the
-- family data of the whole game: every reward, contribution, order and attempt ever, and it found the farmers by testing every row of
-- player_stats (45 ms of the 82).
-- harvest_family_read gives a read the same context with only the rows the rules (game/farm-state.js) can use for that farmer, so
-- every screen and every write is what it was:
--  - families, members, pending invitations and requests, week results, settled weeks, chests and farmers: as before (the farmers now
--    found from the members, invitations and requests instead of testing every farmer: the same rows);
--  - orders and contributions of this week, of any past week not settled yet (settleFamilyWeeks: at the Monday rollover, until the
--    first read or action settles it), the farmer's own contribution of last week (lastWeek in the Family window) and every order of
--    the family whose profile is open (its Family Orders completed);
--  - rewards: the farmer's own, every reward of a week not settled yet (settlement checks it pays nobody twice), and this and last
--    week's rewards of the farmers in the farmer's family chest (grantFamilyChest checks the same);
--  - chest farmers of this and last week (as before) for the farmer's family, the family whose profile is open and the farmer's own;
--  - attempts: the farmer's own (only actions use attempts, and actions still read everything).
-- A read is still the whole rule set: it settles a past week, expires invitations and requests, makes the week's order and grants
-- chest rewards as before. tests/family-read.test.mjs plays weeks of families and compares every read, profile and commit with the old
-- context. Rows come in the order of the table (ctid), as the old full scans gave them. json, not jsonb: about half the time, and no
-- rule reads the order of keys in a row. Actions keep harvest_family_context unchanged. Only farm-api (service role) calls either.
-- Measured on the live data of 13 Oct (read only, the body as a plain select): a read went from 88 ms, 13,600-15,700 buffers and 494 KB
-- to 10-14 ms, about 900 buffers and 175-183 KB, sending included; 153 farmers (in a family, without one, removed, the admin, profiles
-- of other families) got exactly the old rows, cut as below.
-- Run before farm-api (supabase/functions/farm-api/family-service.js); a farm-api from before never calls it, and the new one falls
-- back to the whole context while this has not run. Re-runnable.

-- It narrows harvest_family_context as live on 13 Oct 2026 (the same as supabase/family-chest.sql). A context changed since then
-- may read something this does not: then stop and compare first.
do $guard$
begin
 if md5(pg_get_functiondef('public.harvest_family_context(uuid,uuid)'::regprocedure))<>'7cd8a1177c21f1bad6b40ad4d8487248' then
  raise exception 'harvest_family_context is not as it was on 13 Oct 2026: compare harvest_family_read with the live definition first';
 end if;
end $guard$;

-- One statement, so the database plans it once per connection (plpgsql keeps the plan; the old sql function planned every call).
create or replace function public.harvest_family_read(p_player uuid, p_family uuid default null)
 returns json language plpgsql stable set search_path to '' as $function$
begin
 return (
  with k as materialized (
   select floor((extract(epoch from statement_timestamp())*1000-345600000)/604800000)::integer as week,   -- familyWeek(now)
    (select m.family_id from public.family_members m where m.player_id=p_player and m.left_at is null) as family,
    (select coalesce(array_agg(distinct c.week),'{}'::integer[]) from public.family_contributions c
      where c.week<floor((extract(epoch from statement_timestamp())*1000-345600000)/604800000)::integer
      and not exists(select 1 from public.family_weeks w where w.week=c.week)) as unsettled
  )
  select json_build_object(
   'revision',(select revision from public.family_revision where id),
   'now',floor(extract(epoch from statement_timestamp())*1000)::bigint,
   'families',coalesce((select json_agg(t order by t.ctid) from public.families t),'[]'::json),
   'members',coalesce((select json_agg(t order by t.ctid) from public.family_members t),'[]'::json),
   'invitations',coalesce((select json_agg(t order by t.ctid) from public.family_invitations t where t.status='pending'),'[]'::json),
   'requests',coalesce((select json_agg(t order by t.ctid) from public.family_requests t where t.status='pending'),'[]'::json),
   'orders',coalesce((select json_agg(t order by t.ctid) from public.family_orders t
     where t.week=k.week or t.week=any(k.unsettled) or t.family_id=p_family),'[]'::json),
   'contributions',coalesce((select json_agg(t order by t.ctid) from public.family_contributions t
     where t.week=k.week or t.week=any(k.unsettled) or (t.player_id=p_player and t.week=k.week-1)),'[]'::json),
   'results',coalesce((select json_agg(t order by t.ctid) from public.family_week_results t),'[]'::json),
   'rewards',coalesce((select json_agg(t order by t.ctid) from public.family_rewards t
     where t.player_id=p_player or t.week=any(k.unsettled)
      or (t.week>=k.week-1 and t.player_id in (select c.player_id from public.family_chest_players c where c.family_id=k.family and c.week>=k.week-1))),'[]'::json),
   'attempts',coalesce((select json_agg(t order by t.ctid) from public.family_attempts t where t.player_id=p_player),'[]'::json),
   'weeks',coalesce((select json_agg(t order by t.ctid) from public.family_weeks t),'[]'::json),
   'chests',coalesce((select json_agg(t order by t.ctid) from public.family_chests t),'[]'::json),
   'chestPlayers',coalesce((select json_agg(t order by t.ctid) from public.family_chest_players t
     where t.week>=k.week-1 and (t.family_id=k.family or t.family_id=p_family or t.player_id=p_player)),'[]'::json),
   'players',coalesce((select json_agg(json_build_object('player_id',p.player_id,'username',p.username,'level',p.level,'last_active_at',p.last_active_at,'vip_expires_at',p.vip_expires_at,'avatar_id',p.avatar_id) order by p.ctid)
     from public.player_stats p where p.player_id in (select p_player
      union all select m.player_id from public.family_members m where m.left_at is null
      union all select i.recipient_id from public.family_invitations i where i.status='pending'
      union all select i.invited_by from public.family_invitations i where i.status='pending'
      union all select r.player_id from public.family_requests r where r.status='pending')),'[]'::json),
   'receipt',null)
  from k
 );
end $function$;
revoke all on function public.harvest_family_read(uuid,uuid) from public, anon, authenticated;
grant execute on function public.harvest_family_read(uuid,uuid) to service_role;
-- Check: select has_function_privilege('authenticated','public.harvest_family_read(uuid,uuid)','execute'); -- false
-- and (read only, about 5 s): the same lists as the context for 40 farmers, and fewer rewards; every column true:
-- select count(*), bool_and(n->'families'=o->'families' and n->'members'=o->'members' and n->'players'=o->'players' and n->'chests'=o->'chests'
--  and n->'results'=o->'results' and n->'weeks'=o->'weeks') same_lists, bool_and(jsonb_array_length(n->'rewards')<jsonb_array_length(o->'rewards')) fewer_rewards
-- from (select public.harvest_family_read(s.p)::jsonb n, public.harvest_family_context(s.p) o from (select player_id p from public.family_members where left_at is null limit 40) s) x;
