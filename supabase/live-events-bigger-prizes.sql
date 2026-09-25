-- Simple, bigger event prizes (25 Sep 2026): a fixed 50, 30 and 20 diamonds for the first three finishers and 5 for every other
-- finisher, whatever the number of farmers; coins are unchanged (the event's coins plus 2000/1000/500/100). The daily cap on event
-- diamonds goes from 30 to 50. Only these parts change: the live definitions are read and re-created, so nothing else can drift.
do $migration$
declare definition text; before text;
begin
 definition:=pg_get_functiondef('public.harvest_event_settle(uuid)'::regprocedure);before:=definition;
 definition:=replace(definition,'diamonds=greatest(0,least(per_player,budget-((r.rank-1)*per_player)::integer))+(case r.rank when 1 then 20 when 2 then 10 when 3 then 5 else 1 end)','diamonds=(case r.rank when 1 then 50 when 2 then 30 when 3 then 20 else 5 end)');
 definition:=replace(definition,'(1st +2000 coins +20 diamonds, 2nd +1000 +10, 3rd +500 +5) and every later finisher +100 +1;','(1st +2000 coins, 2nd +1000, 3rd +500) and every later finisher +100 coins; diamonds are a fixed 50, 30, 20 and 5;');
 definition:=replace(definition,'the daily diamond cap (30)','the daily diamond cap (50)');
 if definition=before or position('when 1 then 50 when 2 then 30 when 3 then 20 else 5' in definition)=0 or position('cap (50)' in definition)=0 then raise exception 'harvest_event_settle: expected text not found'; end if;
 execute definition;
 definition:=pg_get_functiondef('public.harvest_event_claim(uuid,uuid)'::regprocedure);before:=definition;
 definition:=replace(definition,'paid:=least(p.diamonds,greatest(0,30-used));','paid:=least(p.diamonds,greatest(0,50-used));');
 if definition=before then raise exception 'harvest_event_claim: the daily cap was not found'; end if;
 execute definition;
end
$migration$;
