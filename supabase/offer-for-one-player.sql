-- An offer for one farmer (22 Oct 2026, the owner: "onbeperkte actie voor info+appstore@harvesttycoon.com"): App Review's demo account
-- gets its own special offer that never runs out, so Apple finds special_offer in the iPhone app 1.5 while no other farmer sees it.
-- harvest_offers gets player_id (null = everyone, as before); diamond-checkout (currentOffer) takes the farmer's own offer before the
-- offer for everyone; offer_post, which stops the running offer when the admin posts a new one, now stops only offers for everyone.
-- Run before diamond-checkout of this release (the old diamond-checkout ignores player_id, so it would show the demo offer to all: run
-- the SQL, then deploy diamond-checkout at once, and only then insert the demo offer — the last block does that, so deploy first and
-- run the last block after, or run all of it right after the deploy).
alter table public.harvest_offers add column if not exists player_id uuid references auth.users(id) on delete cascade;
create index if not exists harvest_offers_player on public.harvest_offers(player_id) where player_id is not null;

do $$ declare d text; begin
 d:=pg_get_functiondef('public.offer_post(integer,integer,integer,text,integer,integer)'::regprocedure);
 if md5(d) not in ('95e353a5f6665cec26b31e29035109b9') and position('and player_id is null' in d)=0 then raise exception 'offer_post is not the one read on 22 Oct 2026'; end if;
 if position('and player_id is null' in d)=0 then
  d:=replace(d,'where stopped_at is null and ends_at>now();','where stopped_at is null and ends_at>now() and player_id is null;');
  if position('and player_id is null' in d)=0 then raise exception 'offer_post: the stop line was not found'; end if;
  execute d;
 end if;
end $$;
select md5(pg_get_functiondef('public.offer_post(integer,integer,integer,text,integer,integer)'::regprocedure)) offer_post_md5;
