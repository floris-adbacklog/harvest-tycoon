-- The Starter Pack holds 500 diamonds from 27 Sep 2026 (as many as the €4.99 pack), 300 before: both stay valid, for checkouts
-- opened before the change (game/payments.js, STARTER_DIAMONDS_BEFORE). Every other pack as it was.
alter table public.harvest_purchases drop constraint if exists harvest_pack_amount_matches;
alter table public.harvest_purchases add constraint harvest_pack_amount_matches check (
 (pack in ('50','100','150') and diamonds=(case when pack ~ '^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=199)
 or (pack='500' and diamonds=500 and coins=0 and amount_cents=499)
 or (pack in ('300','600','1250') and diamonds=(case when pack ~ '^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=999)
 or (pack in ('1000','2000','3500') and diamonds=(case when pack ~ '^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=2499)
 or (pack='starter' and diamonds in (300,500) and coins=10000 and amount_cents=299)
);
