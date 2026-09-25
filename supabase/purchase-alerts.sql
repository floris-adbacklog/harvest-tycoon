-- In-game purchases for the admin (25 Sep 2026): when a purchase is credited (harvest_credit_purchase, after Stripe says it is paid),
-- the admin gets a notice in the chat's Notifications tab: who bought what, for how much. A test payment says so. The admin can turn
-- these off and on in Settings, Chat (chat_settings.purchase_alerts_off; on unless turned off). Only the admin (chat_staff_role) gets
-- them and may change the switch; moderators do not see purchases.
alter table public.chat_settings add column if not exists purchase_alerts_off boolean not null default false;

create or replace function public.chat_set_purchase_alerts(p_on boolean) returns void language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());
begin
 if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 insert into public.chat_settings as c(player_id,purchase_alerts_off,updated_at) values(me,not coalesce(p_on,true),now())
  on conflict (player_id) do update set purchase_alerts_off=excluded.purchase_alerts_off,updated_at=now();
end $f$;
revoke all on function public.chat_set_purchase_alerts(boolean) from public,anon;
grant execute on function public.chat_set_purchase_alerts(boolean) to authenticated;

-- The chat overview tells the admin whether the switch is on (null for everyone else).
do $migration$
declare definition text; before text;
begin
 definition:=pg_get_functiondef('public.chat_overview()'::regprocedure);before:=definition;
 definition:=replace(definition,
  '''privateOn'',not exists(select 1 from public.chat_settings c where c.player_id=me and c.private_off),',
  '''privateOn'',not exists(select 1 from public.chat_settings c where c.player_id=me and c.private_off),
  ''purchaseAlerts'',case when public.chat_staff_role(me)=''admin'' then not exists(select 1 from public.chat_settings c where c.player_id=me and c.purchase_alerts_off) end,');
 if definition=before then raise exception 'chat_overview: the privateOn line was not found'; end if;
 execute definition;
end
$migration$;

-- The notice itself, once per purchase, when it turns from pending to credited (or test_paid).
create or replace function public.harvest_purchase_alert() returns trigger language plpgsql security definer set search_path to '' as $f$
declare who text; what text; price text;
begin
 select coalesce(s.username,'A farmer') into who from public.player_stats s where s.player_id=new.player_id;
 what:=case when new.pack='starter' then 'the Starter Pack' else to_char(new.diamonds,'FM999G999')||' diamonds' end;
 price:='€'||to_char(new.amount_cents/100.0,'FM999990.00');
 insert into public.player_notices(player_id,kind,body)
 select u.id,'purchase',(case when new.livemode then 'In-game purchase: ' else 'Test purchase (no money): ' end)||coalesce(who,'A farmer')||' bought '||what||' for '||price||'.'
 from auth.users u
 where public.chat_staff_role(u.id)='admin'
  and not exists(select 1 from public.chat_settings c where c.player_id=u.id and c.purchase_alerts_off);
 return new;
end $f$;
revoke all on function public.harvest_purchase_alert() from public,anon,authenticated;
drop trigger if exists harvest_purchase_alert on public.harvest_purchases;
create trigger harvest_purchase_alert after update of status on public.harvest_purchases
 for each row when (old.status='pending' and new.status in ('credited','test_paid')) execute function public.harvest_purchase_alert();
