-- App Review's demo account (info+appstore@harvesttycoon.com, f99d9175…, 22 Oct 2026, the owner: "doe 1,4,5"), so Apple finds all three
-- in-app purchases of the iPhone app 1.5.
-- A. Level 25 (was 10: the Season Pass is for sale from 20), and its Starter Pack week starts now (the server stamps it only on the way
--    up through 14, and a farm that jumps past it gets unlockedAt 0, never offered). The row is saved first; a new revision, so a request
--    that read the farm before cannot save the old one back. Safe to run any time.
create table if not exists public.backup_demo_review_20261022 as
 select * from public.player_farms where player_id='f99d9175-2e83-44a3-ad0a-c225a4b04c1f';
update public.player_farms
 set state=jsonb_set(jsonb_set(state,'{xp}',to_jsonb(greatest(12244,coalesce((state->>'xp')::int,0)))),
                     '{starterOffer}',jsonb_build_object('unlockedAt',floor(extract(epoch from now())*1000)::bigint)),
     revision=revision+1
 where player_id='f99d9175-2e83-44a3-ad0a-c225a4b04c1f';
update public.player_stats set level=greatest(level,25) where player_id='f99d9175-2e83-44a3-ad0a-c225a4b04c1f';
select (state->>'xp')::int xp,state->'starterOffer' starter,revision from public.player_farms where player_id='f99d9175-2e83-44a3-ad0a-c225a4b04c1f';

-- B. ONLY AFTER diamond-checkout of this release is deployed (the old one ignores player_id and would show this offer to everyone):
--    the demo account's own special offer, the contents of the 50% offer of 22 Oct (250 diamonds, 125,000 coins, 7 days VIP, €4.99),
--    until the end of 2027 (supabase/offer-for-one-player.sql must have run first).
-- insert into public.harvest_offers(diamonds,coins,vip_days,audience,min_level,ends_at,created_by,player_id)
--  values(250,125000,7,'all',10,'2027-12-31 23:59:59+00','e8e4c7c3-c06f-408c-9fe6-1cfa7d2b3ae8','f99d9175-2e83-44a3-ad0a-c225a4b04c1f')
--  returning id,ends_at;
