-- Kongregate accounts (Oct 2026, the first Kongregate launch: Kongregate's log-in only, nothing for sale, no linking). Every player
-- signed in to Kongregate plays on an ordinary Supabase account made by the kongregate-auth Edge Function
-- (supabase/functions/kongregate-auth), with a made-up address on players.harvesttycoon.com that has no mailbox and is never mailed.
-- app_metadata.portal='kongregate' marks such an account everywhere. There are no Kongregate guests: a guest sees the game's Register
-- page and gets no account. The world is shared with harvesttycoon.com and CrazyGames: same leaderboards, families, events and chat.
-- Paste it as it is in the SQL editor. Re-runnable: the tables and the new function are made if missing, and every existing function
-- is patched from its LIVE definition (only the line named, so anything deployed since stays as it is); a function that is patched
-- already is left alone, and one that no longer has the expected line once stops the whole file, nothing half-done. The lines looked
-- for were read from the live database on 9 Oct 2026. Each patch keeps the CrazyGames text crazygames.sql looks for, so that file
-- still finds its own patches done.

-- Which Kongregate user plays which farm. Keyed on Kongregate's numeric user id (their username can change). token_hash and
-- verified_at: a keyed hash of the last game auth token Kongregate said yes to and when, so a start within the hour needs no new check
-- (never the token itself). Only kongregate-auth (service_role) reads and writes it.
create table if not exists public.kongregate_accounts (
 kong_user_id bigint primary key check (kong_user_id between 1 and 2147483647),
 player_id uuid not null unique references auth.users(id) on delete cascade,
 token_hash text check (token_hash is null or char_length(token_hash)=64),
 verified_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.kongregate_accounts enable row level security;
revoke all on public.kongregate_accounts from anon, authenticated;

-- Checks with Kongregate per network, for the limit in kongregate_check_slot: a keyed hash of the IP address (never the address
-- itself), kept two hours at most.
create table if not exists public.kongregate_check_ips (
 id bigint generated always as identity primary key,
 ip_hash text check (char_length(ip_hash) between 16 and 64),
 created_at timestamptz not null default now()
);
create index if not exists kongregate_check_ips_ip on public.kongregate_check_ips(ip_hash, created_at);
create index if not exists kongregate_check_ips_created on public.kongregate_check_ips(created_at);
alter table public.kongregate_check_ips enable row level security;
revoke all on public.kongregate_check_ips from anon, authenticated;

-- May this network ask Kongregate once more now? At most p_max an hour from one network (p_ip null: the address was not known, then
-- only the overall limit counts) and at most p_max_all an hour from all networks together. A yes is counted at once, under a lock per
-- network, so two requests at the same moment cannot both take the last place.
create or replace function public.kongregate_check_slot(p_ip text, p_max integer, p_max_all integer)
returns boolean language plpgsql security definer set search_path to '' as $f$
declare n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('kongregate-check:'||coalesce(p_ip,''),0));
 delete from public.kongregate_check_ips where created_at<now()-interval '2 hours';
 if p_ip is not null then
  select count(*) into n from public.kongregate_check_ips where ip_hash=p_ip and created_at>now()-interval '1 hour';
  if n>=greatest(coalesce(p_max,0),0) then return false; end if;
 end if;
 select count(*) into n from public.kongregate_check_ips where created_at>now()-interval '1 hour';
 if n>=greatest(coalesce(p_max_all,0),0) then return false; end if;
 insert into public.kongregate_check_ips(ip_hash) values(p_ip);
 return true;
end $f$;
revoke all on function public.kongregate_check_slot(text,integer,integer) from public, anon, authenticated;
grant execute on function public.kongregate_check_slot(text,integer,integer) to service_role;
-- The limit only counts the last hour: every 15 minutes the older hashes go, also when nobody new comes.
select cron.unschedule('harvest-kongregate-check-ips') where exists(select 1 from cron.job where jobname='harvest-kongregate-check-ips');
select cron.schedule('harvest-kongregate-check-ips','*/15 * * * *',$c$delete from public.kongregate_check_ips where created_at<now()-interval '1 hour'$c$);

-- Patches one function from its live definition: nothing when p_marker shows it is done already, an error when p_from is not there
-- exactly once.
create or replace function pg_temp.kongregate_patch(p_fn regprocedure, p_marker text, p_from text, p_to text)
returns void language plpgsql as $f$
declare def text:=pg_get_functiondef(p_fn);
begin
 if position(p_marker in def)>0 then return; end if;
 if position(p_from in def)=0 or (length(def)-length(replace(def,p_from,'')))/length(p_from)<>1 then
  raise exception using message=format('%s: the expected text was not found once; read the live definition before changing it', p_fn);
 end if;
 execute replace(def,p_from,p_to);
end $f$;

-- 1. The email bonus (farm-api, farm-state.js EMAIL_BONUS): a player signed in with Kongregate counts as checked, as a CrazyGames login,
-- Google and Facebook do (Kongregate checks who it is), and gets it quietly.
select pg_temp.kongregate_patch('public.harvest_email_checked(uuid)',$m$u.raw_app_meta_data->>'portal'='kongregate'$m$,
 $a$or u.raw_app_meta_data->>'portal'='crazygames'))$a$,
 $b$or u.raw_app_meta_data->>'portal'='crazygames' or u.raw_app_meta_data->>'portal'='kongregate'))$b$);

-- 2. Reminders (notify-hourly): no push and no email for a Kongregate account, whose address is made up.
select pg_temp.kongregate_patch('public.notification_candidates()',$m$'kongregate'$m$,
 $a$coalesce(u.raw_app_meta_data->>'portal','')<>'crazygames'$a$,
 $b$coalesce(u.raw_app_meta_data->>'portal','') not in ('crazygames','kongregate')$b$);

-- 3. The Admin dashboard's Players tab and a farmer's page say "Kongregate" under "Signs in with" (src/admin-players.js), not "Email".
select pg_temp.kongregate_patch('public.admin_player_accounts(uuid,text)',$m$'kongregate'$m$,
 $a$case when u.raw_app_meta_data->>'portal'='crazygames' then case$a$,
 $b$case when u.raw_app_meta_data->>'portal'='kongregate' then 'kongregate' when u.raw_app_meta_data->>'portal'='crazygames' then case$b$);

-- 4. Group messages (chat-group-filters.sql): "Kongregate accounts only", as "CrazyGames accounts only".
select pg_temp.kongregate_patch('public.chat_broadcast_filters(jsonb)',$m$'crazygames','kongregate','language'$m$,
 $a$'notPlatform','crazygames','language','family')$a$,
 $b$'notPlatform','crazygames','kongregate','language','family')$b$);
select pg_temp.kongregate_patch('public.chat_broadcast_filters(jsonb)',$m$elsif k in ('crazygames','kongregate') then$m$,
 $a$elsif k='crazygames' then$a$,
 $b$elsif k in ('crazygames','kongregate') then$b$);
select pg_temp.kongregate_patch('public.chat_broadcast_targets(uuid,jsonb)',$m$p_filters->'kongregate'$m$,
 $a$  and (p_filters->'crazygames' is null or exists(select 1 from auth.users u where u.id=ps.player_id and u.raw_app_meta_data->>'portal'='crazygames'))$a$,
 $b$  and (p_filters->'crazygames' is null or exists(select 1 from auth.users u where u.id=ps.player_id and u.raw_app_meta_data->>'portal'='crazygames'))
  and (p_filters->'kongregate' is null or exists(select 1 from auth.users u where u.id=ps.player_id and u.raw_app_meta_data->>'portal'='kongregate'))$b$);

-- 5. Delete account (delete-account.sql): the link between the Kongregate user and the farm goes with the account, next to the
-- CrazyGames one (a new table that holds a player id joins this function).
select pg_temp.kongregate_patch('public.harvest_delete_account(uuid,text)',$m$public.kongregate_accounts$m$,
 $a$delete from public.crazygames_accounts where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('crazygames_accounts',n);$a$,
 $b$delete from public.crazygames_accounts where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('crazygames_accounts',n);
 delete from public.kongregate_accounts where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('kongregate_accounts',n);$b$);
revoke all on function public.harvest_delete_account(uuid,text) from public, anon, authenticated;
grant execute on function public.harvest_delete_account(uuid,text) to service_role;
