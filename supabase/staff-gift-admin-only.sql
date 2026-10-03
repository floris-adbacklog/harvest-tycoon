-- Only the admins send a gift (3 Oct 2026): Send a gift in the dashboard (coins and diamonds for everyone, the farmers active this
-- week, the farmers online now or one farmer) was for all staff; now only the admins (Gerard and Tony, supabase/admins.sql) give, and
-- a moderator is told "Not authorized." like any other farmer. The daily room (5 gifts, 50 diamonds, 1,000 coins or 50 per level)
-- stays the same, for both admins together. Gifts already sent are untouched: every farm still picks them up.
-- Patched from the LIVE definitions (read on 3 Oct 2026: staff_donate md5 fc8de5082f91006dbbcec7c266fb9453, staff-gift-message-admin.sql;
-- staff_donation_room md5 b881fe870bd96e4bb3887c5e81ad9f61), only the staff check: a function patched already is left alone, one
-- without the expected line stops the file. The same arguments, so the grants stay as they are. Re-runnable.
do $do$
declare donate text:=pg_get_functiondef('public.staff_donate(integer,integer,text,text,uuid,boolean)'::regprocedure);
 room text:=pg_get_functiondef('public.staff_donation_room()'::regprocedure);
begin
 if position($a$if public.chat_staff_role(me) is null then raise exception 'Not authorized.'$a$ in donate)>0 then
  execute replace(donate,$a$if public.chat_staff_role(me) is null then raise exception 'Not authorized.'$a$,
   $b$if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.'$b$);
 elsif position($b$if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.'$b$ in donate)=0 then
  raise exception 'staff_donate: the expected text was not found; read the live definition before changing it';
 end if;
 if position($a$if public.chat_staff_role((select auth.uid())) is null then raise exception 'Not authorized.'$a$ in room)>0 then
  execute replace(room,$a$if public.chat_staff_role((select auth.uid())) is null then raise exception 'Not authorized.'$a$,
   $b$if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.'$b$);
 elsif position($b$if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.'$b$ in room)=0 then
  raise exception 'staff_donation_room: the expected text was not found; read the live definition before changing it';
 end if;
end $do$;
