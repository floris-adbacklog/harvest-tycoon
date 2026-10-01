-- Farm event leagues (1 Oct 2026, game/farm-state.js EVENT_LEAGUES): every farmer races against farmers of about their level, with
-- a top 10 and a podium of its own per league. Diamonds per place are the same in every league (50, 30, 20, then 5); coins grow
-- with the league: Sprout League 15–29 ×1, Meadow 30–44 ×2, Orchard 45–59 ×3, Harvest 60–74 ×4, Estate 75–89 ×5,
-- Valley Legends 90+ ×8. The level when the event ends decides the league; settlement writes it on every row.
-- Built on the live harvest_event_settle (read on 1 Oct 2026); only the league lines are new.
alter table public.live_event_players add column if not exists league smallint check (league is null or league between 0 and 5);

-- The league (0–5) for a farm level.
create or replace function public.harvest_event_league(p_level integer)
 returns smallint language sql immutable set search_path to '' as $function$
 select (case when coalesce(p_level,0)>=90 then 5 when p_level>=75 then 4 when p_level>=60 then 3 when p_level>=45 then 2 when p_level>=30 then 1 else 0 end)::smallint
$function$;

create or replace function public.harvest_event_settle(p_event uuid)
 returns void language plpgsql set search_path to '' as $function$
declare e public.live_events; n integer; per_player integer; budget integer;
begin
 select * into e from public.live_events where id=p_event for update;
 if not found or e.ends_at>now() or e.settled_at is not null then return; end if;
 -- The league of every farmer in the event, by their level now (1 Oct 2026), and then whether they finished their league's goals
 -- (live-event-league-goals.sql; an event without per-league goals uses its own for everyone).
 update public.live_event_players p set league=public.harvest_event_league(s.level)
  from public.player_stats s where p.event_id=p_event and s.player_id=p.player_id;
 update public.live_event_players set league=0 where event_id=p_event and league is null;
 update public.live_event_players p set qualified=(not exists(select 1 from jsonb_array_elements(coalesce(e.leagues->p.league->'objectives',e.objectives)) o where coalesce((p.progress->>(o->>'stat'))::integer,0)<(o->>'target')::integer)) where event_id=p_event;
 select count(*) into n from public.live_event_players where event_id=p_event and qualified;
 per_player:=least((e.rewards->>'diamondMax')::integer,(e.rewards->>'diamondMin')::integer+floor(sqrt(n::numeric/(e.rewards->>'participantStep')::integer))::integer);
 budget:=least((e.rewards->>'poolCap')::integer,n*per_player);
 -- Completed players are ordered by completion time within their league, UUID as deterministic tie-break. The first three of each
 -- league also win a podium prize on top (+2000, +1000, +500 coins) and every later finisher +100 coins; the event's coins and the
 -- podium coins are × the league's number (1–5), × 8 for the Valley Legends. Diamonds are a fixed 50, 30, 20 and 5 in every league.
 with ranked as (select player_id,league,row_number() over(partition by league order by last_at,player_id) as rank from public.live_event_players where event_id=p_event and qualified)
 update public.live_event_players p set coins=((e.rewards->>'coins')::integer+(case r.rank when 1 then 2000 when 2 then 1000 when 3 then 500 else 100 end))*(case r.league when 5 then 8 else r.league+1 end),
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

-- Every farmer in an event with their league, for farm-api's standings (event-service.js): the league written at settlement, or
-- while the event runs the one their level puts them in now. Only the server reads it.
create or replace function public.harvest_event_board(p_event uuid)
 returns table(player_id uuid, progress jsonb, actions integer, joined_at timestamptz, last_at timestamptz, qualified boolean, coins integer, diamonds integer, league smallint)
 language sql stable security definer set search_path to '' as $function$
 select lp.player_id,lp.progress,lp.actions,lp.joined_at,lp.last_at,lp.qualified,lp.coins,lp.diamonds,coalesce(lp.league,public.harvest_event_league(s.level))
 from public.live_event_players lp left join public.player_stats s on s.player_id=lp.player_id
 where lp.event_id=p_event
$function$;
revoke all on function public.harvest_event_board(uuid) from public, anon, authenticated;
grant execute on function public.harvest_event_board(uuid) to service_role;

-- Progress (the trigger on player_farms), as live on 1 Oct 2026, now counting the goals of the farmer's league: the one their level
-- puts them in at the time of the action (an event without per-league goals uses its own for everyone). The new kinds of the
-- higher leagues count on their own actions: Glasshouse batches on collecting, Valley Market baskets on selling one there.
create or replace function public.harvest_event_progress()
 returns trigger language plpgsql set search_path to '' as $function$
declare e public.live_events; p public.live_event_players; o jsonb; receipt jsonb; action text; stat text;
 before_v integer; after_v integer; value integer; changed boolean; moved boolean; fresh boolean; mapped boolean; base jsonb;
 lg smallint; objs jsonb;
begin
 receipt:=new.receipts->-1;action:=receipt->>'eventAction';
 if receipt is null or receipt->>'id' is not distinct from old.receipts->-1->>'id' or action is null then
  -- Not an event action: whatever it added to the stats must not count later on.
  if new.state->'stats' is distinct from old.state->'stats' then
   for p in select lp.* from public.live_event_players lp join public.live_events le on le.id=lp.event_id
    where lp.player_id=new.player_id and lp.baseline is not null and le.active and le.starts_at<=now() and le.ends_at>now() and le.settled_at is null loop
    base:=p.baseline;
    for stat in select jsonb_object_keys(p.baseline) loop
     base:=jsonb_set(base,array[stat],to_jsonb(coalesce((base->>stat)::integer,0)+greatest(0,coalesce((new.state#>>array['stats',stat])::integer,0)-coalesce((old.state#>>array['stats',stat])::integer,0))));
    end loop;
    if base is distinct from p.baseline then update public.live_event_players set baseline=base where event_id=p.event_id and player_id=p.player_id; end if;
   end loop;
  end if;
  return new;
 end if;
 select public.harvest_event_league(s.level) into lg from public.player_stats s where s.player_id=new.player_id and s.level>=15;
 if not found then return new; end if;
 for e in select * from public.live_events where active and starts_at<=now() and ends_at>now() and settled_at is null order by id for share loop
  objs:=coalesce(e.leagues->lg->'objectives',e.objectives);
  select * into p from public.live_event_players where event_id=e.id and player_id=new.player_id;
  fresh:=not found;
  if fresh then p.progress:='{}';p.actions:=0;p.joined_at:=now();p.last_at:=now()-interval '1 day';p.baseline:=null;end if;
  if p.baseline is null then
   -- Start from the stats before this action; a row from before this change keeps the progress it already has.
   base:='{}';
   for o in select * from jsonb_array_elements(objs) loop
    stat:=o->>'stat';
    base:=jsonb_set(base,array[stat],to_jsonb(coalesce((old.state#>>array['stats',stat])::integer,0)-coalesce((p.progress->>stat)::integer,0)));
   end loop;
   p.baseline:=base;
  end if;
  -- Freeze the qualifying completion time so further play never worsens reward priority.
  if not fresh and not exists(select 1 from jsonb_array_elements(objs) obj where coalesce((p.progress->>(obj->>'stat'))::integer,0)<(obj->>'target')::integer) then continue; end if;
  changed:=false;moved:=false;
  for o in select * from jsonb_array_elements(objs) loop
   stat:=o->>'stat';
   before_v:=coalesce((old.state#>>array['stats',stat])::integer,0);after_v:=coalesce((new.state#>>array['stats',stat])::integer,0);
   mapped:=(stat in ('harvested','watered','tended','planted') and action in ('field','fields','tractor','collect_all')) or (stat='produced' and action in ('collect','collect_all')) or (stat='chores' and action='chore') or (stat='deliveries' and action='delivery')
    or (stat like 'harvest\_%' and action in ('field','fields','tractor')) or (stat like 'made\_%' and action in ('collect','collect_all'))
    or stat in ('sold','sold_wheat','earned','coins_spent','diamonds_spent') or (stat in ('activities','activity_rounds') and action='activity_work') or (stat='upgrades' and action='upgrade')
    or (stat='fertilized' and action='fertilize') or (stat='parallel_batches' and action='produce') or (stat='boosts_used' and action='buy_boost')
    or (stat='glasshouse_batches' and action in ('collect','collect_all')) or (stat='valley_baskets' and action='valley_sell')
    or (stat='tractor' and action='tractor') or (stat like 'sold\_%' and action='sell');
   if not mapped then
    if after_v>before_v then p.baseline:=jsonb_set(p.baseline,array[stat],to_jsonb(coalesce((p.baseline->>stat)::integer,0)+after_v-before_v));moved:=true;end if;
    continue;
   end if;
   value:=least((o->>'target')::integer,greatest(0,after_v-coalesce((p.baseline->>stat)::integer,before_v)));
   if value>coalesce((p.progress->>stat)::integer,0) then changed:=true;p.progress:=jsonb_set(p.progress,array[stat],to_jsonb(value));end if;
  end loop;
  if changed then
   -- A save counts as a separate contribution at most once every 10 seconds; progress itself always counts.
   insert into public.live_event_players(event_id,player_id,progress,actions,joined_at,last_at,baseline)
    values(e.id,new.player_id,p.progress,p.actions+(case when p.last_at<=now()-interval '10 seconds' then 1 else 0 end),p.joined_at,now(),p.baseline)
    on conflict(event_id,player_id) do update set progress=excluded.progress,actions=excluded.actions,last_at=excluded.last_at,baseline=excluded.baseline;
  elsif moved and not fresh then
   update public.live_event_players set baseline=p.baseline where event_id=e.id and player_id=new.player_id;
  end if;
 end loop;
 return new;
end $function$;
