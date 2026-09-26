-- Crops & goods ready (26 Sep 2026): one switch in the game for both settings, on by default like private messages and the daily
-- gift, and one plain push at most once an hour (notify-hourly/rules.js). Farmers who switched both off keep that choice.
alter table public.notification_settings alter column push_crops set default true, alter column push_production set default true;
-- One switch: where one of the two was on, both are now.
update public.notification_settings set push_crops=true, push_production=true, updated_at=now() where push_crops<>push_production;
-- A farmer who allowed notifications but never saved a setting had no row, and so got no reminder at all: the defaults now. (The game
-- now saves the settings as soon as notifications are allowed; its time zone arrives with the next save.)
insert into public.notification_settings(player_id)
 select distinct p.player_id from public.push_subscriptions p
 where not exists(select 1 from public.notification_settings s where s.player_id=p.player_id)
   and exists(select 1 from public.player_stats ps where ps.player_id=p.player_id)
 on conflict (player_id) do nothing;
