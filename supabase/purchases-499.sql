-- The 500-diamond pack costs €4.99 (game/payments.js), and harvest_pack_amount_matches allows it, but the older amount check
-- (starter-pack.sql) still only accepted 199, 299, 999 and 2499 cents: every €4.99 checkout failed with a check violation (23514)
-- before Stripe was even reached. Live as migration harvest_purchases_allow_499 (24 Sep 2026).
alter table public.harvest_purchases drop constraint if exists harvest_purchases_amount_cents_check;
alter table public.harvest_purchases add constraint harvest_purchases_amount_cents_check check (amount_cents = any (array[199, 299, 499, 999, 2499]));
