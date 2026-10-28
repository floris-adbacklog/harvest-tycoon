-- The Donkey Stable (level 64, 27 Oct 2026): donkey milk, the Craft Workshop's donkey milk soap (64) and bath basket (77), and the
-- Dairy Barn's donkey cheese (69).
-- 1. Family sharing: all four can be gifted and requested like every other farm item (63 items). Only harvest_social's items list
--    changes; limits, checks and the reply stay as they are. tests/family-sharing.test.mjs keeps this list equal to the game's items.
-- 2. Leaderboards: all four count toward "goods produced" (harvest_public_metrics). Their own boards need nothing: goods_made collects
--    every made_* count by itself (leaderboard-goods.sql).
-- Guarded by the md5 of the live bodies on 27 Oct 2026 (harvest_social 137d9207549af3384eb0c42175440e13, harvest_public_metrics
-- 619356d3d99564e95d1906b00fdddd1d): if either changed since, nothing runs. One transaction. Run before the farm-api release.
-- Run live by the owner on 27 Oct 2026: harvest_social is now df78bb5b9275602b1ca35e4422026217, harvest_public_metrics ce8c8cc7daf9daa798a71d81a69e5e0b.
begin;
do $migration$
declare
 social text; metrics text; social_body text; metrics_body text;
 new_items constant text:='items constant text[]:=array[''corn'',''wheat'',''cabbage'',''pumpkin'',''sunflower'',''barley'',''lettuce'',''redcabbage'',''cauliflower'',''greenbeans'',''apples'',''berries'',''squash'',''polebeans'',''ciderapples'',''cherries'',''honey'',''grainmeal'',''fertilizer'',''salad'',''pickles'',''flour'',''feed'',''oil'',''milk'',''eggs'',''cheese'',''bread'',''pie'',''vegetables'',''applejuice'',''applepie'',''berrypreserves'',''berrytart'',''stew'',''orchardjuice'',''berrysmoothie'',''applecompote'',''applevinegar'',''pickledbeans'',''beangratin'',''orchardsalad'',''berrycheesecake'',''harvesthamper'',''squashsoup'',''beeswax'',''wool'',''yarn'',''cloth'',''cider'',''goatmilk'',''goatcheese'',''truffles'',''truffleomelette'',''candles'',''blanket'',''cherryjam'',''cherrypie'',''prizeproduce'',''donkeymilk'',''donkeymilksoap'',''donkeycheese'',''bathbasket'']';
 old_items constant text:='''cherrypie'',''prizeproduce'']';
 old_goods constant text:='+coalesce((farm#>>''{stats,made_truffleomelette}'')::bigint,0),';
 new_goods constant text:='+coalesce((farm#>>''{stats,made_truffleomelette}'')::bigint,0)+coalesce((farm#>>''{stats,made_donkeymilk}'')::bigint,0)+coalesce((farm#>>''{stats,made_donkeymilksoap}'')::bigint,0)+coalesce((farm#>>''{stats,made_donkeycheese}'')::bigint,0)+coalesce((farm#>>''{stats,made_bathbasket}'')::bigint,0),';
begin
 select p.prosrc into social_body from pg_proc p where p.oid='public.harvest_social(uuid,jsonb,uuid)'::regprocedure;
 select p.prosrc into metrics_body from pg_proc p where p.oid='public.harvest_public_metrics(jsonb)'::regprocedure;
 if md5(social_body)<>'137d9207549af3384eb0c42175440e13' then raise exception 'harvest_social changed since 27 Oct 2026: check it first'; end if;
 if md5(metrics_body)<>'619356d3d99564e95d1906b00fdddd1d' then raise exception 'harvest_public_metrics changed since 27 Oct 2026: check it first'; end if;
 social:=pg_get_functiondef('public.harvest_social(uuid,jsonb,uuid)'::regprocedure);
 if (length(social)-length(replace(social,old_items,'')))/length(old_items)<>1 then raise exception 'harvest_social: the items list was not found once'; end if;
 social:=regexp_replace(social,'items constant text\[\]:=array\[[^\]]*\]',replace(new_items,'\','\\'));
 if position('''bathbasket'']' in social)=0 then raise exception 'harvest_social: the new list did not go in'; end if;
 execute social;
 metrics:=pg_get_functiondef('public.harvest_public_metrics(jsonb)'::regprocedure);
 if (length(metrics)-length(replace(metrics,old_goods,'')))/length(old_goods)<>1 then raise exception 'harvest_public_metrics: the goods sum was not found once'; end if;
 metrics:=replace(metrics,old_goods,new_goods);
 execute metrics;
end
$migration$;
-- Both bodies after the change (the reply shows them: compare with the md5s in the release notes).
select p.proname,md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('harvest_social','harvest_public_metrics') order by 1;
commit;
