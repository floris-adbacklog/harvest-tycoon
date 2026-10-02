-- Feedback gets a third kind (2 Oct 2026): next to Feedback and Report a bug, Request a feature (public/feedback-ui.js); the
-- mailbox button is called just Feedback now. feedback_send as live on 2 Oct 2026 (md5 of the body b9f6168e10b2a49c0f959ca22d8e4c60),
-- with 'feature' allowed.
alter table public.feedback_reports drop constraint if exists feedback_reports_kind_check;
alter table public.feedback_reports add constraint feedback_reports_kind_check check (kind in ('feedback','bug','feature'));

create or replace function public.feedback_send(p_kind text, p_body text, p_level integer default null, p_device text default null, p_language text default null)
 returns void language plpgsql security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); message text:=btrim(coalesce(p_body,''));
begin
 if me is null or coalesce((select auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in to send feedback.' using errcode='28000'; end if;
 if p_kind is null or p_kind not in ('feedback','bug','feature') then raise exception 'Choose feedback, a bug or a feature request.' using errcode='22023'; end if;
 if char_length(message)<3 or char_length(message)>1000 then raise exception 'Write between 3 and 1,000 characters.' using errcode='22023'; end if;
 if (select count(*) from public.feedback_reports r where r.player_id=me and r.created_at>now()-interval '1 hour')>=5 then
  raise exception 'Thanks, we have your messages. Try again later.' using errcode='54000'; end if;
 delete from public.feedback_reports where created_at<now()-interval '1 year';
 insert into public.feedback_reports(player_id,kind,body,level,device,language)
  values(me,p_kind,message,case when p_level between 1 and 1000 then p_level end,
   left(nullif(btrim(coalesce(p_device,'')),''),300),left(nullif(btrim(coalesce(p_language,'')),''),12));
end $function$;
