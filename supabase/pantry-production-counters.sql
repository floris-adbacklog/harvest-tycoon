-- Nine additional production counters; existing harvest counters and permissions are preserved.
begin;
CREATE OR REPLACE FUNCTION public.harvest_public_metrics(farm jsonb)
 RETURNS TABLE(harvested_wheat bigint, harvested_corn bigint, harvested_barley bigint, harvested_lettuce bigint, harvested_cabbage bigint, harvested_cauliflower bigint, harvested_pumpkin bigint, harvested_redcabbage bigint, harvested_sunflower bigint, harvested_crops bigint, badges integer, deliveries integer, goods_produced bigint, items_sold bigint)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select coalesce((farm#>>'{stats,harvest_wheat}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_corn}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_barley}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_lettuce}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_cabbage}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_cauliflower}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_pumpkin}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_redcabbage}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_sunflower}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_wheat}')::bigint,0)+coalesce((farm#>>'{stats,harvest_corn}')::bigint,0)+coalesce((farm#>>'{stats,harvest_barley}')::bigint,0)+coalesce((farm#>>'{stats,harvest_lettuce}')::bigint,0)+coalesce((farm#>>'{stats,harvest_cabbage}')::bigint,0)+coalesce((farm#>>'{stats,harvest_cauliflower}')::bigint,0)+coalesce((farm#>>'{stats,harvest_pumpkin}')::bigint,0)+coalesce((farm#>>'{stats,harvest_redcabbage}')::bigint,0)+coalesce((farm#>>'{stats,harvest_sunflower}')::bigint,0)+coalesce((farm#>>'{stats,harvest_apples}')::bigint,0)+coalesce((farm#>>'{stats,harvest_berries}')::bigint,0)+coalesce((farm#>>'{stats,harvest_greenbeans}')::bigint,0),
  coalesce(jsonb_array_length(farm#>'{mastery,claimed}'),0),
  coalesce((farm#>>'{stats,deliveries}')::integer,0),
  coalesce((farm#>>'{stats,made_honey}')::bigint,0)+coalesce((farm#>>'{stats,made_grainmeal}')::bigint,0)+coalesce((farm#>>'{stats,made_fertilizer}')::bigint,0)+coalesce((farm#>>'{stats,made_salad}')::bigint,0)+coalesce((farm#>>'{stats,made_pickles}')::bigint,0)+coalesce((farm#>>'{stats,made_flour}')::bigint,0)+coalesce((farm#>>'{stats,made_feed}')::bigint,0)+coalesce((farm#>>'{stats,made_oil}')::bigint,0)+coalesce((farm#>>'{stats,made_milk}')::bigint,0)+coalesce((farm#>>'{stats,made_eggs}')::bigint,0)+coalesce((farm#>>'{stats,made_cheese}')::bigint,0)+coalesce((farm#>>'{stats,made_bread}')::bigint,0)+coalesce((farm#>>'{stats,made_pie}')::bigint,0)+coalesce((farm#>>'{stats,made_vegetables}')::bigint,0)+coalesce((farm#>>'{stats,made_stew}')::bigint,0)+coalesce((farm#>>'{stats,made_applejuice}')::bigint,0)+coalesce((farm#>>'{stats,made_applepie}')::bigint,0)+coalesce((farm#>>'{stats,made_berrypreserves}')::bigint,0)+coalesce((farm#>>'{stats,made_berrytart}')::bigint,0)+coalesce((farm#>>'{stats,made_orchardjuice}')::bigint,0)+coalesce((farm#>>'{stats,made_berrysmoothie}')::bigint,0)+coalesce((farm#>>'{stats,made_applecompote}')::bigint,0)+coalesce((farm#>>'{stats,made_applevinegar}')::bigint,0)+coalesce((farm#>>'{stats,made_pickledbeans}')::bigint,0)+coalesce((farm#>>'{stats,made_beangratin}')::bigint,0)+coalesce((farm#>>'{stats,made_orchardsalad}')::bigint,0)+coalesce((farm#>>'{stats,made_berrycheesecake}')::bigint,0)+coalesce((farm#>>'{stats,made_harvesthamper}')::bigint,0),
  coalesce((farm#>>'{stats,sold}')::bigint,0);
$function$
;
revoke execute on function public.harvest_public_metrics(jsonb) from public,anon,authenticated;
grant execute on function public.harvest_public_metrics(jsonb) to service_role;
commit;

