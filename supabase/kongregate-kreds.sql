-- Kreds on Kongregate (15 Oct 2026, the owner: built now, switched on once Kongregate allows the game its Virtual Goods API). The same
-- packs as on the website, sold as Kongregate's own items (its developer portal, Manage Items: consumables of 1 use, identifiers equal to
-- the Google Play product ids, game/payments.js KONG_PRODUCTS) at prices in Kreds the owner sets there. A Kreds purchase is a row in
-- harvest_purchases like a Stripe checkout or an app purchase: store 'kongregate', price_id = the item's identifier, amount_cents the
-- euro list price (so every check, the admin's list, the alert and the log stay as they are), and Kongregate's own references:
-- kong_item_id (the item instance the player bought; one row per instance), kong_user_id (the buyer), kong_usage_id (Kongregate's usage
-- record once the instance is used up) and kreds (its price in Kreds, for the books). diamond-checkout kong_claim reads what the player
-- owns at Kongregate (user_items.json), credits each instance once (harvest_credit_kong_purchase, or harvest_credit_kong_pack for a
-- diamond pack bought without a row of ours) and then uses it up there. Kongregate's test accounts (KONGREGATE_TEST_USERS: the developer
-- account buys for 0 Kreds) are credited as livemode false: no revenue, no partner share, "Test purchase (no money)" in the alert and log.
-- Kongregate sends no refunds: one it takes off the payout (its Kred revenue report) is taken back by hand with
-- harvest_revoke_kong_purchases.
-- Production can be ahead of this repo, so this file only adds: a store value, four columns with their checks and index, three columns
-- on kongregate_accounts (how often a farmer's page asks, 5. below), four new functions, and two lines of harvest_delete_account patched
-- from its live definition (6. below). It replaces no other function and needs google-play.sql (harvest_purchase_grant, 'refunded'),
-- app-store.sql (the store 'app_store') and kongregate.sql. Re-runnable. NOT run yet: run it before diamond-checkout with Kreds is
-- deployed. After it, app-store.sql stops when run again (it does not know the store 'kongregate'), as it is meant to.

-- 0. What this file builds on.
do $do$ begin
 if to_regprocedure('public.harvest_purchase_grant(uuid)') is null or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='harvest_purchases' and column_name='refunded_at') then
  raise exception 'Run google-play.sql first: harvest_purchase_grant and harvest_purchases.refunded_at are missing';
 end if;
 if to_regclass('public.kongregate_accounts') is null then raise exception 'Run kongregate.sql first: kongregate_accounts is missing'; end if;
 -- The four functions below are new; one by that name that this file did not make is left for a person to read first. (A function that
 -- is not there gives null here, so the first run passes.)
 if position('kongregate-kreds.sql' in pg_get_functiondef(to_regprocedure('public.harvest_credit_kong_purchase(uuid,bigint,bigint,integer,text,boolean)')))=0 then
  raise exception 'harvest_credit_kong_purchase exists already and was not made by kongregate-kreds.sql; read the live definition before replacing it';
 end if;
 if position('kongregate-kreds.sql' in pg_get_functiondef(to_regprocedure('public.harvest_credit_kong_pack(uuid,text,bigint,bigint,integer,boolean)')))=0 then
  raise exception 'harvest_credit_kong_pack exists already and was not made by kongregate-kreds.sql; read the live definition before replacing it';
 end if;
 if position('kongregate-kreds.sql' in pg_get_functiondef(to_regprocedure('public.harvest_revoke_kong_purchases(jsonb)')))=0 then
  raise exception 'harvest_revoke_kong_purchases exists already and was not made by kongregate-kreds.sql; read the live definition before replacing it';
 end if;
 if position('kongregate-kreds.sql' in pg_get_functiondef(to_regprocedure('public.harvest_kong_claim_slot(bigint,uuid,integer,integer)')))=0 then
  raise exception 'harvest_kong_claim_slot exists already and was not made by kongregate-kreds.sql; read the live definition before replacing it';
 end if;
end $do$;

-- 1. The row: 'kongregate' as a store, and Kongregate's references (whole numbers; one row per item instance).
alter table public.harvest_purchases add column if not exists kong_item_id bigint;
alter table public.harvest_purchases add column if not exists kong_user_id bigint;
alter table public.harvest_purchases add column if not exists kong_usage_id bigint;
alter table public.harvest_purchases add column if not exists kreds integer;
do $do$
declare def text; known text[];
begin
 select pg_get_constraintdef(c.oid) into def from pg_constraint c where c.conname='harvest_purchases_store_check' and c.conrelid='public.harvest_purchases'::regclass;
 select coalesce(array_agg(m[1] order by m[1]),'{}') into known from regexp_matches(coalesce(def,''),'''([^'']*)''','g') m;
 -- The live check must allow exactly the stores of app-store.sql (a first run) or those and 'kongregate' (a second run). Anything else
 -- (a store added live, or app-store.sql not run yet) would be changed by the new check: stop, so a person reads it first.
 if known<>array['app_store','google_play','stripe'] and known<>array['app_store','google_play','kongregate','stripe'] then
  raise exception 'harvest_purchases_store_check is not the one this file expects (%); read the live definition first',def;
 end if;
 alter table public.harvest_purchases drop constraint if exists harvest_purchases_store_check;
 alter table public.harvest_purchases add constraint harvest_purchases_store_check check (store in ('stripe','google_play','app_store','kongregate'));
 if not exists(select 1 from pg_constraint where conname='harvest_purchases_kong_ids_check' and conrelid='public.harvest_purchases'::regclass) then
  alter table public.harvest_purchases add constraint harvest_purchases_kong_ids_check check ((kong_item_id is null or kong_item_id>0)
   and (kong_user_id is null or kong_user_id between 1 and 2147483647) and (kong_usage_id is null or kong_usage_id>0) and (kreds is null or kreds between 1 and 100000));
 end if;
end $do$;
create unique index if not exists harvest_purchases_kong_item on public.harvest_purchases(kong_item_id) where kong_item_id is not null;

-- 2. A Kongregate item instance for one of this farmer's rows (diamond-checkout kong_claim checked the buyer, the row and the product).
-- p_test: a test account; still granted, as livemode false. Safe to repeat with the same instance; another instance for a row that has
-- one, a row of another store or product, or an instance another row holds already (a claim at the same moment that chose another
-- row) is refused or answered as a duplicate, so an instance is never credited twice.
create or replace function public.harvest_credit_kong_purchase(p_purchase uuid, p_item bigint, p_user bigint, p_kreds integer, p_product text, p_test boolean)
returns jsonb
language plpgsql
set search_path to ''
as $function$
-- kongregate-kreds.sql (Oct 2026)
declare purchase public.harvest_purchases%rowtype;
begin
 if p_item is null or p_item<1 or p_user is null or p_user not between 1 and 2147483647 or (p_kreds is not null and p_kreds not between 1 and 100000)
  or p_product is null or p_test is null then raise exception 'Invalid payment reference'; end if;
 select * into purchase from public.harvest_purchases where id=p_purchase for update;
 if not found then raise exception 'Unknown purchase'; end if;
 if purchase.kong_item_id is not null and purchase.kong_item_id<>p_item then raise exception 'Payment mismatch'; end if;
 if purchase.status in ('credited','test_paid','refunded') then
  if purchase.kong_item_id is null then raise exception 'Payment mismatch'; end if;
  return jsonb_build_object('status',purchase.status,'duplicate',true);
 end if;
 if purchase.store<>'kongregate' or purchase.price_id<>p_product then raise exception 'Payment mismatch'; end if;
 if exists(select 1 from public.harvest_purchases where kong_item_id=p_item and id<>p_purchase) then
  return jsonb_build_object('status',purchase.status,'duplicate',true,'other',true);
 end if;
 if purchase.player_id is null then raise exception 'Purchase without a farmer'; end if;
 if purchase.status not in ('pending','expired') then raise exception 'Purchase is not pending'; end if;
 if purchase.pack='starter' then
  if purchase.starter_expires_at is null or purchase.created_at<purchase.starter_expires_at-interval '7 days' or purchase.created_at>=purchase.starter_expires_at then raise exception 'Starter offer expired'; end if;
 end if;
 -- livemode first, so the alert and the log see what kind of purchase it is
 update public.harvest_purchases set kong_item_id=p_item,kong_user_id=p_user,kreds=p_kreds,livemode=not p_test where id=p_purchase;
 perform public.harvest_purchase_grant(p_purchase);
 update public.harvest_purchases set status='credited',credited_at=now() where id=p_purchase;
 return jsonb_build_object('status','credited','duplicate',false);
end $function$;
revoke all on function public.harvest_credit_kong_purchase(uuid,bigint,bigint,integer,text,boolean) from public, anon, authenticated;
grant execute on function public.harvest_credit_kong_purchase(uuid,bigint,bigint,integer,text,boolean) to service_role;

-- 3. A diamond pack bought at Kongregate without a row of ours left to match (bought outside our purchase window, or its data changed by
-- a browser plugin): a new row for it, credited at once through the function above. Only the four diamond packs, whose contents are
-- the pack itself; a Starter Pack, special offer or pass takes its contents from its own row and is never made here. The instance is
-- written into the new row as it is made, so two claims at the same moment cannot both make one (the unique index).
create or replace function public.harvest_credit_kong_pack(p_player uuid, p_pack text, p_item bigint, p_user bigint, p_kreds integer, p_test boolean)
returns jsonb
language plpgsql
set search_path to ''
as $function$
-- kongregate-kreds.sql (Oct 2026)
declare made uuid:=gen_random_uuid(); d integer; c integer;
begin
 select v.diamonds,v.cents into d,c from (values ('150',150,199),('500',500,499),('1250',1250,999),('3500',3500,2499)) v(pack,diamonds,cents) where v.pack=p_pack;
 if not found then raise exception 'Only a diamond pack'; end if;
 if p_player is null or p_item is null or p_item<1 or p_user is null or p_user not between 1 and 2147483647 or (p_kreds is not null and p_kreds not between 1 and 100000)
  or p_test is null then raise exception 'Invalid payment reference'; end if;
 if exists(select 1 from public.harvest_purchases where kong_item_id=p_item) then return jsonb_build_object('status','credited','duplicate',true); end if;
 if not exists(select 1 from public.player_farms where player_id=p_player) then raise exception 'Farm is missing'; end if;
 begin
  insert into public.harvest_purchases(id,player_id,pack,diamonds,coins,amount_cents,price_id,livemode,store,status,kong_item_id,kong_user_id,kreds)
   values(made,p_player,p_pack,d,0,c,'diamonds_'||p_pack,not p_test,'kongregate','pending',p_item,p_user,p_kreds);
 exception when unique_violation then return jsonb_build_object('status','credited','duplicate',true);
 end;
 return public.harvest_credit_kong_purchase(made,p_item,p_user,p_kreds,'diamonds_'||p_pack,p_test)||jsonb_build_object('id',made);
end $function$;
revoke all on function public.harvest_credit_kong_pack(uuid,text,bigint,bigint,integer,boolean) from public, anon, authenticated;
grant execute on function public.harvest_credit_kong_pack(uuid,text,bigint,bigint,integer,boolean) to service_role;

-- 4. Refunded by Kongregate (by hand, from its Kred revenue report: Kongregate sends no refund notice): what the purchase gave is taken
-- back as far as the farm still has it (never below 0; spent diamonds stay spent), VIP time comes off, the pass closes, for live and test
-- purchases alike (both were granted); the row becomes 'refunded'. p_items: [{item, refundedAt}], item = Kongregate's item instance id
-- (kong_item_id). An instance that is not ours, or refunded already, is skipped, so it is safe to repeat.
create or replace function public.harvest_revoke_kong_purchases(p_items jsonb)
returns jsonb
language plpgsql
set search_path to ''
as $function$
-- kongregate-kreds.sql (Oct 2026)
declare item jsonb; purchase public.harvest_purchases%rowtype; farm_state jsonb; n integer:=0; at timestamptz;
begin
 for item in select value from jsonb_array_elements(case when jsonb_typeof(p_items)='array' then p_items else '[]'::jsonb end) loop
  if jsonb_typeof(item)<>'object' or coalesce(item->>'item','') !~ '^[1-9][0-9]{0,17}$' then continue; end if;
  select * into purchase from public.harvest_purchases where kong_item_id=(item->>'item')::bigint and store='kongregate' for update;
  if not found or purchase.status not in ('credited','test_paid') then continue; end if;
  begin at:=coalesce((item->>'refundedAt')::timestamptz,now()); exception when others then at:=now(); end;
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
    insert into public.player_logs(player_id,category,action,text) values(purchase.player_id,'purchase','refund','Refunded by Kongregate: '
     ||case when purchase.pack='starter' then 'the Starter Pack' when purchase.pack='pass' then 'the Halloween Pass' when purchase.pack='offer' then 'the special offer'
      else to_char(purchase.diamonds,'FM999G999')||' diamonds' end||' (taken back as far as the farm still had it)');
   end if;
  end if;
  update public.harvest_purchases set status='refunded',refunded_at=at where id=purchase.id;
  n:=n+1;
 end loop;
 return jsonb_build_object('revoked',n);
end $function$;
revoke all on function public.harvest_revoke_kong_purchases(jsonb) from public, anon, authenticated;
grant execute on function public.harvest_revoke_kong_purchases(jsonb) to service_role;

-- 5. How often a farmer's page may make diamond-checkout ask Kongregate (kong_claim; 15 Oct 2026 review): p_gap_ms apart and p_max an
-- hour per Kongregate account (game/payments.js KONG_CLAIM_LIMIT: 5 seconds, 120), so nobody can make us call Kongregate with the game's
-- key over and over (kongregate_check_slot does the same for sign-ins). Checked against the account's own row in the same step, before
-- Kongregate is asked: 'ok' (counted), 'busy' (too soon or too often; nothing counted) or 'other' (this Kongregate user plays another
-- farm, or none). The row is changed under its own lock, so two claims at the same moment cannot both pass.
alter table public.kongregate_accounts add column if not exists kreds_claim_at timestamptz;
alter table public.kongregate_accounts add column if not exists kreds_claims integer not null default 0;
alter table public.kongregate_accounts add column if not exists kreds_claims_from timestamptz;
create or replace function public.harvest_kong_claim_slot(p_user bigint, p_player uuid, p_gap_ms integer, p_max integer)
returns text
language plpgsql
set search_path to ''
as $function$
-- kongregate-kreds.sql (Oct 2026)
begin
 update public.kongregate_accounts set kreds_claim_at=now(),
  kreds_claims=case when kreds_claims_from is null or kreds_claims_from<=now()-interval '1 hour' then 1 else kreds_claims+1 end,
  kreds_claims_from=case when kreds_claims_from is null or kreds_claims_from<=now()-interval '1 hour' then now() else kreds_claims_from end
  where kong_user_id=p_user and player_id=p_player
   and (kreds_claim_at is null or kreds_claim_at<=now()-greatest(coalesce(p_gap_ms,0),0)*interval '1 millisecond')
   and (kreds_claims_from is null or kreds_claims_from<=now()-interval '1 hour' or kreds_claims<greatest(coalesce(p_max,0),0));
 if found then return 'ok'; end if;
 if exists(select 1 from public.kongregate_accounts where kong_user_id=p_user and player_id=p_player) then return 'busy'; end if;
 return 'other';
end $function$;
revoke all on function public.harvest_kong_claim_slot(bigint,uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.harvest_kong_claim_slot(bigint,uuid,integer,integer) to service_role;

-- 6. Delete account (delete-account.sql; 15 Oct 2026 review): a purchase kept for the bookkeeping no longer names the Kongregate user
-- (kong_user_id null; kong_item_id stays, the once-only guard), and a Kongregate test purchase (no money) keeps its row without the
-- account instead of being deleted, so its item instance can never be credited again to a new farm of the same Kongregate user.
-- Patched from the LIVE definition, only the two lines named (as kongregate.sql does): a function patched already is left alone, one
-- without the expected line once stops the whole file, nothing half-done.
create or replace function pg_temp.kreds_patch(p_fn regprocedure, p_marker text, p_from text, p_to text)
returns void language plpgsql as $f$
declare def text:=pg_get_functiondef(p_fn);
begin
 if position(p_marker in def)>0 then return; end if;
 if position(p_from in def)=0 or (length(def)-length(replace(def,p_from,'')))/length(p_from)<>1 then
  raise exception using message=format('%s: the expected text was not found once; read the live definition before changing it', p_fn);
 end if;
 execute replace(def,p_from,p_to);
end $f$;
select pg_temp.kreds_patch('public.harvest_delete_account(uuid,text)',$m$not livemode and kong_item_id is null$m$,
 $a$delete from public.harvest_purchases where player_id=p_player and not livemode;$a$,
 $b$delete from public.harvest_purchases where player_id=p_player and not livemode and kong_item_id is null;$b$);
select pg_temp.kreds_patch('public.harvest_delete_account(uuid,text)',$m$account_deleted_at=now(),kong_user_id=null,$m$,
 $a$update public.harvest_purchases set player_id=null,account_deleted_at=now(),$a$,
 $b$update public.harvest_purchases set player_id=null,account_deleted_at=now(),kong_user_id=null,$b$);
revoke all on function public.harvest_delete_account(uuid,text) from public, anon, authenticated;
grant execute on function public.harvest_delete_account(uuid,text) to service_role;

-- Dry run first, if you like: in the SQL editor put "begin;" above this file and these lines plus "rollback;" below it, so nothing stays.
-- select pg_get_constraintdef(oid) from pg_constraint where conname='harvest_purchases_store_check'; -- ... 'kongregate' ...
-- select public.harvest_revoke_kong_purchases('[{"item":"1"},{"item":"x"},5]'::jsonb); -- {"revoked": 0}
-- select public.harvest_kong_claim_slot(1,gen_random_uuid(),5000,120); -- other
-- select public.harvest_credit_kong_purchase(gen_random_uuid(),1,1,null,'diamonds_150',false); -- ERROR: Unknown purchase
