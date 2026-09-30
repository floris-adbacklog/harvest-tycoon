-- Feedback & bugs (30 Sep 2026): a farmer writes to the team with the mailbox button (public/feedback-ui.js); the admin and the
-- moderators read it in the staff dashboard, tab Feedback (src/admin-dashboard.js), with the farmer's name, the time, their level,
-- device and game language, and mark it done. Players reach the table only through these functions.
create table if not exists public.feedback_reports(
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('feedback','bug')),
 body text not null check (char_length(body) between 3 and 1000),
 level integer, device text, language text,
 created_at timestamptz not null default now(),
 handled_at timestamptz, handled_by uuid references auth.users(id) on delete set null);
create index if not exists feedback_reports_open on public.feedback_reports(created_at desc) where handled_at is null;
create index if not exists feedback_reports_player on public.feedback_reports(player_id, created_at desc);
create index if not exists feedback_reports_age on public.feedback_reports(created_at);
alter table public.feedback_reports enable row level security;
revoke all on public.feedback_reports from anon, authenticated;

-- Any signed-in farmer, at most 5 messages an hour (the game says so in the farmer's language: errcode 54000). Every message sent
-- also clears the ones older than a year (the privacy policy keeps them one year).
create or replace function public.feedback_send(p_kind text, p_body text, p_level integer default null, p_device text default null, p_language text default null)
 returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid()); message text:=btrim(coalesce(p_body,''));
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in to send feedback.' using errcode='28000'; end if;
 if p_kind is null or p_kind not in ('feedback','bug') then raise exception 'Choose feedback or a bug.' using errcode='22023'; end if;
 if char_length(message)<3 or char_length(message)>1000 then raise exception 'Write between 3 and 1,000 characters.' using errcode='22023'; end if;
 if (select count(*) from public.feedback_reports r where r.player_id=me and r.created_at>now()-interval '1 hour')>=5 then
  raise exception 'Thanks, we have your messages. Try again later.' using errcode='54000'; end if;
 delete from public.feedback_reports where created_at<now()-interval '1 year';
 insert into public.feedback_reports(player_id,kind,body,level,device,language)
  values(me,p_kind,message,case when p_level between 1 and 1000 then p_level end,
   left(nullif(btrim(coalesce(p_device,'')),''),300),left(nullif(btrim(coalesce(p_language,'')),''),12));
end $f$;
revoke all on function public.feedback_send(text,text,integer,text,text) from public, anon;
grant execute on function public.feedback_send(text,text,integer,text,text) to authenticated;

-- The staff: the open messages (or the done ones), newest first, with the farmer's current name and who marked it done.
create or replace function public.feedback_list(p_done boolean default false) returns jsonb language plpgsql stable security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(x order by x."createdAt" desc) from (
  select r.id, r.player_id as "playerId", ps.username as name, r.kind, r.body, r.level, r.device, r.language, r.created_at as "createdAt",
   r.handled_at as "handledAt", (select h.username from public.player_stats h where h.player_id=r.handled_by) as "handledBy"
  from public.feedback_reports r left join public.player_stats ps on ps.player_id=r.player_id
  where (r.handled_at is not null)=coalesce(p_done,false)
  order by r.created_at desc limit 200) x),'[]'::jsonb);
end $f$;
revoke all on function public.feedback_list(boolean) from public, anon;
grant execute on function public.feedback_list(boolean) to authenticated;

create or replace function public.feedback_handle(p_id uuid, p_done boolean default true) returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());
begin
 if public.chat_staff_role(me) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 update public.feedback_reports set handled_at=case when p_done then now() end, handled_by=case when p_done then me end where id=p_id;
 if not found then raise exception 'This message is no longer there.' using errcode='22023'; end if;
end $f$;
revoke all on function public.feedback_handle(uuid,boolean) from public, anon;
grant execute on function public.feedback_handle(uuid,boolean) to authenticated;
