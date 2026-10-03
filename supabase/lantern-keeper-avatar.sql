-- The Lantern keeper (4 Oct 2026): the paid Halloween Pass brings this face (public/player-avatars.js, its goal 'Get the Halloween Pass';
-- farm-api avatar-service.js checks the farm's own state.passPremium before it saves it). player_stats.avatar_id only takes known faces,
-- so 'lantern-keeper' joins the live list (read on 4 Oct 2026: the 40 of the game plus 'owner' and 'gerard', supabase/gerard.sql).
-- Re-runnable: a list that has it already is left alone; one without the expected end stops the file.
do $avatar$
declare definition text;
begin
 select pg_get_constraintdef(oid) into definition from pg_constraint where conrelid='public.player_stats'::regclass and conname='player_stats_avatar_id_check';
 if definition is null then raise exception 'player_stats_avatar_id_check not found'; end if;
 if position('''lantern-keeper''::text' in definition)>0 then return; end if;
 if position('''valley-regular''::text]' in definition)=0 then raise exception 'The avatar list was not where it was expected.'; end if;
 definition:=replace(definition,'''valley-regular''::text]','''valley-regular''::text, ''lantern-keeper''::text]');
 execute 'alter table public.player_stats drop constraint player_stats_avatar_id_check';
 execute 'alter table public.player_stats add constraint player_stats_avatar_id_check '||definition;
end
$avatar$;
