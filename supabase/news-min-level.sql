-- News from a level (4 Oct 2026): the admin's notification can be for farmers from a level on (the Admin dashboard's "From level",
-- as the pop-up and the private message to many farmers already have). The level is the farmer's level when they read it, so a farmer
-- who reaches it later sees the news too while it runs. Below it, the news is not shown and does not count as unread.
-- Built on the live definitions of 4 Oct 2026 (chat_overview and popup_post are changed in place, nothing else in them).
alter table public.player_notices add column if not exists min_level integer;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='player_notices_min_level_check') then
  alter table public.player_notices add constraint player_notices_min_level_check check (min_level is null or min_level between 2 and 200);
 end if;
end $$;

-- The signed-in farmer's level (1 without a farm), for the read policy below.
create or replace function public.notice_reader_level() returns integer language sql stable security definer set search_path to '' as $$
 select coalesce((select ps.level from public.player_stats ps where ps.player_id=(select auth.uid())),1)
$$;
revoke all on function public.notice_reader_level() from public, anon;
grant execute on function public.notice_reader_level() to authenticated;

drop policy if exists "players read their notices and the news" on public.player_notices;
create policy "players read their notices and the news" on public.player_notices for select to authenticated
 using (((player_id=(select auth.uid())) or (player_id is null and (min_level is null or min_level<=(select public.notice_reader_level()))))
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false and (expires_at is null or expires_at>now()));

drop function if exists public.chat_post_news(text,integer,jsonb);
create or replace function public.chat_post_news(p_body text, p_hours integer default 24, p_texts jsonb default null, p_min_level integer default 1)
 returns void language plpgsql security definer set search_path to '' as $f$
declare body text:=btrim(coalesce(p_body,''));lvl integer:=coalesce(p_min_level,1);
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if char_length(body)<1 or char_length(body)>400 then raise exception 'Write 1–400 characters.' using errcode='22023'; end if;
 if coalesce(p_hours,0)<0 or coalesce(p_hours,0)>720 then raise exception 'Choose up to 720 hours (30 days).' using errcode='22023'; end if;
 if lvl not between 1 and 200 then raise exception 'Choose a level from 1 to 200.' using errcode='22023'; end if;
 insert into public.player_notices(player_id,kind,body,expires_at,texts,min_level) values(null,'news',body,case when coalesce(p_hours,0)>0 then now()+make_interval(hours=>p_hours) else null end,public.admin_texts_body(public.admin_texts(p_texts,400)),case when lvl>1 then lvl end);
end $f$;
revoke all on function public.chat_post_news(text,integer,jsonb,integer) from public, anon;
grant execute on function public.chat_post_news(text,integer,jsonb,integer) to authenticated;

-- The unread count leaves out news below the farmer's level; the pop-up's own notification takes the pop-up's level.
do $$
declare d text;n text;
begin
 d:=pg_get_functiondef('public.chat_overview()'::regprocedure);
 n:=replace(d,'(n.player_id=me or (n.player_id is null and n.created_at>joined))','(n.player_id=me or (n.player_id is null and n.created_at>joined and (n.min_level is null or n.min_level<=coalesce((select ps.level from public.player_stats ps where ps.player_id=me),1))))');
 if n=d then raise exception 'chat_overview: the notices count was not found'; end if;
 execute n;
 d:=pg_get_functiondef('public.popup_post(text,text,text,text,text,integer,integer,boolean,jsonb)'::regprocedure);
 n:=replace(replace(d,'insert into public.player_notices(player_id,kind,body,expires_at,texts) values(null,''news'',b,','insert into public.player_notices(player_id,kind,body,expires_at,texts,min_level) values(null,''news'',b,'),
  'public.admin_texts_body(texts)) returning id into news;','public.admin_texts_body(texts),case when lvl>1 then lvl end) returning id into news;');
 if n=d or position('min_level) values(null' in n)=0 then raise exception 'popup_post: the news insert was not found'; end if;
 execute n;
end $$;

