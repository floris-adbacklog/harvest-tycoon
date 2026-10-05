-- Pop-ups and News (5 Oct 2026): the button can open the Feedback window too (screen:feedback), next to the other game screens
-- (src/popup-ui.js POPUP_SCREENS). The table's check and popup_post's own check both learn it. popup_post is changed in place from its
-- LIVE definition (only that list), so nothing else in it can go back to an older copy; it stops if the list is not as expected.
-- Re-runnable.
alter table public.popups drop constraint if exists popups_button_target_check;
alter table public.popups add constraint popups_button_target_check check (button_target is null or (char_length(button_target)<=300 and button_target ~ '^(screen:(install|today|events|leaderboard|chat|shop|family|wiki|feedback)|https://[^[:space:]<>"]+)$'));
do $patch$
declare d text;old text:='screen:(install|today|events|leaderboard|chat|shop|family|wiki)';new text:='screen:(install|today|events|leaderboard|chat|shop|family|wiki|feedback)';
begin
 select pg_get_functiondef(p.oid) into strict d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='popup_post';
 if position(new in d)>0 then return; end if;
 if (length(d)-length(replace(d,old,'')))/length(old)<>1 then raise exception 'popup_post is not as expected: add feedback to its screen list by hand'; end if;
 execute replace(d,old,new);
end $patch$;
-- Check: select pg_get_constraintdef(oid) from pg_constraint where conname='popups_button_target_check'; -- ... |wiki|feedback) ...
