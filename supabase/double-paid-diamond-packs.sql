-- Doubles the three standalone paid diamond packs without changing their prices.
-- Legacy values remain valid so a checkout opened before this release can still
-- be confirmed safely by the Stripe webhook. Browser clients have no write
-- access to this table; the checkout function only creates the new pack IDs.
begin;

alter table public.harvest_purchases
 drop constraint harvest_purchases_pack_check,
 drop constraint harvest_purchases_diamonds_check,
 drop constraint harvest_pack_amount_matches;

alter table public.harvest_purchases
 add constraint harvest_purchases_pack_check
  check(pack in ('50','300','1000','100','600','2000','starter')),
 add constraint harvest_purchases_diamonds_check
  check(diamonds in (50,100,300,600,1000,2000)),
 add constraint harvest_pack_amount_matches check(
  (pack='50' and diamonds=50 and coins=0 and amount_cents=199) or
  (pack='300' and diamonds=300 and coins=0 and amount_cents=999) or
  (pack='1000' and diamonds=1000 and coins=0 and amount_cents=2499) or
  (pack='100' and diamonds=100 and coins=0 and amount_cents=199) or
  (pack='600' and diamonds=600 and coins=0 and amount_cents=999) or
  (pack='2000' and diamonds=2000 and coins=0 and amount_cents=2499) or
  (pack='starter' and diamonds=300 and coins=10000 and amount_cents=299));

commit;
