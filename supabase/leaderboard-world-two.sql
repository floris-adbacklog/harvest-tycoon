-- World II (30 Sep 2026): the farm's leaderboards stay the farm's. "Most building upgrades" counts the farm's buildings only, not the
-- village's places (the Mine, the Lumber Camp, the Smithy and the Village Windmill). The village's goods have their own boards under
-- Village (goods_made, src/leaderboard.js), and its batches and sales are counted apart in the farm itself (village_batches,
-- village_sold), so Goods produced and Items sold need no change here. The rest of the trigger is the live function.
do $migration$
declare definition text; before text;
begin
 definition:=pg_get_functiondef('public.harvest_stats_extras()'::regprocedure);
 before:=definition;
 definition:=replace(definition,
  'b.key not in (''farmhouse'',''familyhall'')',
  'b.key not in (''farmhouse'',''familyhall'',''mine'',''lumbercamp'',''smithy'',''villagemill'')');
 if definition=before then raise exception 'harvest_stats_extras: the building list was not found'; end if;
 execute definition;
end
$migration$;
