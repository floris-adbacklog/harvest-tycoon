-- The special offer at 33%, 50% or 90% off (21 Oct 2026, the owner: "Maak het mogelijk om te kiezen uit 33%, 50% of 90% korting in de
-- actie i.p.v. enkel 90%"). The price stays €4.99 (the same Stripe, Google Play, App Store and Kongregate product); what is in it
-- follows the discount: worth €49.99 at 90% (as before), €9.98 at 50%, €7.45 at 33% (game/payments.js OFFER.discounts). offer_post
-- checks the worth with the same sum as game/payments.js offerValueCents; now it takes an offer within 2% of any of the three (the
-- bands do not overlap). Nothing stores the discount: the worth of the contents says which it is, so harvest_offers, its checks and
-- every row already there stay as they are, and no new function is made (no grants to revoke).
-- Run this first, then the functions (diamond-checkout, stripe-webhook, app-store-notify), then the site. The Admin panel from before
-- only makes 90% offers, which this function still takes; until the functions are out, a 33% or 50% offer is refused at checkout
-- ("This offer has ended."), so post one only after them.
-- offer_post is replaced from the LIVE definition read on 21 Oct 2026 (md5 2a12640e84d223cd0e4827abc2c9fafc, the one
-- supabase/offer-coins-500.sql and supabase/special-offer.sql give), with only the worth line changed (md5
-- 95e353a5f6665cec26b31e29035109b9 after this file); a different live definition stops the file. Re-runnable.
-- offer_post holds a € (its worth message): copy this file as UTF-8 (LC_ALL=en_US.UTF-8 pbcopy). The check at the end stops the file
-- when offer_post did not come out exactly as written, so a mangled € never stays (the SQL editor runs the file as one transaction).

do $guard$
begin
 if md5(pg_get_functiondef('public.offer_post(integer,integer,integer,text,integer,integer)'::regprocedure))
  not in ('2a12640e84d223cd0e4827abc2c9fafc','95e353a5f6665cec26b31e29035109b9') then
  raise exception 'offer_post is not as it was on 21 Oct 2026: compare it with the live definition first';
 end if;
end $guard$;

-- Posting: the same function, worth €49.99, €9.98 or €7.45 (it said only €49.99). Its grants stay (create or replace keeps them).
create or replace function public.offer_post(p_diamonds integer, p_coins integer, p_vip_days integer, p_audience text, p_min_level integer, p_hours integer)
returns uuid language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());d integer:=coalesce(p_diamonds,0);c integer:=coalesce(p_coins,0);v integer:=coalesce(p_vip_days,0);
 who text:=coalesce(nullif(p_audience,''),'all');lvl integer:=coalesce(p_min_level,14);hours integer:=coalesce(p_hours,48);worth integer;offer uuid;
begin
 if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if d not between 0 and 20000 or c not between 0 and 10000000 or v not in (0,7,30,60,90) then raise exception 'Choose amounts within the limits.' using errcode='22023'; end if;
 if d=0 and c=0 and v=0 then raise exception 'Put something in the offer.' using errcode='22023'; end if;
 worth:=round((d+c/500.0+case v when 7 then 500 when 30 then 1500 when 60 then 3000 when 90 then 4500 else 0 end)*499/500.0);
 if abs(worth-4999)>4999*0.02 and abs(worth-998)>998*0.02 and abs(worth-745)>745*0.02 then raise exception 'The offer must be worth €7.45, €9.98 or €49.99; it is worth €%.', to_char(worth/100.0,'FM990.00') using errcode='22023'; end if;
 if who not in ('all','browser','phone_browser','phone','desktop') then raise exception 'Choose who sees it.' using errcode='22023'; end if;
 if lvl not between 10 and 200 then raise exception 'Choose a level from 10 to 200.' using errcode='22023'; end if;
 if hours not between 1 and 336 then raise exception 'Choose up to 336 hours (14 days).' using errcode='22023'; end if;
 update public.harvest_offers set stopped_at=now() where stopped_at is null and ends_at>now();
 insert into public.harvest_offers(diamonds,coins,vip_days,audience,min_level,ends_at,created_by)
  values(d,c,v,who,lvl,now()+make_interval(hours=>hours),me) returning id into offer;
 return offer;
end $f$;

-- After: offer_post is exactly the function above (md5 95e353a5…).
do $after$
begin
 if md5(pg_get_functiondef('public.offer_post(integer,integer,integer,text,integer,integer)'::regprocedure))<>'95e353a5f6665cec26b31e29035109b9' then
  raise exception 'offer_post did not come out as written (copied as UTF-8?): nothing of this file is kept';
 end if;
end $after$;
