-- In-game purchases for the admin, on the phone too (25 Sep 2026): besides the notice in the chat's Notifications (purchase-alerts.sql),
-- a push notification to the admin's devices, the same way a private message is pushed (chat_dm_push in chat.sql): the trigger asks
-- notify-hourly (?notice) to send it, and notice_push_claim hands each notice out once, so calling the function again sends nothing.
-- It follows the same switch as the notice (Settings, Chat, In-game purchases) and needs notifications allowed on the device.
-- Also: nothing in here can stop a purchase from being credited; any problem only costs the notice.
alter table public.player_notices add column if not exists pushed_at timestamptz;

create or replace function public.harvest_purchase_alert() returns trigger language plpgsql security definer set search_path to '' as $f$
declare who text; what text; price text; body text; admin_id uuid; notice uuid;
begin
 select coalesce(s.username,'A farmer') into who from public.player_stats s where s.player_id=new.player_id;
 what:=case when new.pack='starter' then 'the Starter Pack' else to_char(new.diamonds,'FM999G999')||' diamonds' end;
 price:='€'||to_char(new.amount_cents/100.0,'FM999990.00');
 body:=(case when new.livemode then 'In-game purchase: ' else 'Test purchase (no money): ' end)||coalesce(who,'A farmer')||' bought '||what||' for '||price||'.';
 for admin_id in select u.id from auth.users u where public.chat_staff_role(u.id)='admin'
  and not exists(select 1 from public.chat_settings c where c.player_id=u.id and c.purchase_alerts_off) loop
  insert into public.player_notices(player_id,kind,body) values(admin_id,'purchase',body) returning id into notice;
  if exists(select 1 from public.push_subscriptions p where p.player_id=admin_id) then
   perform net.http_post(url:='https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/notify-hourly?notice',headers:='{"Content-Type":"application/json"}'::jsonb,
    body:=jsonb_build_object('notice',notice),timeout_milliseconds:=10000);
  end if;
 end loop;
 return new;
exception when others then return new;   -- a notice never stands in the way of the purchase itself
end $f$;
revoke all on function public.harvest_purchase_alert() from public,anon,authenticated;

-- The notification service (service role) takes a purchase notice once, within 10 minutes, with the admin's devices.
create or replace function public.notice_push_claim(p_notice uuid) returns jsonb language plpgsql security definer set search_path to '' as $f$
declare n public.player_notices;
begin
 update public.player_notices set pushed_at=now()
  where id=p_notice and kind='purchase' and player_id is not null and pushed_at is null and created_at>now()-interval '10 minutes'
  returning * into n;
 if not found then return null; end if;
 return jsonb_build_object('id',n.id,'body',n.body,
  'subscriptions',coalesce((select jsonb_agg(jsonb_build_object('endpoint',p.endpoint,'p256dh',p.p256dh,'auth',p.auth)) from public.push_subscriptions p where p.player_id=n.player_id),'[]'::jsonb));
end $f$;
revoke execute on function public.notice_push_claim(uuid) from public, anon, authenticated;
