-- Admin dashboard: every account in one answer (26 Oct 2026). farm-api read admin_player_accounts (admin-player-accounts-paging.sql)
-- a page of 1,000 at a time, and the database worked out every account again for each page (0.24 s a page for 9,000 accounts, about
-- ten pages every minute while the dashboard was open). That helped fill the database to 89% CPU on the evening the database stopped
-- answering. This one works the list out once and hands it back as one JSON array (PostgREST's 1,000-row cap is for rows, not for a
-- single value), in the same order. farm-api uses it when it is there and reads the pages as before when it is not, so the order of
-- release does not matter. Run in the SQL editor; running it again changes nothing.
create or replace function public.admin_player_accounts_all()
returns jsonb language sql stable security definer set search_path to '' as $f$
 select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc, a.player_id),'[]'::jsonb) from public.admin_player_accounts() a
$f$;
revoke all on function public.admin_player_accounts_all() from public, anon, authenticated;
grant execute on function public.admin_player_accounts_all() to service_role;
-- Check: select jsonb_array_length(public.admin_player_accounts_all());   -- about as many as auth.users
