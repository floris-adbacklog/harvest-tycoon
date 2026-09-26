-- Pop-ups (26 Sep 2026). The admin (not the moderators) can post news that also opens as a pop-up, once per farmer, with an
-- optional button: a screen of the game ("screen:install" opens the wiki at how to install the app) or an https link, which opens
-- in a new tab. It can go to everyone or to a group: only farmers without the installed app, only phones, only computers (the
-- device decides those three), and from a farm level (checked here). The news itself goes to Notifications as before.
-- A pop-up always ends: after the hours chosen, or after 30 days when the news has no end. The admin can stop one early.
create table if not exists public.popups(
 id uuid primary key default gen_random_uuid(),
 notice_id uuid references public.player_notices(id) on delete set null,
 title text not null check (char_length(title) between 1 and 60),
 body text not null check (char_length(body) between 1 and 400),
 button_label text check (button_label is null or char_length(button_label) between 1 and 30),
 button_target text check (button_target is null or (char_length(button_target)<=300 and button_target ~ '^(screen:(install|today|events|leaderboard|chat|shop|family|wiki)|https://[^[:space:]<>"]+)$')),
 audience text not null default 'all' check (audience in ('all','no_app','phone','desktop')),
 min_level integer not null default 1 check (min_level between 1 and 200),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 created_by uuid,
 check ((button_label is null)=(button_target is null))
);
create index if not exists popups_active on public.popups(expires_at desc);
create table if not exists public.popup_seen(
 player_id uuid not null,
 popup_id uuid not null references public.popups(id) on delete cascade,
 seen_at timestamptz not null default now(),
 primary key(player_id,popup_id)
);
alter table public.popups enable row level security;
alter table public.popup_seen enable row level security;
-- Only through the functions below.
revoke all on public.popups, public.popup_seen from anon, authenticated;

create or replace function public.popup_post(p_title text, p_body text, p_button_label text, p_button_target text, p_audience text, p_min_level integer, p_hours integer)
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
 if who not in ('all','no_app','phone','desktop') then raise exception 'Choose who sees it.' using errcode='22023'; end if;
 if lvl not between 1 and 200 then raise exception 'Choose a level from 1 to 200.' using errcode='22023'; end if;
 if hours<0 or hours>720 then raise exception 'Choose up to 720 hours (30 days).' using errcode='22023'; end if;
 insert into public.player_notices(player_id,kind,body,expires_at) values(null,'news',b,case when hours>0 then now()+make_interval(hours=>hours) else null end) returning id into news;
 ends:=now()+make_interval(hours=>case when hours>0 then hours else 720 end);
 insert into public.popups(notice_id,title,body,button_label,button_target,audience,min_level,expires_at,created_by)
  values(news,t,b,label,target,who,lvl,ends,me) returning id into popup;
 return popup;
end $f$;

-- The pop-ups this farmer has not seen yet (newest first, at most five): the game shows the first one that fits the device.
create or replace function public.popup_next() returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());lvl integer;
begin
 if me is null then return '[]'::jsonb; end if;
 select level into lvl from public.player_stats where player_id=me;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'body',p.body,'buttonLabel',p.button_label,'buttonTarget',p.button_target,'audience',p.audience) order by p.created_at desc)
  from (select * from public.popups x where x.expires_at>now() and x.min_level<=coalesce(lvl,1)
        and not exists(select 1 from public.popup_seen s where s.player_id=me and s.popup_id=x.id) order by x.created_at desc limit 5) p),'[]'::jsonb);
end $f$;

create or replace function public.popup_seen(p_id uuid) returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());
begin
 if me is null then return; end if;
 insert into public.popup_seen(player_id,popup_id) select me,p.id from public.popups p where p.id=p_id on conflict do nothing;
end $f$;

-- The admin: the last ten pop-ups, how many farmers saw each, and stopping one (its news stays in Notifications).
create or replace function public.popup_list() returns jsonb language plpgsql stable security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'audience',p.audience,'minLevel',p.min_level,'createdAt',p.created_at,'expiresAt',p.expires_at,
   'active',p.expires_at>now(),'seen',(select count(*) from public.popup_seen s where s.popup_id=p.id)) order by p.created_at desc)
  from (select * from public.popups order by created_at desc limit 10) p),'[]'::jsonb);
end $f$;

create or replace function public.popup_stop(p_id uuid) returns void language plpgsql security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 update public.popups set expires_at=now() where id=p_id and expires_at>now();
end $f$;

do $g$
declare f text;
begin
 foreach f in array array['popup_post(text,text,text,text,text,integer,integer)','popup_next()','popup_seen(uuid)','popup_list()','popup_stop(uuid)'] loop
  execute format('revoke all on function public.%s from public, anon',f);
  execute format('grant execute on function public.%s to authenticated',f);
 end loop;
end $g$;
