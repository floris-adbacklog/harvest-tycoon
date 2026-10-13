-- News and offers by email (13 Oct 2026). The admin writes an email in the Admin dashboard (Settings, News and offers by email:
-- src/admin-news-mail.js) and it goes, through the news-mail function (supabase/functions/news-mail), to every farmer who:
--  - said yes to news and offers by email (notification_settings.email_marketing, its own switch, off until they turn it on: the
--    privacy policy promises nothing else);
--  - has a confirmed address by the rule of the daily summary (notify-hourly): harvest_email_checked, a Google, Facebook or Apple
--    sign-up or an address confirmed with the 6-digit code. Supabase marks every email sign-up confirmed at once (email_confirmed_at),
--    so that says nothing. On 13 Oct 2026: 172 said yes, 94 of them with a confirmed address (28 from level 14);
--  - is no CrazyGames, Kongregate or Discord account and has no made-up address (@players.harvesttycoon.com), is no guest, and has a
--    farm (player_stats);
--  - matches the admin's filters: from a level (1 is everyone) and, if chosen, played in the last N days.
-- Each farmer gets the text of their game language (player_seen.language, as the reminders), or the English one.
-- Every email is recorded (news_mailings: who, when, the texts, the button, the filters, how many) with one row per farmer
-- (news_mail_recipients, keyed on the email and the farmer): an email can never go twice to the same farmer, and a send that stopped
-- goes on with the farmers still waiting. The function claims a batch of 50 (news_mail_claim, checked again: who said no since is
-- skipped), sends it and marks each farmer (news_mail_done). At most 5,000 farmers per email.
-- The admin's functions (count, start, status, the list, the test address) check the session like every admin function: the admin,
-- signed in with Google (chat_staff_role). The claim and the marks are for the service role only; the addresses never reach a browser.
-- The farmer's rows go with their account (harvest_delete_account, 6. below, and on delete cascade).
-- Run before the news-mail function and the dashboard. Re-runnable: a second run changes nothing.

-- 1. The emails and their farmers. Nobody reads them directly (row-level security, no policy, no rights): only the functions below.
create table if not exists public.news_mailings(
 id uuid primary key default gen_random_uuid(),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 texts jsonb not null,
 button_url text,
 filters jsonb not null default '{}'::jsonb,
 recipients integer not null default 0 check (recipients between 0 and 5000),
 run_id uuid,
 run_until timestamptz,
 finished_at timestamptz
);
create index if not exists news_mailings_created on public.news_mailings(created_at desc);
alter table public.news_mailings enable row level security;
revoke all on public.news_mailings from public, anon, authenticated;

create table if not exists public.news_mail_recipients(
 mailing_id uuid not null references public.news_mailings(id) on delete cascade,
 player_id uuid not null references auth.users(id) on delete cascade,
 language text not null default 'en',
 batch integer not null check (batch>=0),
 status text not null default 'pending' check (status in ('pending','sending','sent','failed','skipped')),
 claimed_at timestamptz,
 done_at timestamptz,
 resend_id text,
 note text,
 primary key (mailing_id,player_id)
);
create index if not exists news_mail_recipients_open on public.news_mail_recipients(mailing_id,batch) where status in ('pending','sending');
create index if not exists news_mail_recipients_player on public.news_mail_recipients(player_id);
alter table public.news_mail_recipients enable row level security;
revoke all on public.news_mail_recipients from public, anon, authenticated;

-- 2. The texts and the filters as sent, checked (the same rules as supabase/functions/news-mail/rules.js). Texts per game language:
-- {"en":{"subject","body","buttonLabel"},"nl":{…}}; English needs a subject and a text, other languages only what was written.
create or replace function public.news_mail_texts(p_texts jsonb)
 returns jsonb language plpgsql immutable set search_path to '' as $f$
declare out jsonb:='{}'::jsonb; code text; v jsonb; s text; b text; l text;
begin
 if p_texts is null or jsonb_typeof(p_texts)<>'object' then raise exception 'Write a subject and a text in English first.' using errcode='22023'; end if;
 for code, v in select key, value from jsonb_each(p_texts) loop
  continue when code not in ('en','cs','de','es','fr','id','hu','nl','pt','tr','ru','uk','hi','ja','ar','zh') or jsonb_typeof(v)<>'object';
  s:=nullif(btrim(regexp_replace(coalesce(v->>'subject',''),'\s+',' ','g')),'');
  b:=nullif(btrim(replace(coalesce(v->>'body',''),E'\r',''),E' \t\n'),'');
  l:=nullif(btrim(regexp_replace(coalesce(v->>'buttonLabel',''),'\s+',' ','g')),'');
  if char_length(s)>100 then raise exception 'Keep every subject to 100 characters.' using errcode='22023'; end if;
  if char_length(b)>5000 then raise exception 'Keep every text to % characters.', 5000 using errcode='22023'; end if;
  if char_length(l)>30 then raise exception 'Keep every button text to 30 characters.' using errcode='22023'; end if;
  continue when s is null and b is null and l is null;
  out:=out||jsonb_build_object(code,jsonb_strip_nulls(jsonb_build_object('subject',s,'body',b,'buttonLabel',l)));
 end loop;
 if out->'en'->>'subject' is null or out->'en'->>'body' is null then raise exception 'Write a subject and a text in English first.' using errcode='22023'; end if;
 return out;
end $f$;
revoke all on function public.news_mail_texts(jsonb) from public, anon, authenticated;

-- From level (1 to 200; 1 is left out) and played in the last N days (1 to 365). Nothing else.
create or replace function public.news_mail_filters(p_filters jsonb)
 returns jsonb language plpgsql immutable set search_path to '' as $f$
declare f jsonb:=coalesce(p_filters,'{}'::jsonb); out jsonb:='{}'::jsonb; k text; v jsonb; s text;
begin
 if jsonb_typeof(f)<>'object' then raise exception 'The filter % cannot be %.', 'filters', f using errcode='22023'; end if;
 for k, v in select key, value from jsonb_each(f) loop
  s:=v#>>'{}';
  if k not in ('minLevel','activeDays') then raise exception 'There is no filter called %.', k using errcode='22023'; end if;
  continue when jsonb_typeof(v)='null';
  -- In a case, so the text is only read as a number once it is one; in brackets, as PL/pgSQL ends an if's condition at the first then.
  if k='minLevel' then
   if (case when jsonb_typeof(v)='number' and s ~ '^[0-9]{1,3}$' then s::integer not between 1 and 200 else true end) then raise exception 'Choose a level from 1 to 200.' using errcode='22023'; end if;
   if s::integer>1 then out:=out||jsonb_build_object(k,s::integer); end if;
  else
   if (case when jsonb_typeof(v)='number' and s ~ '^[0-9]{1,3}$' then s::integer not between 1 and 365 else true end) then raise exception 'Choose from 1 to 365 days.' using errcode='22023'; end if;
   out:=out||jsonb_build_object(k,s::integer);
  end if;
 end loop;
 return out;
end $f$;
revoke all on function public.news_mail_filters(jsonb) from public, anon, authenticated;

-- 3. Who may get one now: said yes, a confirmed real address (the daily summary's rule), no portal account, no guest, not deleted.
-- Asked when the email starts and again when each batch goes.
create or replace function public.news_mail_ok(p_player uuid)
 returns boolean language sql stable security definer set search_path to '' as $function$
 select exists(select 1 from public.notification_settings s join auth.users u on u.id=s.player_id
   where s.player_id=p_player and s.email_marketing and nullif(btrim(coalesce(u.email,'')),'') is not null and u.email !~* '@players\.harvesttycoon\.com$'
    and coalesce(u.raw_app_meta_data->>'portal','') not in ('crazygames','kongregate','discord') and coalesce(u.raw_app_meta_data->>'guest','')<>'true'
    and not coalesce(u.is_anonymous,false) and u.deleted_at is null)
  and public.harvest_email_checked(p_player)
$function$;
revoke all on function public.news_mail_ok(uuid) from public, anon, authenticated;

-- The farmers an email goes to (filters checked by news_mail_filters first), with the game language they last played in: one of the
-- game's languages, else English.
create or replace function public.news_mail_targets(p_filters jsonb)
 returns table(player_id uuid, language text) language sql stable security definer set search_path to '' as $function$
 select s.player_id, case when seen.language in ('en','cs','de','es','fr','id','hu','nl','pt','tr','ru','uk','hi','ja','ar','zh') then seen.language else 'en' end
 from public.notification_settings s
 join public.player_stats ps on ps.player_id=s.player_id
 left join public.player_seen seen on seen.player_id=s.player_id
 where s.email_marketing
  and ps.level>=coalesce((p_filters->>'minLevel')::integer,1)
  and (p_filters->>'activeDays' is null or ps.last_active_at>now()-make_interval(days=>(p_filters->>'activeDays')::integer))
  and public.news_mail_ok(s.player_id)
$function$;
revoke all on function public.news_mail_targets(jsonb) from public, anon, authenticated;

-- 4. The admin's functions. Each starts with the same check as every admin function: the admin, signed in with Google.
-- How many it would reach now, per game language (the dashboard's "Goes to …").
create or replace function public.news_mail_count(p_filters jsonb)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); f jsonb;
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 f:=public.news_mail_filters(p_filters);
 return (select jsonb_build_object('total',coalesce(sum(l.n),0),'cap',5000,'languages',coalesce(jsonb_object_agg(l.language,l.n),'{}'::jsonb))
  from (select t.language, count(*) as n from public.news_mail_targets(f) t group by t.language) l);
end $function$;
revoke all on function public.news_mail_count(jsonb) from public, anon;
grant execute on function public.news_mail_count(jsonb) to authenticated;

-- The admin's own address, unsubscribe token and language, for "Send a test to me" (only ever the caller's own).
create or replace function public.news_mail_me()
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid());
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 return (select jsonb_build_object('email',u.email,'token',s.unsubscribe_token,'language',coalesce(seen.language,'en'))
  from auth.users u left join public.notification_settings s on s.player_id=u.id left join public.player_seen seen on seen.player_id=u.id where u.id=me);
end $function$;
revoke all on function public.news_mail_me() from public, anon;
grant execute on function public.news_mail_me() to authenticated;

-- Records an email and its farmers, in batches of 50 (by farmer id, so a batch is the same farmers every time it goes). The button only
-- with its English text, and only to a page of harvesttycoon.com. The same English subject again within 24 hours is refused: a double
-- click, or Send again after a call that got no answer (the email is going already: Continue under Last emails goes on with it).
create or replace function public.news_mail_start(p_texts jsonb, p_button_url text, p_filters jsonb)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); v_texts jsonb; v_filters jsonb; v_url text:=nullif(btrim(coalesce(p_button_url,'')),''); v_id uuid:=gen_random_uuid(); v_n integer;
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 v_texts:=public.news_mail_texts(p_texts);v_filters:=public.news_mail_filters(p_filters);
 if v_texts->'en'->>'buttonLabel' is null then v_url:=null;
 elsif v_url is null then raise exception 'Add the web address the button opens.' using errcode='22023';
 elsif v_url !~ '^https://(www\.)?harvesttycoon\.com(/[A-Za-z0-9._~:/?#@!$&()*+,;=%-]*)?$' then raise exception 'The button can only open a page on harvesttycoon.com.' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('news-mail',0));
 if exists(select 1 from public.news_mailings m where m.texts->'en'->>'subject'=v_texts->'en'->>'subject' and m.created_at>now()-interval '24 hours') then
  raise exception 'An email with this subject went out in the last 24 hours. Use Continue under Last emails, or change the subject.' using errcode='54000';
 end if;
 select count(*) into v_n from public.news_mail_targets(v_filters);
 if v_n=0 then raise exception 'No farmer matches: nobody gets this email.' using errcode='22023'; end if;
 if v_n>5000 then raise exception 'More than 5,000 farmers match. Choose a higher level or fewer days.' using errcode='22023'; end if;
 insert into public.news_mailings(id,created_by,texts,button_url,filters,recipients) values(v_id,me,v_texts,v_url,v_filters,0);
 insert into public.news_mail_recipients(mailing_id,player_id,language,batch)
  select v_id, t.player_id, t.language, ((row_number() over (order by t.player_id))-1)/50 from public.news_mail_targets(v_filters) t;
 get diagnostics v_n=row_count;
 update public.news_mailings set recipients=v_n where id=v_id;
 return jsonb_build_object('id',v_id,'recipients',v_n);
end $function$;
revoke all on function public.news_mail_start(jsonb,text,jsonb) from public, anon;
grant execute on function public.news_mail_start(jsonb,text,jsonb) to authenticated;

-- One email for the dashboard: what it was, to whom and where each farmer stands. The texts only for the news-mail function.
create or replace function public.news_mail_summary(p_mailing uuid, p_full boolean)
 returns jsonb language sql stable security definer set search_path to '' as $function$
 select jsonb_build_object('id',m.id,'createdAt',m.created_at,'by',(select ps.username from public.player_stats ps where ps.player_id=m.created_by),
   'subject',m.texts->'en'->>'subject','languages',(select coalesce(jsonb_agg(k.code order by k.code),'[]'::jsonb) from jsonb_object_keys(m.texts) as k(code)),
   'filters',m.filters,'buttonUrl',m.button_url,'recipients',m.recipients,'finishedAt',m.finished_at,
   'sent',c.sent,'failed',c.failed,'skipped',c.skipped,'pending',c.pending,'sending',c.sending)
  ||case when p_full then jsonb_build_object('texts',m.texts) else '{}'::jsonb end
 from public.news_mailings m
 cross join lateral (select count(*) filter (where r.status='sent') as sent, count(*) filter (where r.status='failed') as failed, count(*) filter (where r.status='skipped') as skipped,
   count(*) filter (where r.status='pending') as pending, count(*) filter (where r.status='sending') as sending
  from public.news_mail_recipients r where r.mailing_id=m.id) c
 where m.id=p_mailing
$function$;
revoke all on function public.news_mail_summary(uuid,boolean) from public, anon, authenticated;

create or replace function public.news_mail_status(p_mailing uuid)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid());
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 return public.news_mail_summary(p_mailing,true);
end $function$;
revoke all on function public.news_mail_status(uuid) from public, anon;
grant execute on function public.news_mail_status(uuid) to authenticated;

-- The last emails, newest first.
create or replace function public.news_mail_list(p_limit integer default 10)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid());
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(public.news_mail_summary(m.id,false) order by m.created_at desc)
  from (select x.id, x.created_at from public.news_mailings x order by x.created_at desc limit least(greatest(coalesce(p_limit,10),1),50)) m),'[]'::jsonb);
end $function$;
revoke all on function public.news_mail_list(integer) from public, anon;
grant execute on function public.news_mail_list(integer) to authenticated;

-- 5. The news-mail function's own steps (service role only).
-- The next batch: one run at a time per email (a second tab, a double click: busy; free again 2 minutes after a run that stopped
-- without letting go). Farmers no longer theirs to get it are skipped and never sent. A batch claimed more than 10 minutes ago and
-- never marked (Resend's answer was lost) is claimed again, with again true: it goes with the same Idempotency-Key, which Resend
-- remembers for 24 hours, so who got it does not get it twice. After 23 hours it is not tried again: failed.
create or replace function public.news_mail_claim(p_mailing uuid, p_run uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_batch integer; v_again boolean; v_skipped integer; v_rows jsonb;
begin
 update public.news_mailings set run_id=p_run, run_until=now()+interval '2 minutes' where id=p_mailing and (run_id is null or run_id=p_run or run_until<now());
 if not found then
  if not exists(select 1 from public.news_mailings where id=p_mailing) then raise exception 'news_mail_claim: no such email'; end if;
  return jsonb_build_object('busy',true);
 end if;
 update public.news_mail_recipients set status='failed', done_at=now(), note='stopped while sending; not sent again'
  where mailing_id=p_mailing and status='sending' and claimed_at<now()-interval '23 hours';
 select r.batch, bool_or(r.status='sending') into v_batch, v_again from public.news_mail_recipients r
  where r.mailing_id=p_mailing and r.batch=(select min(x.batch) from public.news_mail_recipients x where x.mailing_id=p_mailing and (x.status='pending' or (x.status='sending' and x.claimed_at<now()-interval '10 minutes')))
   and (r.status='pending' or (r.status='sending' and r.claimed_at<now()-interval '10 minutes'))
  group by r.batch;
 if v_batch is null then
  update public.news_mailings set finished_at=coalesce(finished_at,now())
   where id=p_mailing and not exists(select 1 from public.news_mail_recipients r where r.mailing_id=p_mailing and r.status in ('pending','sending'));
  return jsonb_build_object('batch',null,'recipients','[]'::jsonb,'skipped',0);
 end if;
 update public.news_mail_recipients r set status='skipped', done_at=now(), note='said no since, or no confirmed address'
  where r.mailing_id=p_mailing and r.batch=v_batch and (r.status='pending' or (r.status='sending' and r.claimed_at<now()-interval '10 minutes')) and not public.news_mail_ok(r.player_id);
 get diagnostics v_skipped=row_count;
 with claimed as (
  update public.news_mail_recipients r set status='sending', claimed_at=now()
  where r.mailing_id=p_mailing and r.batch=v_batch and (r.status='pending' or (r.status='sending' and r.claimed_at<now()-interval '10 minutes'))
  returning r.player_id, r.language
 )
 select coalesce(jsonb_agg(jsonb_build_object('player_id',c.player_id,'email',u.email,'language',c.language,'token',s.unsubscribe_token) order by c.player_id),'[]'::jsonb) into v_rows
 from claimed c join auth.users u on u.id=c.player_id join public.notification_settings s on s.player_id=c.player_id;
 return jsonb_build_object('batch',v_batch,'again',coalesce(v_again,false),'recipients',v_rows,'skipped',v_skipped);
end $function$;
revoke all on function public.news_mail_claim(uuid,uuid) from public, anon, authenticated;
grant execute on function public.news_mail_claim(uuid,uuid) to service_role;

-- What Resend said, per farmer: sent (with its id), failed (with why) or pending (Resend sent nothing: they go again). Only farmers
-- this run claimed (sending) change.
create or replace function public.news_mail_done(p_mailing uuid, p_results jsonb)
 returns integer language plpgsql security definer set search_path to '' as $function$
declare v_n integer;
begin
 update public.news_mail_recipients r set status=x.status, done_at=case when x.status='pending' then null else now() end,
   claimed_at=case when x.status='pending' then null else r.claimed_at end, resend_id=left(x.id,100), note=left(x.note,300)
 from jsonb_to_recordset(case when jsonb_typeof(p_results)='array' then p_results else '[]'::jsonb end) as x(player uuid, status text, id text, note text)
 where r.mailing_id=p_mailing and r.player_id=x.player and r.status='sending' and x.status in ('sent','failed','pending');
 get diagnostics v_n=row_count;
 update public.news_mailings set finished_at=now()
  where id=p_mailing and finished_at is null and not exists(select 1 from public.news_mail_recipients r where r.mailing_id=p_mailing and r.status in ('pending','sending'));
 return v_n;
end $function$;
revoke all on function public.news_mail_done(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.news_mail_done(uuid,jsonb) to service_role;

create or replace function public.news_mail_release(p_mailing uuid, p_run uuid)
 returns void language sql security definer set search_path to '' as $function$
 update public.news_mailings set run_id=null, run_until=null where id=p_mailing and run_id=p_run
$function$;
revoke all on function public.news_mail_release(uuid,uuid) from public, anon, authenticated;
grant execute on function public.news_mail_release(uuid,uuid) to service_role;

-- 6. Delete account (delete-account.sql): a farmer's rows go with their account (also on delete cascade), next to their notification
-- state; an email the admin sent stays, without their name. Patched from the LIVE definition (read on 13 Oct 2026, md5
-- f280d40cf7398ca984d10fd99bf4ce43): patched already, left alone; the line not found once, the file stops.
create or replace function pg_temp.news_mail_patch(p_fn regprocedure, p_marker text, p_from text, p_to text)
returns void language plpgsql as $f$
declare def text:=pg_get_functiondef(p_fn);
begin
 if position(p_marker in def)>0 then return; end if;
 if position(p_from in def)=0 or (length(def)-length(replace(def,p_from,'')))/length(p_from)<>1 then
  raise exception using message=format('%s: the expected text was not found once; read the live definition before changing it', p_fn);
 end if;
 execute replace(def,p_from,p_to);
end $f$;
select pg_temp.news_mail_patch('public.harvest_delete_account(uuid,text)',$m$public.news_mail_recipients$m$,
 $a$delete from public.notification_state where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('notification_state',n);$a$,
 $b$delete from public.notification_state where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('notification_state',n);
 delete from public.news_mail_recipients where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('news_mail_recipients',n);
 update public.news_mailings set created_by=null where created_by=p_player;$b$);
revoke all on function public.harvest_delete_account(uuid,text) from public, anon, authenticated;
grant execute on function public.harvest_delete_account(uuid,text) to service_role;
