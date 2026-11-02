-- The Starter Pack gives 100,000 coins instead of 10,000 (30 Oct 2026, the owner; the price stays €2.99, game/payments.js). A purchase
-- row may hold either: 10,000 for a checkout opened before the change (STARTER_COINS_BEFORE, still credited as it showed), 100,000
-- after. Only that one part of harvest_pack_amount_matches changes; the rest is read from the live check and kept as it is.
-- Run before the payment functions and the site. Safe to run again (it stops once the new amounts are in).
do $starter$
declare definition text; before text;
begin
 select pg_get_constraintdef(oid) into definition from pg_constraint where conrelid='public.harvest_purchases'::regclass and conname='harvest_pack_amount_matches';
 if definition is null then raise exception 'harvest_pack_amount_matches not found'; end if;
 if position('ARRAY[10000, 100000]' in definition)>0 then return; end if;
 before:=definition;
 definition:=replace(definition,'(pack = ''starter''::text) AND (diamonds = ANY (ARRAY[300, 500])) AND (coins = 10000) AND (amount_cents = 299)',
  '(pack = ''starter''::text) AND (diamonds = ANY (ARRAY[300, 500])) AND (coins = ANY (ARRAY[10000, 100000])) AND (amount_cents = 299)');
 if definition=before then raise exception 'The Starter Pack part of the check was not where it was expected.'; end if;
 execute 'alter table public.harvest_purchases drop constraint harvest_pack_amount_matches';
 execute 'alter table public.harvest_purchases add constraint harvest_pack_amount_matches '||definition;
end
$starter$;
-- After-check: both amounts are allowed now.
do $after$
begin
 if position('ARRAY[10000, 100000]' in (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.harvest_purchases'::regclass and conname='harvest_pack_amount_matches')) = 0 then raise exception 'The new Starter Pack amounts are not in the check.'; end if;
end
$after$;
