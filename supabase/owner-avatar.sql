-- The admin's own avatar, "owner" (27 Sep 2026): player_stats.avatar_id only takes known avatars, so owner joins the list. Only the
-- admin account can choose it (avatar-service.js); other farmers keep the 40. Built on the live check, whatever it lists today.
do $avatar$
declare definition text;
begin
 select pg_get_constraintdef(oid) into definition from pg_constraint where conrelid='public.player_stats'::regclass and conname='player_stats_avatar_id_check';
 if definition is null then raise exception 'player_stats_avatar_id_check not found'; end if;
 if position('''owner''::text' in definition)>0 then return; end if;
 definition:=replace(definition,'ARRAY[''default''::text,','ARRAY[''default''::text, ''owner''::text,');
 if position('''owner''::text' in definition)=0 then raise exception 'The avatar list was not where it was expected.'; end if;
 execute 'alter table public.player_stats drop constraint player_stats_avatar_id_check';
 execute 'alter table public.player_stats add constraint player_stats_avatar_id_check '||definition;
end
$avatar$;
