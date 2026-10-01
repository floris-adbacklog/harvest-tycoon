-- The Crew's messages as a push, like a private message (1 Oct 2026): every other member of the staff with notifications on for
-- messages gets "Message from Bram (Crew)"; tapping it opens the Crew. The same rules as a private message: not while they have
-- the Crew open (read in the last 2 minutes), and at most one push per 3 minutes per farmer. The same Edge Function sends it
-- (notify-hourly?dm): chat_push_claim hands each farmer's push out once and gives the subscriptions of everyone who gets it.
-- Run after chat-crew.sql. chat_push_claim as live on 1 Oct 2026, with the Crew added.

create or replace function public.chat_crew_push()
 returns trigger language plpgsql security definer set search_path to '' as $function$
declare n int;
begin
 insert into public.chat_push_state as s(player_id,channel,message_id,claimed,pushed_at)
  select distinct p.player_id,'crew',new.id,false,now() from public.push_subscriptions p
  where p.player_id<>new.sender and public.chat_staff_role(p.player_id) is not null
   and exists(select 1 from public.notification_settings x where x.player_id=p.player_id and x.push_messages)
   and not exists(select 1 from public.chat_reads r where r.player_id=p.player_id and r.channel='crew' and r.last_read_at>now()-interval '2 minutes')
  on conflict (player_id,channel) do update set message_id=excluded.message_id,claimed=false,pushed_at=excluded.pushed_at where s.pushed_at<now()-interval '3 minutes';
 get diagnostics n=row_count;
 if n=0 then return null; end if;
 perform net.http_post(url:='https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/notify-hourly?dm',headers:='{"Content-Type":"application/json"}'::jsonb,
  body:=jsonb_build_object('message',new.id),timeout_milliseconds:=10000);
 return null;
exception when others then return null;
end $function$;
revoke all on function public.chat_crew_push() from public, anon, authenticated;
drop trigger if exists chat_crew_push on public.chat_messages;
create trigger chat_crew_push after insert on public.chat_messages for each row when (new.channel='crew') execute function public.chat_crew_push();

create or replace function public.chat_push_claim(p_message uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare m public.chat_messages; other uuid; who uuid[];
begin
 select * into m from public.chat_messages where id=p_message and (channel like 'dm:%' or channel='crew') and created_at>now()-interval '10 minutes';
 if not found then return null; end if;
 -- The Crew: every member of the staff this message was handed to, once.
 if m.channel='crew' then
  with claimed as (update public.chat_push_state set claimed=true where channel='crew' and message_id=m.id and not claimed returning player_id)
  select array_agg(player_id) into who from claimed;
  if who is null then return null; end if;
  return jsonb_build_object('senderName',m.sender_name||' (Crew)','body',left(m.body,140),'channel',m.channel,
   'subscriptions',coalesce((select jsonb_agg(jsonb_build_object('endpoint',p.endpoint,'p256dh',p.p256dh,'auth',p.auth)) from public.push_subscriptions p where p.player_id=any(who)),'[]'::jsonb));
 end if;
 other:=(case when split_part(m.channel,':',2)=m.sender::text then split_part(m.channel,':',3) else split_part(m.channel,':',2) end)::uuid;
 update public.chat_push_state set claimed=true where player_id=other and channel=m.channel and message_id=m.id and not claimed;
 if not found then return null; end if;
 return jsonb_build_object('senderName',m.sender_name,'body',left(m.body,140),'channel',m.channel,
  'subscriptions',coalesce((select jsonb_agg(jsonb_build_object('endpoint',p.endpoint,'p256dh',p.p256dh,'auth',p.auth)) from public.push_subscriptions p where p.player_id=other),'[]'::jsonb));
end $function$;
