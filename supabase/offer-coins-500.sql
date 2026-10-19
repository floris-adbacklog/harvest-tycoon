-- The special offer values coins at 500 a diamond (20 Oct 2026, the owner: "1 diamond = 500 coins"); it was 200. offer_post checks
-- that an offer is worth €49.99 with the same sum as game/payments.js offerValueCents, so it takes the same rate: only c/200.0 becomes
-- c/500.0. With the new rate the Admin panel fills e.g. 1,000 diamonds + 500,000 coins + 60 days VIP (offerFill).
-- Run this before the site goes out: the Admin panel from before still fills coins at 200 a diamond, which this function now refuses,
-- and the new panel's amounts are refused by the function from before. No offer was running on 20 Oct 2026; a purchase begun under an
-- older offer is still credited (game/payments.js paidOfferProblem takes either rate).
-- offer_post is replaced from the LIVE definition read on 20 Oct 2026 (md5 6e7d4f9a43cde06be7806c57fdb311e2, the one
-- supabase/offer-level-10.sql gives), with only that sum changed (md5 2a12640e84d223cd0e4827abc2c9fafc after this file, which
-- supabase/special-offer.sql now gives too); a different live definition stops the file. Re-runnable.
-- offer_post holds a € (its worth message): copy this file as UTF-8 (LC_ALL=en_US.UTF-8 pbcopy). The check at the end stops the file
-- when offer_post did not come out exactly as written, so a mangled € never stays (the SQL editor runs the file as one transaction).

do $guard$
begin
 if md5(pg_get_functiondef('public.offer_post(integer,integer,integer,text,integer,integer)'::regprocedure))
  not in ('6e7d4f9a43cde06be7806c57fdb311e2','2a12640e84d223cd0e4827abc2c9fafc') then
  raise exception 'offer_post is not as it was on 20 Oct 2026: compare it with the live definition first';
 end if;
end $guard$;

-- Posting: the same function, coins at 500 a diamond (it said 200). Its grants stay (create or replace keeps them).
create or replace function public.offer_post(p_diamonds integer, p_coins integer, p_vip_days integer, p_audience text, p_min_level integer, p_hours integer)
returns uuid language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());d integer:=coalesce(p_diamonds,0);c integer:=coalesce(p_coins,0);v integer:=coalesce(p_vip_days,0);
 who text:=coalesce(nullif(p_audience,''),'all');lvl integer:=coalesce(p_min_level,14);hours integer:=coalesce(p_hours,48);worth integer;offer uuid;
begin
 if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if d not between 0 and 20000 or c not between 0 and 10000000 or v not in (0,7,30,60,90) then raise exception 'Choose amounts within the limits.' using errcode='22023'; end if;
 if d=0 and c=0 and v=0 then raise exception 'Put something in the offer.' using errcode='22023'; end if;
 worth:=round((d+c/500.0+case v when 7 then 500 when 30 then 1500 when 60 then 3000 when 90 then 4500 else 0 end)*499/500.0);
 if abs(worth-4999)>4999*0.02 then raise exception 'The offer must be worth €49.99; it is worth €%.', to_char(worth/100.0,'FM990.00') using errcode='22023'; end if;
 if who not in ('all','browser','phone_browser','phone','desktop') then raise exception 'Choose who sees it.' using errcode='22023'; end if;
 if lvl not between 10 and 200 then raise exception 'Choose a level from 10 to 200.' using errcode='22023'; end if;
 if hours not between 1 and 336 then raise exception 'Choose up to 336 hours (14 days).' using errcode='22023'; end if;
 update public.harvest_offers set stopped_at=now() where stopped_at is null and ends_at>now();
 insert into public.harvest_offers(diamonds,coins,vip_days,audience,min_level,ends_at,created_by)
  values(d,c,v,who,lvl,now()+make_interval(hours=>hours),me) returning id into offer;
 return offer;
end $f$;

-- After: offer_post is exactly the function above (md5 2a12640e…, as supabase/special-offer.sql).
do $after$
begin
 if md5(pg_get_functiondef('public.offer_post(integer,integer,integer,text,integer,integer)'::regprocedure))<>'2a12640e84d223cd0e4827abc2c9fafc' then
  raise exception 'offer_post did not come out as written (copied as UTF-8?): nothing of this file is kept';
 end if;
end $after$;
