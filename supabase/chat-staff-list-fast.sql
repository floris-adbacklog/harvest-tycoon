-- The staff list, fast (12 Oct 2026). chat_staff_list (supabase/chat-staff-list.sql) asked chat_staff_role about every farmer: 5,801 on
-- 12 Oct, 245 ms a call, about 1,300 calls a day (every game load and every leaderboard). Only the admin addresses and staff_roles can
-- give a role, so it now asks chat_staff_role only about those few (8 ms). The rule for who is who stays in chat_staff_role.
-- To find the admins without a second copy of their addresses, the two addresses move into one small function, harvest_admin_emails,
-- which chat_staff_role uses too: the database still lists them once. farm-api (admin-service.js SUPERADMINS) and the game
-- (src/player-profiles.js ADMIN_EMAILS) list the same two; tests/admins.test.mjs pins all three.
-- harvest_admin_emails is immutable, so the database reads the list once when it plans a query (and can use the email index).
create or replace function public.harvest_admin_emails()
 returns text[] language sql immutable set search_path to '' as $function$
 select array['floris@millstone.nl','harvesttycoon@gmail.com']
$function$;
revoke all on function public.harvest_admin_emails() from public, anon, authenticated;

-- chat_staff_role: only the address line, patched from the LIVE definition (read on 12 Oct 2026, md5 6b88b04c2dbde0750c2856eb26eca6a3).
-- A function patched already is left alone, one without the expected line stops the file. Re-runnable.
do $do$
declare def text:=pg_get_functiondef('public.chat_staff_role(uuid)'::regprocedure);
 old text:=$a$lower(u.email) in ('floris@millstone.nl','harvesttycoon@gmail.com')$a$;
begin
 if position('public.harvest_admin_emails()' in def)>0 then return; end if;
 if position(old in def)=0 then raise exception 'chat_staff_role: the expected text was not found; read the live definition before changing it'; end if;
 execute replace(def,old,$b$lower(u.email)=any(public.harvest_admin_emails())$b$);
end $do$;
revoke execute on function public.chat_staff_role(uuid) from public, anon, authenticated;

-- The same answer as before, still only farmers who have a farm (player_stats), each with chat_staff_role's own verdict.
create or replace function public.chat_staff_list()
 returns jsonb language sql stable security definer set search_path to '' as $function$
 select coalesce(jsonb_agg(jsonb_build_object('player_id',s.player_id,'role',s.role)),'[]'::jsonb)
 from (select c.player_id,public.chat_staff_role(c.player_id) as role from (
   select u.id as player_id from auth.users u where lower(u.email)=any(public.harvest_admin_emails())
   union select r.player_id from public.staff_roles r
  ) c where exists(select 1 from public.player_stats ps where ps.player_id=c.player_id)) s where s.role is not null
$function$;
revoke all on function public.chat_staff_list() from public, anon;
grant execute on function public.chat_staff_list() to authenticated;
