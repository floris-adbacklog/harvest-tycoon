-- CrazyGames accounts (Oct 2026, Basic Launch). Every CrazyGames player, guest or logged in to CrazyGames, plays on an ordinary
-- Supabase account made by the crazygames-auth Edge Function (supabase/functions/crazygames-auth), with a made-up address on
-- players.harvesttycoon.com that has no mailbox and is never mailed. app_metadata.portal='crazygames' marks such an account
-- everywhere; a guest also has app_metadata.guest=true until it logs in to CrazyGames (then its farm is linked and kept).
-- The world is shared with harvesttycoon.com: same leaderboards, families and events. The chat is only for players logged in to
-- CrazyGames (CrazyGames' own rule for chat is moderation plus their disableChat setting, which the game follows).
-- Re-runnable: the tables and the new functions are made if missing, and every existing function is patched from its LIVE
-- definition (only the line named, so anything deployed since stays as it is); a function that is patched already is left alone,
-- and one that no longer has the expected line stops the whole file, nothing half-done.

-- Which CrazyGames user plays which farm. Keyed on CrazyGames' userId (their username can change). linked_from_guest: the farm
-- began as a CrazyGames guest and was kept when the player logged in. Only crazygames-auth (service_role) reads and writes it.
create table if not exists public.crazygames_accounts (
 cg_user_id text primary key check (char_length(cg_user_id) between 1 and 128),
 player_id uuid not null unique references auth.users(id) on delete cascade,
 linked_from_guest boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.crazygames_accounts enable row level security;
revoke all on public.crazygames_accounts from anon, authenticated;

-- New guest farms per network, for the limit in crazygames_guest_slot: a keyed hash of the IP address (never the address itself),
-- kept two hours at most.
create table if not exists public.crazygames_guest_ips (
 id bigint generated always as identity primary key,
 ip_hash text check (char_length(ip_hash) between 16 and 64),
 created_at timestamptz not null default now()
);
create index if not exists crazygames_guest_ips_ip on public.crazygames_guest_ips(ip_hash, created_at);
create index if not exists crazygames_guest_ips_created on public.crazygames_guest_ips(created_at);
alter table public.crazygames_guest_ips enable row level security;
revoke all on public.crazygames_guest_ips from anon, authenticated;

-- May this network make one more guest farm now? At most p_max an hour from one network (p_ip null: the address was not known,
-- then only the overall limit counts) and at most p_max_all an hour from all networks together, a ceiling against faked addresses.
-- A yes is counted at once, under a lock per network, so two requests at the same moment cannot both take the last place.
create or replace function public.crazygames_guest_slot(p_ip text, p_max integer, p_max_all integer)
returns boolean language plpgsql security definer set search_path to '' as $f$
declare n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('crazygames-guest:'||coalesce(p_ip,''),0));
 delete from public.crazygames_guest_ips where created_at<now()-interval '2 hours';
 if p_ip is not null then
  select count(*) into n from public.crazygames_guest_ips where ip_hash=p_ip and created_at>now()-interval '1 hour';
  if n>=greatest(coalesce(p_max,0),0) then return false; end if;
 end if;
 select count(*) into n from public.crazygames_guest_ips where created_at>now()-interval '1 hour';
 if n>=greatest(coalesce(p_max_all,0),0) then return false; end if;
 insert into public.crazygames_guest_ips(ip_hash) values(p_ip);
 return true;
end $f$;
revoke all on function public.crazygames_guest_slot(text,integer,integer) from public, anon, authenticated;
grant execute on function public.crazygames_guest_slot(text,integer,integer) to service_role;

-- Is this a CrazyGames guest (not logged in to CrazyGames)? Read from the account itself, not from a session's token.
create or replace function public.harvest_portal_guest(p_player uuid)
returns boolean language sql stable security definer set search_path to '' as $f$
 select coalesce((select u.raw_app_meta_data->>'guest'='true' and u.raw_app_meta_data->>'portal'='crazygames' from auth.users u where u.id=p_player),false)
$f$;
revoke all on function public.harvest_portal_guest(uuid) from public, anon, authenticated;
grant execute on function public.harvest_portal_guest(uuid) to service_role;

-- Patches one function from its live definition: nothing when p_marker shows it is done already, an error when p_from is missing.
create or replace function pg_temp.crazygames_patch(p_fn regprocedure, p_marker text, p_from text, p_to text)
returns void language plpgsql as $f$
declare def text:=pg_get_functiondef(p_fn);
begin
 if position(p_marker in def)>0 then return; end if;
 if position(p_from in def)=0 then raise exception using message=format('%s: the expected text was not found; read the live definition before changing it', p_fn); end if;
 execute replace(def,p_from,p_to);
end $f$;

-- 1. The chat is for players logged in to CrazyGames: a guest cannot write, report, block or switch private messages, and is told
-- why. Nobody can send a guest a private message (a guest cannot read it), and a profile offers no "Message" button either way.
select pg_temp.crazygames_patch(fn::regprocedure,'harvest_portal_guest(me)',
 $a$then raise exception 'Sign in to use the chat.' using errcode='28000'; end if;$a$,
 $b$then raise exception 'Sign in to use the chat.' using errcode='28000'; end if;
 if public.harvest_portal_guest(me) then raise exception 'Log in with CrazyGames to chat.' using errcode='42501'; end if;$b$)
from unnest(array['public.chat_send(text,text)','public.chat_report(uuid,text)','public.chat_report_player(uuid,text)','public.chat_block(uuid,boolean)','public.chat_set_private(boolean)']) as fn;

select pg_temp.crazygames_patch('public.chat_send(text,text)','harvest_portal_guest(other)',
 $a$if exists(select 1 from public.chat_blocks b where b.player_id=other and b.blocked_id=me)$a$,
 $b$if public.harvest_portal_guest(other) then raise exception 'This farmer does not receive private messages.' using errcode='42501'; end if;
  if exists(select 1 from public.chat_blocks b where b.player_id=other and b.blocked_id=me)$b$);

select pg_temp.crazygames_patch('public.chat_player_status(uuid)','harvest_portal_guest(p_player)',
 $a$'canMessage',p_player<>me and$a$,
 $b$'canMessage',p_player<>me and not public.harvest_portal_guest(me) and not public.harvest_portal_guest(p_player) and$b$);

-- Reading (row-level security on chat_messages, Realtime included): a guest receives no chat. This runs for every message row, so
-- it reads the session's token instead of the account; a token only ever says guest for a guest (logging in to CrazyGames gives a
-- new session that says otherwise), so it never shows a guest anything.
select pg_temp.crazygames_patch('public.chat_can_read(text)',$m$auth.jwt()->'app_metadata'->>'guest'$m$,
 $a$coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then return false; end if;$a$,
 $b$coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then return false; end if;
 if coalesce((select auth.jwt()->'app_metadata'->>'guest'),'')='true' then return false; end if;$b$);

-- Private messages the admin sends to many farmers at once, and the welcome message: never to a guest, who cannot read them. A guest
-- who logs in to CrazyGames on its first day still gets the welcome message.
select pg_temp.crazygames_patch('public.chat_broadcast_targets(uuid,text,integer)','harvest_portal_guest(ps.player_id)',
 $a$and not exists(select 1 from public.chat_sanctions s where s.player_id=ps.player_id and s.banned)$a$,
 $b$and not exists(select 1 from public.chat_sanctions s where s.player_id=ps.player_id and s.banned)
  and not public.harvest_portal_guest(ps.player_id)$b$);

select pg_temp.crazygames_patch('public.welcome_dm_run()',$m$u.raw_app_meta_data->>'guest'$m$,
 $a$and not coalesce(u.is_anonymous,false) and u.id<>c.sender$a$,
 $b$and not coalesce(u.is_anonymous,false) and coalesce(u.raw_app_meta_data->>'guest','')<>'true' and u.id<>c.sender$b$);

-- 2. The email bonus (farm-api, farm-state.js EMAIL_BONUS): a player logged in to CrazyGames counts as checked, as Google and Facebook
-- do (CrazyGames checks who it is), and gets it quietly; a CrazyGames guest never does, also not through an email code.
select pg_temp.crazygames_patch('public.harvest_email_checked(uuid)',$m$raw_app_meta_data->>'portal'='crazygames'$m$,
 $a$u.id=p_player and coalesce(u.raw_app_meta_data->>'provider','email')<>'email')$a$,
 $b$u.id=p_player and coalesce(u.raw_app_meta_data->>'guest','')<>'true' and (coalesce(u.raw_app_meta_data->>'provider','email')<>'email' or u.raw_app_meta_data->>'portal'='crazygames'))$b$);

select pg_temp.crazygames_patch('public.harvest_email_checked(uuid)',$m$c.player_id=p_player and coalesce(u.raw_app_meta_data->>'guest','')<>'true'$m$,
 $a$where c.player_id=p_player and c.confirmed_at is not null$a$,
 $b$where c.player_id=p_player and coalesce(u.raw_app_meta_data->>'guest','')<>'true' and c.confirmed_at is not null$b$);

-- 3. Reminders (notify-hourly): no push and no email for a CrazyGames account, whose address is made up. Built on the live
-- definition with the comeback chest (supabase/comeback-chest.sql).
select pg_temp.crazygames_patch('public.notification_candidates()',$m$raw_app_meta_data->>'portal'$m$,
 $a$where (s.push_crops or s.push_production or s.push_daily or s.email_digest)$a$,
 $b$where (s.push_crops or s.push_production or s.push_daily or s.email_digest)
  and coalesce(u.raw_app_meta_data->>'portal','')<>'crazygames'$b$);

-- 4. The Admin dashboard's Players tab and a farmer's page say "CrazyGames" or "CrazyGames guest" under "Signs in with"
-- (src/admin-players.js), not "Email".
select pg_temp.crazygames_patch('public.admin_player_accounts(uuid,text)',$m$'crazygames_guest'$m$,
 $a$coalesce(u.raw_app_meta_data->>'provider','email') as provider$a$,
 $b$case when u.raw_app_meta_data->>'portal'='crazygames' then case when u.raw_app_meta_data->>'guest'='true' then 'crazygames_guest' else 'crazygames' end
   else coalesce(u.raw_app_meta_data->>'provider','email') end as provider$b$);
