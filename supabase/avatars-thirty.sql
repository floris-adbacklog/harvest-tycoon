-- 30 new avatars (30 Oct 2026, the owner's pictures; public/player-avatars.js): ten level avatars every 20 levels from 120 to 300 and
-- twenty goal avatars (AVATAR_GOALS, each read from a counter the farm keeps; farm-api avatar-service.js checks it before it saves).
-- player_stats.avatar_id only takes known faces, so the 30 join the live list (read on 30 Oct 2026: it ends with 'lantern-keeper',
-- season-… ids pass by their own pattern). Re-runnable: a list that has them already is left alone; one without the expected end
-- stops the file. Run before the site release.
do $avatar$
declare definition text;
begin
 select pg_get_constraintdef(oid) into definition from pg_constraint where conrelid='public.player_stats'::regclass and conname='player_stats_avatar_id_check';
 if definition is null then raise exception 'player_stats_avatar_id_check not found'; end if;
 if position('''glasshouse-gardener''::text' in definition)>0 then return; end if;
 if position('''lantern-keeper''::text]' in definition)=0 then raise exception 'The avatar list was not where it was expected.'; end if;
 definition:=replace(definition,'''lantern-keeper''::text]','''lantern-keeper''::text, ''village-mayor''::text, ''stonemason''::text, ''silversmith''::text, ''mine-foreman''::text, ''harbour-pilot''::text, ''rope-maker''::text, ''galley-cook''::text, ''cooper''::text, ''harbour-master''::text, ''valley-admiral''::text, ''golden-harvester''::text, ''royal-baker''::text, ''egg-merchant''::text, ''tractor-ace''::text, ''moonlight-farmer''::text, ''pet-whisperer''::text, ''seal-friend''::text, ''master-angler''::text, ''heirloom-breeder''::text, ''gift-giver''::text, ''shipping-clerk''::text, ''fair-star''::text, ''giant-grower''::text, ''sea-captain''::text, ''water-bearer''::text, ''caretaker''::text, ''chore-champion''::text, ''delivery-driver''::text, ''miller''::text, ''glasshouse-gardener''::text]');
 execute 'alter table public.player_stats drop constraint player_stats_avatar_id_check';
 execute 'alter table public.player_stats add constraint player_stats_avatar_id_check '||definition;
end
$avatar$;
-- After-check: all 30 are in.
do $after$
declare definition text:=(select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.player_stats'::regclass and conname='player_stats_avatar_id_check');
begin
 if definition is null or position('''village-mayor''::text' in definition)=0 or position('''stonemason''::text' in definition)=0 or position('''silversmith''::text' in definition)=0 or position('''mine-foreman''::text' in definition)=0 or position('''harbour-pilot''::text' in definition)=0 or position('''rope-maker''::text' in definition)=0 or position('''galley-cook''::text' in definition)=0 or position('''cooper''::text' in definition)=0 or position('''harbour-master''::text' in definition)=0 or position('''valley-admiral''::text' in definition)=0 or position('''golden-harvester''::text' in definition)=0 or position('''royal-baker''::text' in definition)=0 or position('''egg-merchant''::text' in definition)=0 or position('''tractor-ace''::text' in definition)=0 or position('''moonlight-farmer''::text' in definition)=0 or position('''pet-whisperer''::text' in definition)=0 or position('''seal-friend''::text' in definition)=0 or position('''master-angler''::text' in definition)=0 or position('''heirloom-breeder''::text' in definition)=0 or position('''gift-giver''::text' in definition)=0 or position('''shipping-clerk''::text' in definition)=0 or position('''fair-star''::text' in definition)=0 or position('''giant-grower''::text' in definition)=0 or position('''sea-captain''::text' in definition)=0 or position('''water-bearer''::text' in definition)=0 or position('''caretaker''::text' in definition)=0 or position('''chore-champion''::text' in definition)=0 or position('''delivery-driver''::text' in definition)=0 or position('''miller''::text' in definition)=0 or position('''glasshouse-gardener''::text' in definition)=0 then raise exception 'The avatar list was not where it was expected.'; end if;
end
$after$;
