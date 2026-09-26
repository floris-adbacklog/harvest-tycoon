-- Farm events (26 Sep 2026): "Use a boost" leaves the pool of 30 goal kinds. The cheapest boost costs 50 diamonds, more than
-- anyone but the winner gets back from an event (5 diamonds for finishing). "Sell wheat" takes its place in the market group:
-- free, as often as you like, and every farm grows wheat. boosts_used stays a valid goal, so an event that already has it (and
-- one the admin makes by hand) still counts. Run after live-events-mixed.sql; changes only the three functions below.
do $migration$
declare definition text; before text;
begin
 -- 1. The pool: the boost goal becomes the wheat sale.
 definition:=pg_get_functiondef('public.harvest_event_pick(bigint)'::regprocedure);before:=definition;
 definition:=replace(definition,
  $s${"stat":"boosts_used","targets":[1,1,2],"titles":[["Boost hour","Use a boost and make the most of it."],["Turbo farm","A boost to speed up the whole farm."]]}$s$,
  $s${"stat":"sold_wheat","targets":[40,70,100],"titles":[["Wheat market","The village bakers are buying. Sell your wheat at the market."],["Grain traders","Bring your wheat to the market stalls."]]}$s$);
 if definition=before then raise exception 'harvest_event_pick: the boost goal was not found'; end if;
 execute definition;
 -- 2. The goals an event may use.
 definition:=pg_get_functiondef('public.harvest_event_validate()'::regprocedure);before:=definition;
 definition:=replace(definition,$s$'boosts_used','activity_rounds')$s$,$s$'boosts_used','activity_rounds','sold_wheat')$s$);
 if definition=before then raise exception 'harvest_event_validate: the list of goals was not found'; end if;
 execute definition;
 -- 3. Selling wheat counts, like selling anything.
 definition:=pg_get_functiondef('public.harvest_event_progress()'::regprocedure);before:=definition;
 definition:=replace(definition,$s$or stat in ('sold','earned','coins_spent','diamonds_spent')$s$,$s$or stat in ('sold','sold_wheat','earned','coins_spent','diamonds_spent')$s$);
 if definition=before then raise exception 'harvest_event_progress: the market goals were not found'; end if;
 execute definition;
end
$migration$;
