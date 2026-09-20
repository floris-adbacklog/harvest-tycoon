-- Reminders and daily email summary: preferences, push subscriptions and per-player send state.
--
-- Everything is opt-in: a player without a row in notification_settings has every reminder switched off.
-- Players can only READ their own settings and subscriptions. Every write goes through the security-definer
-- functions below (validated, tied to auth.uid()), so a client can never edit another player's rows or
-- set a value the rules do not allow. notification_state is server-only (RLS on, no policies).
create table if not exists public.notification_settings (
 player_id uuid primary key references auth.users(id) on delete cascade,
 push_crops boolean not null default false,
 push_production boolean not null default false,
 push_daily boolean not null default false,
 email_digest boolean not null default false,
 digest_hour smallint not null default 9 check (digest_hour between 0 and 23),
 timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
 unsubscribe_token uuid not null default gen_random_uuid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists notification_settings_unsubscribe_token_key on public.notification_settings (unsubscribe_token);
alter table public.notification_settings enable row level security;
drop policy if exists "players read their own notification settings" on public.notification_settings;
create policy "players read their own notification settings" on public.notification_settings for select to authenticated using (player_id = (select auth.uid()));

create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 2048),
 p256dh text not null check (char_length(p256dh) between 1 and 256),
 auth text not null check (char_length(auth) between 1 and 256),
 user_agent text check (char_length(user_agent) <= 300),
 created_at timestamptz not null default now(),
 last_success_at timestamptz,
 failures smallint not null default 0
);
create index if not exists push_subscriptions_player_idx on public.push_subscriptions (player_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "players read their own push subscriptions" on public.push_subscriptions;
create policy "players read their own push subscriptions" on public.push_subscriptions for select to authenticated using (player_id = (select auth.uid()));

-- What the hourly job has already looked at or sent, per player. Never readable by clients.
create table if not exists public.notification_state (
 player_id uuid primary key references auth.users(id) on delete cascade,
 crops_seen_at bigint,
 production_seen_at bigint,
 last_push_at timestamptz,
 push_day date,
 push_count smallint not null default 0,
 daily_morning_on date,
 daily_evening_on date,
 digest_on date,
 updated_at timestamptz not null default now()
);
alter table public.notification_state enable row level security;

create or replace function public.notification_save(p_push_crops boolean, p_push_production boolean, p_push_daily boolean, p_email_digest boolean, p_digest_hour integer, p_timezone text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_player uuid := (select auth.uid());
begin
 if v_player is null or coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Sign in to change reminders.' using errcode = '28000'; end if;
 if p_digest_hour is null or p_digest_hour < 0 or p_digest_hour > 23 then raise exception 'Choose an hour between 0 and 23.' using errcode = '22023'; end if;
 if p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then raise exception 'Unknown time zone.' using errcode = '22023'; end if;
 insert into public.notification_settings as s (player_id, push_crops, push_production, push_daily, email_digest, digest_hour, timezone)
  values (v_player, coalesce(p_push_crops, false), coalesce(p_push_production, false), coalesce(p_push_daily, false), coalesce(p_email_digest, false), p_digest_hour, p_timezone)
  on conflict (player_id) do update set push_crops = excluded.push_crops, push_production = excluded.push_production, push_daily = excluded.push_daily,
   email_digest = excluded.email_digest, digest_hour = excluded.digest_hour, timezone = excluded.timezone, updated_at = now();
end $$;

create or replace function public.notification_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_player uuid := (select auth.uid());
begin
 if v_player is null or coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Sign in to turn on notifications.' using errcode = '28000'; end if;
 -- A browser keeps one endpoint. If another player signed in on the same device earlier, it moves to this player.
 insert into public.push_subscriptions as p (player_id, endpoint, p256dh, auth, user_agent)
  values (v_player, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update set player_id = excluded.player_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent, failures = 0;
 -- At most five devices per player: the oldest ones make room.
 delete from public.push_subscriptions where player_id = v_player and id not in (select id from public.push_subscriptions where player_id = v_player order by created_at desc limit 5);
end $$;

create or replace function public.notification_unsubscribe(p_endpoint text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_player uuid := (select auth.uid());
begin
 if v_player is null or coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Sign in to change notifications.' using errcode = '28000'; end if;
 delete from public.push_subscriptions where endpoint = p_endpoint and player_id = v_player;
end $$;

revoke all on function public.notification_save(boolean, boolean, boolean, boolean, integer, text) from public, anon;
revoke all on function public.notification_subscribe(text, text, text, text) from public, anon;
revoke all on function public.notification_unsubscribe(text) from public, anon;
grant execute on function public.notification_save(boolean, boolean, boolean, boolean, integer, text) to authenticated;
grant execute on function public.notification_subscribe(text, text, text, text) to authenticated;
grant execute on function public.notification_unsubscribe(text) to authenticated;
