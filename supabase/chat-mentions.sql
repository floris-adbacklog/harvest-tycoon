-- Mentions in the chat (3 Oct 2026). In Global and Family a farmer types "@", picks a farmer from the list under the box and "@Full Name"
-- goes into the message (src/chat-ui.js, src/chat-rich.js); the message takes the picked farmers' ids along. Kept with the message
-- (meta.mentions: [{id, name}]), so the chip opens the right profile also after a rename. The one rule for the farmer who is mentioned:
-- a mention reaches you like a private message. The message gets a soft mark, Global a red count (its only one), the chat button and the
-- app icon count it, the private message's sound plays, and a push comes through the private messages switch (Settings: "Private
-- messages and mentions"), in the farmer's own language ("Bram mentioned you", supabase/functions/notify-hourly/messages.js).
-- Limits against spam to strangers: at most 3 farmers in one message, at most 10 different farmers an hour from one farmer, at most one
-- push per 3 minutes per farmer per chat (chat_push_state, as a private message), nothing for a farmer who blocked the writer, and in
-- Family only its members. Not in private chats or the Crew.
--
-- How: chat_send(text,text) stays as it is (one function for every chat, which other files patch). chat_send(p_channel, p_body,
-- p_mentions) is a second one, found by its third argument's name (PostgREST tells functions apart by their argument names; a game
-- that sends no mentions calls the first): it hands the ids to the insert for this transaction only (the setting
-- harvest.chat_mentions) and sends through the first. A trigger before the insert checks them against the stored message: the
-- farmer exists, "@" and their name of now is in the words, a member of the family, not yourself; then the limits. A refused limit
-- refuses the message, with the reason. The push trigger after the insert hands the push to notify-hourly?dm (a new kind, 'mention').
-- chat_overview (the count) and chat_push_claim (the push) are patched from their LIVE definition, as supabase/crazygames.sql does: a
-- patched one is left alone, one without the expected text stops the whole file, nothing half-done. Re-runnable. Read live on 3 Oct
-- 2026: chat_overview md5 0257f9ef8c0e97322b64e65d9a909f75, chat_push_claim 4d5e6ccbbaa02ab949a8812a615f6847.
-- Deploy notify-hourly with it (messages.js): before that, a mention's push goes out with the English title "Message from …".

-- 1. Sending with mentions.
create or replace function public.chat_send(p_channel text, p_body text, p_mentions uuid[]) returns jsonb language plpgsql set search_path to '' as $f$
declare result jsonb;
begin
 perform set_config('harvest.chat_mentions',coalesce(array_to_string(p_mentions[1:20],','),''),true);
 result:=public.chat_send(p_channel,p_body);
 perform set_config('harvest.chat_mentions','',true);
 return result;
end $f$;
revoke all on function public.chat_send(text,text,uuid[]) from public, anon;
grant execute on function public.chat_send(text,text,uuid[]) to authenticated;

-- Before the message is stored: the mentions it may carry. Only the writer's own message from chat_send, in Global or a family.
create or replace function public.chat_mentions_tag() returns trigger language plpgsql security definer set search_path to '' as $f$
declare raw text:=nullif(current_setting('harvest.chat_mentions',true),''); ids uuid[]; tags jsonb:='[]'::jsonb; who uuid; whose text; seen int;
begin
 if raw is null then return new; end if;
 perform set_config('harvest.chat_mentions','',true);
 if new.sender is distinct from (select auth.uid()) or coalesce(new.kind,'message')<>'message' then return new; end if;
 ids:=array(select distinct x from unnest(string_to_array(raw,',')::uuid[]) x where x is not null and x<>new.sender);
 if cardinality(ids)>3 then raise exception 'Mention up to 3 farmers in one message.' using errcode='22023'; end if;
 foreach who in array ids loop
  select ps.username into whose from public.player_stats ps where ps.player_id=who;
  continue when whose is null or position('@'||whose in new.body)=0 or public.harvest_portal_guest(who);
  continue when new.channel like 'family:%' and not exists(select 1 from public.family_members m where m.player_id=who and m.family_id=substr(new.channel,8)::uuid and m.left_at is null);
  tags:=tags||jsonb_build_array(jsonb_build_object('id',who,'name',whose));
 end loop;
 if jsonb_array_length(tags)=0 then return new; end if;
 select count(distinct y.x->>'id') into seen from (
  select jsonb_array_elements(m.meta->'mentions') as x from public.chat_messages m where m.sender=new.sender and m.created_at>now()-interval '1 hour' and jsonb_typeof(m.meta->'mentions')='array'
  union all select jsonb_array_elements(tags)) y;
 if seen>10 then raise exception 'You can mention up to 10 farmers an hour.' using errcode='54000'; end if;
 new.meta:=coalesce(new.meta,'{}'::jsonb)||jsonb_build_object('mentions',tags);
 return new;
end $f$;
revoke all on function public.chat_mentions_tag() from public, anon, authenticated;
drop trigger if exists chat_mentions_tag on public.chat_messages;
create trigger chat_mentions_tag before insert on public.chat_messages for each row when (new.channel='global' or new.channel like 'family:%') execute function public.chat_mentions_tag();

-- 2. The push, as for a private message: every mentioned farmer with notifications on (a browser or our app) and the private messages
-- switch on, who did not block the writer and is not reading that chat right now, at most once per 3 minutes per chat.
create or replace function public.chat_mention_push() returns trigger language plpgsql security definer set search_path to '' as $f$
declare n int;
begin
 insert into public.chat_push_state as s(player_id,channel,message_id,claimed,pushed_at)
  select distinct t.id,new.channel,new.id,false,now() from (select (x->>'id')::uuid as id from jsonb_array_elements(new.meta->'mentions') x) t
  where t.id<>new.sender
   and (exists(select 1 from public.push_subscriptions p where p.player_id=t.id) or exists(select 1 from public.app_push_players a where a.player_id=t.id and a.enabled))
   and exists(select 1 from public.notification_settings x where x.player_id=t.id and x.push_messages)
   and not exists(select 1 from public.chat_blocks b where b.player_id=t.id and b.blocked_id=new.sender)
   and not exists(select 1 from public.chat_reads r where r.player_id=t.id and r.channel=new.channel and r.last_read_at>now()-interval '2 minutes')
  on conflict (player_id,channel) do update set message_id=excluded.message_id,claimed=false,pushed_at=excluded.pushed_at where s.pushed_at<now()-interval '3 minutes';
 get diagnostics n=row_count;
 if n=0 then return null; end if;
 perform net.http_post(url:='https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/notify-hourly?dm',headers:='{"Content-Type":"application/json"}'::jsonb,
  body:=jsonb_build_object('message',new.id),timeout_milliseconds:=10000);
 return null;
exception when others then return null;   -- a notification never stands in the way of the message itself
end $f$;
revoke all on function public.chat_mention_push() from public, anon, authenticated;
drop trigger if exists chat_mention_push on public.chat_messages;
create trigger chat_mention_push after insert on public.chat_messages for each row when (new.meta ? 'mentions' and (new.channel='global' or new.channel like 'family:%')) execute function public.chat_mention_push();

-- Patches one function from its live definition: nothing when p_marker shows it is done already, an error when a text to change is
-- missing. p_pairs: what to change, as [from, to, from, to, ...], in that order.
create or replace function pg_temp.chat_mentions_patch(p_fn regprocedure, p_marker text, p_pairs text[])
returns void language plpgsql as $f$
declare def text:=pg_get_functiondef(p_fn);
begin
 if position(p_marker in def)>0 then return; end if;
 for i in 1..coalesce(array_length(p_pairs,1),0) by 2 loop
  if position(p_pairs[i] in def)=0 then raise exception using message=format('%s: the expected text was not found; read the live definition before changing it', p_fn); end if;
  def:=replace(def,p_pairs[i],p_pairs[i+1]);
 end loop;
 execute def;
end $f$;

-- 3. The count: mentions of you in Global since you last read it (the same day at most as its other messages), not from a farmer you
-- blocked. The game shows it on the Global tab, adds it to the chat button and the app icon.
select pg_temp.chat_mentions_patch('public.chat_overview()',$m$'mentions',(select count(*)$m$,array[
 $a$'unread',jsonb_build_object('notices',n_notices,'global',n_global,'family',n_family,$a$,
 $b$'unread',jsonb_build_object('notices',n_notices,'global',n_global,'family',n_family,
   'mentions',(select count(*) from (select 1 from public.chat_messages m where m.channel='global' and m.sender<>me and m.meta->'mentions' @> jsonb_build_array(jsonb_build_object('id',me))
    and not exists(select 1 from public.chat_blocks b where b.player_id=me and b.blocked_id=m.sender)
    and m.created_at>coalesce((select r.last_read_at from public.chat_reads r where r.player_id=me and r.channel='global'),greatest(joined,now()-interval '1 day')) limit 99) x),$b$]);

-- 4. Handing out the push, once: a mention to every farmer it was handed to (kind 'mention'). Every subscription now names its farmer,
-- so notify-hourly writes each farmer's title in their own language (private messages and the Crew too).
select pg_temp.chat_mentions_patch('public.chat_push_claim(uuid)',$m$'kind','mention'$m$,array[
 $a$jsonb_build_object('endpoint',p.endpoint,'p256dh',p.p256dh,'auth',p.auth)$a$,
 $b$jsonb_build_object('endpoint',p.endpoint,'p256dh',p.p256dh,'auth',p.auth,'player',p.player_id)$b$,
 $a$(channel like 'dm:%' or channel='crew')$a$,
 $b$(channel like 'dm:%' or channel='crew' or channel='global' or channel like 'family:%')$b$,
 $a$ -- The Crew: every member of the staff this message was handed to, once.$a$,
 $b$ -- A mention (supabase/chat-mentions.sql): every farmer it mentions that it was handed to, once.
 if m.channel='global' or m.channel like 'family:%' then
  with claimed as (update public.chat_push_state set claimed=true where channel=m.channel and message_id=m.id and not claimed returning player_id)
  select array_agg(player_id) into who from claimed;
  if who is null then return null; end if;
  return jsonb_build_object('kind','mention','senderName',m.sender_name,'body',left(m.body,140),'channel',m.channel,
   'subscriptions',coalesce((select jsonb_agg(jsonb_build_object('endpoint',p.endpoint,'p256dh',p.p256dh,'auth',p.auth,'player',p.player_id)) from public.push_subscriptions p where p.player_id=any(who)),'[]'::jsonb));
 end if;
 -- The Crew: every member of the staff this message was handed to, once.$b$]);
