-- A welcome message for every new farmer (26 Sep 2026): a few minutes after the account is made, a private message from the admin,
-- which the farmer can simply reply to. The admin sets it up in the Admin dashboard (Settings, Welcome message): on or off, the text
-- ({name} becomes the farmer's name) and after how many minutes. Only accounts made after it was switched on get it, each once, and
-- only once they have a farmer name. A check every minute sends what is due (at most 200 at a time).

create table if not exists public.welcome_dm_config (
 id boolean primary key default true check (id),
 enabled boolean not null default false,
 body text not null default 'Hi {name}, welcome to Harvest Tycoon! 🌾 I''m Tony, the maker of the game. Plant your first crops, and if anything is unclear or you have an idea, just reply to this message. I read every one. Happy farming!' check (char_length(body) between 1 and 500),
 delay_minutes integer not null default 3 check (delay_minutes between 1 and 60),
 sender uuid references auth.users(id),
 enabled_since timestamptz,
 updated_at timestamptz not null default now()
);
insert into public.welcome_dm_config(id) values(true) on conflict do nothing;
create table if not exists public.welcome_dm_sent (player_id uuid primary key references auth.users(id) on delete cascade, sent_at timestamptz not null default now());
alter table public.welcome_dm_config enable row level security;
alter table public.welcome_dm_sent enable row level security;
revoke all on public.welcome_dm_config, public.welcome_dm_sent from anon, authenticated;

-- The admin reads the setting, with how many farmers got it and when the last one did.
create or replace function public.welcome_dm_get()
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); c public.welcome_dm_config;
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 select * into c from public.welcome_dm_config where id;
 return jsonb_build_object('enabled',c.enabled,'body',c.body,'delayMinutes',c.delay_minutes,'enabledSince',c.enabled_since,
  'sent',(select count(*) from public.welcome_dm_sent),'lastSentAt',(select max(sent_at) from public.welcome_dm_sent));
end $function$;

-- The admin saves it; the message comes from whoever saved it. Switching it on starts from now: nobody from before gets it.
create or replace function public.welcome_dm_save(p_enabled boolean, p_body text, p_delay integer)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); msg text:=btrim(coalesce(p_body,''));
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if char_length(msg)<1 or char_length(msg)>500 then raise exception 'Write 1–500 characters.' using errcode='22023'; end if;
 if p_delay is null or p_delay<1 or p_delay>60 then raise exception 'Choose 1–60 minutes.' using errcode='22023'; end if;
 update public.welcome_dm_config set body=msg,delay_minutes=p_delay,sender=me,
  enabled_since=case when coalesce(p_enabled,false) and not enabled then now() else enabled_since end,
  enabled=coalesce(p_enabled,false),updated_at=now() where id;
 return public.welcome_dm_get();
end $function$;

-- Every minute (pg_cron): the farmers whose account is at least the delay old, made since it was switched on (and in the last
-- day), with a name, not yet welcomed. {name} becomes their farmer name. The admin's side of these chats counts as read.
create or replace function public.welcome_dm_run()
 returns integer language plpgsql security definer set search_path to '' as $function$
declare c public.welcome_dm_config; nm text; av text; vip boolean; n integer:=0; r record; ch text;
begin
 select * into c from public.welcome_dm_config where id;
 if not c.enabled or c.sender is null or c.enabled_since is null then return 0; end if;
 select ps.username, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, av, vip from public.player_stats ps where ps.player_id=c.sender;
 if nm is null then return 0; end if;
 for r in
  select u.id, ps.username from auth.users u join public.player_stats ps on ps.player_id=u.id
  where u.created_at>=greatest(c.enabled_since,now()-interval '1 day') and u.created_at<=now()-make_interval(mins=>c.delay_minutes)
   and not coalesce(u.is_anonymous,false) and u.id<>c.sender and ps.username is not null
   and ps.level>=(select cc.dm_level from public.chat_config cc)
   and not exists(select 1 from public.welcome_dm_sent s where s.player_id=u.id)
   and not exists(select 1 from public.chat_sanctions s where s.player_id=u.id and s.banned)
  order by u.created_at limit 200
 loop
  ch:='dm:'||(case when c.sender::text<r.id::text then c.sender::text||':'||r.id::text else r.id::text||':'||c.sender::text end);
  insert into public.welcome_dm_sent(player_id) values(r.id) on conflict do nothing;
  if not found then continue; end if;
  insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_staff,sender_vip,body)
   values(ch,c.sender,nm,av,true,vip,left(replace(c.body,'{name}',r.username),500));
  insert into public.chat_reads(player_id,channel,last_read_at) values(c.sender,ch,now())
   on conflict (player_id,channel) do update set last_read_at=excluded.last_read_at;
  n:=n+1;
 end loop;
 return n;
end $function$;
revoke all on function public.welcome_dm_run() from public, anon, authenticated;
revoke all on function public.welcome_dm_get() from public, anon;
revoke all on function public.welcome_dm_save(boolean,text,integer) from public, anon;
grant execute on function public.welcome_dm_get() to authenticated;
grant execute on function public.welcome_dm_save(boolean,text,integer) to authenticated;

select cron.unschedule(jobid) from cron.job where jobname='harvest-welcome-dm';
select cron.schedule('harvest-welcome-dm','* * * * *','select public.welcome_dm_run()');
