-- New private messages and the daily gift & streak reminder are on by default for everyone (25 Sep 2026); crops, production and
-- the email summary stay off. Push itself still needs each farmer's yes on their device (push_subscriptions).
alter table public.notification_settings alter column push_daily set default true, alter column push_messages set default true;
update public.notification_settings set push_daily=true, push_messages=true, updated_at=now() where not (push_daily and push_messages);
-- A farmer who allowed push on a device but never opened the settings gets the defaults too.
insert into public.notification_settings(player_id)
 select distinct s.player_id from public.push_subscriptions s
 where not exists(select 1 from public.notification_settings n where n.player_id=s.player_id)
 on conflict do nothing;
