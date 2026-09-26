-- Pop-ups, 26 Sep 2026 (later the same day). The admin sends a notification, a pop-up or both: a pop-up no longer always posts the
-- news too. Clearer groups: "in the browser (phone or computer)" (was "not using the app yet", 'no_app' -> 'browser') and the new
-- "phones in the browser", for "install the app". Run after popups.sql.
alter table public.popups drop constraint if exists popups_audience_check;
update public.popups set audience='browser' where audience='no_app';
alter table public.popups add constraint popups_audience_check check (audience in ('all','browser','phone_browser','phone','desktop'));

drop function if exists public.popup_post(text,text,text,text,text,integer,integer);
create or replace function public.popup_post(p_title text, p_body text, p_button_label text, p_button_target text, p_audience text, p_min_level integer, p_hours integer, p_news boolean default true)
returns uuid language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());t text:=btrim(coalesce(p_title,''));b text:=btrim(coalesce(p_body,''));
 label text:=nullif(btrim(coalesce(p_button_label,'')),'');target text:=nullif(btrim(coalesce(p_button_target,'')),'');
 who text:=coalesce(nullif(p_audience,''),'all');lvl integer:=coalesce(p_min_level,1);hours integer:=coalesce(p_hours,0);
 news uuid;popup uuid;ends timestamptz;
begin
 if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if char_length(t)<1 or char_length(t)>60 then raise exception 'Write a title of 1–60 characters.' using errcode='22023'; end if;
 if char_length(b)<1 or char_length(b)>400 then raise exception 'Write 1–400 characters.' using errcode='22023'; end if;
 if (label is null)<>(target is null) then raise exception 'A button needs a text and a place to go.' using errcode='22023'; end if;
 if char_length(label)>30 then raise exception 'Keep the button text to 30 characters.' using errcode='22023'; end if;
 if char_length(target)>300 or target !~ '^(screen:(install|today|events|leaderboard|chat|shop|family|wiki)|https://[^[:space:]<>"]+)$' then raise exception 'Choose a screen or an https:// link.' using errcode='22023'; end if;
 if who not in ('all','browser','phone_browser','phone','desktop') then raise exception 'Choose who sees it.' using errcode='22023'; end if;
 if lvl not between 1 and 200 then raise exception 'Choose a level from 1 to 200.' using errcode='22023'; end if;
 if hours<0 or hours>720 then raise exception 'Choose up to 720 hours (30 days).' using errcode='22023'; end if;
 -- The same text in Notifications, unless the admin sends only the pop-up.
 if coalesce(p_news,true) then
  insert into public.player_notices(player_id,kind,body,expires_at) values(null,'news',b,case when hours>0 then now()+make_interval(hours=>hours) else null end) returning id into news;
 end if;
 ends:=now()+make_interval(hours=>case when hours>0 then hours else 720 end);
 insert into public.popups(notice_id,title,body,button_label,button_target,audience,min_level,expires_at,created_by)
  values(news,t,b,label,target,who,lvl,ends,me) returning id into popup;
 return popup;
end $f$;
revoke all on function public.popup_post(text,text,text,text,text,integer,integer,boolean) from public, anon;
grant execute on function public.popup_post(text,text,text,text,text,integer,integer,boolean) to authenticated;
