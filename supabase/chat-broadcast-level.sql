-- The admin's private message to many farmers (chat-broadcast-dm.sql) from a farm level too (29 Sep 2026): for example "active
-- this week" and level 14 or higher, the farmers who can buy the special offer. Level 1 is everyone, as before; the private-message
-- level (chat_config.dm_level) still applies on top. The old versions without a level are dropped, so the game's call has one
-- function to match; a call without p_min_level still works (level 1).
drop function if exists public.chat_broadcast_dm(text,text,boolean);
drop function if exists public.chat_broadcast_targets(uuid,text);

create or replace function public.chat_broadcast_targets(p_sender uuid, p_audience text, p_min_level integer)
 returns table(player_id uuid) language sql stable security definer set search_path to '' as $function$
 select ps.player_id from public.player_stats ps
 where ps.player_id<>p_sender and ps.username is not null
  and ps.level>=greatest((select c.dm_level from public.chat_config c),coalesce(p_min_level,1))
  and (p_audience='all' or (p_audience='online' and ps.last_active_at>now()-interval '30 minutes') or (p_audience='week' and ps.last_active_at>now()-interval '7 days'))
  and not exists(select 1 from public.chat_blocks b where b.player_id=ps.player_id and b.blocked_id=p_sender)
  and not exists(select 1 from public.chat_sanctions s where s.player_id=ps.player_id and s.banned)
$function$;
revoke all on function public.chat_broadcast_targets(uuid,text,integer) from public, anon, authenticated;

create or replace function public.chat_broadcast_dm(p_body text, p_audience text, p_send boolean default false, p_min_level integer default 1)
 returns integer language plpgsql security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); msg text; nm text; av text; vip boolean; n integer; lvl integer:=coalesce(p_min_level,1);
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_audience is null or p_audience not in ('online','week','all') then raise exception 'Choose who gets it.' using errcode='22023'; end if;
 if lvl not between 1 and 200 then raise exception 'Choose a level from 1 to 200.' using errcode='22023'; end if;
 if not coalesce(p_send,false) then return (select count(*) from public.chat_broadcast_targets(me,p_audience,lvl)); end if;
 msg:=regexp_replace(btrim(coalesce(p_body,'')),'\s+',' ','g');
 if char_length(msg)<1 or char_length(msg)>500 then raise exception 'Write 1–500 characters.' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('broadcast:'||me::text,0));
 if exists(select 1 from public.chat_messages m where m.sender=me and m.channel like 'dm:%' and m.body=msg and m.created_at>now()-interval '10 minutes') then raise exception 'You sent this message a moment ago.' using errcode='54000'; end if;
 select ps.username, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, av, vip from public.player_stats ps where ps.player_id=me;
 insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_staff,sender_vip,body)
  select 'dm:'||(case when me::text<t.player_id::text then me::text||':'||t.player_id::text else t.player_id::text||':'||me::text end),me,nm,av,true,vip,msg
  from public.chat_broadcast_targets(me,p_audience,lvl) t;
 get diagnostics n=row_count;
 -- The admin's own side counts as read, so hundreds of chats do not light up as unread for them.
 insert into public.chat_reads(player_id,channel,last_read_at)
  select me,'dm:'||(case when me::text<t.player_id::text then me::text||':'||t.player_id::text else t.player_id::text||':'||me::text end),now() from public.chat_broadcast_targets(me,p_audience,lvl) t
  on conflict (player_id,channel) do update set last_read_at=excluded.last_read_at;
 return n;
end $function$;
revoke all on function public.chat_broadcast_dm(text,text,boolean,integer) from public, anon;
grant execute on function public.chat_broadcast_dm(text,text,boolean,integer) to authenticated;
