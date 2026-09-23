-- Bigger event prizes (2026-09-23): the first three finishers win +2,000 coins and +20 diamonds, +1,000 and +10, +500 and +5
-- on top of the usual reward, and every later finisher +100 coins and +1 diamond. A farmer collects at most 30 event diamonds a
-- day (was 6), so one first place is paid in full. Both functions are the live definitions read on 23 Sep 2026
-- (settle md5 dadbfdc70932a8a9d4312c85bd82d248, claim md5 8ed690db282ae5bfffea491d4791a929) with only these numbers changed.
-- Same numbers in PODIUM / FINISHER_PRIZE / EVENT_DAY_DIAMONDS (farm-api event-service.js) and the event screen.
CREATE OR REPLACE FUNCTION public.harvest_event_settle(p_event uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare e public.live_events; n integer; per_player integer; budget integer;
begin
 select * into e from public.live_events where id=p_event for update;
 if not found or e.ends_at>now() or e.settled_at is not null then return; end if;
 update public.live_event_players p set qualified=(actions>=3 and last_at>=joined_at+interval '10 minutes' and not exists(select 1 from jsonb_array_elements(e.objectives) o where coalesce((p.progress->>(o->>'stat'))::integer,0)<(o->>'target')::integer)) where event_id=p_event;
 select count(*) into n from public.live_event_players where event_id=p_event and qualified;
 per_player:=least((e.rewards->>'diamondMax')::integer,(e.rewards->>'diamondMin')::integer+floor(sqrt(n::numeric/(e.rewards->>'participantStep')::integer))::integer);
 budget:=least((e.rewards->>'poolCap')::integer,n*per_player);
 -- Completed players are ordered by completion time, UUID as deterministic tie-break. The first three also win a
 -- podium prize on top (1st +2000 coins +20 diamonds, 2nd +1000 +10, 3rd +500 +5) and every later finisher +100 +1;
 -- the daily diamond cap (30) still applies at claim.
 with ranked as (select player_id,row_number() over(order by last_at,player_id) as rank from public.live_event_players where event_id=p_event and qualified)
 update public.live_event_players p set coins=(e.rewards->>'coins')::integer+(case r.rank when 1 then 2000 when 2 then 1000 when 3 then 500 else 100 end),
  diamonds=greatest(0,least(per_player,budget-((r.rank-1)*per_player)::integer))+(case r.rank when 1 then 20 when 2 then 10 when 3 then 5 else 1 end)
  from ranked r where p.event_id=p_event and p.player_id=r.player_id;
 update public.live_events set settled_at=now(),participants=(select count(*) from public.live_event_players where event_id=p_event),qualified=n,diamond_pool=budget where id=p_event;
 update public.player_stats s set events_finished=(select count(*) from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified)
  where s.player_id in (select player_id from public.live_event_players where event_id=p_event and qualified);
end $function$;

CREATE OR REPLACE FUNCTION public.harvest_event_claim(p_player uuid, p_event uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare p public.live_event_players; farm public.player_farms; paid integer; used integer;
begin
 -- Farm first: same lock order as ordinary gameplay and its progress trigger.
 select * into farm from public.player_farms where player_id=p_player for update;
 perform public.harvest_event_settle(p_event);
 select * into p from public.live_event_players where player_id=p_player and event_id=p_event for update;
 if not found or not p.qualified or not exists(select 1 from public.live_events where id=p_event and settled_at is not null) then raise exception 'Complete the event objectives and wait for results.'; end if;
 if p.claimed_at is not null then return jsonb_build_object('message','This reward was already collected.'); end if;
 select coalesce(sum(paid_diamonds),0) into used from public.live_event_players where player_id=p_player and claimed_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC');
 paid:=least(p.diamonds,greatest(0,30-used));
 farm.state:=jsonb_set(jsonb_set(farm.state,'{coins}',to_jsonb((farm.state->>'coins')::integer+p.coins)),'{diamonds}',to_jsonb((farm.state->>'diamonds')::integer+paid));
 update public.player_farms set state=farm.state,revision=revision+1,updated_at=now() where player_id=p_player;
 update public.player_stats set currency=(farm.state->>'coins')::integer where player_id=p_player;
 update public.live_event_players set claimed_at=now(),paid_diamonds=paid where event_id=p_event and player_id=p_player;
 return jsonb_build_object('message','Event rewards collected!','coins',p.coins,'diamonds',paid);
end $function$;
