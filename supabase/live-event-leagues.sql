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
 update public.live_event_players p set qualified=(not exists(select 1 from jsonb_array_elements(e.objectives) o where coalesce((p.progress->>(o->>'stat'))::integer,0)<(o->>'target')::integer)) where event_id=p_event;
 -- The league of every farmer in the event, by their level now (1 Oct 2026).
 update public.live_event_players p set league=public.harvest_event_league(s.level)
  from public.player_stats s where p.event_id=p_event and s.player_id=p.player_id;
 update public.live_event_players set league=0 where event_id=p_event and league is null;
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
