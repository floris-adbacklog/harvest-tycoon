-- Podium prizes for farm events: the first three farmers to finish win extra coins and diamonds on top of the
-- usual reward. Run after live-events.sql; replaces only harvest_event_settle (its grants stay as they are).
create or replace function public.harvest_event_settle(p_event uuid) returns void language plpgsql security invoker set search_path='' as $$
declare e public.live_events; n integer; per_player integer; budget integer;
begin
 select * into e from public.live_events where id=p_event for update;
 if not found or e.ends_at>now() or e.settled_at is not null then return; end if;
 update public.live_event_players p set qualified=(actions>=3 and last_at>=joined_at+interval '10 minutes' and not exists(select 1 from jsonb_array_elements(e.objectives) o where coalesce((p.progress->>(o->>'stat'))::integer,0)<(o->>'target')::integer)) where event_id=p_event;
 select count(*) into n from public.live_event_players where event_id=p_event and qualified;
 per_player:=least((e.rewards->>'diamondMax')::integer,(e.rewards->>'diamondMin')::integer+floor(sqrt(n::numeric/(e.rewards->>'participantStep')::integer))::integer);
 budget:=least((e.rewards->>'poolCap')::integer,n*per_player);
 -- Completed players are ordered by completion time, UUID as deterministic tie-break. The first three also win a
 -- podium prize on top (1st +300 coins +2 diamonds, 2nd +200 +1, 3rd +100 +1); the daily diamond cap still applies at claim.
 -- Live since 2026-09-22 (migration harvest_event_podium_prizes, also in live-events-podium.sql).
 with ranked as (select player_id,row_number() over(order by last_at,player_id) as rank from public.live_event_players where event_id=p_event and qualified)
 update public.live_event_players p set coins=(e.rewards->>'coins')::integer+(case r.rank when 1 then 300 when 2 then 200 when 3 then 100 else 0 end),
  diamonds=greatest(0,least(per_player,budget-((r.rank-1)*per_player)::integer))+(case r.rank when 1 then 2 when 2 then 1 when 3 then 1 else 0 end)
  from ranked r where p.event_id=p_event and p.player_id=r.player_id;
 update public.live_events set settled_at=now(),participants=(select count(*) from public.live_event_players where event_id=p_event),qualified=n,diamond_pool=budget where id=p_event;
end $$;
