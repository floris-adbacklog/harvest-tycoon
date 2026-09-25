-- Mixed farm events (26 Sep 2026): instead of twelve fixed events, every event draws 3 goals from a pool of 30 kinds, each in
-- three sizes (easy, medium, hard): 90 goals and about 14,000 different events. Events open at level 15 (was 10), so spending
-- diamonds (boosts and finishing open at 14) can be a goal too; every goal can be done at level 15 in a 5-hour event (bread needs
-- the Bakery, which opens at level 8).
-- 1. harvest_event_pick(slot): the event for one 6-hour slot, the same for everyone. The main goal's group takes turns
--    (fields, crops, animals & buildings, market & coins, farm life), so two events in a row never have the same main goal; the
--    other two goals come from two other groups, and the sizes are hard + medium + easy or three medium, never three hard. The title
--    and description come with the main goal.
-- 2. harvest_event_schedule: uses harvest_event_pick; settling and slots unchanged.
-- 3. harvest_event_validate: the new goals may be used (also by the admin's own events).
-- 4. harvest_event_progress: joins at level 15; swiping over several fields ('fields') counts for harvesting, planting, watering
--    and care (it did not); the new goals count for the actions that move them. The live definitions are changed in place (only
--    these strings), so anything else in them stays as it is live.
-- Events already created keep their goals: the mix starts with the first slot not created yet.

create or replace function public.harvest_event_pick(n bigint) returns jsonb language plpgsql stable set search_path to '' as $f$
declare
 pool constant jsonb:='[
  [
   {"stat":"harvested","targets":[25,40,60],"titles":[["Harvest rush","Bring in the harvest together with farmers across the valley."],["Full barns","Field after field brought in, and every barn a little fuller."]]},
   {"stat":"planted","targets":[25,40,60],"titles":[["Sowing season","Fresh seed in every furrow, as fast as you can plant."],["Fresh furrows","Plant field after field before the rest of the valley."]]},
   {"stat":"watered","targets":[12,20,30],"titles":[["Green thumbs","Give your fields some extra love with water."],["Rain dance","No field goes thirsty today."]]},
   {"stat":"tended","targets":[8,12,18],"titles":[["Tender care","A little care makes every harvest bigger."],["Walk the rows","Look after every crop, row by row."]]},
   {"stat":"fertilized","targets":[3,5,8],"titles":[["Rich soil","Fertilize your fields for a faster harvest."],["Growing strong","A little fertilizer, a lot of growth."]]}
  ],
  [
   {"stat":"harvest_wheat","targets":[60,100,150],"titles":[["The wheat race","Every farm grows wheat. Bring in yours before the rest of the valley does."],["Golden fields","Wheat, wheat and more wheat."]]},
   {"stat":"harvest_corn","targets":[25,40,60],"titles":[["Corn country","Fill the barns with golden corn."],["Cob and kernel","Corn for the mill, the market and the hens."]]},
   {"stat":"harvest_lettuce","targets":[30,45,70],"titles":[["Salad days","Crisp lettuce for every kitchen in the village."],["Leafy greens","Quick lettuce, round after round."]]},
   {"stat":"harvest_barley","targets":[15,25,40],"titles":[["Amber waves","Fields of barley swaying in the valley wind."],["Barley bound","A sturdy crop for feed and flour."]]},
   {"stat":"harvest_greenbeans","targets":[8,12,18],"titles":[["Bean feast","Green beans by the basketful."],["Tall and green","Green beans for the market stalls."]]},
   {"stat":"harvest_cabbage","targets":[6,10,15],"titles":[["Cabbage patch","Big round cabbages for the village."],["Head start","Heads of cabbage, row after row."]]},
   {"stat":"harvest_cauliflower","targets":[6,10,15],"titles":[["Cauliflower crown","Plant early: white cauliflower for the whole valley."],["Snow-white heads","A slow crop worth the wait."]]}
  ],
  [
   {"stat":"made_eggs","targets":[24,36,54],"titles":[["The egg hunt","Keep the hens fed and the baskets full."],["Full nests","Every nest a little fuller."]]},
   {"stat":"made_feed","targets":[20,30,45],"titles":[["Feed the flock","The Feed Mill turns and the animals eat well."],["Mill day","Grind corn and barley into good animal feed."]]},
   {"stat":"made_milk","targets":[12,20,30],"titles":[["Milk run","Fresh milk from the Dairy Barn."],["Happy cows","Keep the cows fed and the pails full."]]},
   {"stat":"made_cheese","targets":[3,5,8],"titles":[["Cheese board","Turn fresh milk into farmhouse cheese."],["Say cheese","The Dairy Barn''s finest, wheel after wheel."]]},
   {"stat":"made_flour","targets":[16,32,56],"titles":[["Flour power","Keep the Windmill turning and the flour sacks full."],["Mill and grind","Grain in, flour out, all day long."]]},
   {"stat":"produced","targets":[5,8,12],"titles":[["Busy kitchens","Keep your buildings humming and collect fresh batches."],["Workshop rush","Batch after batch from every building."]]},
   {"stat":"made_grainmeal","targets":[6,12,18],"titles":[["Grind it out","Wheat and barley into grain meal at the Windmill."],["Sails turning","The Windmill never stops today."]]},
   {"stat":"made_bread","targets":[4,8,12],"titles":[["Fresh from the oven","Warm bread from the Bakery for the whole village."],["Bread and butter","Flour and milk into golden loaves."]]},
   {"stat":"parallel_batches","targets":[5,10,15],"titles":[["Full steam ahead","Start batches while others are still running."],["Many hands","Keep every slot of your buildings busy."]]}
  ],
  [
   {"stat":"sold","targets":[60,100,150],"titles":[["Market day","Fill the stalls and sell, sell, sell."],["Open stalls","The market is busy. Bring everything you can."]]},
   {"stat":"earned","targets":[700,1200,1800],"titles":[["Coin harvest","Earn coins at the market, with orders and with chores."],["Golden profits","A good day to fill the coin purse."]]},
   {"stat":"coins_spent","targets":[500,800,1200],"titles":[["Big spenders","Seeds, upgrades and new buildings: invest in your farm."],["Shopping spree","Put your coins to work on the farm."]]},
   {"stat":"diamonds_spent","targets":[10,20,40],"titles":[["Diamond day","Spend diamonds on boosts or on finishing fields and batches."],["Sparkle and shine","Let your diamonds do some of the work today."]]},
   {"stat":"boosts_used","targets":[1,1,2],"titles":[["Boost hour","Use a boost and make the most of it."],["Turbo farm","A boost to speed up the whole farm."]]}
  ],
  [
   {"stat":"chores","targets":[2,3,4],"titles":[["Helping hands","Lend a hand around the farm."],["Odd jobs","The little jobs that keep a farm running."]]},
   {"stat":"activities","targets":[3,5,8],"titles":[["A helping hand","Help at the greenhouse, the apiary, the paddock and the workshop."],["Around the farm","Lend a hand at every stop on the farm."]]},
   {"stat":"upgrades","targets":[1,2,3],"titles":[["Builders'' day","Make your buildings better and faster."],["Hammer time","Upgrade the buildings that work hardest for you."]]},
   {"stat":"activity_rounds","targets":[1,1,2],"titles":[["Grand tour","Help at all four stops for the round bonus."],["All around","The greenhouse, the apiary, the paddock and the workshop, in one round."]]}
  ]
 ]';
 r bigint[]:=array[]::bigint[]; i int; head int; rest int[]; g1 int; g2 int; sizes int[]; groups int[]; kind jsonb; picked jsonb:='[]'::jsonb; title jsonb; main jsonb;
begin
 for i in 1..8 loop r:=r||abs(hashtextextended('harvest-event-mix:'||n||':'||i,0)); end loop;
 head:=(n%5)::int;
 rest:=array_remove(array[0,1,2,3,4],head);
 g1:=rest[1+(r[1]%4)::int];rest:=array_remove(rest,g1);
 g2:=rest[1+(r[2]%3)::int];
 groups:=array[head,g1,g2];
 sizes:=case when r[3]%2=0 then array[2,1,0] else array[1,1,1] end;   -- index into targets: 0 easy, 1 medium, 2 hard
 for i in 1..3 loop
  kind:=(pool->groups[i])->((r[3+i]%jsonb_array_length(pool->groups[i]))::int);
  if i=1 then main:=kind; end if;
  picked:=picked||jsonb_build_array(jsonb_build_object('stat',kind->>'stat','target',(kind->'targets'->>sizes[i])::int));
 end loop;
 title:=main->'titles'->((r[7]%jsonb_array_length(main->'titles'))::int);
 return jsonb_build_object('title',title->>0,'description',title->>1,'objectives',picked);
end $f$;
revoke all on function public.harvest_event_pick(bigint) from public, anon, authenticated;

create or replace function public.harvest_event_schedule() returns void language plpgsql set search_path to '' as $f$
declare
 rewards constant jsonb:='{"coins":200,"diamondMin":1,"diamondMax":1,"participantStep":25,"poolCap":50}';
 slot bigint:=floor(extract(epoch from now())/21600)::bigint;
 ended uuid; n bigint; starts timestamptz; event_id uuid; t jsonb;
begin
 for ended in select e.id from public.live_events e where e.ends_at<=now() and e.settled_at is null loop
  perform public.harvest_event_settle(ended);
 end loop;
 for n in slot..slot+2 loop
  starts:=to_timestamp(n::bigint*21600);
  continue when starts+interval '5 hours'<=now();
  event_id:=md5('harvest-auto-event:'||n)::uuid;
  continue when exists(select 1 from public.live_events e where e.id=event_id);
  t:=public.harvest_event_pick(n);
  begin
   insert into public.live_events(id,title,description,starts_at,ends_at,active,objectives,rewards,created_by)
   values(event_id,t->>'title',t->>'description',starts,starts+interval '5 hours',true,t->'objectives',rewards,null);
  exception
   -- An operator's own active event already holds this time, or a parallel run just created the same slot.
   when raise_exception or unique_violation then null;
  end;
 end loop;
end $f$;

do $migration$
declare definition text; before text;
begin
 -- 3. The goals an event may use.
 definition:=pg_get_functiondef('public.harvest_event_validate()'::regprocedure);before:=definition;
 definition:=replace(definition,$s$'harvest_cabbage','made_eggs')$s$,$s$'harvest_cabbage','made_eggs','planted','sold','earned','coins_spent','diamonds_spent','activities','upgrades','made_feed','made_milk','made_cheese','made_flour','fertilized','harvest_cauliflower','made_grainmeal','made_bread','parallel_batches','boosts_used','activity_rounds')$s$);
 if definition=before then raise exception 'harvest_event_validate: the list of goals was not found'; end if;
 execute definition;
 -- 4. Level 15, swiping counts, the new goals count.
 definition:=pg_get_functiondef('public.harvest_event_progress()'::regprocedure);before:=definition;
 definition:=replace(definition,$s$level>=10) then return new;$s$,$s$level>=15) then return new;$s$);
 if definition=before then raise exception 'harvest_event_progress: the level gate was not found'; end if;before:=definition;
 definition:=replace(definition,$s$(stat in ('harvested','watered','tended') and action in ('field','tractor','collect_all'))$s$,$s$(stat in ('harvested','watered','tended','planted') and action in ('field','fields','tractor','collect_all'))$s$);
 if definition=before then raise exception 'harvest_event_progress: the field goals were not found'; end if;before:=definition;
 definition:=replace(definition,$s$(stat like 'harvest\_%' and action in ('field','tractor'))$s$,$s$(stat like 'harvest\_%' and action in ('field','fields','tractor'))$s$);
 if definition=before then raise exception 'harvest_event_progress: the crop goals were not found'; end if;before:=definition;
 definition:=replace(definition,$s$(stat like 'made\_%' and action in ('collect','collect_all'));$s$,$s$(stat like 'made\_%' and action in ('collect','collect_all'))
    or stat in ('sold','earned','coins_spent','diamonds_spent') or (stat in ('activities','activity_rounds') and action='activity_work') or (stat='upgrades' and action='upgrade')
    or (stat='fertilized' and action='fertilize') or (stat='parallel_batches' and action='produce') or (stat='boosts_used' and action='buy_boost');$s$);
 if definition=before then raise exception 'harvest_event_progress: the goods goals were not found'; end if;
 execute definition;
end
$migration$;
