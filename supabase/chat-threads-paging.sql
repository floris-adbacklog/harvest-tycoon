-- All private chats within reach (8 Oct 2026). The Private tab listed only the 30 newest conversations (chat_overview), and its count
-- added up only those 30. The admin who sends the welcome message has about 1,500 conversations, 150 to 500 new ones a day: 30 were
-- some 5 hours of them, 26 conversations with an unread answer could not be reached, and the count said 2 instead of 28. Now:
--  1. chat_overview lists the 30 newest conversations and every conversation with something unread (99 at most), newest first; the
--     count on Private covers all conversations, also those not listed. moreThreads says there are older ones beyond the list and
--     threadsCursor is the 30th as {at, channel}: a message to many farmers gives all their conversations one time, so the time
--     alone could skip some. Chats with a farmer I blocked are left out before the 30 are counted (they were taken out after, so
--     fewer than 30 showed), and from the count as before. The Crew stays as it was. The game still in use keeps working: it shows
--     the longer list and ignores the two new fields.
--  2. chat_threads(cursor) gives the next page after that cursor, the same rows, for Show more at the end of the list.
--  3. Two indexes on the farmer's id in a private channel (dm:<lower id>:<higher id>, so first or second), read as two lookups: the
--     overview runs for every farmer on load, every 3 minutes and on a private message, and now reads only that farmer's own
--     private messages instead of the whole chat table.
-- Built on the live chat_overview of 8 Oct 2026 (md5 of pg_get_functiondef ec2b7da1f98ca46d9fa925be0c6304b9): only the private chats
-- part, its count and its two new fields change; a part that is not found stops the whole file (a second run leaves the overview as it
-- is). Run it before the new client; the new client without this file shows the 30 as before and no Show more.

-- 1. The farmer's id in a private channel, first or second.
create index if not exists chat_messages_dm_first on public.chat_messages (split_part(channel,':',2), created_at desc) where channel like 'dm:%';
create index if not exists chat_messages_dm_second on public.chat_messages (split_part(channel,':',3), created_at desc) where channel like 'dm:%';
analyze public.chat_messages;

-- 2. The overview: every unread conversation listed, the count over all of them, and where the next page starts.
do $patch$
declare d text; i int;
 want text[]:=array[
  'threads jsonb; blocked jsonb;',
$old$ with mine as (
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
 where not exists(select 1 from public.chat_blocks b where b.player_id=me and b.blocked_id=t.other);$old$,
  $old$'dm',coalesce((select sum((x->>'unread')::int) from jsonb_array_elements(threads) x),0)+coalesce((crew->>'unread')::int,0)),$old$,
  $old$'threads',threads,'blocked',blocked,$old$];
 put text[]:=array[
  'threads jsonb; blocked jsonb; n_dm bigint:=0; more_threads boolean:=false; threads_cursor jsonb;',
$new$ -- 8 Oct 2026 (supabase/chat-threads-paging.sql): the 30 newest private chats and every one with something unread (99 at most), the
 -- count over all of them. Two lookups, my id first or second in the channel, each on its own index. Newest first, then the channel
 -- (in byte order): a message to many farmers gives their conversations one time; chat_threads pages on in the same order.
 with mine as (
  select m.channel, split_part(m.channel,':',3)::uuid as other, max(m.created_at) as last_at,
   count(*) filter (where m.sender<>me and m.created_at>coalesce(r.last_read_at,joined)) as unread
  from public.chat_messages m left join public.chat_reads r on r.player_id=me and r.channel=m.channel
  where m.channel like 'dm:%' and split_part(m.channel,':',2)=me::text group by m.channel
  union all
  select m.channel, split_part(m.channel,':',2)::uuid, max(m.created_at),
   count(*) filter (where m.sender<>me and m.created_at>coalesce(r.last_read_at,joined))
  from public.chat_messages m left join public.chat_reads r on r.player_id=me and r.channel=m.channel
  where m.channel like 'dm:%' and split_part(m.channel,':',3)=me::text group by m.channel
 ), k as (
  select mine.*, row_number() over (order by mine.last_at desc, mine.channel collate "C" desc) as n from mine
  where not exists(select 1 from public.chat_blocks b where b.player_id=me and b.blocked_id=mine.other)
 ), t as (
  select k.* from k where k.n<=30 or k.unread>0 order by k.last_at desc, k.channel collate "C" desc limit 99
 )
 select coalesce((select jsonb_agg(jsonb_build_object(
   'channel',t.channel,'otherId',t.other,'otherName',coalesce(ps.username,'A farmer'),'otherAvatar',ps.avatar_id,'otherVip',coalesce(ps.vip_expires_at>now(),false),'lastAt',t.last_at,
   'last',(select jsonb_build_object('body',l.body,'mine',l.sender=me) from public.chat_messages l where l.channel=t.channel order by l.created_at desc limit 1),
   'unread',t.unread
  ) order by t.last_at desc, t.channel collate "C" desc) from t left join public.player_stats ps on ps.player_id=t.other),'[]'::jsonb),
  coalesce((select sum(k.unread) from k),0),
  (select count(*) from k)>(select count(*) from t),
  (select jsonb_build_object('at',k.last_at,'channel',k.channel) from k where k.n=30)
 into threads, n_dm, more_threads, threads_cursor;
 if not more_threads then threads_cursor:=null; end if;$new$,
  $new$'dm',n_dm+coalesce((crew->>'unread')::int,0)),$new$,
  $new$'threads',threads,'moreThreads',more_threads,'threadsCursor',threads_cursor,'blocked',blocked,$new$];
begin
 d:=pg_get_functiondef('public.chat_overview()'::regprocedure);
 if position('''moreThreads''' in d)>0 then raise notice 'chat_overview has moreThreads already'; return; end if;
 for i in 1..array_length(want,1) loop
  if (length(d)-length(replace(d,want[i],'')))/length(want[i])<>1 then raise exception 'chat_overview: part % (of 4) was not found once', i; end if;
  d:=replace(d,want[i],put[i]);
 end loop;
 execute d;
end $patch$;

-- 3. The next page of private chats after a cursor ({at, channel} from the overview or the page before), the same rows as the
-- overview's, newest first. The same blocks are left out. Without a cursor: the newest. At most 50 at a time.
create or replace function public.chat_threads(p_before_at timestamptz, p_before_channel text, p_limit integer default 30)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
 me uuid:=(select auth.uid()); joined timestamptz; lim int:=least(greatest(coalesce(p_limit,30),1),50); page jsonb; more boolean; last_one jsonb;
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in to use the chat.' using errcode='28000'; end if;
 select u.created_at into joined from auth.users u where u.id=me;
 with mine as (
  select m.channel, split_part(m.channel,':',3)::uuid as other, max(m.created_at) as last_at,
   count(*) filter (where m.sender<>me and m.created_at>coalesce(r.last_read_at,joined)) as unread
  from public.chat_messages m left join public.chat_reads r on r.player_id=me and r.channel=m.channel
  where m.channel like 'dm:%' and split_part(m.channel,':',2)=me::text group by m.channel
  union all
  select m.channel, split_part(m.channel,':',2)::uuid, max(m.created_at),
   count(*) filter (where m.sender<>me and m.created_at>coalesce(r.last_read_at,joined))
  from public.chat_messages m left join public.chat_reads r on r.player_id=me and r.channel=m.channel
  where m.channel like 'dm:%' and split_part(m.channel,':',3)=me::text group by m.channel
 ), k as (
  select mine.* from mine
  where not exists(select 1 from public.chat_blocks b where b.player_id=me and b.blocked_id=mine.other)
   and (p_before_at is null or mine.last_at<p_before_at or (mine.last_at=p_before_at and mine.channel collate "C"<coalesce(p_before_channel,'')))
  order by mine.last_at desc, mine.channel collate "C" desc limit lim+1
 ), t as (
  select k.* from k order by k.last_at desc, k.channel collate "C" desc limit lim
 )
 select coalesce((select jsonb_agg(jsonb_build_object(
   'channel',t.channel,'otherId',t.other,'otherName',coalesce(ps.username,'A farmer'),'otherAvatar',ps.avatar_id,'otherVip',coalesce(ps.vip_expires_at>now(),false),'lastAt',t.last_at,
   'last',(select jsonb_build_object('body',l.body,'mine',l.sender=me) from public.chat_messages l where l.channel=t.channel order by l.created_at desc limit 1),
   'unread',t.unread
  ) order by t.last_at desc, t.channel collate "C" desc) from t left join public.player_stats ps on ps.player_id=t.other),'[]'::jsonb),
  (select count(*) from k)>lim,
  (select jsonb_build_object('at',t.last_at,'channel',t.channel) from t order by t.last_at, t.channel collate "C" limit 1)
 into page, more, last_one;
 return jsonb_build_object('threads',page,'more',more,'cursor',case when more then last_one end);
end $function$;
revoke all on function public.chat_threads(timestamptz,text,integer) from public, anon;
grant execute on function public.chat_threads(timestamptz,text,integer) to authenticated;
