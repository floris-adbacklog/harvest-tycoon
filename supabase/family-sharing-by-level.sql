-- Daily family sharing grows with your level (26 Sep 2026): 5 coins and 1–5 goods meant nothing once sharing opens at level 10.
-- Help costs the helper level × 25 coins (level 10: 250) and gives exactly that to the member; a gift or a request is up to 5
-- per 10 levels of the one who sends or asks (level 10: 5, level 30: 15, level 60: 30). Everything still moves from one farm
-- to the other; the limits (3 a day, once per pair, one request a day) stay. Changes only these lines of the live
-- harvest_social (read on 26 Sep 2026); public/social-ui.js shows the same numbers.
do $migration$
declare definition text; before text;
begin
 definition:=pg_get_functiondef('public.harvest_social(uuid,jsonb,uuid)'::regprocedure);before:=definition;
 definition:=replace(definition,$s$ item text; quantity integer; fid uuid; message text;$s$,$s$ item text; quantity integer; fid uuid; message text; lvl integer; most integer; help bigint;$s$);
 definition:=replace(definition,$s$level>=10) then raise exception 'Daily sharing opens at level 10, after 48 hours on your farm and 24 hours in your family.'; end if;$s$,
  $s$level>=10) then raise exception 'Daily sharing opens at level 10, after 48 hours on your farm and 24 hours in your family.'; end if;
 select level into lvl from public.player_stats where player_id=p_player;
 most:=5*greatest(1,coalesce(lvl,10)/10);help:=25*greatest(10,coalesce(lvl,10));$s$);
 definition:=replace(definition,$s$quantity not between 1 and 5 then raise exception 'Ask for 1–5 of a crop or good.'; end if;$s$,
  $s$quantity not between 1 and most then raise exception 'Ask for 1–% of a crop or good.',most; end if;$s$);
 definition:=replace(definition,$s$quantity not between 1 and 5 then raise exception 'Send 1–5 of a crop or good.'; end if;$s$,
  $s$quantity not between 1 and most then raise exception 'Send 1–% of a crop or good.',most; end if;$s$);
 definition:=replace(definition,$s$  if (actor.state->>'coins')::bigint<5 then raise exception 'You need 5 coins to help.'; end if;
  actor.state:=jsonb_set(actor.state,'{coins}',to_jsonb((actor.state->>'coins')::bigint-5));
  other.state:=jsonb_set(other.state,'{coins}',to_jsonb((other.state->>'coins')::bigint+5));$s$,
  $s$  if (actor.state->>'coins')::bigint<help then raise exception 'You need % coins to help.',help; end if;
  actor.state:=jsonb_set(actor.state,'{coins}',to_jsonb((actor.state->>'coins')::bigint-help));
  other.state:=jsonb_set(other.state,'{coins}',to_jsonb((other.state->>'coins')::bigint+help));$s$);
 definition:=replace(definition,$s$when 'help' then 'You helped with 5 coins. Thank you!'$s$,$s$when 'help' then format('You helped with %s coins. Thank you!',help)$s$);
 if (length(definition)-length(replace(definition,'most','')))/4<4 or position('-help))' in definition)=0 or position('format(''You helped' in definition)=0 then
  raise exception 'harvest_social: one of the lines to change was not found';
 end if;
 execute definition;
end
$migration$;
