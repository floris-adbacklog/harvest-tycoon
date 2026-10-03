-- The admins are level 999 (3 Oct 2026): an admin account plays nothing (farm-api locks every action) and now opens a showcase farm
-- at level 999 with the staff's own topbar and menu (farm-state.js createShowcaseFarm, src/admin-view.js). What other farmers see of an
-- admin (a profile, the player search, the mention list, family members, a new chat message, the dashboard's lists) reads
-- player_stats.level, so this sets it to 999 there too. No leaderboard shows it: every board leaves the admins out (src/leaderboard.js
-- boardAdmins). An admin's load no longer saves the farm and the dashboard sends no gifts to an admin account (admin-service.js), so
-- nothing sets it back; the real farm (player_farms) is untouched.
-- The admins are whoever the database's one staff check calls admin (chat_staff_role: Tony and Gerard, supabase/admins.sql); run here,
-- in the SQL editor, there is no session, so the confirmed address alone decides. Re-runnable: an admin at 999 already is left alone.
update public.player_stats set level=999 where public.chat_staff_role(player_id)='admin' and level is distinct from 999;
select player_id,username,level from public.player_stats where public.chat_staff_role(player_id)='admin';
