-- A second admin (3 Oct 2026): the owner's brother, harvesttycoon@gmail.com (farmer Gerard), with exactly the owner's rules. The admin
-- powers need a session signed in with Google (supabase/admin-google-only.sql); for another player (a message's staff badge, "cannot be
-- muted", the purchase alerts, which go to every admin) the confirmed address alone says admin. Every staff check in the database goes
-- through chat_staff_role, so this one line is all the database needs; farm-api (admin-service.js SUPERADMINS) and the game
-- (src/player-profiles.js ADMIN_EMAILS) list the same two addresses, and farm-api locks playing on both accounts.
-- Patched from the LIVE definition (read on 3 Oct 2026, md5 2dfab064cffd0feed93804c3ef105e04), only the address line: a function patched
-- already is left alone, one without the expected line stops the file. Re-runnable.
do $do$
declare def text:=pg_get_functiondef('public.chat_staff_role(uuid)'::regprocedure);
begin
 if position('harvesttycoon@gmail.com' in def)>0 then return; end if;
 if position($a$lower(u.email)='floris@millstone.nl'$a$ in def)=0 then raise exception 'chat_staff_role: the expected text was not found; read the live definition before changing it'; end if;
 execute replace(def,$a$lower(u.email)='floris@millstone.nl'$a$,$b$lower(u.email) in ('floris@millstone.nl','harvesttycoon@gmail.com')$b$);
end $do$;
revoke execute on function public.chat_staff_role(uuid) from public, anon, authenticated;
