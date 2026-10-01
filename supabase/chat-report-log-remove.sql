-- The admin (not the moderators) can take a handled report out of the Report log (1 Oct 2026): every report of that message goes,
-- so it no longer counts on that farmer's details in the dashboard either. The chat message itself is not touched. An open report
-- is handled first, under Chat reports (Delete or Nothing wrong), so nothing waiting for the staff disappears.
create or replace function public.chat_mod_log_remove(p_message uuid) returns integer language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid()); n integer;
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if exists(select 1 from public.chat_reports r where r.message_id=p_message and r.resolved_at is null) then raise exception 'Handle this report first.' using errcode='22023'; end if;
 delete from public.chat_reports where message_id=p_message;
 get diagnostics n=row_count;
 return n;
end $f$;
revoke all on function public.chat_mod_log_remove(uuid) from public, anon;
grant execute on function public.chat_mod_log_remove(uuid) to authenticated;
