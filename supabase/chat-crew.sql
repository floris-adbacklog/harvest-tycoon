-- The Crew (1 Oct 2026): one group chat for the staff, the admin and every moderator, pinned at the top of their private chats. Its
-- channel is 'crew': only the staff read it (row-level security, Realtime included) and only the staff write in it. The rest of the
-- chat's rules hold here too (no links, friendly words, not too fast), and like every chat its messages go after 30 days. No push
-- yet: the Crew shows its count in the chat. As live on 1 Oct 2026 (chat_can_read md5 8f41a2ec28d78cd31d76f7d5600130b8, chat_send
-- e061ca95fc65b8113da16f8790ef5c40, chat_overview c3c9ac158d940270b31312fec90e8a3c, md5 of the body), with the Crew added.

-- The table takes the Crew's channel too (it allowed global, family:… and dm:… only).
alter table public.chat_messages drop constraint if exists chat_messages_channel_check;
alter table public.chat_messages add constraint chat_messages_channel_check check (channel ~ '^(global|crew|family:[0-9a-f-]{36}|dm:[0-9a-f-]{36}:[0-9a-f-]{36})$');

create or replace function public.chat_can_read(p_channel text)
 returns boolean language plpgsql stable security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid());
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then return false; end if;
 if p_channel='global' then return true; end if;
 if p_channel='crew' then return public.chat_staff_role(me) is not null; end if;
 if p_channel ~ '^family:[0-9a-f-]{36}$' then
  return exists(select 1 from public.family_members m where m.player_id=me and m.family_id=substr(p_channel,8)::uuid and m.left_at is null);
 end if;
 if p_channel ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$' then return me::text in (split_part(p_channel,':',2), split_part(p_channel,':',3)); end if;
 return false;
end $function$;

create or replace function public.chat_send(p_channel text, p_body text)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
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
 elsif p_channel='crew' then
  if public.chat_staff_role(me) is null then raise exception 'Choose a chat.' using errcode='22023'; end if;
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
end $function$;

create or replace function public.chat_overview()
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
 me uuid:=(select auth.uid()); joined timestamptz; fam uuid; fam_name text; fam_channel text; s public.chat_sanctions;
 n_notices int; n_global int; n_family int:=0; threads jsonb; blocked jsonb;
 crew jsonb;
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
 -- The Crew, for the staff only: its last message and what is new since they last read it (at most the last 7 days).
 if public.chat_staff_role(me) is not null then crew:=jsonb_build_object('channel','crew',
  'lastAt',(select max(m.created_at) from public.chat_messages m where m.channel='crew'),
  'last',(select jsonb_build_object('body',l.body,'mine',l.sender=me,'senderName',l.sender_name) from public.chat_messages l where l.channel='crew' order by l.created_at desc limit 1),
  'unread',(select count(*) from (select 1 from public.chat_messages u where u.channel='crew' and u.sender<>me
   and u.created_at>coalesce((select r.last_read_at from public.chat_reads r where r.player_id=me and r.channel='crew'),now()-interval '7 days') limit 99) x)); end if;
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
   'dm',coalesce((select sum((x->>'unread')::int) from jsonb_array_elements(threads) x),0)+coalesce((crew->>'unread')::int,0)),
  'threads',threads,'blocked',blocked,
  'crew',crew,
  'privateOn',not exists(select 1 from public.chat_settings c where c.player_id=me and c.private_off),
  'purchaseAlerts',case when public.chat_staff_role(me)='admin' then not exists(select 1 from public.chat_settings c where c.player_id=me and c.purchase_alerts_off) end,
  'levels',(select jsonb_build_object('global',c.global_level,'dm',c.dm_level) from public.chat_config c));
end $function$;
