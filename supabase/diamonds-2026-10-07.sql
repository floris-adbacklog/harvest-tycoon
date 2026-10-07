-- Fewer diamonds from farm events (7 Oct 2026, the owner's choice: "option B" and "podium only with rivals").
--
-- What it changes, only in the prize part of harvest_event_settle:
--  1. The podium pays 25 / 15 / 10 diamonds (was 50 / 30 / 20) and every other finisher 3 (was 5).
--  2. The podium's diamonds need rivals: only a league where at least 4 farmers finished pays them. In a league with 1 to 3
--     finishers every finisher gets 3. The podium's coins (+2000 / +1000 / +500, × the league) stay as they are.
--  3. The family bonus (3 or more finishers from one family) pays +3 diamonds (was +5); its +200 coins stay.
-- Everything else is the live function as read on 7 Oct 2026 (identical to supabase/live-event-leagues.sql), unchanged.
-- Events settled before this runs keep what they paid; nobody loses diamonds already earned.
-- The same numbers are in farm-api (event-service.js: PODIUM, FINISHER_PRIZE, PODIUM_MIN_FINISHERS) and the game
-- (FAMILY_EVENT_BONUS in game/farm-state.js), which show the prizes.
--
-- Safe to run twice: it only replaces the function (CREATE OR REPLACE keeps its owner and grants) and changes no data.

create or replace function public.harvest_event_settle(p_event uuid)
 returns void
 language plpgsql
 set search_path to ''
as $function$
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
 -- podium coins are × the league's number (1–5), × 8 for the Valley Legends. Diamonds are a fixed 25, 15, 10 and 3 in every league
 -- (7 Oct 2026; 50, 30, 20 and 5 before), and the podium's diamonds only where at least 4 finished in the league: else 3 for all.
 with ranked as (select player_id,league,row_number() over(partition by league order by last_at,player_id) as rank,count(*) over(partition by league) as finishers from public.live_event_players where event_id=p_event and qualified)
 update public.live_event_players p set coins=((e.rewards->>'coins')::integer+(case r.rank when 1 then 2000 when 2 then 1000 when 3 then 500 else 100 end))*(case r.league when 5 then 8 else r.league+1 end),
  diamonds=(case when r.finishers>=4 then (case r.rank when 1 then 25 when 2 then 15 when 3 then 10 else 3 end) else 3 end)
  from ranked r where p.event_id=p_event and p.player_id=r.player_id;
 -- The family bonus (27 Sep 2026): 3 or more finishers from one family each get +200 coins and +3 diamonds (+5 until 7 Oct 2026).
 with fam as (select m.family_id,lp.player_id from public.live_event_players lp
   join public.family_members m on m.player_id=lp.player_id and m.left_at is null
   join public.families f on f.id=m.family_id and f.deleted_at is null
   where lp.event_id=p_event and lp.qualified),
  big as (select family_id from fam group by family_id having count(*)>=3)
 update public.live_event_players p set coins=p.coins+200,diamonds=p.diamonds+3
  from fam where fam.family_id in (select family_id from big) and p.event_id=p_event and p.player_id=fam.player_id;
 update public.live_events set settled_at=now(),participants=(select count(*) from public.live_event_players where event_id=p_event),qualified=n,diamond_pool=budget where id=p_event;
 update public.player_stats s set events_finished=(select count(*) from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified)
  where s.player_id in (select player_id from public.live_event_players where event_id=p_event and qualified);
end $function$;
