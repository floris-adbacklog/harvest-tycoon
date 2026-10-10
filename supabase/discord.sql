-- Discord accounts (Oct 2026, the first Discord Activity: Discord's log-in only, nothing for sale, no linking). Every player of the
-- Activity plays on an ordinary Supabase account made by the discord-auth Edge Function (supabase/functions/discord-auth), with a
-- made-up address on players.harvesttycoon.com that has no mailbox and is never mailed. app_metadata.portal='discord' marks such an
-- account everywhere. There are no Discord guests. The world is shared with harvesttycoon.com, CrazyGames and Kongregate: same
-- leaderboards, families, events and chat.
-- Paste it as it is in the SQL editor. Re-runnable: the table is made if missing, and every existing function is patched from its LIVE
-- definition (only the line named, so anything deployed since stays as it is); a function that is patched already is left alone, and
-- one that no longer has the expected line once stops the whole file, nothing half-done. The lines looked for were read from the live
-- database on 10 Oct 2026. Each patch keeps the texts crazygames.sql and kongregate.sql look for, so those files still find their own
-- patches done.

-- Which Discord user plays which farm. Keyed on Discord's user id (a snowflake of 17 to 20 digits, kept as text; their username can
-- change). Nothing else of Discord is kept: no name, no avatar, no token. Only discord-auth (service_role) reads and writes it.
create table if not exists public.discord_accounts (
 discord_user_id text primary key check (discord_user_id ~ '^[0-9]{17,20}$'),
 player_id uuid not null unique references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.discord_accounts enable row level security;
revoke all on public.discord_accounts from anon, authenticated;

-- Patches one function from its live definition: nothing when p_marker shows it is done already, an error when p_from is not there
-- exactly once.
create or replace function pg_temp.discord_patch(p_fn regprocedure, p_marker text, p_from text, p_to text)
returns void language plpgsql as $f$
declare def text:=pg_get_functiondef(p_fn);
begin
 if position(p_marker in def)>0 then return; end if;
 if position(p_from in def)=0 or (length(def)-length(replace(def,p_from,'')))/length(p_from)<>1 then
  raise exception using message=format('%s: the expected text was not found once; read the live definition before changing it', p_fn);
 end if;
 execute replace(def,p_from,p_to);
end $f$;

-- 1. The email bonus (farm-api, farm-state.js EMAIL_BONUS): a player signed in with Discord counts as checked, as a Kongregate or
-- CrazyGames login, Google and Facebook do (Discord checks who it is), and gets it quietly.
select pg_temp.discord_patch('public.harvest_email_checked(uuid)',$m$u.raw_app_meta_data->>'portal'='discord'$m$,
 $a$or u.raw_app_meta_data->>'portal'='kongregate'))$a$,
 $b$or u.raw_app_meta_data->>'portal'='kongregate' or u.raw_app_meta_data->>'portal'='discord'))$b$);

-- 2. Reminders (notify-hourly): no push and no email for a Discord account, whose address is made up (and Discord's Developer Policy
-- does not let us contact its players outside Discord).
select pg_temp.discord_patch('public.notification_candidates()',$m$'discord'$m$,
 $a$coalesce(u.raw_app_meta_data->>'portal','') not in ('crazygames','kongregate')$a$,
 $b$coalesce(u.raw_app_meta_data->>'portal','') not in ('crazygames','kongregate','discord')$b$);

-- 3. The Admin dashboard's Players tab and a farmer's page say "Discord" under "Signs in with" (src/admin-players.js), not "Email".
select pg_temp.discord_patch('public.admin_player_accounts(uuid,text)',$m$'discord'$m$,
 $a$case when u.raw_app_meta_data->>'portal'='kongregate' then 'kongregate' when$a$,
 $b$case when u.raw_app_meta_data->>'portal'='discord' then 'discord' when u.raw_app_meta_data->>'portal'='kongregate' then 'kongregate' when$b$);

-- 4. Group messages (chat-group-filters.sql): "Discord accounts only", as "Kongregate accounts only". Its own branch in the filter
-- check, so the line kongregate.sql looks for stays as it is.
select pg_temp.discord_patch('public.chat_broadcast_filters(jsonb)',$m$'notPlatform','discord',$m$,
 $a$'notPlatform','crazygames','kongregate','language','family')$a$,
 $b$'notPlatform','discord','crazygames','kongregate','language','family')$b$);
select pg_temp.discord_patch('public.chat_broadcast_filters(jsonb)',$m$elsif k='discord' then$m$,
 $a$  elsif k in ('crazygames','kongregate') then$a$,
 $b$  elsif k='discord' then
   if v is distinct from 'true'::jsonb then raise exception 'The filter % cannot be %.', k, v using errcode='22023'; end if;
   out:=out||jsonb_build_object(k,true);
  elsif k in ('crazygames','kongregate') then$b$);
select pg_temp.discord_patch('public.chat_broadcast_targets(uuid,jsonb)',$m$p_filters->'discord'$m$,
 $a$  and (p_filters->'kongregate' is null or exists(select 1 from auth.users u where u.id=ps.player_id and u.raw_app_meta_data->>'portal'='kongregate'))$a$,
 $b$  and (p_filters->'kongregate' is null or exists(select 1 from auth.users u where u.id=ps.player_id and u.raw_app_meta_data->>'portal'='kongregate'))
  and (p_filters->'discord' is null or exists(select 1 from auth.users u where u.id=ps.player_id and u.raw_app_meta_data->>'portal'='discord'))$b$);

-- 5. Delete account (delete-account.sql): the link between the Discord user and the farm goes with the account, next to the
-- Kongregate one (a new table that holds a player id joins this function).
select pg_temp.discord_patch('public.harvest_delete_account(uuid,text)',$m$public.discord_accounts$m$,
 $a$delete from public.kongregate_accounts where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('kongregate_accounts',n);$a$,
 $b$delete from public.kongregate_accounts where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('kongregate_accounts',n);
 delete from public.discord_accounts where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('discord_accounts',n);$b$);
revoke all on function public.harvest_delete_account(uuid,text) from public, anon, authenticated;
grant execute on function public.harvest_delete_account(uuid,text) to service_role;
