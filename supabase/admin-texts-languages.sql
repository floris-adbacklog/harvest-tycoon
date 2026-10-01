-- News, pop-ups and the admin's private message to many farmers in the farmer's own language (1 Oct 2026). The admin writes them in
-- English and can add a text per game language in the Admin dashboard (Settings, News and pop-ups, Language), as for the welcome
-- message; a farmer whose language has no text of its own gets the English one. News and pop-ups keep every language's text with
-- them (texts: {"nl":{"title":…,"body":…,"buttonLabel":…}}) and the game shows the one of the language it plays in; a private
-- message is written once per farmer, in the language they last played in (player_seen.language). Run after popups-send-as.sql
-- and chat-broadcast-level.sql.
alter table public.popups add column if not exists texts jsonb not null default '{}'::jsonb;
alter table public.player_notices add column if not exists texts jsonb;

-- The languages' own texts as the admin sent them: a two-letter language other than English, each part trimmed, empty ones left out.
create or replace function public.admin_texts(p_texts jsonb, p_body_max integer)
 returns jsonb language plpgsql immutable set search_path to '' as $f$
declare out jsonb:='{}'::jsonb; code text; v jsonb; t text; b text; l text;
begin
 if p_texts is null or jsonb_typeof(p_texts)<>'object' then return out; end if;
 for code, v in select key, value from jsonb_each(p_texts) loop
  continue when code !~ '^[a-z]{2}$' or code='en' or jsonb_typeof(v)<>'object';
  t:=nullif(btrim(coalesce(v->>'title','')),'');b:=nullif(btrim(coalesce(v->>'body','')),'');l:=nullif(btrim(coalesce(v->>'buttonLabel','')),'');
  if char_length(t)>60 then raise exception 'Keep every title to 60 characters.' using errcode='22023'; end if;
  if char_length(b)>p_body_max then raise exception 'Keep every text to % characters.',p_body_max using errcode='22023'; end if;
  if char_length(l)>30 then raise exception 'Keep every button text to 30 characters.' using errcode='22023'; end if;
  continue when t is null and b is null and l is null;
  out:=out||jsonb_build_object(code,jsonb_strip_nulls(jsonb_build_object('title',t,'body',b,'buttonLabel',l)));
 end loop;
 return out;
end $f$;
revoke all on function public.admin_texts(jsonb,integer) from public, anon, authenticated;

-- Only each language's text, for Notifications.
create or replace function public.admin_texts_body(p_texts jsonb)
 returns jsonb language sql immutable set search_path to '' as $f$
 select nullif(coalesce(jsonb_object_agg(key,jsonb_build_object('body',value->'body')) filter (where value ? 'body'),'{}'::jsonb),'{}'::jsonb)
 from jsonb_each(coalesce(p_texts,'{}'::jsonb));
$f$;
revoke all on function public.admin_texts_body(jsonb) from public, anon, authenticated;

-- As live on 1 Oct 2026 (chat.sql), with each language's text.
drop function if exists public.chat_post_news(text,integer);
create or replace function public.chat_post_news(p_body text, p_hours integer default 24, p_texts jsonb default null)
 returns void language plpgsql security definer set search_path to '' as $f$
declare body text:=btrim(coalesce(p_body,''));
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if char_length(body)<1 or char_length(body)>400 then raise exception 'Write 1–400 characters.' using errcode='22023'; end if;
 if coalesce(p_hours,0)<0 or coalesce(p_hours,0)>720 then raise exception 'Choose up to 720 hours (30 days).' using errcode='22023'; end if;
 insert into public.player_notices(player_id,kind,body,expires_at,texts) values(null,'news',body,case when coalesce(p_hours,0)>0 then now()+make_interval(hours=>p_hours) else null end,public.admin_texts_body(public.admin_texts(p_texts,400)));
end $f$;
revoke all on function public.chat_post_news(text,integer,jsonb) from public, anon;
grant execute on function public.chat_post_news(text,integer,jsonb) to authenticated;

-- As live on 1 Oct 2026 (popups-send-as.sql), with each language's text; a button text only when the pop-up has a button.
drop function if exists public.popup_post(text,text,text,text,text,integer,integer,boolean);
create or replace function public.popup_post(p_title text, p_body text, p_button_label text, p_button_target text, p_audience text, p_min_level integer, p_hours integer, p_news boolean default true, p_texts jsonb default null)
returns uuid language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());t text:=btrim(coalesce(p_title,''));b text:=btrim(coalesce(p_body,''));
 label text:=nullif(btrim(coalesce(p_button_label,'')),'');target text:=nullif(btrim(coalesce(p_button_target,'')),'');
 who text:=coalesce(nullif(p_audience,''),'all');lvl integer:=coalesce(p_min_level,1);hours integer:=coalesce(p_hours,0);
 news uuid;popup uuid;ends timestamptz;texts jsonb;
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
 texts:=public.admin_texts(p_texts,400);
 if label is null then texts:=coalesce((select jsonb_object_agg(key,value-'buttonLabel') from jsonb_each(texts) where value-'buttonLabel'<>'{}'::jsonb),'{}'::jsonb); end if;
 -- The same text in Notifications, unless the admin sends only the pop-up.
 if coalesce(p_news,true) then
  insert into public.player_notices(player_id,kind,body,expires_at,texts) values(null,'news',b,case when hours>0 then now()+make_interval(hours=>hours) else null end,public.admin_texts_body(texts)) returning id into news;
 end if;
 ends:=now()+make_interval(hours=>case when hours>0 then hours else 720 end);
 insert into public.popups(notice_id,title,body,button_label,button_target,audience,min_level,expires_at,created_by,texts)
  values(news,t,b,label,target,who,lvl,ends,me,texts) returning id into popup;
 return popup;
end $f$;
revoke all on function public.popup_post(text,text,text,text,text,integer,integer,boolean,jsonb) from public, anon;
grant execute on function public.popup_post(text,text,text,text,text,integer,integer,boolean,jsonb) to authenticated;

-- As live on 1 Oct 2026 (popups.sql), with each language's text.
create or replace function public.popup_next() returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());lvl integer;
begin
 if me is null then return '[]'::jsonb; end if;
 select level into lvl from public.player_stats where player_id=me;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'body',p.body,'buttonLabel',p.button_label,'buttonTarget',p.button_target,'audience',p.audience,'texts',p.texts) order by p.created_at desc)
  from (select * from public.popups x where x.expires_at>now() and x.min_level<=coalesce(lvl,1)
        and not exists(select 1 from public.popup_seen s where s.player_id=me and s.popup_id=x.id) order by x.created_at desc limit 5) p),'[]'::jsonb);
end $f$;

-- As live on 1 Oct 2026 (chat-broadcast-level.sql): each farmer gets the text of the language they last played in, else English.
drop function if exists public.chat_broadcast_dm(text,text,boolean,integer);
create or replace function public.chat_broadcast_dm(p_body text, p_audience text, p_send boolean default false, p_min_level integer default 1, p_texts jsonb default null)
 returns integer language plpgsql security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); msg text; nm text; av text; vip boolean; n integer; lvl integer:=coalesce(p_min_level,1); own jsonb;
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_audience is null or p_audience not in ('online','week','all') then raise exception 'Choose who gets it.' using errcode='22023'; end if;
 if lvl not between 1 and 200 then raise exception 'Choose a level from 1 to 200.' using errcode='22023'; end if;
 if not coalesce(p_send,false) then return (select count(*) from public.chat_broadcast_targets(me,p_audience,lvl)); end if;
 msg:=regexp_replace(btrim(coalesce(p_body,'')),'\s+',' ','g');
 if char_length(msg)<1 or char_length(msg)>500 then raise exception 'Write 1–500 characters.' using errcode='22023'; end if;
 select coalesce(jsonb_object_agg(key,regexp_replace(value->>'body','\s+',' ','g')),'{}'::jsonb) into own from jsonb_each(public.admin_texts(p_texts,500)) where value ? 'body';
 perform pg_advisory_xact_lock(hashtextextended('broadcast:'||me::text,0));
 if exists(select 1 from public.chat_messages m where m.sender=me and m.channel like 'dm:%' and (m.body=msg or m.body in (select value from jsonb_each_text(own))) and m.created_at>now()-interval '10 minutes') then raise exception 'You sent this message a moment ago.' using errcode='54000'; end if;
 select ps.username, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, av, vip from public.player_stats ps where ps.player_id=me;
 insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_staff,sender_vip,body)
  select 'dm:'||(case when me::text<t.player_id::text then me::text||':'||t.player_id::text else t.player_id::text||':'||me::text end),me,nm,av,true,vip,coalesce(own->>seen.language,msg)
  from public.chat_broadcast_targets(me,p_audience,lvl) t left join public.player_seen seen on seen.player_id=t.player_id;
 get diagnostics n=row_count;
 insert into public.chat_reads(player_id,channel,last_read_at)
  select me,'dm:'||(case when me::text<t.player_id::text then me::text||':'||t.player_id::text else t.player_id::text||':'||me::text end),now() from public.chat_broadcast_targets(me,p_audience,lvl) t
  on conflict (player_id,channel) do update set last_read_at=excluded.last_read_at;
 return n;
end $function$;
revoke all on function public.chat_broadcast_dm(text,text,boolean,integer,jsonb) from public, anon;
grant execute on function public.chat_broadcast_dm(text,text,boolean,integer,jsonb) to authenticated;
