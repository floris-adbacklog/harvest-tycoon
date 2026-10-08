-- The event podium always pays its diamonds (8 Oct 2026, the owner's choice: "option 3").
--
-- What it changes, only in the prize part of harvest_event_settle: the first three finishers of each league win 25 / 15 / 10 diamonds
-- however many farmers finished in that league, and every other finisher 3. Since 7 Oct 2026 (supabase/diamonds-2026-10-07.sql) the
-- podium's diamonds needed at least 4 finishers in the league (with fewer, every finisher got 3); in the 5 events settled under
-- that rule only 2 of 24 leagues with finishers reached 4, so first place almost always got 3.
-- Unchanged: all coins (the event's own and the podium's +2000 / +1000 / +500, × the league; +100 for every other finisher), the
-- 3 diamonds for every other finisher and the family bonus (3 or more finishers from one family: +200 coins and +3 diamonds each).
-- Everything else is the live function as read on 8 Oct 2026 (identical to supabase/diamonds-2026-10-07.sql), unchanged.
-- Events settled before this runs keep what they paid; nothing is paid again or taken back.
-- Run this first, then deploy farm-api, then push the website (8 Oct 2026), all three within a few minutes while an event runs (not
-- in the break): that event then settles under the new prizes, and the break after it shows the same numbers as the prize list.
-- The same numbers are in farm-api (event-service.js: PODIUM, FINISHER_PRIZE) and the game (PODIUM_PRIZES and FINISHER_PRIZE in
-- public/live-events-ui.js, FAMILY_EVENT_BONUS in game/farm-state.js), which show the prizes.
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
 -- (7 Oct 2026; 50, 30, 20 and 5 before), however many finished in the league (8 Oct 2026; on 7 Oct only with 4 or more).
 with ranked as (select player_id,league,row_number() over(partition by league order by last_at,player_id) as rank from public.live_event_players where event_id=p_event and qualified)
 update public.live_event_players p set coins=((e.rewards->>'coins')::integer+(case r.rank when 1 then 2000 when 2 then 1000 when 3 then 500 else 100 end))*(case r.league when 5 then 8 else r.league+1 end),
  diamonds=(case r.rank when 1 then 25 when 2 then 15 when 3 then 10 else 3 end)
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
