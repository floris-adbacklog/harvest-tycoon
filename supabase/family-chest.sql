-- Farm families as a real part of the game (27 Sep 2026). Before this, 12 of 14 families had one member: a new family was invite
-- only, so farmers made their own and stayed alone. The rules (game/farm-state.js) now make a new family open and sort the list by
-- busy families you can join; this file adds what the database counts:
--  1. The Family Chest: one chest a week per family, filled by what members do on their farms. After every farm action this trigger
--     adds points to the member's family for the week (a harvest 1, a collected batch 2, a delivery 10, a chore 3, a helping-hand job
--     2; FAMILY_CHEST_POINTS in the rules). The game hands out the rewards per tier (family rewards, claimed as before) and derives
--     the family level from every tier ever opened. Only farm-api (service role) reads or writes these tables.
--  2. The family context gives the game the chests (every week, for the level) and this and last week's points per member.
--  3. Farm events: when 3 or more members of one family finish the same event, each of them gets +200 coins and +5 diamonds on top
--     (FAMILY_EVENT_BONUS). The rest of the settlement is unchanged.

create table if not exists public.family_chests(
 family_id uuid not null references public.families(id) on delete cascade,
 week integer not null,
 points bigint not null default 0 check (points>=0),
 primary key(family_id,week)
);
create table if not exists public.family_chest_players(
 family_id uuid not null references public.families(id) on delete cascade,
 week integer not null,
 player_id uuid not null references auth.users(id) on delete cascade,
 points bigint not null default 0 check (points>=0),
 primary key(family_id,week,player_id)
);
alter table public.family_chests enable row level security;
alter table public.family_chest_players enable row level security;
revoke all on public.family_chests, public.family_chest_players from anon, authenticated;

-- 1. After a farm action (the receipt farm-api writes with eventAction, the same test as harvest_event_progress): the growth of five
-- stats, weighted, goes to the farmer's current family for this week. A chest can never stop a farm from saving.
create or replace function public.harvest_family_chest()
 returns trigger language plpgsql security definer set search_path to '' as $function$
declare receipt jsonb; fam uuid; pts bigint; wk integer;
begin
 receipt:=new.receipts->-1;
 if receipt is null or receipt->>'eventAction' is null or receipt->>'id' is not distinct from old.receipts->-1->>'id' then return new; end if;
 if new.state->'stats' is not distinct from old.state->'stats' then return new; end if;
 pts:=greatest(0,coalesce((new.state->'stats'->>'harvested')::bigint,0)-coalesce((old.state->'stats'->>'harvested')::bigint,0))*1
  +greatest(0,coalesce((new.state->'stats'->>'produced')::bigint,0)-coalesce((old.state->'stats'->>'produced')::bigint,0))*2
  +greatest(0,coalesce((new.state->'stats'->>'deliveries')::bigint,0)-coalesce((old.state->'stats'->>'deliveries')::bigint,0))*10
  +greatest(0,coalesce((new.state->'stats'->>'chores')::bigint,0)-coalesce((old.state->'stats'->>'chores')::bigint,0))*3
  +greatest(0,coalesce((new.state->'stats'->>'activities')::bigint,0)-coalesce((old.state->'stats'->>'activities')::bigint,0))*2;
 if pts<=0 then return new; end if;
 select m.family_id into fam from public.family_members m join public.families f on f.id=m.family_id and f.deleted_at is null
  where m.player_id=new.player_id and m.left_at is null limit 1;
 if fam is null then return new; end if;
 wk:=floor((extract(epoch from now())*1000-4*86400000)/(7*86400000))::integer;   -- familyWeek(): weeks start Monday 00:00 UTC
 insert into public.family_chests(family_id,week,points) values(fam,wk,pts)
  on conflict(family_id,week) do update set points=public.family_chests.points+excluded.points;
 insert into public.family_chest_players(family_id,week,player_id,points) values(fam,wk,new.player_id,pts)
  on conflict(family_id,week,player_id) do update set points=public.family_chest_players.points+excluded.points;
 return new;
exception when others then return new;
end $function$;
revoke all on function public.harvest_family_chest() from public, anon, authenticated;
drop trigger if exists harvest_family_chest on public.player_farms;
create trigger harvest_family_chest after update on public.player_farms for each row execute function public.harvest_family_chest();

-- 2. The family context as before, plus 'chests' and 'chestPlayers' (this week and last week).
create or replace function public.harvest_family_context(p_player uuid, p_request uuid default null::uuid)
 returns jsonb language sql stable set search_path to '' as $function$
 select jsonb_build_object(
 'revision',(select revision from public.family_revision where id),
 'now',floor(extract(epoch from statement_timestamp())*1000)::bigint,
 'families',coalesce((select jsonb_agg(to_jsonb(t)) from public.families t),'[]'::jsonb),
 'members',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_members t),'[]'::jsonb),
 'invitations',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_invitations t where t.status='pending'),'[]'::jsonb),
 'requests',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_requests t where t.status='pending'),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_orders t),'[]'::jsonb),
 'contributions',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_contributions t),'[]'::jsonb),
 'results',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_week_results t),'[]'::jsonb),
 'rewards',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_rewards t),'[]'::jsonb),
 'attempts',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_attempts t),'[]'::jsonb),
 'weeks',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_weeks t),'[]'::jsonb),
 'chests',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_chests t),'[]'::jsonb),
 'chestPlayers',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_chest_players t where t.week>=floor((extract(epoch from statement_timestamp())*1000-4*86400000)/(7*86400000))::integer-1),'[]'::jsonb),
 'players',coalesce((select jsonb_agg(jsonb_build_object('player_id',p.player_id,'username',p.username,'level',p.level,'last_active_at',p.last_active_at,'vip_expires_at',p.vip_expires_at,'avatar_id',p.avatar_id)) from public.player_stats p where p.player_id=p_player or exists(select 1 from public.family_members m where m.player_id=p.player_id and m.left_at is null) or exists(select 1 from public.family_invitations i where i.status='pending' and (i.recipient_id=p.player_id or i.invited_by=p.player_id)) or exists(select 1 from public.family_requests r where r.status='pending' and r.player_id=p.player_id)),'[]'::jsonb),
 'receipt',(select jsonb_build_object('result',r.result,'failed',r.failed) from public.family_receipts r where r.player_id=p_player and r.request_id=p_request))
$function$;

-- 3. The event settlement as before, plus the family bonus for 3 or more finishers from one family.
create or replace function public.harvest_event_settle(p_event uuid)
 returns void language plpgsql set search_path to '' as $function$
declare e public.live_events; n integer; per_player integer; budget integer;
begin
 select * into e from public.live_events where id=p_event for update;
 if not found or e.ends_at>now() or e.settled_at is not null then return; end if;
 update public.live_event_players p set qualified=(actions>=3 and last_at>=joined_at+interval '10 minutes' and not exists(select 1 from jsonb_array_elements(e.objectives) o where coalesce((p.progress->>(o->>'stat'))::integer,0)<(o->>'target')::integer)) where event_id=p_event;
 select count(*) into n from public.live_event_players where event_id=p_event and qualified;
 per_player:=least((e.rewards->>'diamondMax')::integer,(e.rewards->>'diamondMin')::integer+floor(sqrt(n::numeric/(e.rewards->>'participantStep')::integer))::integer);
 budget:=least((e.rewards->>'poolCap')::integer,n*per_player);
 -- Completed players are ordered by completion time, UUID as deterministic tie-break. The first three also win a
 -- podium prize on top (1st +2000 coins, 2nd +1000, 3rd +500) and every later finisher +100 coins; diamonds are a fixed 50, 30, 20 and 5;
 -- the daily diamond cap (50) still applies at claim.
 with ranked as (select player_id,row_number() over(order by last_at,player_id) as rank from public.live_event_players where event_id=p_event and qualified)
 update public.live_event_players p set coins=(e.rewards->>'coins')::integer+(case r.rank when 1 then 2000 when 2 then 1000 when 3 then 500 else 100 end),
  diamonds=(case r.rank when 1 then 50 when 2 then 30 when 3 then 20 else 5 end)
  from ranked r where p.event_id=p_event and p.player_id=r.player_id;
 -- The family bonus (27 Sep 2026): 3 or more finishers from one family each get +200 coins and +5 diamonds.
 with fam as (select m.family_id,lp.player_id from public.live_event_players lp
   join public.family_members m on m.player_id=lp.player_id and m.left_at is null
   join public.families f on f.id=m.family_id and f.deleted_at is null
   where lp.event_id=p_event and lp.qualified),
  big as (select family_id from fam group by family_id having count(*)>=3)
 update public.live_event_players p set coins=p.coins+200,diamonds=p.diamonds+5
  from fam where fam.family_id in (select family_id from big) and p.event_id=p_event and p.player_id=fam.player_id;
 update public.live_events set settled_at=now(),participants=(select count(*) from public.live_event_players where event_id=p_event),qualified=n,diamond_pool=budget where id=p_event;
 update public.player_stats s set events_finished=(select count(*) from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified)
  where s.player_id in (select player_id from public.live_event_players where event_id=p_event and qualified);
end $function$;
