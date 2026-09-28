-- Event diamonds without a daily limit (28 Sep 2026): a farmer collects every diamond an event pays. Until now claims were capped at
-- 50 event diamonds a UTC day (paid:=least(p.diamonds,50-used)); the 7 days before this capped 3 farmer-days, 112 diamonds in all.
-- This is the live harvest_event_claim read on 28 Sep 2026 (md5 3c07f196ac767c56377cc0c047e575b2) with only the cap taken out;
-- paid_diamonds is still filled in (now always the full prize).
CREATE OR REPLACE FUNCTION public.harvest_event_claim(p_player uuid, p_event uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare p public.live_event_players; farm public.player_farms; paid integer;
begin
 -- Farm first: same lock order as ordinary gameplay and its progress trigger.
 select * into farm from public.player_farms where player_id=p_player for update;
 perform public.harvest_event_settle(p_event);
 select * into p from public.live_event_players where player_id=p_player and event_id=p_event for update;
 if not found or not p.qualified or not exists(select 1 from public.live_events where id=p_event and settled_at is not null) then raise exception 'Complete the event objectives and wait for results.'; end if;
 if p.claimed_at is not null then return jsonb_build_object('message','This reward was already collected.'); end if;
 paid:=greatest(0,p.diamonds);
 farm.state:=jsonb_set(jsonb_set(farm.state,'{coins}',to_jsonb((farm.state->>'coins')::integer+p.coins)),'{diamonds}',to_jsonb((farm.state->>'diamonds')::integer+paid));
 update public.player_farms set state=farm.state,revision=revision+1,updated_at=now() where player_id=p_player;
 update public.player_stats set currency=(farm.state->>'coins')::integer where player_id=p_player;
 update public.live_event_players set claimed_at=now(),paid_diamonds=paid where event_id=p_event and player_id=p_player;
 return jsonb_build_object('message','Event rewards collected!','coins',p.coins,'diamonds',paid);
end $function$;
