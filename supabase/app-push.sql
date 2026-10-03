-- Push notifications in our Android app (Oct 2026), through OneSignal: the same reminders and messages as the browser's push, with the
-- same switches (notification_settings), quiet hours and limits (notify-hourly). The app links each phone to the farmer itself
-- (OneSignal.login with the player id as external_id), so OneSignal finds every phone the farmer is signed in on by the player id;
-- notify-hourly sends with include_aliases.external_id. This table only says which farmers turned them on: on or off is the farmer's,
-- not a phone's, and no phone's push id is kept here (OneSignal has those).
--
-- A row is made by the farmer's own tap ("Turn on" in Settings, yes to the reminder question, "Remind me" under the daily gift) once the
-- phone allows notifications (src/app-push.js). Turning them off keeps the row, marked off, so they stay off on every phone. Signing out
-- in the app changes nothing here: the app unlinks that phone in OneSignal, and the farmer's other phones keep theirs.
-- Players can only READ their own row. Every write goes through the security-definer function below (validated, tied to auth.uid()),
-- as in supabase/notifications.sql.
--
-- Also: the three triggers that ask notify-hourly for a push only did so for farmers with a browser device (push_subscriptions); they
-- now also do for farmers with app push on. Each is patched from its LIVE definition (only the line named, so anything deployed since
-- stays as it is), as supabase/crazygames.sql does: a function patched already is left alone, and one that no longer has the expected
-- line stops the whole file, nothing half-done. Re-runnable.
-- Deploy notify-hourly before or after this file, in either order: without the table or without the secret ONESIGNAL_REST_API_KEY
-- it sends no app push and nothing fails.

create table if not exists public.app_push_players (
 player_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.app_push_players enable row level security;
revoke all on public.app_push_players from anon, authenticated;
grant select on public.app_push_players to authenticated;
drop policy if exists "players read their own app push" on public.app_push_players;
create policy "players read their own app push" on public.app_push_players for select to authenticated using (player_id = (select auth.uid()));

-- p_enabled true: the farmer turns them on (a phone that allows them asked; src/app-push.js). A farmer without saved reminder settings
-- gets the defaults, as one who allows browser push does (supabase/notification-defaults.sql), in the phone's time zone p_timezone (a
-- name the database knows, else UTC), so quiet hours and the 09:00 and 19:00 reminders follow the farmer's clock.
-- p_enabled false: off for the farmer, on every phone.
create or replace function public.app_push_save(p_enabled boolean, p_timezone text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_player uuid := (select auth.uid());
begin
 if v_player is null or coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Sign in to change notifications.' using errcode = '28000'; end if;
 if p_enabled is null then raise exception 'This device cannot receive notifications.' using errcode = '22023'; end if;
 insert into public.app_push_players as a (player_id, enabled) values (v_player, p_enabled)
  on conflict (player_id) do update set enabled = excluded.enabled, updated_at = now();
 if p_enabled then
  insert into public.notification_settings (player_id, timezone)
   values (v_player, case when p_timezone is not null and exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then p_timezone else 'UTC' end)
   on conflict (player_id) do nothing;
 end if;
end $$;

revoke all on function public.app_push_save(boolean, text) from public, anon;
grant execute on function public.app_push_save(boolean, text) to authenticated;

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
select pg_temp.app_push_patch('public.chat_dm_push()','app_push_players',
 $a$if not exists(select 1 from public.push_subscriptions p where p.player_id=other) then return null; end if;$a$,
 $b$if not exists(select 1 from public.push_subscriptions p where p.player_id=other)
  and not exists(select 1 from public.app_push_players a where a.player_id=other and a.enabled) then return null; end if;$b$);

-- 2. The Crew's messages (chat_crew_push, supabase/chat-crew-push.sql): every other member of the staff with a browser device or app push.
select pg_temp.app_push_patch('public.chat_crew_push()','app_push_players',
 $a$select distinct p.player_id,'crew',new.id,false,now() from public.push_subscriptions p$a$,
 $b$select distinct p.player_id,'crew',new.id,false,now() from (select player_id from public.push_subscriptions union select player_id from public.app_push_players where enabled) p$b$);

-- 3. An in-game purchase for the admin (harvest_purchase_alert, last in supabase/special-offer.sql and season-pass.sql).
select pg_temp.app_push_patch('public.harvest_purchase_alert()','app_push_players',
 $a$if exists(select 1 from public.push_subscriptions p where p.player_id=admin_id) then$a$,
 $b$if exists(select 1 from public.push_subscriptions p where p.player_id=admin_id)
   or exists(select 1 from public.app_push_players a where a.player_id=admin_id and a.enabled) then$b$);
