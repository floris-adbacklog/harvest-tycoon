-- Purchases through the App Store (Oct 2026, the iPhone app 1.1, ios-app HarvestApp.swift HarvestStore). The same packs as on the
-- website, at the same euro prices, each a consumable in App Store Connect with the Google Play product id (game/payments.js
-- APPLE_PRODUCTS). An App Store purchase is a row in harvest_purchases like a Stripe checkout or a Play purchase: store 'app_store',
-- price_id = the product, apple_transaction_id / apple_original_transaction_id = Apple's ids. So the admin panel's Purchases, the
-- purchase alert and log, the partners' 25% (partner_stats: status 'credited', live) and account deletion (delete-account.sql) count it
-- without a change. diamond-checkout apple_confirm checks Apple's signed transaction before harvest_credit_apple_purchase;
-- app-store-notify credits it too (a backup when the app closed first) and takes back what Apple refunded (harvest_revoke_apple_purchases).
-- The sandbox (App Review, TestFlight) is credited as well, so App Review sees the diamonds, but as livemode false: no revenue, no partner
-- share, and the alert and the log say "Test purchase (no money)".
-- Production can be ahead of this repo, so this file only adds: a store value, two columns with their check and index, two new
-- functions. It replaces no existing function and needs google-play.sql (the store column, 'refunded', harvest_purchase_grant). Re-runnable.

-- 0. What this file builds on.
do $do$ begin
 if to_regprocedure('public.harvest_purchase_grant(uuid)') is null or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='harvest_purchases' and column_name='refunded_at') then
  raise exception 'Run google-play.sql first: harvest_purchase_grant and harvest_purchases.refunded_at are missing';
 end if;
 -- The two functions below are new; one by that name that this file did not make is left for a person to read first. (A function that
 -- is not there gives null here, so the first run passes.)
 if position('app-store.sql' in pg_get_functiondef(to_regprocedure('public.harvest_credit_apple_purchase(uuid,text,text,boolean)')))=0 then
  raise exception 'harvest_credit_apple_purchase exists already and was not made by app-store.sql; read the live definition before replacing it';
 end if;
 if position('app-store.sql' in pg_get_functiondef(to_regprocedure('public.harvest_revoke_apple_purchases(jsonb)')))=0 then
  raise exception 'harvest_revoke_apple_purchases exists already and was not made by app-store.sql; read the live definition before replacing it';
 end if;
end $do$;

-- 1. The row: 'app_store' as a store, and Apple's transaction ids (digits; one row per transaction).
alter table public.harvest_purchases add column if not exists apple_transaction_id text;
alter table public.harvest_purchases add column if not exists apple_original_transaction_id text;
do $do$
declare def text;
begin
 select pg_get_constraintdef(c.oid) into def from pg_constraint c where c.conname='harvest_purchases_store_check' and c.conrelid='public.harvest_purchases'::regclass;
 -- A store this file does not know (added live) would be lost by the new check: stop, so a person reads it first.
 if exists(select 1 from regexp_matches(coalesce(def,''),'''([^'']*)''','g') m where m[1] not in ('stripe','google_play','app_store')) then
  raise exception 'harvest_purchases_store_check allows a store this file does not know (%); read the live definition first',def;
 end if;
 alter table public.harvest_purchases drop constraint if exists harvest_purchases_store_check;
 alter table public.harvest_purchases add constraint harvest_purchases_store_check check (store in ('stripe','google_play','app_store'));
 if not exists(select 1 from pg_constraint where conname='harvest_purchases_apple_ids_check' and conrelid='public.harvest_purchases'::regclass) then
  alter table public.harvest_purchases add constraint harvest_purchases_apple_ids_check check ((apple_transaction_id is null or apple_transaction_id ~ '^[0-9]{1,20}$')
   and (apple_original_transaction_id is null or apple_original_transaction_id ~ '^[0-9]{1,20}$'));
 end if;
end $do$;
create unique index if not exists harvest_purchases_apple_transaction on public.harvest_purchases(apple_transaction_id) where apple_transaction_id is not null;

-- 2. An App Store purchase that Apple signed (diamond-checkout apple_confirm checked it is this farmer's row, or app-store-notify that it
-- is this row's). p_test: the sandbox; still granted, as livemode false. Safe to repeat with the same transaction; another transaction
-- for a row that has one, or a row paid another way (Stripe, Google Play), is refused. A deleted account's row (delete-account.sql) is
-- recorded for the books without giving anything and without a partner.
create or replace function public.harvest_credit_apple_purchase(p_purchase uuid, p_transaction text, p_original text, p_test boolean)
returns jsonb
language plpgsql
set search_path to ''
as $function$
-- app-store.sql (Oct 2026)
declare purchase public.harvest_purchases%rowtype;
begin
 if p_transaction is null or p_transaction !~ '^[0-9]{1,20}$' or (p_original is not null and p_original !~ '^[0-9]{1,20}$') or p_test is null then raise exception 'Invalid payment reference'; end if;
 select * into purchase from public.harvest_purchases where id=p_purchase for update;
 if not found then raise exception 'Unknown purchase'; end if;
 if purchase.apple_transaction_id is not null and purchase.apple_transaction_id<>p_transaction then raise exception 'Payment mismatch'; end if;
 if purchase.status in ('credited','test_paid','refunded') then
  if purchase.apple_transaction_id is null then raise exception 'Payment mismatch'; end if;
  return jsonb_build_object('status',purchase.status,'duplicate',true);
 end if;
 if purchase.player_id is null and purchase.account_deleted_at is not null then
  update public.harvest_purchases set status='credited',store='app_store',apple_transaction_id=p_transaction,apple_original_transaction_id=coalesce(p_original,p_transaction),
   livemode=not p_test,credited_at=now(),partner_id=null where id=p_purchase;
  return jsonb_build_object('status','credited','duplicate',false,'account_deleted',true);
 end if;
 if purchase.status not in ('pending','expired') then raise exception 'Purchase is not pending'; end if;
 if purchase.pack='starter' then
  if purchase.starter_expires_at is null or purchase.created_at<purchase.starter_expires_at-interval '7 days' or purchase.created_at>=purchase.starter_expires_at then raise exception 'Starter offer expired'; end if;
 end if;
 -- livemode first, so the alert and the log see what kind of purchase it is
 update public.harvest_purchases set store='app_store',apple_transaction_id=p_transaction,apple_original_transaction_id=coalesce(p_original,p_transaction),livemode=not p_test where id=p_purchase;
 perform public.harvest_purchase_grant(p_purchase);
 update public.harvest_purchases set status='credited',credited_at=now() where id=p_purchase;
 return jsonb_build_object('status','credited','duplicate',false);
end $function$;
revoke all on function public.harvest_credit_apple_purchase(uuid,text,text,boolean) from public, anon, authenticated;
grant execute on function public.harvest_credit_apple_purchase(uuid,text,text,boolean) to service_role;

-- 3. Refunded by Apple (app-store-notify REFUND, or apple_confirm for a transaction Apple has revoked since): what the purchase gave is
-- taken back as far as the farm still has it (never below 0; spent diamonds stay spent), VIP time comes off, the pass closes, for live
-- and sandbox purchases alike (both were granted); the row becomes 'refunded'. p_items: [{transaction, revokedAt}]. A transaction that is
-- not ours, or refunded already, is skipped, so it is safe to repeat.
create or replace function public.harvest_revoke_apple_purchases(p_items jsonb)
returns jsonb
language plpgsql
set search_path to ''
as $function$
-- app-store.sql (Oct 2026)
declare item jsonb; purchase public.harvest_purchases%rowtype; farm_state jsonb; n integer:=0; at timestamptz;
begin
 for item in select value from jsonb_array_elements(case when jsonb_typeof(p_items)='array' then p_items else '[]'::jsonb end) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'transaction','') !~ '^[0-9]{1,20}$' then continue; end if;
  select * into purchase from public.harvest_purchases where apple_transaction_id=item->>'transaction' and store='app_store' for update;
  if not found or purchase.status not in ('credited','test_paid') then continue; end if;
  begin at:=coalesce((item->>'revokedAt')::timestamptz,now()); exception when others then at:=now(); end;
  if purchase.status='credited' and purchase.player_id is not null then
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
    insert into public.player_logs(player_id,category,action,text) values(purchase.player_id,'purchase','refund','Refunded by the App Store: '
     ||case when purchase.pack='starter' then 'the Starter Pack' when purchase.pack='pass' then 'the Halloween Pass' when purchase.pack='offer' then 'the special offer'
      else to_char(purchase.diamonds,'FM999G999')||' diamonds' end||' (taken back as far as the farm still had it)');
   end if;
  end if;
  update public.harvest_purchases set status='refunded',refunded_at=at where id=purchase.id;
  n:=n+1;
 end loop;
 return jsonb_build_object('revoked',n);
end $function$;
revoke all on function public.harvest_revoke_apple_purchases(jsonb) from public, anon, authenticated;
grant execute on function public.harvest_revoke_apple_purchases(jsonb) to service_role;

-- Dry run first, if you like: in the SQL editor put "begin;" above this file and these lines plus "rollback;" below it, so nothing stays.
-- select pg_get_constraintdef(oid) from pg_constraint where conname='harvest_purchases_store_check'; -- ... 'app_store' ...
-- select public.harvest_revoke_apple_purchases('[{"transaction":"0"},{"transaction":"x"},5]'::jsonb); -- {"revoked": 0}
-- select public.harvest_credit_apple_purchase(gen_random_uuid(),'1',null,false); -- ERROR: Unknown purchase
