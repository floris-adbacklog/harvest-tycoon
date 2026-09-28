-- The admin's powers only in a session signed in with Google (28 Sep 2026): millstone.nl is Google Workspace, with two-step
-- verification, so a stolen or guessed password alone no longer reaches the chat's staff tools. A password session of the same
-- account is an ordinary farmer's. The same rule is in farm-api (admin-service.js isSuperadmin). For another player (a message's
-- staff badge, "cannot be muted", the purchase alerts) the confirmed address alone still says admin.
-- This is the live chat_staff_role read on 28 Sep 2026 (md5 ca6b67c37f7de7d72a06d57afdf5716d) with only the session check added.
create or replace function public.chat_staff_role(p_player uuid) returns text language sql stable security definer set search_path to '' as $f$
 select case
  when exists(select 1 from auth.users u where u.id=p_player and lower(u.email)='floris@millstone.nl' and u.email_confirmed_at is not null)
   and (p_player is distinct from (select auth.uid()) or coalesce((select auth.jwt()->'amr') @> '[{"method":"oauth"}]'::jsonb,false)) then 'admin'
  when exists(select 1 from public.staff_roles s where s.player_id=p_player and s.role='moderator') then 'moderator'
  else null end
$f$;
revoke execute on function public.chat_staff_role(uuid) from public, anon, authenticated;
