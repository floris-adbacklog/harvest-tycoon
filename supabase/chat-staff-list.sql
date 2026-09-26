-- Who is on the staff, for the mark beside their name (26 Sep 2026): the admin shows as Admin, a moderator as Moderator, in the
-- chat, on profiles and on the leaderboard (src/staff-badge.js). Only player ids and roles; the rule for who is who stays in
-- chat_staff_role. A farmer's profile status also says which role they have.
create or replace function public.chat_staff_list()
 returns jsonb language sql stable security definer set search_path to '' as $function$
 select coalesce(jsonb_agg(jsonb_build_object('player_id',s.player_id,'role',s.role)),'[]'::jsonb)
 from (select ps.player_id,public.chat_staff_role(ps.player_id) as role from public.player_stats ps) s where s.role is not null
$function$;
revoke all on function public.chat_staff_list() from public, anon;
grant execute on function public.chat_staff_list() to authenticated;

-- chat_player_status: the role beside the old moderator flag (built on the live function, read on 26 Sep 2026).
do $migration$
declare definition text;
begin
 definition:=pg_get_functiondef('public.chat_player_status(uuid)'::regprocedure);
 if position('''role'',public.chat_staff_role(p_player)' in definition)=0 then
  definition:=replace(definition,'return jsonb_build_object(''moderator'',public.chat_staff_role(p_player) is not null,','return jsonb_build_object(''moderator'',public.chat_staff_role(p_player) is not null,''role'',public.chat_staff_role(p_player),');
  if position('''role'',public.chat_staff_role(p_player)' in definition)=0 then raise exception 'chat_player_status: the line to change was not found'; end if;
  execute definition;
 end if;
end
$migration$;
