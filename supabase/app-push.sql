-- Push notifications in our Android app (Oct 2026), through OneSignal: the same reminders and messages as the browser's push, with the
-- same switches (notification_settings), quiet hours and limits (notify-hourly). The app links the phone to the farmer itself
-- (OneSignal.login with the player id as external_id), so OneSignal finds every phone the farmer is signed in on by the player id;
-- notify-hourly sends with include_aliases.external_id. This table only says which farmers turned them on, and with which phone.
--
-- A row is made only by the farmer's own tap ("Turn on" in Settings, yes to the reminder question, "Remind me" under the daily gift)
-- once the phone allows notifications (src/app-push.js). On or off is the farmer's (OneSignal reaches all their phones alike): turning
-- them off switches every row of the farmer off and keeps the rows, so they stay off; signing out in the app forgets that phone.
-- Players can only READ their own rows. Every write goes through the two security-definer functions below (validated, tied to
-- auth.uid()), as in supabase/notifications.sql.
--
-- Also: the three triggers that ask notify-hourly for a push only did so for farmers with a browser device (push_subscriptions); they
-- now also do for farmers with app push on. Each is patched from its LIVE definition (only the line named, so anything deployed since
-- stays as it is), as supabase/crazygames.sql does: a function patched already is left alone, and one that no longer has the expected
-- line stops the whole file, nothing half-done. Re-runnable.
-- Deploy notify-hourly before or after this file, in either order: without the table or without the secret ONESIGNAL_REST_API_KEY
-- it sends no app push and nothing fails.

create table if not exists public.app_push_devices (
 subscription_id text primary key check (subscription_id ~ '^[A-Za-z0-9._:-]{8,128}$'),
 player_id uuid not null references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 platform text not null default 'android' check (platform in ('android')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists app_push_devices_player_idx on public.app_push_devices (player_id);
alter table public.app_push_devices enable row level security;
revoke all on public.app_push_devices from anon, authenticated;
grant select on public.app_push_devices to authenticated;
drop policy if exists "players read their own app push devices" on public.app_push_devices;
create policy "players read their own app push devices" on public.app_push_devices for select to authenticated using (player_id = (select auth.uid()));

-- p_enabled true: this phone (its OneSignal subscription id) turns them on for the farmer. A phone keeps one subscription: if another
-- farmer turned them on with it earlier, it moves to this farmer. At most five phones per farmer: the oldest make room. A farmer
-- without saved reminder settings gets the defaults, as one who allows browser push does (supabase/notification-defaults.sql).
-- p_enabled false: off for the farmer, on every phone (the subscription id may then be left out).
create or replace function public.app_push_save(p_subscription_id text, p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_player uuid := (select auth.uid());
begin
 if v_player is null or coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Sign in to change notifications.' using errcode = '28000'; end if;
 if p_enabled is null then raise exception 'This device cannot receive notifications.' using errcode = '22023'; end if;
 if not p_enabled then
  update public.app_push_devices set enabled = false, updated_at = now() where player_id = v_player and enabled;
  return;
 end if;
 if p_subscription_id is null or p_subscription_id !~ '^[A-Za-z0-9._:-]{8,128}$' then raise exception 'This device cannot receive notifications.' using errcode = '22023'; end if;
 insert into public.app_push_devices as d (subscription_id, player_id, enabled)
  values (p_subscription_id, v_player, true)
  on conflict (subscription_id) do update set player_id = excluded.player_id, enabled = true, updated_at = now();
 update public.app_push_devices set enabled = true, updated_at = now() where player_id = v_player and not enabled;
 delete from public.app_push_devices where player_id = v_player and subscription_id not in
  (select subscription_id from public.app_push_devices where player_id = v_player order by subscription_id = p_subscription_id desc, updated_at desc limit 5);
 insert into public.notification_settings (player_id) values (v_player) on conflict (player_id) do nothing;
end $$;

-- Signing out in the app: this phone no longer gets the farmer's notifications (the app also unlinks it from the farmer in OneSignal).
create or replace function public.app_push_forget(p_subscription_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_player uuid := (select auth.uid());
begin
 if v_player is null or coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Sign in to change notifications.' using errcode = '28000'; end if;
 delete from public.app_push_devices where subscription_id = p_subscription_id and player_id = v_player;
end $$;

revoke all on function public.app_push_save(text, boolean) from public, anon;
revoke all on function public.app_push_forget(text) from public, anon;
grant execute on function public.app_push_save(text, boolean) to authenticated;
grant execute on function public.app_push_forget(text) to authenticated;

-- Patches one function from its live definition: nothing when p_marker shows it is done already, an error when p_from is missing.
create or replace function pg_temp.app_push_patch(p_fn regprocedure, p_marker text, p_from text, p_to text)
returns void language plpgsql as $f$
declare def text:=pg_get_functiondef(p_fn);
begin
 if position(p_marker in def)>0 then return; end if;
 if position(p_from in def)=0 then raise exception using message=format('%s: the expected text was not found; read the live definition before changing it', p_fn); end if;
 execute replace(def,p_from,p_to);
end $f$;

-- 1. A private message (chat_dm_push, supabase/chat.sql and chat-broadcast-dm.sql): also for a farmer with app push on.
select pg_temp.app_push_patch('public.chat_dm_push()','app_push_devices',
 $a$if not exists(select 1 from public.push_subscriptions p where p.player_id=other) then return null; end if;$a$,
 $b$if not exists(select 1 from public.push_subscriptions p where p.player_id=other)
  and not exists(select 1 from public.app_push_devices a where a.player_id=other and a.enabled) then return null; end if;$b$);

-- 2. The Crew's messages (chat_crew_push, supabase/chat-crew-push.sql): every other member of the staff with a browser device or app push.
select pg_temp.app_push_patch('public.chat_crew_push()','app_push_devices',
 $a$select distinct p.player_id,'crew',new.id,false,now() from public.push_subscriptions p$a$,
 $b$select distinct p.player_id,'crew',new.id,false,now() from (select player_id from public.push_subscriptions union select player_id from public.app_push_devices where enabled) p$b$);

-- 3. An in-game purchase for the admin (harvest_purchase_alert, last in supabase/special-offer.sql and season-pass.sql).
select pg_temp.app_push_patch('public.harvest_purchase_alert()','app_push_devices',
 $a$if exists(select 1 from public.push_subscriptions p where p.player_id=admin_id) then$a$,
 $b$if exists(select 1 from public.push_subscriptions p where p.player_id=admin_id)
   or exists(select 1 from public.app_push_devices a where a.player_id=admin_id and a.enabled) then$b$);
