-- Help and support (3 Oct 2026): the messages from the form on https://www.harvesttycoon.com/support (public/support.html), which the
-- support Edge Function (supabase/functions/support) stores here and mails to info@harvesttycoon.com. Only that function (service_role)
-- reads and writes them: RLS on, nothing for anon or authenticated.
-- Re-runnable: the table, its indexes and the function are made if missing or replaced; no existing function is changed.

-- One message. ip_hash: a keyed hash of the sender's IP address (never the address itself), for the limit only, and cleared after two
-- hours. app: where it was sent from (the website, our Android app or our iPhone app). mailed: it went to info@ (false: past the day's
-- mails, or the mail failed; read those here). spam: the form's hidden field was filled in (never mailed, gone after 30 days). Messages
-- go after a year.
create table if not exists public.support_messages (
 id bigint generated always as identity primary key,
 email text not null check (char_length(email) between 3 and 254),
 farmer_name text check (char_length(farmer_name) <= 40),
 topic text not null check (topic in ('account','bug','purchases','other')),
 -- The function asks 10 to 2000 characters as JavaScript counts them (an emoji is two there, one here): only a loose check here.
 message text not null check (char_length(message) between 1 and 2000),
 language text not null default 'en' check (language ~ '^[a-z]{2}$'),
 app text not null default 'web' check (app in ('web','android','ios')),
 user_agent text check (char_length(user_agent) <= 300),
 ip_hash text check (char_length(ip_hash) between 16 and 64),
 mailed boolean not null default false,
 spam boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.support_messages add column if not exists mailed boolean not null default false;
alter table public.support_messages add column if not exists spam boolean not null default false;
create index if not exists support_messages_ip on public.support_messages(ip_hash, created_at) where ip_hash is not null;
create index if not exists support_messages_email on public.support_messages(lower(email), created_at);
create index if not exists support_messages_created on public.support_messages(created_at);
alter table public.support_messages enable row level security;
revoke all on public.support_messages from anon, authenticated;
grant select, update, delete on public.support_messages to service_role;

-- Store one message, unless a limit says no: at most p_max_stored in a day from everyone together (the hard ceiling), at most p_max_ip
-- an hour from one network (p_ip_hash null: the address was not known, then that limit is skipped) and at most p_max_email an hour from
-- one address. Returns {id, mail}, or null when a limit is reached. mail: send it to info@, true for at most p_max_day a day and never
-- for spam; past that the message is still stored (mailed false), so one sender with many addresses cannot close the form for everyone.
-- One lock for all, so two messages at the same moment cannot both take the last place (a handful a day: waiting costs nothing).
drop function if exists public.support_submit(text,text,text,text,text,text,text,text,integer,integer,integer);
create or replace function public.support_submit(p_email text, p_farmer_name text, p_topic text, p_message text, p_language text, p_app text,
 p_user_agent text, p_ip_hash text, p_spam boolean, p_max_ip integer, p_max_email integer, p_max_day integer, p_max_stored integer)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare n integer; new_id bigint; mail boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('harvest-support',0));
 select count(*) into n from public.support_messages where created_at>now()-interval '1 day';
 if n>=greatest(coalesce(p_max_stored,0),0) then return null; end if;
 if p_ip_hash is not null then
  select count(*) into n from public.support_messages where ip_hash=p_ip_hash and created_at>now()-interval '1 hour';
  if n>=greatest(coalesce(p_max_ip,0),0) then return null; end if;
 end if;
 select count(*) into n from public.support_messages where lower(email)=lower(p_email) and created_at>now()-interval '1 hour';
 if n>=greatest(coalesce(p_max_email,0),0) then return null; end if;
 select count(*) into n from public.support_messages where mailed and created_at>now()-interval '1 day';
 mail:=not coalesce(p_spam,false) and n<greatest(coalesce(p_max_day,0),0);
 insert into public.support_messages(email,farmer_name,topic,message,language,app,user_agent,ip_hash,mailed,spam)
  values(p_email,nullif(p_farmer_name,''),p_topic,p_message,coalesce(p_language,'en'),coalesce(p_app,'web'),p_user_agent,p_ip_hash,mail,coalesce(p_spam,false))
  returning id into new_id;
 return jsonb_build_object('id',new_id,'mail',mail);
end $f$;
revoke all on function public.support_submit(text,text,text,text,text,text,text,text,boolean,integer,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.support_submit(text,text,text,text,text,text,text,text,boolean,integer,integer,integer,integer) to service_role;

-- Every hour: the network hashes go after two hours (the limit only looks back one), spam after 30 days, the messages after a year (the
-- answer is in the mailbox by then).
select cron.unschedule('harvest-support-messages') where exists(select 1 from cron.job where jobname='harvest-support-messages');
select cron.schedule('harvest-support-messages','17 * * * *',$c$update public.support_messages set ip_hash=null where ip_hash is not null and created_at<now()-interval '2 hours'; delete from public.support_messages where created_at<now()-interval '1 year' or (spam and created_at<now()-interval '30 days')$c$);
