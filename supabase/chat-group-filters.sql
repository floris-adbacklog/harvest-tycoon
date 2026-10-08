-- Group messages with filters (8 Oct 2026). The admin's private message to many farmers (chat-broadcast-dm.sql, from a level since
-- chat-broadcast-level.sql, in each farmer's language since admin-texts-languages.sql) goes to the farmers who match every filter the
-- admin sets in the Admin dashboard (Settings, News and pop-ups, Send as: Private message), all together. Only these keys:
--  minLevel, maxLevel  1 to 200 (the private-message level, chat_config.dm_level, still applies on top)
--  active              online (a farm action in the last 30 minutes, the green dot), week (7 days), month (30 days) or all
--  platform            where their last farm load was: android (our Android app from Google Play: " HarvestTycoonApp/" in the user agent,
--                      kept in player_seen.device, on Android), ios (our iPhone app from the App Store: the same mark on an iPhone, iPad
--                      or iPad in desktop mode, as public/android-app.js tells them apart) or browser (no app mark, CrazyGames included).
--                      A farmer with no load on record is in none of them.
--  notPlatform         the same three, left out (the owner, 8 Oct 2026: "exclude Google Play", ready for the App Store): a farmer with
--                      no load on record is not left out. It cannot be the same place as platform.
--  crazygames          true: a CrazyGames account (app_metadata.portal). Guests never get one, with or without this filter.
--  language            one game language, the one they last played in (player_seen.language). It was never saved before 1 Oct 2026,
--                      when the game was English only: no language on record is English, as the text they get.
--  family              in or out (a family that still exists, as chat_overview reads it)
-- An unknown key or a value it cannot take is refused and nothing goes. No limit per farmer (the owner's choice, 8 Oct 2026).
-- New for every message to many: farmers who switched private messages off are left out (until now only farmers could not reach
-- them; the staff still can, one by one, as chat_send allows).
-- Every copy carries the group in its meta ({"group":{"id":…,"filters":{…}}}), so the game shows above it "Group message from the
-- team" and who it was sent to, one pill per filter in the farmer's language (src/chat-ui.js groupPills): built from these checked
-- filters, never from the admin's text. Every send is logged in public.chat_broadcasts (row-level security on, no policy: nobody
-- reads it directly); chat_broadcast_log gives the admin the last ones, to how many farmers and how many of those chats got a reply,
-- counted when asked. The dashboard of before keeps working: its call (audience and level) becomes one with filters.
-- Built on the live definitions of 8 Oct 2026: chat_broadcast_dm(text,text,boolean,integer,jsonb) (md5 of pg_get_functiondef
-- a9eb04b87c3e15c05be67613391fb2ab) is replaced only while it is still that one, and harvest_delete_account gets one line after its
-- chat_settings line. Re-runnable: a second run changes nothing. Run it before the new dashboard; without it the dashboard offers the
-- old choice only and the chat shows no group line.

-- 0. The old function is replaced below: stop here if it changed on live since it was read.
do $check$
declare d text:=pg_get_functiondef('public.chat_broadcast_dm(text,text,boolean,integer,jsonb)'::regprocedure);
begin
 if position($m$jsonb_build_object('active',p_audience,'minLevel',lvl)$m$ in d)>0 then return; end if;
 if md5(d)<>'a9eb04b87c3e15c05be67613391fb2ab' then raise exception 'chat_broadcast_dm changed on live after 8 Oct 2026: read it again before running this file'; end if;
end $check$;

-- 1. The log: one row per send. Keyed on the admin who sent it, so it goes with their account (harvest_delete_account, 7. below).
create table if not exists public.chat_broadcasts(
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references auth.users(id) on delete cascade,
 filters jsonb not null default '{}'::jsonb,
 body text not null,
 recipients integer not null check (recipients>=0),
 sent_at timestamptz not null default now()
);
create index if not exists chat_broadcasts_sent on public.chat_broadcasts(sent_at desc);
alter table public.chat_broadcasts enable row level security;
revoke all on public.chat_broadcasts from public, anon, authenticated;

-- 2. The filters as sent, checked: the same filters in one form ({} is every farmer). What changes nothing is left out (level 1,
-- up to level 200, active all), so the farmer's line only names what was chosen.
create or replace function public.chat_broadcast_filters(p_filters jsonb)
 returns jsonb language plpgsql immutable set search_path to '' as $f$
declare f jsonb:=coalesce(p_filters,'{}'::jsonb); out jsonb:='{}'::jsonb; k text; v jsonb; s text;
begin
 if jsonb_typeof(f)<>'object' then raise exception 'Choose who gets it.' using errcode='22023'; end if;
 for k, v in select key, value from jsonb_each(f) loop
  s:=v#>>'{}';
  if k not in ('minLevel','maxLevel','active','platform','notPlatform','crazygames','language','family') then raise exception 'There is no filter called %.', k using errcode='22023'; end if;
  if k in ('minLevel','maxLevel') then
   -- In a case, so the text is only read as a number once it is one (an or may be worked out in any order).
   if case when jsonb_typeof(v)='number' and s ~ '^[0-9]{1,3}$' then s::integer not between 1 and 200 else true end then raise exception 'Choose a level from 1 to 200.' using errcode='22023'; end if;
   if (k='minLevel' and s::integer>1) or (k='maxLevel' and s::integer<200) then out:=out||jsonb_build_object(k,s::integer); end if;
  elsif k='crazygames' then
   if v is distinct from 'true'::jsonb then raise exception 'The filter % cannot be %.', k, v using errcode='22023'; end if;
   out:=out||jsonb_build_object(k,true);
  elsif jsonb_typeof(v)<>'string' or not ((k='active' and s in ('online','week','month','all')) or (k in ('platform','notPlatform') and s in ('android','ios','browser'))
   or (k='language' and s in ('en','cs','de','es','fr','id','hu','nl','pt','tr','ru','uk','hi','ja','ar','zh')) or (k='family' and s in ('in','out'))) then
   raise exception 'The filter % cannot be %.', k, v using errcode='22023';
  elsif not (k='active' and s='all') then out:=out||jsonb_build_object(k,s);
  end if;
 end loop;
 if (out->>'minLevel')::integer>(out->>'maxLevel')::integer then raise exception 'Up to level must be at least From level.' using errcode='22023'; end if;
 if out->>'platform'=out->>'notPlatform' then raise exception 'Leave out a different place than the one you chose.' using errcode='22023'; end if;
 return out;
end $f$;
revoke all on function public.chat_broadcast_filters(jsonb) from public, anon, authenticated;

-- Where a farm was last loaded, from its user agent (player_seen.device): null when nothing is on record.
create or replace function public.chat_broadcast_platform(p_device text, p_platform text)
 returns boolean language sql immutable set search_path to '' as $function$
 select case p_platform when 'android' then p_device like '%HarvestTycoonApp/%' and p_device like '%Android%'
  when 'ios' then p_device like '%HarvestTycoonApp/%' and p_device ~ '(iPhone|iPad|iPod|Macintosh)'
  when 'browser' then p_device not like '%HarvestTycoonApp/%' end
$function$;
revoke all on function public.chat_broadcast_platform(text,text) from public, anon, authenticated;

-- 3. Who gets it: every filter (checked by 2. first), and as before never a farmer who blocked the admin, is banned from the chat or is a
-- CrazyGames guest; now also never a farmer whose private messages are off. With the language they last played in, for their text.
create or replace function public.chat_broadcast_targets(p_sender uuid, p_filters jsonb)
 returns table(player_id uuid, language text) language sql stable security definer set search_path to '' as $function$
 select ps.player_id, seen.language from public.player_stats ps left join public.player_seen seen on seen.player_id=ps.player_id
 where ps.player_id<>p_sender and ps.username is not null
  and ps.level>=greatest((select c.dm_level from public.chat_config c),coalesce((p_filters->>'minLevel')::integer,1))
  and (p_filters->>'maxLevel' is null or ps.level<=(p_filters->>'maxLevel')::integer)
  and (case p_filters->>'active' when 'online' then ps.last_active_at>now()-interval '30 minutes' when 'week' then ps.last_active_at>now()-interval '7 days'
   when 'month' then ps.last_active_at>now()-interval '30 days' else true end)
  and (p_filters->>'platform' is null or public.chat_broadcast_platform(seen.device,p_filters->>'platform'))
  and (p_filters->>'notPlatform' is null or not coalesce(public.chat_broadcast_platform(seen.device,p_filters->>'notPlatform'),false))
  and (p_filters->'crazygames' is null or exists(select 1 from auth.users u where u.id=ps.player_id and u.raw_app_meta_data->>'portal'='crazygames'))
  and (p_filters->>'language' is null or coalesce(seen.language,'en')=p_filters->>'language')
  and (case p_filters->>'family' when 'in' then exists(select 1 from public.family_members m join public.families fa on fa.id=m.family_id where m.player_id=ps.player_id and m.left_at is null and fa.deleted_at is null)
   when 'out' then not exists(select 1 from public.family_members m join public.families fa on fa.id=m.family_id where m.player_id=ps.player_id and m.left_at is null and fa.deleted_at is null) else true end)
  and not exists(select 1 from public.chat_blocks b where b.player_id=ps.player_id and b.blocked_id=p_sender)
  and not exists(select 1 from public.chat_sanctions s where s.player_id=ps.player_id and s.banned)
  and not exists(select 1 from public.chat_settings cs where cs.player_id=ps.player_id and cs.private_off)
  and not public.harvest_portal_guest(ps.player_id)
$function$;
revoke all on function public.chat_broadcast_targets(uuid,jsonb) from public, anon, authenticated;

-- 4. Count first (p_send false), then send, as the old function did (its checks, the text per language, the 10-minute guard against
-- a double click, now for the same text to the same group: the same text may go to another group at once), now with the filters
-- and the group on every copy, and logged.
create or replace function public.chat_broadcast_dm(p_body text, p_filters jsonb, p_send boolean default false, p_texts jsonb default null)
 returns integer language plpgsql security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); f jsonb; msg text; nm text; av text; vip boolean; n integer; own jsonb; gid uuid:=gen_random_uuid();
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) or public.harvest_portal_guest(me) then raise exception 'Sign in to use the chat.' using errcode='28000'; end if;
 if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 f:=public.chat_broadcast_filters(p_filters);
 if not coalesce(p_send,false) then return (select count(*) from public.chat_broadcast_targets(me,f)); end if;
 msg:=regexp_replace(btrim(coalesce(p_body,'')),'\s+',' ','g');
 if char_length(msg)<1 or char_length(msg)>500 then raise exception 'Write 1–500 characters.' using errcode='22023'; end if;
 select coalesce(jsonb_object_agg(key,regexp_replace(value->>'body','\s+',' ','g')),'{}'::jsonb) into own from jsonb_each(public.admin_texts(p_texts,500)) where value ? 'body';
 perform pg_advisory_xact_lock(hashtextextended('broadcast:'||me::text,0));
 if exists(select 1 from public.chat_messages m where m.sender=me and m.channel like 'dm:%' and (m.body=msg or m.body in (select value from jsonb_each_text(own))) and m.created_at>now()-interval '10 minutes' and m.meta->'group'->'filters'=f) then raise exception 'You sent this message a moment ago.' using errcode='54000'; end if;
 select ps.username, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, av, vip from public.player_stats ps where ps.player_id=me;
 -- One copy per farmer in the private chat between the admin and them, in the language they last played in (else English), with the
 -- group. The admin's own side counts as read, so hundreds of chats do not light up as unread for them. Every copy has the same time
 -- as the log row (now()): that is how chat_broadcast_log finds them.
 with sent as (
  insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_staff,sender_vip,body,meta)
  select 'dm:'||(case when me::text<t.player_id::text then me::text||':'||t.player_id::text else t.player_id::text||':'||me::text end),me,nm,av,true,vip,coalesce(own->>t.language,msg),
   jsonb_build_object('group',jsonb_build_object('id',gid,'filters',f))
  from public.chat_broadcast_targets(me,f) t
  returning channel
 )
 insert into public.chat_reads(player_id,channel,last_read_at) select me,sent.channel,now() from sent
  on conflict (player_id,channel) do update set last_read_at=excluded.last_read_at;
 get diagnostics n=row_count;
 if n>0 then insert into public.chat_broadcasts(id,sender,filters,body,recipients,sent_at) values(gid,me,f,msg,n,now()); end if;
 return n;
end $function$;
revoke all on function public.chat_broadcast_dm(text,jsonb,boolean,jsonb) from public, anon;
grant execute on function public.chat_broadcast_dm(text,jsonb,boolean,jsonb) to authenticated;

-- 5. The dashboard of before (and a tab left open while this goes live): its call, audience and level, as one with filters. Its
-- parameters differ from the new one's (p_audience, p_min_level against p_filters), so the API tells the two calls apart by name.
create or replace function public.chat_broadcast_dm(p_body text, p_audience text, p_send boolean default false, p_min_level integer default 1, p_texts jsonb default null)
 returns integer language plpgsql security definer set search_path to '' as $function$
declare lvl integer:=coalesce(p_min_level,1);
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_audience is null or p_audience not in ('online','week','all') then raise exception 'Choose who gets it.' using errcode='22023'; end if;
 return public.chat_broadcast_dm(p_body,jsonb_build_object('active',p_audience,'minLevel',lvl),p_send,p_texts);
end $function$;
revoke all on function public.chat_broadcast_dm(text,text,boolean,integer,jsonb) from public, anon;
grant execute on function public.chat_broadcast_dm(text,text,boolean,integer,jsonb) to authenticated;

-- 6. The last sends for the dashboard, newest first: the text, the filters, to how many farmers, by which admin, and in how many of
-- those chats the farmer wrote after it came (a reply; also one after a later message of the admin's counts).
create or replace function public.chat_broadcast_log(p_limit integer default 10)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid());
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) or public.harvest_portal_guest(me) then raise exception 'Sign in to use the chat.' using errcode='28000'; end if;
 if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'body',b.body,'filters',b.filters,'recipients',b.recipients,'sentAt',b.sent_at,
   'senderName',(select ps.username from public.player_stats ps where ps.player_id=b.sender),
   'replies',(select count(*) from public.chat_messages m where m.sender=b.sender and m.created_at=b.sent_at and m.channel like 'dm:%' and m.meta->'group'->>'id'=b.id::text
     and exists(select 1 from public.chat_messages r where r.channel=m.channel and r.sender<>b.sender and r.created_at>m.created_at))
  ) order by b.sent_at desc)
  from (select x.* from public.chat_broadcasts x order by x.sent_at desc limit least(greatest(coalesce(p_limit,10),1),50)) b),'[]'::jsonb);
end $function$;
revoke all on function public.chat_broadcast_log(integer) from public, anon;
grant execute on function public.chat_broadcast_log(integer) to authenticated;

-- 7. Delete account (delete-account.sql): the admin's log rows go with their account, next to their chat settings. Patched from the
-- LIVE definition: patched already, left alone; the line not found once, the whole file stops.
do $patch$
declare d text:=pg_get_functiondef('public.harvest_delete_account(uuid,text)'::regprocedure);
 want text:=$a$delete from public.chat_settings where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_settings',n);$a$;
begin
 if position('public.chat_broadcasts' in d)>0 then return; end if;
 if (length(d)-length(replace(d,want,'')))/length(want)<>1 then raise exception 'harvest_delete_account: the chat_settings line was not found once; read the live definition before changing it'; end if;
 execute replace(d,want,want||$b$
 delete from public.chat_broadcasts where sender=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_broadcasts',n);$b$);
end $patch$;
revoke all on function public.harvest_delete_account(uuid,text) from public, anon, authenticated;
grant execute on function public.harvest_delete_account(uuid,text) to service_role;
