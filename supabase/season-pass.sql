-- The Halloween Pass (Oct 2026): the paid row of the season pass (game/farm-state.js SEASON_PASS, game/payments.js PASS), €4.99, once
-- per farmer per pass, from level 10, sold from 23 October to 2 November 2026 (diamond-checkout checks the window and the level). A pass
-- purchase holds no diamonds, coins or VIP of its own: crediting it adds the pass id to the farm's state.passPremium, an append-only list
-- the game never resets, and every paid reward is then collected in the game, one by one. Safe to run more than once; the functions
-- below are the live ones (read on 2 Oct 2026, identical to supabase/special-offer.sql) with only the pass added.

-- A pass purchase: pack 'pass', €4.99 (already an allowed amount), no diamonds, coins or VIP, and the pass it opens.
alter table public.harvest_purchases add column if not exists pass_id text check (pass_id is null or pass_id ~ '^[a-z0-9-]{3,40}$');
alter table public.harvest_purchases drop constraint if exists harvest_purchases_pack_check;
alter table public.harvest_purchases add constraint harvest_purchases_pack_check check (pack = any (array['50','100','150','300','500','600','1000','1250','2000','3500','starter','offer','pass']));
alter table public.harvest_purchases drop constraint if exists harvest_purchases_diamonds_check;
alter table public.harvest_purchases add constraint harvest_purchases_diamonds_check check (
 (pack='offer' and diamonds between 0 and 20000) or (pack='pass' and diamonds=0) or diamonds = any (array[50,100,150,300,500,600,1000,1250,2000,3500]));
alter table public.harvest_purchases drop constraint if exists harvest_pack_amount_matches;
alter table public.harvest_purchases add constraint harvest_pack_amount_matches check (
 (pack = any (array['50','100','150']) and diamonds=(case when pack ~ '^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=199) or
 (pack='500' and diamonds=500 and coins=0 and amount_cents=499) or
 (pack = any (array['300','600','1250']) and diamonds=(case when pack ~ '^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=999) or
 (pack = any (array['1000','2000','3500']) and diamonds=(case when pack ~ '^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=2499) or
 (pack='starter' and diamonds = any (array[300,500]) and coins=10000 and amount_cents=299) or
 (pack='offer' and offer_id is not null and amount_cents=499 and coins between 0 and 10000000 and vip_days in (0,7,30,60,90) and (diamonds>0 or coins>0 or vip_days>0)) or
 (pack='pass' and pass_id is not null and diamonds=0 and coins=0 and vip_days=0 and amount_cents=499));
-- One checkout per farmer per pass, like the Starter Pack and an offer: only a Stripe session that expired frees it.
create unique index if not exists harvest_one_pass_per_player on public.harvest_purchases(player_id, pass_id)
 where pack='pass' and status<>'expired';

-- Crediting: as before for the packs, the Starter Pack and an offer; a pass adds its id to state.passPremium (never twice, and a
-- passPremium that is not a list starts a new one, so a valid payment never fails here and Stripe never has to retry).
create or replace function public.harvest_credit_purchase(p_purchase uuid, p_session text, p_payment text, p_event text, p_livemode boolean)
 returns jsonb language plpgsql set search_path to '' as $function$
declare purchase public.harvest_purchases%rowtype; farm_state jsonb; goods jsonb; crop text; vip_until bigint;
begin
 select * into purchase from public.harvest_purchases where id=p_purchase for update;
 if not found then raise exception 'Unknown purchase'; end if;
 if purchase.stripe_session_id is distinct from p_session or purchase.livemode is distinct from p_livemode then raise exception 'Payment mismatch'; end if;
 if p_session is null or p_payment is null or p_event is null or p_payment not like 'pi_%' or p_event not like 'evt_%' then raise exception 'Invalid payment reference'; end if;
 if purchase.status in ('credited','test_paid') then return jsonb_build_object('status',purchase.status,'duplicate',true); end if;
 if purchase.status<>'pending' then raise exception 'Purchase is not pending'; end if;
 if purchase.pack='starter' then
  if purchase.starter_expires_at is null or purchase.created_at<purchase.starter_expires_at-interval '7 days' or purchase.created_at>=purchase.starter_expires_at then raise exception 'Starter offer expired'; end if;
 end if;
 if purchase.livemode then
  select state into farm_state from public.player_farms where player_id=purchase.player_id for update;
  if not found then raise exception 'Farm is missing'; end if;
  farm_state:=jsonb_set(farm_state,'{diamonds}',to_jsonb(coalesce((farm_state->>'diamonds')::bigint,0)+purchase.diamonds));
  if purchase.pack in ('starter','offer') and purchase.coins>0 then
   farm_state:=jsonb_set(farm_state,'{coins}',to_jsonb(coalesce((farm_state->>'coins')::bigint,0)+purchase.coins));
  end if;
  if purchase.pack='starter' then
   goods:=coalesce(farm_state->'inventory','{}'::jsonb);
   foreach crop in array array['corn','wheat','cabbage','pumpkin','sunflower','barley','lettuce','redcabbage','cauliflower','greenbeans','apples','berries','squash','polebeans','ciderapples','cherries'] loop
    goods:=jsonb_set(goods,array[crop],to_jsonb(coalesce((goods->>crop)::integer,0)+1));
   end loop;
   farm_state:=jsonb_set(farm_state,'{inventory}',goods);
   farm_state:=jsonb_set(farm_state,'{starterPackClaimed}',to_jsonb(true));
  end if;
  if purchase.pack='offer' and purchase.vip_days>0 then
   vip_until:=greatest(coalesce((farm_state->>'vipExpiresAt')::bigint,0),(extract(epoch from now())*1000)::bigint)+purchase.vip_days::bigint*86400000;
   farm_state:=jsonb_set(farm_state,'{vipExpiresAt}',to_jsonb(vip_until));
   farm_state:=jsonb_set(farm_state,'{stats,vip_days}',to_jsonb(coalesce((farm_state#>>'{stats,vip_days}')::integer,0)+purchase.vip_days));
  end if;
  if purchase.pack='pass' then
   farm_state:=jsonb_set(farm_state,'{passPremium}',(select coalesce(jsonb_agg(distinct v),'[]'::jsonb) from jsonb_array_elements(
    (case when jsonb_typeof(farm_state->'passPremium')='array' then farm_state->'passPremium' else '[]'::jsonb end)||jsonb_build_array(purchase.pass_id)) v));
  end if;
  if purchase.pack in ('starter','offer') then
   update public.player_stats set currency=(farm_state->>'coins')::integer,updated_at=now() where player_id=purchase.player_id;
  end if;
  update public.player_farms set state=farm_state,revision=revision+1,updated_at=now() where player_id=purchase.player_id;
 end if;
 update public.harvest_purchases set status=case when livemode then 'credited' else 'test_paid' end,
  stripe_payment_id=p_payment,stripe_event_id=p_event,credited_at=now() where id=p_purchase;
 return jsonb_build_object('status',case when purchase.livemode then 'credited' else 'test_paid' end,'duplicate',false);
end $function$;

-- The admin's purchase notice and the farmer's log: a pass says which one, instead of "0 diamonds".
create or replace function public.harvest_purchase_alert() returns trigger language plpgsql security definer set search_path to '' as $function$
declare who text; what text; price text; body text; admin_id uuid; notice uuid;
begin
 select coalesce(s.username,'A farmer') into who from public.player_stats s where s.player_id=new.player_id;
 what:=case when new.pack='starter' then 'the Starter Pack'
  when new.pack='pass' then 'the Halloween Pass'
  when new.pack='offer' then 'the special offer ('||concat_ws(' + ',case when new.diamonds>0 then to_char(new.diamonds,'FM999G999')||' diamonds' end,
   case when new.coins>0 then to_char(new.coins,'FM999G999G999')||' coins' end,case when new.vip_days>0 then new.vip_days||' days of VIP' end)||')'
  else to_char(new.diamonds,'FM999G999')||' diamonds' end;
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
end $function$;

create or replace function public.harvest_purchase_log() returns trigger language plpgsql security definer set search_path to '' as $function$
begin
 insert into public.player_logs(player_id,category,action,text)
 values(new.player_id,'purchase',case when new.livemode then 'purchase' else 'test_purchase' end,
  (case when new.livemode then 'Bought ' else 'Test purchase (no money): ' end)
  ||case when new.pack='starter' then 'the Starter Pack'
    when new.pack='pass' then 'the Halloween Pass'
    when new.pack='offer' then 'the special offer ('||concat_ws(' + ',case when new.diamonds>0 then to_char(new.diamonds,'FM999G999')||' diamonds' end,
     case when new.coins>0 then to_char(new.coins,'FM999G999G999')||' coins' end,case when new.vip_days>0 then new.vip_days||' days of VIP' end)||')'
    else to_char(new.diamonds,'FM999G999')||' diamonds' end
  ||' for €'||to_char(new.amount_cents/100.0,'FM999990.00'));
 return new;
exception when others then return new;
end $function$;
