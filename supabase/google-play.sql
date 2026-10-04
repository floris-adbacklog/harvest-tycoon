-- Purchases through Google Play (Oct 2026, the Android app 1.1, android-app PlayBilling.java). The same packs as on the website, at
-- the same euro prices, each a one-time product in Play Console (game/payments.js PLAY_PRODUCTS). A Play purchase is a row in
-- harvest_purchases like a Stripe checkout: store 'google_play', price_id = the Play product, play_token / play_order_id = Google's
-- references. So the admin panel's Purchases, the purchase alert and log, the partners' 25% (partner_stats: status 'credited', live) and
-- account deletion (delete-account.sql) count it without a change. diamond-checkout checks each purchase with Google before
-- harvest_credit_play_purchase; play-voided takes back what Google refunded (harvest_revoke_play_purchases, status 'refunded').
-- What a purchase gives the farm moves into one function, harvest_purchase_grant, used by Stripe's harvest_credit_purchase and by Play.
-- harvest_credit_purchase is replaced from the LIVE definition read on 4 Oct 2026 (md5 963c3c96a5a1f1bcd7e0faa77d05e839, with the
-- deleted-account branch of delete-account.sql); a different live definition stops the file. Re-runnable.

-- 1. The row: where it was bought, Google's references, and 'refunded'.
alter table public.harvest_purchases add column if not exists store text not null default 'stripe';
alter table public.harvest_purchases add column if not exists play_token text;
alter table public.harvest_purchases add column if not exists play_order_id text;
alter table public.harvest_purchases add column if not exists refunded_at timestamptz;
do $do$ begin
 if not exists(select 1 from pg_constraint where conname='harvest_purchases_store_check' and conrelid='public.harvest_purchases'::regclass) then
  alter table public.harvest_purchases add constraint harvest_purchases_store_check check (store in ('stripe','google_play'));
 end if;
 if not exists(select 1 from pg_constraint where conname='harvest_purchases_play_token_check' and conrelid='public.harvest_purchases'::regclass) then
  alter table public.harvest_purchases add constraint harvest_purchases_play_token_check check (play_token is null or (play_token ~ '^[A-Za-z0-9._-]+$' and length(play_token) between 20 and 1024));
 end if;
end $do$;
create unique index if not exists harvest_purchases_play_token on public.harvest_purchases(play_token) where play_token is not null;
create unique index if not exists harvest_purchases_play_order on public.harvest_purchases(play_order_id) where play_order_id is not null;
alter table public.harvest_purchases drop constraint if exists harvest_purchases_status_check;
alter table public.harvest_purchases add constraint harvest_purchases_status_check check (status in ('pending','credited','test_paid','expired','refunded'));

-- 2. What a purchase gives the farm (diamonds; coins for the Starter Pack and an offer; one of every crop for the Starter Pack; VIP time
-- for an offer; the pass for a pass), the block harvest_credit_purchase had inline, unchanged. The caller holds the purchase row's lock.
create or replace function public.harvest_purchase_grant(p_purchase uuid)
returns void
language plpgsql
set search_path to ''
as $function$
declare purchase public.harvest_purchases%rowtype; farm_state jsonb; goods jsonb; crop text; vip_until bigint;
begin
 select * into purchase from public.harvest_purchases where id=p_purchase;
 if not found then raise exception 'Unknown purchase'; end if;
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
end $function$;
revoke all on function public.harvest_purchase_grant(uuid) from public, anon, authenticated;
grant execute on function public.harvest_purchase_grant(uuid) to service_role;

-- 3. Stripe's credit, the same steps with the grant above.
do $do$ begin
 if md5(pg_get_functiondef('public.harvest_credit_purchase(uuid,text,text,text,boolean)'::regprocedure)) not in ('963c3c96a5a1f1bcd7e0faa77d05e839')
  and position('perform public.harvest_purchase_grant(p_purchase)' in pg_get_functiondef('public.harvest_credit_purchase(uuid,text,text,text,boolean)'::regprocedure))=0 then
  raise exception 'harvest_credit_purchase changed since 4 Oct 2026; read the live definition before replacing it';
 end if;
end $do$;
create or replace function public.harvest_credit_purchase(p_purchase uuid, p_session text, p_payment text, p_event text, p_livemode boolean)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare purchase public.harvest_purchases%rowtype;
begin
 select * into purchase from public.harvest_purchases where id=p_purchase for update;
 if not found then raise exception 'Unknown purchase'; end if;
 if purchase.stripe_session_id is distinct from p_session or purchase.livemode is distinct from p_livemode then raise exception 'Payment mismatch'; end if;
 if p_session is null or p_payment is null or p_event is null or p_payment not like 'pi_%' or p_event not like 'evt_%' then raise exception 'Invalid payment reference'; end if;
 if purchase.status in ('credited','test_paid') then return jsonb_build_object('status',purchase.status,'duplicate',true); end if;
 -- Paid after the account was deleted (delete-account.sql): recorded for the books and a refund, nothing credited, no commission.
 if purchase.player_id is null and purchase.account_deleted_at is not null and purchase.status in ('pending','expired') then
  update public.harvest_purchases set status=case when livemode then 'credited' else 'test_paid' end,stripe_payment_id=p_payment,stripe_event_id=p_event,credited_at=now(),partner_id=null where id=p_purchase;
  return jsonb_build_object('status',case when purchase.livemode then 'credited' else 'test_paid' end,'duplicate',false,'account_deleted',true);
 end if;
 if purchase.status<>'pending' then raise exception 'Purchase is not pending'; end if;
 if purchase.pack='starter' then
  if purchase.starter_expires_at is null or purchase.created_at<purchase.starter_expires_at-interval '7 days' or purchase.created_at>=purchase.starter_expires_at then raise exception 'Starter offer expired'; end if;
 end if;
 if purchase.livemode then perform public.harvest_purchase_grant(p_purchase); end if;
 update public.harvest_purchases set status=case when livemode then 'credited' else 'test_paid' end,
  stripe_payment_id=p_payment,stripe_event_id=p_event,credited_at=now() where id=p_purchase;
 return jsonb_build_object('status',case when purchase.livemode then 'credited' else 'test_paid' end,'duplicate',false);
end $function$;
revoke all on function public.harvest_credit_purchase(uuid,text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.harvest_credit_purchase(uuid,text,text,text,boolean) to service_role;

-- 4. A Google Play purchase that Google says is paid (diamond-checkout play_confirm checked it is this farmer's and this row's).
-- A test purchase (p_test: a licence tester, promo code or reward) becomes test_paid and credits nothing, as a Stripe test payment.
-- Safe to repeat with the same token; a different token for a row that has one is refused.
create or replace function public.harvest_credit_play_purchase(p_purchase uuid, p_token text, p_order text, p_test boolean)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare purchase public.harvest_purchases%rowtype; done text:=case when p_test then 'test_paid' else 'credited' end;
begin
 if p_token is null or p_token !~ '^[A-Za-z0-9._-]+$' or length(p_token) not between 20 and 1024 or p_test is null or (p_order is not null and length(p_order)>100) then raise exception 'Invalid payment reference'; end if;
 select * into purchase from public.harvest_purchases where id=p_purchase for update;
 if not found then raise exception 'Unknown purchase'; end if;
 if purchase.play_token is not null and purchase.play_token<>p_token then raise exception 'Payment mismatch'; end if;
 if purchase.status in ('credited','test_paid','refunded') then return jsonb_build_object('status',purchase.status,'duplicate',true); end if;
 if purchase.player_id is null and purchase.account_deleted_at is not null then
  update public.harvest_purchases set status=done,store='google_play',play_token=p_token,play_order_id=p_order,livemode=not p_test,credited_at=now(),partner_id=null where id=p_purchase;
  return jsonb_build_object('status',done,'duplicate',false,'account_deleted',true);
 end if;
 if purchase.status not in ('pending','expired') then raise exception 'Purchase is not pending'; end if;
 if purchase.pack='starter' then
  if purchase.starter_expires_at is null or purchase.created_at<purchase.starter_expires_at-interval '7 days' or purchase.created_at>=purchase.starter_expires_at then raise exception 'Starter offer expired'; end if;
 end if;
 -- livemode first, so the grant and the alert see what kind of purchase it is
 update public.harvest_purchases set store='google_play',play_token=p_token,play_order_id=p_order,livemode=not p_test where id=p_purchase;
 if not p_test then perform public.harvest_purchase_grant(p_purchase); end if;
 update public.harvest_purchases set status=done,credited_at=now() where id=p_purchase;
 return jsonb_build_object('status',done,'duplicate',false);
end $function$;
revoke all on function public.harvest_credit_play_purchase(uuid,text,text,boolean) from public, anon, authenticated;
grant execute on function public.harvest_credit_play_purchase(uuid,text,text,boolean) to service_role;

-- 5. Refunded by Google (play-voided, every hour): what the purchase gave is taken back as far as the farm still has it (never below 0;
-- spent diamonds stay spent), VIP time comes off, the pass closes; the row becomes 'refunded' (no revenue, no partner share).
-- p_items: [{token, voidedAt}]. A token that is not ours, or already refunded, is skipped.
create or replace function public.harvest_revoke_play_purchases(p_items jsonb)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare item jsonb; purchase public.harvest_purchases%rowtype; farm_state jsonb; n integer:=0; at timestamptz;
begin
 for item in select value from jsonb_array_elements(case when jsonb_typeof(p_items)='array' then p_items else '[]'::jsonb end) loop
  select * into purchase from public.harvest_purchases where play_token=item->>'token' and store='google_play' for update;
  if not found or purchase.status not in ('credited','test_paid') then continue; end if;
  begin at:=coalesce((item->>'voidedAt')::timestamptz,now()); exception when others then at:=now(); end;
  if purchase.status='credited' and purchase.livemode and purchase.player_id is not null then
   select state into farm_state from public.player_farms where player_id=purchase.player_id for update;
   if found then
    farm_state:=jsonb_set(farm_state,'{diamonds}',to_jsonb(greatest(0,coalesce((farm_state->>'diamonds')::bigint,0)-purchase.diamonds)));
    if purchase.pack in ('starter','offer') and purchase.coins>0 then
     farm_state:=jsonb_set(farm_state,'{coins}',to_jsonb(greatest(0,coalesce((farm_state->>'coins')::bigint,0)-purchase.coins)));
    end if;
    if purchase.pack='offer' and purchase.vip_days>0 then
     farm_state:=jsonb_set(farm_state,'{vipExpiresAt}',to_jsonb(greatest(0,coalesce((farm_state->>'vipExpiresAt')::bigint,0)-purchase.vip_days::bigint*86400000)));
    end if;
    if purchase.pack='pass' and jsonb_typeof(farm_state->'passPremium')='array' then
     farm_state:=jsonb_set(farm_state,'{passPremium}',(select coalesce(jsonb_agg(v),'[]'::jsonb) from jsonb_array_elements(farm_state->'passPremium') v where v<>to_jsonb(purchase.pass_id)));
    end if;
    if purchase.pack in ('starter','offer') then
     update public.player_stats set currency=(farm_state->>'coins')::integer,updated_at=now() where player_id=purchase.player_id;
    end if;
    update public.player_farms set state=farm_state,revision=revision+1,updated_at=now() where player_id=purchase.player_id;
    insert into public.player_logs(player_id,category,action,text) values(purchase.player_id,'purchase','refund','Refunded by Google Play: '
     ||case when purchase.pack='starter' then 'the Starter Pack' when purchase.pack='pass' then 'the Halloween Pass' when purchase.pack='offer' then 'the special offer'
      else to_char(purchase.diamonds,'FM999G999')||' diamonds' end||' (taken back as far as the farm still had it)');
   end if;
  end if;
  update public.harvest_purchases set status='refunded',refunded_at=at where id=purchase.id;
  n:=n+1;
 end loop;
 return jsonb_build_object('revoked',n);
end $function$;
revoke all on function public.harvest_revoke_play_purchases(jsonb) from public, anon, authenticated;
grant execute on function public.harvest_revoke_play_purchases(jsonb) to service_role;

-- 6. A job that may run at most once every p_gap_minutes, whoever calls it (play-voided): true for the caller that may go now.
create table if not exists public.harvest_job_runs(name text primary key, ran_at timestamptz not null);
alter table public.harvest_job_runs enable row level security;
revoke all on table public.harvest_job_runs from anon, authenticated;
create or replace function public.harvest_job_begin(p_name text, p_gap_minutes integer)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare ok boolean;
begin
 insert into public.harvest_job_runs(name,ran_at) values(p_name,now())
 on conflict(name) do update set ran_at=now() where public.harvest_job_runs.ran_at<now()-make_interval(mins=>greatest(1,p_gap_minutes))
 returning true into ok;
 return coalesce(ok,false);
end $function$;
revoke all on function public.harvest_job_begin(text,integer) from public, anon, authenticated;
grant execute on function public.harvest_job_begin(text,integer) to service_role;

-- 7. Every hour at :41, the refunds check (play-voided does nothing until the service account's key is set).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.unschedule('harvest-play-voided') where exists (select 1 from cron.job where jobname='harvest-play-voided');
select cron.schedule('harvest-play-voided','41 * * * *',$job$
 select net.http_post(
  url := 'https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/play-voided',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb,
  timeout_milliseconds := 25000);
$job$);
