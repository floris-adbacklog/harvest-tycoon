-- The admin sends one private message to many farmers at once (26 Sep 2026), for example to ask for feedback: farmers online now
-- (a farm action in the last 30 minutes, the same rule as the green dot), active this week, or everyone. Each farmer gets it as a
-- private message from the admin and can simply reply. Farmers who blocked the admin, banned farmers and farmers below the
-- private-message level are left out. Only the admin; the same text cannot be sent twice within 10 minutes (a double click).
-- Farmers with notifications on for messages also get a push, as for any private message (26 Sep 2026: at first there was none,
-- for fear of hundreds of Edge Function calls; but the push trigger only calls out for farmers with notifications on, 10 today).

-- 1. The DM push trigger as it was before (the broadcast no longer asks it to stay quiet).
create or replace function public.chat_dm_push()
 returns trigger language plpgsql security definer set search_path to '' as $function$
declare other uuid;
begin
 other:=(case when split_part(new.channel,':',2)=new.sender::text then split_part(new.channel,':',3) else split_part(new.channel,':',2) end)::uuid;
 if not exists(select 1 from public.push_subscriptions p where p.player_id=other) then return null; end if;
 if not exists(select 1 from public.notification_settings s where s.player_id=other and s.push_messages) then return null; end if;
 if exists(select 1 from public.chat_blocks b where b.player_id=other and b.blocked_id=new.sender) then return null; end if;
 if exists(select 1 from public.chat_reads r where r.player_id=other and r.channel=new.channel and r.last_read_at>now()-interval '2 minutes') then return null; end if;
 insert into public.chat_push_state as s(player_id,channel,message_id,claimed,pushed_at) values(other,new.channel,new.id,false,now())
  on conflict (player_id,channel) do update set message_id=excluded.message_id,claimed=false,pushed_at=excluded.pushed_at where s.pushed_at<now()-interval '3 minutes';
 if not found then return null; end if;
 perform net.http_post(url:='https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/notify-hourly?dm',headers:='{"Content-Type":"application/json"}'::jsonb,
  body:=jsonb_build_object('message',new.id),timeout_milliseconds:=10000);
 return null;
exception when others then return null;
end $function$;

-- 2. Who gets it.
create or replace function public.chat_broadcast_targets(p_sender uuid, p_audience text)
 returns table(player_id uuid) language sql stable security definer set search_path to '' as $function$
 select ps.player_id from public.player_stats ps
 where ps.player_id<>p_sender and ps.username is not null
  and ps.level>=(select c.dm_level from public.chat_config c)
  and (p_audience='all' or (p_audience='online' and ps.last_active_at>now()-interval '30 minutes') or (p_audience='week' and ps.last_active_at>now()-interval '7 days'))
  and not exists(select 1 from public.chat_blocks b where b.player_id=ps.player_id and b.blocked_id=p_sender)
  and not exists(select 1 from public.chat_sanctions s where s.player_id=ps.player_id and s.banned)
$function$;
revoke all on function public.chat_broadcast_targets(uuid,text) from public, anon, authenticated;

-- 3. Count first (p_send false), then send: one message per farmer in the private chat between the admin and them.
create or replace function public.chat_broadcast_dm(p_body text, p_audience text, p_send boolean default false)
 returns integer language plpgsql security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); msg text; nm text; av text; vip boolean; n integer;
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_audience is null or p_audience not in ('online','week','all') then raise exception 'Choose who gets it.' using errcode='22023'; end if;
 if not coalesce(p_send,false) then return (select count(*) from public.chat_broadcast_targets(me,p_audience)); end if;
 msg:=regexp_replace(btrim(coalesce(p_body,'')),'\s+',' ','g');
 if char_length(msg)<1 or char_length(msg)>500 then raise exception 'Write 1–500 characters.' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('broadcast:'||me::text,0));
 if exists(select 1 from public.chat_messages m where m.sender=me and m.channel like 'dm:%' and m.body=msg and m.created_at>now()-interval '10 minutes') then raise exception 'You sent this message a moment ago.' using errcode='54000'; end if;
 select ps.username, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, av, vip from public.player_stats ps where ps.player_id=me;
 insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_staff,sender_vip,body)
  select 'dm:'||(case when me::text<t.player_id::text then me::text||':'||t.player_id::text else t.player_id::text||':'||me::text end),me,nm,av,true,vip,msg
  from public.chat_broadcast_targets(me,p_audience) t;
 get diagnostics n=row_count;
 -- The admin's own side counts as read, so hundreds of chats do not light up as unread for them.
 insert into public.chat_reads(player_id,channel,last_read_at)
  select me,'dm:'||(case when me::text<t.player_id::text then me::text||':'||t.player_id::text else t.player_id::text||':'||me::text end),now() from public.chat_broadcast_targets(me,p_audience) t
  on conflict (player_id,channel) do update set last_read_at=excluded.last_read_at;
 return n;
end $function$;
revoke all on function public.chat_broadcast_dm(text,text,boolean) from public, anon;
grant execute on function public.chat_broadcast_dm(text,text,boolean) to authenticated;
