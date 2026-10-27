-- The Sale (27 Oct 2026, the owner): next to the special offer, the admin can start a Sale from the Admin panel for 1 to 72 hours.
-- While it runs, every plain diamond pack (150, 500, 1250, 3500; not the Starter Pack, the special offer, a pass, VIP or the coin pack)
-- gives 40% more diamonds for the same price: 150 + 60, 500 + 200, 1250 + 500, 3500 + 1400 (game/payments.js SALE, saleBonus).
-- The admin picks its name from a fixed list (the owner, 27 Oct 2026): kind 'sale' (Sale) by default, or halloween, autumn,
-- black_friday, christmas, winter, new_year, valentines, easter, spring, summer, weekend; only the title in the shop and the list change.
--
-- The bonus is decided when the purchase row is made (diamond-checkout create, for Stripe, Google Play, the App Store and Kreds;
-- harvest_credit_kong_pack for a Kreds pack bought without a row of ours) and kept on the row: sale_id (the Sale it came from) and
-- sale_bonus (the extra diamonds). diamonds stays the pack's own amount, so every existing check on a pack (harvest_pack_amount_matches,
-- game/payments.js validatePaidSession, checkPlayPurchase, checkApplePurchase, checkKongPurchase) stays as it is. A Sale that ends
-- between paying and crediting still gives what the row holds. harvest_purchase_grant adds diamonds + sale_bonus, once (it runs only
-- from the crediting functions, each of which credits a row once); a refund (Google Play, the App Store, Kongregate by hand) takes
-- diamonds + sale_bonus back, as far as the farm still has them. Stripe sends no refunds to the game (none before this file either).
--
-- What this file does (re-runnable; the SQL editor runs it as one transaction, so a stop keeps nothing):
-- 1. table harvest_diamond_sales; 2. harvest_purchases.sale_id and sale_bonus with their check;
-- 3. the admin's diamond_sale_start(hours, kind) / diamond_sale_stop(id) / diamond_sale_list(), guarded exactly like offer_post
--    (chat_staff_role = 'admin', a Google session), and diamond_sale_now() for everyone (the running Sale or null);
-- 4. seven live functions patched in place, each from its body read LIVE on 27 Oct 2026 (md5 of prosrc below): a body that is not
--    that one stops the file; one patched already (it holds sale_bonus) is left alone. Only the lines named change:
--    harvest_purchase_grant (+ sale_bonus), harvest_revoke_play/apple/kong_purchases (- sale_bonus, and the log line counts it),
--    harvest_credit_kong_pack (a row made at credit time gets the Sale running then), harvest_purchase_alert and harvest_purchase_log
--    ("500 diamonds + 200 Sale bonus").
-- 5. a check at the end: every patched body is exactly as written here (md5), the table, columns and functions are there.
--
-- Release order: this file first, then the functions diamond-checkout (it reads diamond_sale_now; before this file it finds none and
-- sells as before), then the site. Start a Sale only after all three are out.
-- This file holds no characters outside ASCII, so a plain copy is safe.

-- 0. What this file builds on, and the live bodies it patches.
do $do$
declare f record;
begin
 if to_regprocedure('public.chat_staff_role(uuid)') is null then raise exception 'chat_staff_role is missing'; end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='harvest_purchases' and column_name='kong_item_id') then
  raise exception 'Run kongregate-kreds.sql first: harvest_purchases.kong_item_id is missing';
 end if;
 for f in select * from (values
  ('harvest_purchase_grant(uuid)','09baaa1fccbb236f16552e62c7edbb21'),
  ('harvest_revoke_play_purchases(jsonb)','5370e5ae4691814f02091bf273aa78a8'),
  ('harvest_revoke_apple_purchases(jsonb)','b89aa2acc0ec8e2eb0dbca345d8d8b65'),
  ('harvest_revoke_kong_purchases(jsonb)','fce2acc52eeb5195b884ce11f4ecd2b0'),
  ('harvest_credit_kong_pack(uuid,text,bigint,bigint,integer,boolean)','677d5740a9d3f1b38d350528907540a8'),
  ('harvest_purchase_alert()','755510a434f9c45ebe1b6252b11abd14'),
  ('harvest_purchase_log()','e6724b4f92983500c25e409c1db2aedc')) v(fn,before) loop
  if to_regprocedure('public.'||f.fn) is null then raise exception '% is missing',f.fn; end if;
  if (select md5(prosrc)<>f.before and position('sale_bonus' in prosrc)=0 from pg_proc where oid=('public.'||f.fn)::regprocedure) then
   raise exception '% is not the body read on 27 Oct 2026: read the live definition before running this file',f.fn;
  end if;
 end loop;
end $do$;

-- 1. The Sales: one at a time (starting one stops the one running), 40% each (game/payments.js SALE.percent), 1 to 72 hours, a kind
-- from the fixed list. Only the functions below read or write it.
create table if not exists public.harvest_diamond_sales(
 id uuid primary key default gen_random_uuid(),
 kind text not null default 'sale' check (kind in ('sale','halloween','autumn','black_friday','christmas','winter','new_year','valentines','easter','spring','summer','weekend')),
 percent integer not null default 40 check (percent=40),
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null,
 stopped_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 check (ends_at>starts_at and ends_at<=starts_at+interval '72 hours'));
create index if not exists harvest_diamond_sales_created on public.harvest_diamond_sales(created_at desc);
alter table public.harvest_diamond_sales enable row level security;
revoke all on public.harvest_diamond_sales from public, anon, authenticated;
grant select, insert, update on public.harvest_diamond_sales to service_role;

-- 2. The bonus on the purchase row: none (0, no Sale), or exactly 40% of a plain pack's diamonds with the Sale it came from.
alter table public.harvest_purchases add column if not exists sale_id uuid references public.harvest_diamond_sales(id);
alter table public.harvest_purchases add column if not exists sale_bonus integer not null default 0;
alter table public.harvest_purchases drop constraint if exists harvest_purchases_sale_check;
alter table public.harvest_purchases add constraint harvest_purchases_sale_check check (
 (sale_bonus=0 and sale_id is null) or
 (sale_bonus>0 and sale_id is not null and pack in ('150','500','1250','3500') and sale_bonus=least(2000,round(diamonds*0.4)::integer)));
create index if not exists harvest_purchases_sale on public.harvest_purchases(sale_id) where sale_id is not null;

-- 3. The admin's functions (src/chat-client.js startSale / saleList / stopSale; the Admin panel's Sale card) and the public read.
create or replace function public.diamond_sale_start(p_hours integer, p_kind text default 'sale')
returns uuid language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());hours integer:=p_hours;what text:=coalesce(nullif(p_kind,''),'sale');sale uuid;
begin
 if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if hours is null or hours not between 1 and 72 then raise exception 'Choose 1 to 72 hours.' using errcode='22023'; end if;
 if what not in ('sale','halloween','autumn','black_friday','christmas','winter','new_year','valentines','easter','spring','summer','weekend') then
  raise exception 'Choose a name from the list.' using errcode='22023';
 end if;
 update public.harvest_diamond_sales set stopped_at=now() where stopped_at is null and ends_at>now();
 insert into public.harvest_diamond_sales(kind,ends_at,created_by) values(what,now()+make_interval(hours=>hours),me) returning id into sale;
 return sale;
end $f$;

create or replace function public.diamond_sale_stop(p_id uuid) returns void language plpgsql security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 update public.harvest_diamond_sales set stopped_at=now() where id=p_id and stopped_at is null;
end $f$;

-- The last ten, newest first: when, how long, whether it runs, and what it sold (paid rows with its bonus; bonus diamonds given).
create or replace function public.diamond_sale_list() returns jsonb language plpgsql stable security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'kind',s.kind,'percent',s.percent,'createdAt',s.created_at,'endsAt',s.ends_at,'stoppedAt',s.stopped_at,
   'active',s.stopped_at is null and s.ends_at>now(),
   'bought',(select count(*) from public.harvest_purchases p where p.sale_id=s.id and p.status='credited' and p.livemode),
   'bonus',(select coalesce(sum(p.sale_bonus),0) from public.harvest_purchases p where p.sale_id=s.id and p.status='credited' and p.livemode)) order by s.created_at desc)
  from (select * from public.harvest_diamond_sales order by created_at desc limit 10) s),'[]'::jsonb);
end $f$;

-- The Sale running now, for anyone (diamond-checkout reads it for the catalogue and each checkout): {id, kind, percent, endsAt (ms)} or null.
create or replace function public.diamond_sale_now() returns jsonb language sql stable security definer set search_path to '' as $f$
 select jsonb_build_object('id',s.id,'kind',s.kind,'percent',s.percent,'endsAt',(extract(epoch from s.ends_at)*1000)::bigint)
 from public.harvest_diamond_sales s where s.stopped_at is null and s.starts_at<=now() and s.ends_at>now() order by s.created_at desc limit 1
$f$;

do $g$
declare f text;
begin
 foreach f in array array['diamond_sale_start(integer,text)','diamond_sale_stop(uuid)','diamond_sale_list()'] loop
  execute format('revoke all on function public.%s from public, anon',f);
  execute format('grant execute on function public.%s to authenticated',f);
 end loop;
 revoke all on function public.diamond_sale_now() from public;
 grant execute on function public.diamond_sale_now() to anon, authenticated, service_role;
end $g$;

-- 4. The patches, each on the body read live on 27 Oct 2026 (as supabase/season-pass-engine.sql season_patch): every part must be
-- there exactly once; the new body must come out with the md5 written here.
create or replace function pg_temp.sale_patch(p_fn text, p_before text, p_after text, p_from text[], p_to text[]) returns void language plpgsql as $f$
declare fn regprocedure:=('public.'||p_fn)::regprocedure; src text; def text; at integer; i integer;
begin
 select prosrc into src from pg_proc where oid=fn;
 if position('sale_bonus' in src)>0 then
  if md5(src)<>p_after then raise exception '% holds sale_bonus but is not the body this file writes: read it first',p_fn; end if;
  return;
 end if;
 if md5(src)<>p_before then raise exception '% is not the body read on 27 Oct 2026 (md5 % instead of %)',p_fn,md5(src),p_before; end if;
 for i in 1..coalesce(array_length(p_from,1),0) loop
  if (length(src)-length(replace(src,p_from[i],'')))/length(p_from[i])<>1 then raise exception '%: part % is not there exactly once',p_fn,i; end if;
  src:=replace(src,p_from[i],p_to[i]);
 end loop;
 if md5(src)<>p_after then raise exception '%: the patched body is not the one expected (md5 %)',p_fn,md5(src); end if;
 if position('$function$' in src)>0 then raise exception '%: unexpected quote',p_fn; end if;
 def:=pg_get_functiondef(fn);at:=position('AS $function$' in def);
 if at=0 then raise exception '%: no body to replace',p_fn; end if;
 execute substring(def from 1 for at+2)||'$function$'||src||'$function$';
end $f$;

-- What a purchase gives: its diamonds and its Sale bonus.
select pg_temp.sale_patch('harvest_purchase_grant(uuid)','09baaa1fccbb236f16552e62c7edbb21','5c47bee6feb80df59952b411bfdf4e79',
 array[$a$to_jsonb(coalesce((farm_state->>'diamonds')::bigint,0)+purchase.diamonds));$a$],
 array[$b$to_jsonb(coalesce((farm_state->>'diamonds')::bigint,0)+purchase.diamonds+purchase.sale_bonus));$b$]);

-- A refund takes back the diamonds and the Sale bonus (never below 0), and the farmer's log names both.
select pg_temp.sale_patch('harvest_revoke_play_purchases(jsonb)','5370e5ae4691814f02091bf273aa78a8','ddf08832ab874849532d2cd380cd172d',
 array[$a$coalesce((farm_state->>'diamonds')::bigint,0)-purchase.diamonds)));$a$,$a$else to_char(purchase.diamonds,'FM999G999')||' diamonds' end$a$],
 array[$b$coalesce((farm_state->>'diamonds')::bigint,0)-purchase.diamonds-purchase.sale_bonus)));$b$,$b$else to_char(purchase.diamonds+purchase.sale_bonus,'FM999G999')||' diamonds' end$b$]);
select pg_temp.sale_patch('harvest_revoke_apple_purchases(jsonb)','b89aa2acc0ec8e2eb0dbca345d8d8b65','a94d972c010eaf8a782352d52180bbe1',
 array[$a$coalesce((farm_state->>'diamonds')::bigint,0)-purchase.diamonds)));$a$,$a$else to_char(purchase.diamonds,'FM999G999')||' diamonds' end$a$],
 array[$b$coalesce((farm_state->>'diamonds')::bigint,0)-purchase.diamonds-purchase.sale_bonus)));$b$,$b$else to_char(purchase.diamonds+purchase.sale_bonus,'FM999G999')||' diamonds' end$b$]);
select pg_temp.sale_patch('harvest_revoke_kong_purchases(jsonb)','fce2acc52eeb5195b884ce11f4ecd2b0','1173d3cd8d9ddd01f1000bf886214208',
 array[$a$coalesce((farm_state->>'diamonds')::bigint,0)-purchase.diamonds)));$a$,$a$else to_char(purchase.diamonds,'FM999G999')||' diamonds' end$a$],
 array[$b$coalesce((farm_state->>'diamonds')::bigint,0)-purchase.diamonds-purchase.sale_bonus)));$b$,$b$else to_char(purchase.diamonds+purchase.sale_bonus,'FM999G999')||' diamonds' end$b$]);

-- A Kreds pack bought without a row of ours (diamond-checkout kong_claim 'new'): its row is made when it is credited, so it gets the
-- Sale running at that moment, as a row made at checkout does.
select pg_temp.sale_patch('harvest_credit_kong_pack(uuid,text,bigint,bigint,integer,boolean)','677d5740a9d3f1b38d350528907540a8','8d568e90dbe31d2de06246ccf03a67c6',
 array[$a$insert into public.harvest_purchases(id,player_id,pack,diamonds,coins,amount_cents,price_id,livemode,store,status,kong_item_id,kong_user_id,kreds)
   values(made,p_player,p_pack,d,0,c,'diamonds_'||p_pack,not p_test,'kongregate','pending',p_item,p_user,p_kreds);$a$],
 array[$b$insert into public.harvest_purchases(id,player_id,pack,diamonds,coins,amount_cents,price_id,livemode,store,status,kong_item_id,kong_user_id,kreds,sale_id,sale_bonus)
   select made,p_player,p_pack,d,0,c,'diamonds_'||p_pack,not p_test,'kongregate','pending',p_item,p_user,p_kreds,s.id,case when s.id is null then 0 else least(2000,round(d*0.4)::integer) end
   from (select 1) one left join lateral (select x.id from public.harvest_diamond_sales x where x.stopped_at is null and x.starts_at<=now() and x.ends_at>now() order by x.created_at desc limit 1) s on true;$b$]);

-- The admins' purchase notice and the farmer's log: "500 diamonds + 200 Sale bonus".
select pg_temp.sale_patch('harvest_purchase_alert()','755510a434f9c45ebe1b6252b11abd14','2fd12631c57aa45034a6fe9246318e3f',
 array[$a$else to_char(new.diamonds,'FM999G999')||' diamonds' end$a$],
 array[$b$else to_char(new.diamonds,'FM999G999')||' diamonds'||case when new.sale_bonus>0 then ' + '||to_char(new.sale_bonus,'FM999G999')||' Sale bonus' else '' end end$b$]);
select pg_temp.sale_patch('harvest_purchase_log()','e6724b4f92983500c25e409c1db2aedc','f036c98ee5485391eea2ef64f3c2442f',
 array[$a$else to_char(new.diamonds,'FM999G999')||' diamonds' end$a$],
 array[$b$else to_char(new.diamonds,'FM999G999')||' diamonds'||case when new.sale_bonus>0 then ' + '||to_char(new.sale_bonus,'FM999G999')||' Sale bonus' else '' end end$b$]);

-- 5. After: everything is there and every patched body is exactly as written above.
do $after$
declare f record;
begin
 if to_regclass('public.harvest_diamond_sales') is null then raise exception 'harvest_diamond_sales is missing'; end if;
 if (select count(*) from information_schema.columns where table_schema='public' and table_name='harvest_purchases' and column_name in ('sale_id','sale_bonus'))<>2 then
  raise exception 'harvest_purchases.sale_id / sale_bonus are missing';
 end if;
 if to_regprocedure('public.diamond_sale_start(integer,text)') is null or to_regprocedure('public.diamond_sale_stop(uuid)') is null
  or to_regprocedure('public.diamond_sale_list()') is null or to_regprocedure('public.diamond_sale_now()') is null then
  raise exception 'a diamond_sale function is missing';
 end if;
 for f in select * from (values
  ('harvest_purchase_grant(uuid)','5c47bee6feb80df59952b411bfdf4e79'),
  ('harvest_revoke_play_purchases(jsonb)','ddf08832ab874849532d2cd380cd172d'),
  ('harvest_revoke_apple_purchases(jsonb)','a94d972c010eaf8a782352d52180bbe1'),
  ('harvest_revoke_kong_purchases(jsonb)','1173d3cd8d9ddd01f1000bf886214208'),
  ('harvest_credit_kong_pack(uuid,text,bigint,bigint,integer,boolean)','8d568e90dbe31d2de06246ccf03a67c6'),
  ('harvest_purchase_alert()','2fd12631c57aa45034a6fe9246318e3f'),
  ('harvest_purchase_log()','f036c98ee5485391eea2ef64f3c2442f')) v(fn,after) loop
  if (select md5(prosrc) from pg_proc where oid=('public.'||f.fn)::regprocedure)<>f.after then
   raise exception '% did not come out as written: nothing of this file is kept',f.fn;
  end if;
 end loop;
end $after$;
select md5(prosrc) grant_md5 from pg_proc where oid='public.harvest_purchase_grant(uuid)'::regprocedure;
