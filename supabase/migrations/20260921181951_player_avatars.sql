-- Free cosmetic avatar IDs; no balances, farm timers or payment rules change.
alter table public.player_stats add column avatar_id text not null default 'default';
alter table public.player_stats add constraint player_stats_avatar_id_check check (avatar_id in ('default','orchard-grower','field-keeper','berry-gardener','mill-worker','sunflower-grower','village-gardener','old-hand','greenhouse-grower','beekeeper','market-gardener','dairy-farmer','meadow-keeper','apple-picker','herb-gardener','barn-builder','flower-grower','harvest-helper','valley-grower','orchard-veteran','farm-mechanic'));

-- Extend the current live family projection without rebuilding any farm/payment function.
do $avatar$
declare definition text; needle text := '''vip_expires_at'',p.vip_expires_at'; replacement text := '''vip_expires_at'',p.vip_expires_at,''avatar_id'',p.avatar_id';
begin
 select pg_get_functiondef('public.harvest_family_context(uuid,uuid)'::regprocedure) into definition;
 if position(needle in definition)=0 then raise exception 'Family projection changed; inspect the live function before applying this migration.'; end if;
 execute replace(definition,needle,replacement);
end
$avatar$;
-- Existing RLS remains: authenticated users read public profiles; only the server writes.
