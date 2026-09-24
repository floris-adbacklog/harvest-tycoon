-- Chat and notifications (24 Sep 2026). Re-runnable.
-- Four tabs in the game: Notifications (player_notices: gifts, invite rewards, family invitations, moderation notes, and news
-- for everyone when player_id is null), the valley chat ('global'), the family chat ('family:<family id>') and private messages
-- ('dm:<lower id>:<higher id>'). Players read through RLS (and Realtime, which applies the same policies); every write goes
-- through the functions below, which check who may do what. Staff: the admin (the confirmed floris@millstone.nl account) and
-- moderators (staff_roles). Every level can chat (chat_config, changeable by the admin). Moderators can delete messages and mute or ban a farmer from the chat only (the farm itself is never
-- touched); only the admin appoints moderators and posts news. Messages are kept 30 days, notices 60, handled reports 90.

create table if not exists public.staff_roles(
 player_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('moderator')),
 granted_by uuid, granted_at timestamptz not null default now());
create table if not exists public.chat_messages(
 id uuid primary key default gen_random_uuid(),
 channel text not null check (channel ~ '^(global|family:[0-9a-f-]{36}|dm:[0-9a-f-]{36}:[0-9a-f-]{36})$'),
 sender uuid not null references auth.users(id) on delete cascade,
 sender_name text not null, sender_avatar text, sender_staff boolean not null default false, sender_vip boolean not null default false,
 body text not null check (char_length(body) between 1 and 200),
 created_at timestamptz not null default now());
create index if not exists chat_messages_channel on public.chat_messages(channel, created_at desc);
create index if not exists chat_messages_sender on public.chat_messages(sender, created_at desc);
create table if not exists public.player_notices(
 id uuid primary key default gen_random_uuid(),
 player_id uuid references auth.users(id) on delete cascade,   -- null: news for everyone
 kind text not null check (kind ~ '^[a-z_]{2,24}$'),
 body text not null check (char_length(body) between 1 and 400),
 created_at timestamptz not null default now(),
 expires_at timestamptz);                                        -- news the admin shows for a set number of hours
create index if not exists player_notices_player on public.player_notices(player_id, created_at desc);
create table if not exists public.chat_reads(
 player_id uuid not null references auth.users(id) on delete cascade, channel text not null,
 last_read_at timestamptz not null default now(), primary key(player_id, channel));
create table if not exists public.chat_blocks(
 player_id uuid not null references auth.users(id) on delete cascade, blocked_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(player_id, blocked_id));
create table if not exists public.chat_sanctions(
 player_id uuid primary key references auth.users(id) on delete cascade,
 muted_until timestamptz, banned boolean not null default false, reason text, by_player uuid, updated_at timestamptz not null default now());
create table if not exists public.chat_reports(
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null, channel text not null, sender uuid, sender_name text, body text not null,
 reporter uuid not null references auth.users(id) on delete cascade, reason text,
 created_at timestamptz not null default now(), resolved_at timestamptz, resolved_by uuid, action text,
 unique(message_id, reporter));

-- A farmer's own choice (Settings, Chat): private messages off means nobody can write to them privately, and they cannot start
-- one either. The staff can still reach everyone.
create table if not exists public.chat_settings(
 player_id uuid primary key references auth.users(id) on delete cascade,
 private_off boolean not null default false, updated_at timestamptz not null default now());

-- The levels from which farmers may chat (one row; the admin changes it in the Admin dashboard). Every level can chat for now.
create table if not exists public.chat_config(
 id boolean primary key default true check (id), global_level integer not null default 1 check (global_level between 1 and 200),
 dm_level integer not null default 1 check (dm_level between 1 and 200), updated_at timestamptz not null default now());
insert into public.chat_config(id) values(true) on conflict (id) do nothing;
alter table public.chat_config enable row level security;
revoke all on public.chat_config from anon, authenticated;

alter table public.staff_roles enable row level security;
alter table public.chat_messages enable row level security;
alter table public.player_notices enable row level security;
alter table public.chat_reads enable row level security;
alter table public.chat_blocks enable row level security;
alter table public.chat_sanctions enable row level security;
alter table public.chat_settings enable row level security;
alter table public.chat_reports enable row level security;
revoke all on public.staff_roles, public.chat_messages, public.player_notices, public.chat_reads, public.chat_blocks, public.chat_sanctions, public.chat_reports, public.chat_settings from anon, authenticated;
grant select on public.chat_messages, public.player_notices to authenticated;

-- Who is staff: 'admin', 'moderator' or null. Not callable by players (it would tell who the admin is); chat_my_role answers
-- for yourself.
create or replace function public.chat_staff_role(p_player uuid) returns text language sql stable security definer set search_path to '' as $f$
 select case
  when exists(select 1 from auth.users u where u.id=p_player and lower(u.email)='floris@millstone.nl' and u.email_confirmed_at is not null) then 'admin'
  when exists(select 1 from public.staff_roles s where s.player_id=p_player and s.role='moderator') then 'moderator'
  else null end
$f$;
revoke execute on function public.chat_staff_role(uuid) from public, anon, authenticated;

-- May the signed-in player read this channel? Used by the reading policy (and so by Realtime).
create or replace function public.chat_can_read(p_channel text) returns boolean language plpgsql stable security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then return false; end if;
 if p_channel='global' then return true; end if;
 if p_channel ~ '^family:[0-9a-f-]{36}$' then
  return exists(select 1 from public.family_members m where m.player_id=me and m.family_id=substr(p_channel,8)::uuid and m.left_at is null);
 end if;
 if p_channel ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$' then return me::text in (split_part(p_channel,':',2), split_part(p_channel,':',3)); end if;
 return false;
end $f$;
revoke execute on function public.chat_can_read(text) from public, anon;
grant execute on function public.chat_can_read(text) to authenticated;

drop policy if exists "players read the chats they belong to" on public.chat_messages;
create policy "players read the chats they belong to" on public.chat_messages for select to authenticated using ((select public.chat_can_read(channel)));
drop policy if exists "players read their notices and the news" on public.player_notices;
create policy "players read their notices and the news" on public.player_notices for select to authenticated
 using ((player_id = (select auth.uid()) or player_id is null) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false) = false and (expires_at is null or expires_at > now()));

-- Words that never belong in a family game (English and Dutch), matched as whole words.
create or replace function public.chat_is_rude(p_body text) returns boolean language sql immutable set search_path to '' as $f$
 select lower(p_body) ~ '\m(fuck\w*|f\*ck|shit\w*|cunt\w*|nigg\w*|fag|faggot\w*|whore\w*|slut\w*|bitch\w*|retard\w*|asshole\w*|dick|pussy|kanker\w*|kut|kutje|hoer\w*|tering\w*|tyfus\w*|klootzak\w*|mongool\w*|godverdomme)\M'
$f$;

-- Everything the chat window needs when it opens: your role, family channel, chat status, unread counts and your private threads.
create or replace function public.chat_overview() returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare
 me uuid:=(select auth.uid()); joined timestamptz; fam uuid; fam_name text; fam_channel text; s public.chat_sanctions;
 n_notices int; n_global int; n_family int:=0; threads jsonb; blocked jsonb;
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in to use the chat.' using errcode='28000'; end if;
 select u.created_at into joined from auth.users u where u.id=me;
 select m.family_id, f.name into fam, fam_name from public.family_members m join public.families f on f.id=m.family_id where m.player_id=me and m.left_at is null and f.deleted_at is null limit 1;
 fam_channel:=case when fam is null then null else 'family:'||fam::text end;
 select * into s from public.chat_sanctions where player_id=me;
 select count(*) into n_notices from (select 1 from public.player_notices n where (n.player_id=me or (n.player_id is null and n.created_at>joined)) and (n.expires_at is null or n.expires_at>now())
  and n.created_at>coalesce((select r.last_read_at from public.chat_reads r where r.player_id=me and r.channel='notices'),joined) limit 99) x;
 select count(*) into n_global from (select 1 from public.chat_messages m where m.channel='global' and m.sender<>me
  and not exists(select 1 from public.chat_blocks b where b.player_id=me and b.blocked_id=m.sender)
  and m.created_at>coalesce((select r.last_read_at from public.chat_reads r where r.player_id=me and r.channel='global'),greatest(joined,now()-interval '1 day')) limit 99) x;
 if fam_channel is not null then
  select count(*) into n_family from (select 1 from public.chat_messages m where m.channel=fam_channel and m.sender<>me
   and not exists(select 1 from public.chat_blocks b where b.player_id=me and b.blocked_id=m.sender)
   and m.created_at>coalesce((select r.last_read_at from public.chat_reads r where r.player_id=me and r.channel=fam_channel),greatest(joined,now()-interval '3 days')) limit 99) x;
 end if;
 with mine as (
  select m.channel, max(m.created_at) as last_at from public.chat_messages m
  where m.channel like 'dm:%' and (split_part(m.channel,':',2)=me::text or split_part(m.channel,':',3)=me::text) group by m.channel
 ), t as (
  select mine.channel, mine.last_at,
   (case when split_part(mine.channel,':',2)=me::text then split_part(mine.channel,':',3) else split_part(mine.channel,':',2) end)::uuid as other
  from mine order by mine.last_at desc limit 30
 )
 select coalesce(jsonb_agg(jsonb_build_object(
   'channel',t.channel,'otherId',t.other,'otherName',coalesce(ps.username,'A farmer'),'otherAvatar',ps.avatar_id,'otherVip',coalesce(ps.vip_expires_at>now(),false),'lastAt',t.last_at,
   'last',(select jsonb_build_object('body',l.body,'mine',l.sender=me) from public.chat_messages l where l.channel=t.channel order by l.created_at desc limit 1),
   'unread',(select count(*) from public.chat_messages u where u.channel=t.channel and u.sender<>me
     and u.created_at>coalesce((select r.last_read_at from public.chat_reads r where r.player_id=me and r.channel=t.channel),joined))
  ) order by t.last_at desc),'[]'::jsonb) into threads
 from t left join public.player_stats ps on ps.player_id=t.other
 where not exists(select 1 from public.chat_blocks b where b.player_id=me and b.blocked_id=t.other);
 select coalesce(jsonb_agg(b.blocked_id),'[]'::jsonb) into blocked from public.chat_blocks b where b.player_id=me;
 return jsonb_build_object('me',me,'role',public.chat_staff_role(me),'joined',joined,
  'level',(select ps.level from public.player_stats ps where ps.player_id=me),
  'family',case when fam is null then null else jsonb_build_object('channel',fam_channel,'name',fam_name) end,
  'mutedUntil',case when s.muted_until>now() then s.muted_until else null end,'banned',coalesce(s.banned,false),
  'unread',jsonb_build_object('notices',n_notices,'global',n_global,'family',n_family,
   'dm',coalesce((select sum((x->>'unread')::int) from jsonb_array_elements(threads) x),0)),
  'threads',threads,'blocked',blocked,
  'privateOn',not exists(select 1 from public.chat_settings c where c.player_id=me and c.private_off),
  'levels',(select jsonb_build_object('global',c.global_level,'dm',c.dm_level) from public.chat_config c));
end $f$;

-- Send a message: signed in, not muted or banned, friendly, no links, not too fast, and only where you belong. The valley chat
-- and private messages open at the levels in chat_config (both farmers for a private message), never to someone who blocked you.
create or replace function public.chat_send(p_channel text, p_body text) returns jsonb language plpgsql security definer set search_path to '' as $f$
declare
 me uuid:=(select auth.uid()); body text; lvl int; nm text; av text; vip boolean; other uuid; s public.chat_sanctions; msg public.chat_messages; recent int; last_at timestamptz;
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in to use the chat.' using errcode='28000'; end if;
 select * into s from public.chat_sanctions where player_id=me;
 if coalesce(s.banned,false) then raise exception 'You can no longer send messages in the chat.' using errcode='42501'; end if;
 if s.muted_until>now() then raise exception 'You are muted until % UTC.', to_char(s.muted_until at time zone 'UTC','DD Mon HH24:MI') using errcode='42501'; end if;
 body:=regexp_replace(btrim(coalesce(p_body,'')),'\s+',' ','g');
 if char_length(body)<1 or char_length(body)>200 then raise exception 'Write 1–200 characters.' using errcode='22023'; end if;
 if body ~* '(https?://|www\.|\m[a-z0-9-]{2,}\.(com|net|org|nl|be|de|eu|io|gg|ly|me|app|xyz|ru|co|info|biz|tk|link|site|shop)\M)' then raise exception 'Links are not allowed in the chat.' using errcode='22023'; end if;
 if public.chat_is_rude(body) then raise exception 'Please keep it friendly.' using errcode='22023'; end if;
 select ps.username, ps.level, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, lvl, av, vip from public.player_stats ps where ps.player_id=me;
 if nm is null then raise exception 'Choose a farmer name first.' using errcode='22023'; end if;
 if p_channel='global' then
  if coalesce(lvl,0)<(select c.global_level from public.chat_config c) then raise exception 'The valley chat opens at level %.', (select c.global_level from public.chat_config c) using errcode='42501'; end if;
 elsif p_channel ~ '^family:[0-9a-f-]{36}$' then
  if not exists(select 1 from public.family_members m where m.player_id=me and m.family_id=substr(p_channel,8)::uuid and m.left_at is null) then raise exception 'Join this family to chat with it.' using errcode='42501'; end if;
 elsif p_channel ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$' and split_part(p_channel,':',2)<split_part(p_channel,':',3) and me::text in (split_part(p_channel,':',2),split_part(p_channel,':',3)) then
  other:=(case when split_part(p_channel,':',2)=me::text then split_part(p_channel,':',3) else split_part(p_channel,':',2) end)::uuid;
  if coalesce(lvl,0)<(select c.dm_level from public.chat_config c) then raise exception 'Private messages open at level %.', (select c.dm_level from public.chat_config c) using errcode='42501'; end if;
  if coalesce((select ps.level from public.player_stats ps where ps.player_id=other),0)<(select c.dm_level from public.chat_config c) then raise exception 'This farmer cannot receive private messages yet.' using errcode='42501'; end if;
  if exists(select 1 from public.chat_blocks b where b.player_id=other and b.blocked_id=me) then raise exception 'This farmer does not receive your messages.' using errcode='42501'; end if;
  if exists(select 1 from public.chat_settings c where c.player_id=me and c.private_off) then raise exception 'Your private messages are off. Turn them on in Settings.' using errcode='42501'; end if;
  if public.chat_staff_role(me) is null and exists(select 1 from public.chat_settings c where c.player_id=other and c.private_off) then raise exception 'This farmer does not receive private messages.' using errcode='42501'; end if;
 else raise exception 'Choose a chat.' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('chat:'||me::text,0));
 select max(m.created_at), count(*) into last_at, recent from public.chat_messages m where m.sender=me and m.created_at>now()-interval '60 seconds';
 if last_at>now()-interval '2 seconds' or recent>=12 then raise exception 'Slow down a little.' using errcode='54000'; end if;
 insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_staff,sender_vip,body)
  values(p_channel,me,nm,av,public.chat_staff_role(me) is not null,vip,body) returning * into msg;
 insert into public.chat_reads(player_id,channel,last_read_at) values(me,p_channel,now()) on conflict (player_id,channel) do update set last_read_at=excluded.last_read_at;
 return to_jsonb(msg);
end $f$;

create or replace function public.chat_mark_read(p_channel text) returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in to use the chat.' using errcode='28000'; end if;
 if not (p_channel='notices' or public.chat_can_read(p_channel)) then raise exception 'Choose a chat.' using errcode='22023'; end if;
 insert into public.chat_reads(player_id,channel,last_read_at) values(me,p_channel,now()) on conflict (player_id,channel) do update set last_read_at=excluded.last_read_at;
end $f$;

create or replace function public.chat_block(p_player uuid, p_on boolean) returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in to use the chat.' using errcode='28000'; end if;
 if p_player is null or p_player=me then raise exception 'Choose another farmer.' using errcode='22023'; end if;
 if p_on then insert into public.chat_blocks(player_id,blocked_id) values(me,p_player) on conflict do nothing;
 else delete from public.chat_blocks where player_id=me and blocked_id=p_player; end if;
end $f$;

-- Report a message you can see. The report keeps a copy, so a moderator can judge it even after the message is gone.
create or replace function public.chat_report(p_message uuid, p_reason text) returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid()); m public.chat_messages;
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in to use the chat.' using errcode='28000'; end if;
 select * into m from public.chat_messages where id=p_message;
 if not found or not public.chat_can_read(m.channel) then raise exception 'This message is no longer there.' using errcode='22023'; end if;
 if m.sender=me then raise exception 'You cannot report your own message.' using errcode='22023'; end if;
 if (select count(*) from public.chat_reports r where r.reporter=me and r.created_at>now()-interval '1 hour')>=10 then raise exception 'Thanks, we have your reports. Try again later.' using errcode='54000'; end if;
 insert into public.chat_reports(message_id,channel,sender,sender_name,body,reporter,reason)
  values(m.id,m.channel,m.sender,m.sender_name,m.body,me,left(nullif(btrim(coalesce(p_reason,'')),''),120)) on conflict (message_id,reporter) do nothing;
end $f$;

-- What a profile shows about chat: the moderator badge (the admin shows the same one), whether you blocked this farmer, whether
-- you can send a private message, and for staff the farmer's chat status.
create or replace function public.chat_player_status(p_player uuid) returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid()); s public.chat_sanctions; staff boolean; my_level int; their_level int;
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in to use the chat.' using errcode='28000'; end if;
 staff:=public.chat_staff_role(me) is not null;
 select ps.level into my_level from public.player_stats ps where ps.player_id=me;
 select ps.level into their_level from public.player_stats ps where ps.player_id=p_player;
 select * into s from public.chat_sanctions where player_id=p_player;
 return jsonb_build_object('moderator',public.chat_staff_role(p_player) is not null,
  'blocked',exists(select 1 from public.chat_blocks b where b.player_id=me and b.blocked_id=p_player),
  'canMessage',p_player<>me and coalesce(my_level,0)>=(select c.dm_level from public.chat_config c) and coalesce(their_level,0)>=(select c.dm_level from public.chat_config c) and not exists(select 1 from public.chat_blocks b where b.player_id=p_player and b.blocked_id=me)
   and not exists(select 1 from public.chat_settings c where c.player_id=me and c.private_off) and (staff or not exists(select 1 from public.chat_settings c where c.player_id=p_player and c.private_off)),
  'staff',staff,
  'mutedUntil',case when staff and s.muted_until>now() then s.muted_until else null end,
  'banned',case when staff then coalesce(s.banned,false) else null end);
end $f$;

create or replace function public.chat_my_role() returns text language sql stable security definer set search_path to '' as $f$
 select public.chat_staff_role((select auth.uid()))
$f$;

-- Staff: open reports, one row per reported message.
create or replace function public.chat_mod_reports() returns jsonb language plpgsql stable security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(x order by x.first_at) from (
  select r.message_id as "messageId", min(r.channel) as channel, min(r.sender::text)::uuid as sender, min(r.sender_name) as "senderName", min(r.body) as body,
   count(*) as reports, array_remove(array_agg(r.reason),null) as reasons, min(r.created_at) as first_at,
   exists(select 1 from public.chat_messages m where m.id=r.message_id) as present
  from public.chat_reports r where r.resolved_at is null group by r.message_id limit 100) x),'[]'::jsonb);
end $f$;

-- Staff: remove a message (and close its reports).
create or replace function public.chat_mod_delete(p_message uuid) returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());
begin
 if public.chat_staff_role(me) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 delete from public.chat_messages where id=p_message;
 update public.chat_reports set resolved_at=now(),resolved_by=me,action='deleted' where message_id=p_message and resolved_at is null;
end $f$;

-- Staff: close the reports on a message without doing anything.
create or replace function public.chat_mod_dismiss(p_message uuid) returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());
begin
 if public.chat_staff_role(me) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 update public.chat_reports set resolved_at=now(),resolved_by=me,action='dismissed' where message_id=p_message and resolved_at is null;
end $f$;

-- Staff: mute a farmer for some minutes, ban them from the chat, or lift both (minutes 0, no ban). Chat only: the farm is never
-- touched. Staff cannot be sanctioned (the admin removes a moderator's role first). The farmer gets a notice.
create or replace function public.chat_mod_sanction(p_player uuid, p_minutes integer, p_ban boolean, p_reason text) returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid()); why text:=left(nullif(btrim(coalesce(p_reason,'')),''),120);
begin
 if public.chat_staff_role(me) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_player is null or p_player=me or public.chat_staff_role(p_player) is not null then raise exception 'This farmer cannot be muted.' using errcode='22023'; end if;
 if coalesce(p_minutes,0)<0 or coalesce(p_minutes,0)>43200 then raise exception 'Choose a time up to 30 days.' using errcode='22023'; end if;
 insert into public.chat_sanctions(player_id,muted_until,banned,reason,by_player,updated_at)
  values(p_player,case when coalesce(p_minutes,0)>0 then now()+make_interval(mins=>p_minutes) else null end,coalesce(p_ban,false),why,me,now())
  on conflict (player_id) do update set muted_until=excluded.muted_until,banned=excluded.banned,reason=excluded.reason,by_player=excluded.by_player,updated_at=now();
 insert into public.player_notices(player_id,kind,body) values(p_player,'moderation',
  case when coalesce(p_ban,false) then 'A moderator has closed the chat for you. Your farm is not affected.'
   when coalesce(p_minutes,0)>0 then 'A moderator has muted you in the chat for '||case when p_minutes>=1440 then (p_minutes/1440)::text||' day(s)' when p_minutes>=60 then (p_minutes/60)::text||' hour(s)' else p_minutes::text||' minutes' end||'.'
   else 'You can use the chat again.' end||coalesce(' Reason: '||why,''));
 update public.chat_reports set resolved_at=now(),resolved_by=me,action=case when coalesce(p_ban,false) then 'banned' when coalesce(p_minutes,0)>0 then 'muted' else action end
  where sender=p_player and resolved_at is null and (coalesce(p_ban,false) or coalesce(p_minutes,0)>0);
end $f$;

-- Admin: appoint or remove a moderator, and post news for everyone.
create or replace function public.staff_set_moderator(p_player uuid, p_on boolean) returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());
begin
 if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_player is null or p_player=me or not exists(select 1 from public.player_stats ps where ps.player_id=p_player) then raise exception 'Choose a farmer.' using errcode='22023'; end if;
 if p_on then
  insert into public.staff_roles(player_id,role,granted_by) values(p_player,'moderator',me) on conflict (player_id) do nothing;
  insert into public.player_notices(player_id,kind,body) values(p_player,'moderation','You are now a moderator. Thank you for keeping the valley friendly! Reports appear in the Admin dashboard.');
 else delete from public.staff_roles where player_id=p_player; end if;
end $f$;

-- News shows for p_hours (1 to 720), or until it is tidied up after 60 days when p_hours is 0 or empty.
create or replace function public.chat_post_news(p_body text, p_hours integer default 24) returns void language plpgsql security definer set search_path to '' as $f$
declare body text:=btrim(coalesce(p_body,''));
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if char_length(body)<1 or char_length(body)>400 then raise exception 'Write 1–400 characters.' using errcode='22023'; end if;
 if coalesce(p_hours,0)<0 or coalesce(p_hours,0)>720 then raise exception 'Choose up to 720 hours (30 days).' using errcode='22023'; end if;
 insert into public.player_notices(player_id,kind,body,expires_at) values(null,'news',body,case when coalesce(p_hours,0)>0 then now()+make_interval(hours=>p_hours) else null end);
end $f$;

create or replace function public.chat_set_levels(p_global integer, p_dm integer) returns void language plpgsql security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_global not between 1 and 200 or p_dm not between 1 and 200 then raise exception 'Choose levels from 1 to 200.' using errcode='22023'; end if;
 update public.chat_config set global_level=p_global,dm_level=p_dm,updated_at=now() where id;
end $f$;

create or replace function public.staff_list() returns jsonb language plpgsql stable security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('playerId',s.player_id,'name',coalesce(ps.username,'A farmer'),'since',s.granted_at) order by s.granted_at)
  from public.staff_roles s left join public.player_stats ps on ps.player_id=s.player_id),'[]'::jsonb);
end $f$;

-- Settings, Chat: private messages on or off for yourself.
create or replace function public.chat_set_private(p_on boolean) returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in to use the chat.' using errcode='28000'; end if;
 insert into public.chat_settings as c(player_id,private_off,updated_at) values(me,not coalesce(p_on,true),now())
  on conflict (player_id) do update set private_off=excluded.private_off,updated_at=now();
end $f$;

do $g$
declare f text;
begin
 foreach f in array array['chat_overview()','chat_send(text,text)','chat_mark_read(text)','chat_block(uuid,boolean)','chat_report(uuid,text)','chat_player_status(uuid)','chat_my_role()','chat_set_private(boolean)',
  'chat_mod_reports()','chat_mod_delete(uuid)','chat_mod_dismiss(uuid)','chat_mod_sanction(uuid,integer,boolean,text)','staff_set_moderator(uuid,boolean)','chat_post_news(text,integer)','staff_list()','chat_set_levels(integer,integer)'] loop
  execute format('revoke execute on function public.%s from public, anon', f);
  execute format('grant execute on function public.%s to authenticated', f);
 end loop;
end $g$;

-- Live updates: new messages and notices reach an open game through Realtime (same reading policies).
do $p$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages') then
  alter publication supabase_realtime add table public.chat_messages; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='player_notices') then
  alter publication supabase_realtime add table public.player_notices; end if;
end $p$;

-- Tidy up every night: messages after 30 days, notices after 60, handled reports after 90.
select cron.unschedule(jobid) from cron.job where jobname='harvest-chat-cleanup';
select cron.schedule('harvest-chat-cleanup','17 3 * * *',$c$
 delete from public.chat_messages where created_at<now()-interval '30 days';
 delete from public.player_notices where created_at<now()-interval '60 days' or expires_at<now()-interval '1 day';
 delete from public.chat_reports where resolved_at<now()-interval '90 days';
 delete from public.staff_donations where created_at<now()-interval '30 days';
 delete from public.chat_reads r where r.channel<>'notices' and r.channel<>'global' and not exists(select 1 from public.chat_messages m where m.channel=r.channel);
$c$);

-- The first moderator.
insert into public.staff_roles(player_id,role) values('4744af19-aef1-406c-9bb2-2fc9bda17efb','moderator') on conflict (player_id) do nothing;

-- A private message also reaches the other farmer's phone or computer as a notification (not the family or global chat). Only
-- when they have notifications on for a device (push_subscriptions) and the Private messages switch in Settings on (on unless
-- they turn it off), when they have not blocked the sender and are not reading that chat right now, and at most once per chat
-- every 3 minutes. The trigger checks all that in the database, so the notification service is only called for a real push.
alter table public.notification_settings add column if not exists push_messages boolean not null default true;
create table if not exists public.chat_push_state(
 player_id uuid not null references auth.users(id) on delete cascade, channel text not null,
 message_id uuid not null, claimed boolean not null default false, pushed_at timestamptz not null default now(),
 primary key(player_id, channel));
alter table public.chat_push_state enable row level security;
revoke all on public.chat_push_state from anon, authenticated;

-- The reminder settings save the new switch too (null keeps it as it is, for an older game still open somewhere).
drop function if exists public.notification_save(boolean, boolean, boolean, boolean, integer, text);
create or replace function public.notification_save(p_push_crops boolean, p_push_production boolean, p_push_daily boolean, p_email_digest boolean, p_digest_hour integer, p_timezone text, p_push_messages boolean default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_player uuid := (select auth.uid());
begin
 if v_player is null or coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Sign in to change reminders.' using errcode = '28000'; end if;
 if p_digest_hour is null or p_digest_hour < 0 or p_digest_hour > 23 then raise exception 'Choose an hour between 0 and 23.' using errcode = '22023'; end if;
 if p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then raise exception 'Unknown time zone.' using errcode = '22023'; end if;
 insert into public.notification_settings as s (player_id, push_crops, push_production, push_daily, email_digest, digest_hour, timezone, push_messages)
  values (v_player, coalesce(p_push_crops, false), coalesce(p_push_production, false), coalesce(p_push_daily, false), coalesce(p_email_digest, false), p_digest_hour, p_timezone, coalesce(p_push_messages, true))
  on conflict (player_id) do update set push_crops = excluded.push_crops, push_production = excluded.push_production, push_daily = excluded.push_daily,
   email_digest = excluded.email_digest, digest_hour = excluded.digest_hour, timezone = excluded.timezone,
   push_messages = coalesce(p_push_messages, s.push_messages), updated_at = now();
end $$;
revoke all on function public.notification_save(boolean, boolean, boolean, boolean, integer, text, boolean) from public, anon;
grant execute on function public.notification_save(boolean, boolean, boolean, boolean, integer, text, boolean) to authenticated;

create or replace function public.chat_dm_push() returns trigger language plpgsql security definer set search_path to '' as $f$
declare other uuid;
begin
 other:=(case when split_part(new.channel,':',2)=new.sender::text then split_part(new.channel,':',3) else split_part(new.channel,':',2) end)::uuid;
 if not exists(select 1 from public.push_subscriptions p where p.player_id=other) then return null; end if;
 if exists(select 1 from public.notification_settings s where s.player_id=other and not s.push_messages) then return null; end if;
 if exists(select 1 from public.chat_blocks b where b.player_id=other and b.blocked_id=new.sender) then return null; end if;
 if exists(select 1 from public.chat_reads r where r.player_id=other and r.channel=new.channel and r.last_read_at>now()-interval '2 minutes') then return null; end if;
 insert into public.chat_push_state as s(player_id,channel,message_id,claimed,pushed_at) values(other,new.channel,new.id,false,now())
  on conflict (player_id,channel) do update set message_id=excluded.message_id,claimed=false,pushed_at=excluded.pushed_at where s.pushed_at<now()-interval '3 minutes';
 if not found then return null; end if;
 perform net.http_post(url:='https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/notify-hourly?dm',headers:='{"Content-Type":"application/json"}'::jsonb,
  body:=jsonb_build_object('message',new.id),timeout_milliseconds:=10000);
 return null;
exception when others then return null;   -- a notification never stands in the way of the message itself
end $f$;
revoke execute on function public.chat_dm_push() from public, anon, authenticated;
drop trigger if exists chat_dm_push on public.chat_messages;
create trigger chat_dm_push after insert on public.chat_messages for each row when (new.channel like 'dm:%') execute function public.chat_dm_push();

-- The notification service (service role) takes the message the trigger chose, once: calling it again sends nothing.
create or replace function public.chat_push_claim(p_message uuid) returns jsonb language plpgsql security definer set search_path to '' as $f$
declare m public.chat_messages; other uuid;
begin
 select * into m from public.chat_messages where id=p_message and channel like 'dm:%' and created_at>now()-interval '10 minutes';
 if not found then return null; end if;
 other:=(case when split_part(m.channel,':',2)=m.sender::text then split_part(m.channel,':',3) else split_part(m.channel,':',2) end)::uuid;
 update public.chat_push_state set claimed=true where player_id=other and channel=m.channel and message_id=m.id and not claimed;
 if not found then return null; end if;
 return jsonb_build_object('senderName',m.sender_name,'body',left(m.body,140),'channel',m.channel,
  'subscriptions',coalesce((select jsonb_agg(jsonb_build_object('endpoint',p.endpoint,'p256dh',p.p256dh,'auth',p.auth)) from public.push_subscriptions p where p.player_id=other),'[]'::jsonb));
end $f$;
revoke execute on function public.chat_push_claim(uuid) from public, anon, authenticated;

-- A gift for everyone from the staff (the moderators and the admin): coins and diamonds with a short message. All staff together
-- give at most 500 coins and 50 diamonds a day (UTC), in at most 5 gifts. Every farm that already existed when it was sent receives
-- it once, the next time it loads (farm-api, receiveDonations in game/farm-state.js), within 7 days; the note under Notifications
-- tells everyone, and an open game fetches its gift straight away.
create table if not exists public.staff_donations(
 id uuid primary key default gen_random_uuid(),
 coins integer not null default 0 check (coins between 0 and 500), diamonds integer not null default 0 check (diamonds between 0 and 50),
 message text check (char_length(message)<=120), by_player uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now());
create index if not exists staff_donations_created on public.staff_donations(created_at desc);
alter table public.staff_donations enable row level security;
revoke all on public.staff_donations from anon, authenticated;

create or replace function public.staff_donation_room() returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare c int; d int; n int;
begin
 if public.chat_staff_role((select auth.uid())) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 select coalesce(sum(x.coins),0),coalesce(sum(x.diamonds),0),count(*) into c,d,n from public.staff_donations x where (x.created_at at time zone 'UTC')::date=(now() at time zone 'UTC')::date;
 return jsonb_build_object('coins',500-c,'diamonds',50-d,'gifts',5-n);
end $f$;

create or replace function public.staff_donate(p_coins integer, p_diamonds integer, p_message text) returns jsonb language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid()); msg text:=nullif(regexp_replace(btrim(coalesce(p_message,'')),'\s+',' ','g'),''); c int; d int; n int; parts text[];
begin
 if public.chat_staff_role(me) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_coins is null or p_diamonds is null or p_coins<0 or p_diamonds<0 or (p_coins=0 and p_diamonds=0) then raise exception 'Give some coins or diamonds.' using errcode='22023'; end if;
 if char_length(coalesce(msg,''))>120 then raise exception 'Keep the message under 120 characters.' using errcode='22023'; end if;
 if msg is not null and (public.chat_is_rude(msg) or msg ~* '(https?://|www\.)') then raise exception 'Please keep the message friendly, without links.' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-donate',0));
 select coalesce(sum(x.coins),0),coalesce(sum(x.diamonds),0),count(*) into c,d,n from public.staff_donations x where (x.created_at at time zone 'UTC')::date=(now() at time zone 'UTC')::date;
 if n>=5 then raise exception 'Today''s 5 gifts have been sent. Try again tomorrow.' using errcode='54000'; end if;
 if c+p_coins>500 or d+p_diamonds>50 then raise exception 'Today there is room for % more coins and % more diamonds.', 500-c, 50-d using errcode='22023'; end if;
 insert into public.staff_donations(coins,diamonds,message,by_player) values(p_coins,p_diamonds,msg,me);
 parts:=array_remove(array[case when p_diamonds>0 then p_diamonds::text||' diamonds' end, case when p_coins>0 then p_coins::text||' coins' end],null);
 insert into public.player_notices(player_id,kind,body) values(null,'donation','Donation: you received '||array_to_string(parts,' + ')||'.'||coalesce(' “'||msg||'”',''));
 return jsonb_build_object('coins',500-c-p_coins,'diamonds',50-d-p_diamonds,'gifts',4-n);
end $f$;
revoke execute on function public.staff_donation_room() from public, anon;
revoke execute on function public.staff_donate(integer,integer,text) from public, anon;
grant execute on function public.staff_donation_room() to authenticated;
grant execute on function public.staff_donate(integer,integer,text) to authenticated;
