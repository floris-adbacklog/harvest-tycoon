-- Who reported a message (28 Sep 2026): the staff's report list and report log now also give the farmers who reported it, oldest
-- report first, each with the reason they gave. Only staff reach these functions; the reported farmer never learns who it was.
-- These are the live chat_mod_reports (md5 365bd6180bf9f25b6b55483cab4d7d98) and chat_mod_log (md5 200e3bb5fdb197cfaeb40bdbc3ea5add)
-- read on 28 Sep 2026, with only the "reporters" field added.
create or replace function public.chat_mod_reports() returns jsonb language plpgsql stable security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(x order by x.first_at) from (
  select r.message_id as "messageId", min(r.channel) as channel, min(r.sender::text)::uuid as sender, min(r.sender_name) as "senderName", min(r.body) as body,
   count(*) as reports, array_remove(array_agg(r.reason),null) as reasons, min(r.created_at) as first_at,
   exists(select 1 from public.chat_messages m where m.id=r.message_id) as present,
   (select coalesce(jsonb_agg(jsonb_build_object('id',q.reporter,'name',ps.username,'reason',q.reason) order by q.created_at),'[]'::jsonb)
     from public.chat_reports q left join public.player_stats ps on ps.player_id=q.reporter
     where q.message_id=r.message_id and q.resolved_at is null) as reporters
  from public.chat_reports r where r.resolved_at is null group by r.message_id limit 100) x),'[]'::jsonb);
end $f$;

create or replace function public.chat_mod_log() returns jsonb language plpgsql stable security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(x order by x."lastAt" desc) from (
  select r.message_id as "messageId", min(r.channel) as channel, min(r.sender::text)::uuid as sender, min(r.sender_name) as "senderName", min(r.body) as body,
   count(*) as reports, max(r.created_at) as "lastAt", bool_or(r.resolved_at is null) as open, max(r.resolved_at) as "handledAt",
   (array_agg(r.action order by r.resolved_at desc nulls last))[1] as action,
   (select ps.username from public.player_stats ps where ps.player_id=(array_agg(r.resolved_by order by r.resolved_at desc nulls last))[1]) as "handledBy",
   (select coalesce(jsonb_agg(jsonb_build_object('id',q.reporter,'name',ps.username,'reason',q.reason) order by q.created_at),'[]'::jsonb)
     from public.chat_reports q left join public.player_stats ps on ps.player_id=q.reporter
     where q.message_id=r.message_id) as reporters
  from public.chat_reports r group by r.message_id order by max(r.created_at) desc limit 100) x),'[]'::jsonb);
end $f$;
