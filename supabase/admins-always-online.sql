-- Tony and Gerard, the two admin accounts, always show as online (23 Oct 2026, the owner: "Zet Tony en Gerard (admins) altijd online";
-- they never play, so no farm action stamps their last_active_at). Every status in the game reads player_stats.last_active_at against
-- 30 minutes (farm-api presence.js ONLINE_WINDOW, the chat and the admin counts), so a stamp every 10 minutes keeps both online
-- everywhere. Their player ids: Tony e8e4c7c3-…, Gerard c1194a46-… (the admin addresses' accounts, supabase/admins.sql).
-- They also count in "online" totals and audiences (+2), which the owner accepts.
create or replace function public.harvest_admins_online() returns void language sql security definer set search_path to '' as $$
 update public.player_stats set last_active_at=now()
 where player_id in ('e8e4c7c3-c06f-408c-9fe6-1cfa7d2b3ae8','c1194a46-dfdf-47f7-abd2-c59279681702');
$$;
revoke all on function public.harvest_admins_online() from public, anon, authenticated;
select cron.unschedule('harvest-admins-online') where exists (select 1 from cron.job where jobname='harvest-admins-online');
select cron.schedule('harvest-admins-online','*/10 * * * *','select public.harvest_admins_online()');
select public.harvest_admins_online();
select username, last_active_at from public.player_stats where player_id in ('e8e4c7c3-c06f-408c-9fe6-1cfa7d2b3ae8','c1194a46-dfdf-47f7-abd2-c59279681702');
