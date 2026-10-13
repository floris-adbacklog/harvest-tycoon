-- The special offer from level 10 (13 Oct 2026): the admin may let an offer open at level 10 at the earliest (it was 14), as the shop and
-- the boosts open at 10 since 5 Oct. The admin still picks the level per offer and the panel starts at 14 (game/payments.js OFFER:
-- minLevel 10, defaultLevel 14); a call without a level is 14 as before. The Starter Pack keeps its own level 14 (STARTER_LEVEL).
-- Only the floor changes, in the two places that hold it: the table's check and offer_post. diamond-checkout already shows an offer from
-- its own min_level (currentOffer), so a farmer at level 10 sees an offer for level 10 once this has run.
-- The iPhone app shows no special offer at all until Apple sells special_offer as an in-app purchase (game/payments.js
-- APPLE_SELLS_OFFER: diamond-checkout and the site), so App Review's level-10 demo account never meets one.
-- offer_post is replaced from the LIVE definition read on 13 Oct 2026 (md5 248e13ffd02423154bad639989a4ef6b, the same as
-- special-offer-vip-60-90.sql), with only the level check changed (md5 6e7d4f9a43cde06be7806c57fdb311e2 after this file, which
-- supabase/special-offer.sql now gives too); a different live definition stops the file. Re-runnable.
-- Run before the site (src/admin-dashboard.js lets the admin choose 10 only then; the panel from before refuses a level below 14).
-- offer_post holds a € (its worth message): copy this file as UTF-8 (LC_ALL=en_US.UTF-8 pbcopy). The check at the end stops the file
-- when offer_post or the table's check did not come out exactly as written, so a mangled € never stays (the SQL editor runs the file as
-- one transaction).

do $guard$
begin
 if md5(pg_get_functiondef('public.offer_post(integer,integer,integer,text,integer,integer)'::regprocedure))
  not in ('248e13ffd02423154bad639989a4ef6b','6e7d4f9a43cde06be7806c57fdb311e2') then
  raise exception 'offer_post is not as it was on 13 Oct 2026: compare it with the live definition first';
 end if;
end $guard$;

-- The table: from level 10 (it said 14); the default stays 14.
alter table public.harvest_offers drop constraint if exists harvest_offers_min_level_check;
alter table public.harvest_offers add constraint harvest_offers_min_level_check check (min_level between 10 and 200);

-- Posting: the same function, a level from 10 to 200 (it said 14 to 200). Its grants stay (create or replace keeps them).
create or replace function public.offer_post(p_diamonds integer, p_coins integer, p_vip_days integer, p_audience text, p_min_level integer, p_hours integer)
returns uuid language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());d integer:=coalesce(p_diamonds,0);c integer:=coalesce(p_coins,0);v integer:=coalesce(p_vip_days,0);
 who text:=coalesce(nullif(p_audience,''),'all');lvl integer:=coalesce(p_min_level,14);hours integer:=coalesce(p_hours,48);worth integer;offer uuid;
begin
 if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if d not between 0 and 20000 or c not between 0 and 10000000 or v not in (0,7,30,60,90) then raise exception 'Choose amounts within the limits.' using errcode='22023'; end if;
 if d=0 and c=0 and v=0 then raise exception 'Put something in the offer.' using errcode='22023'; end if;
 worth:=round((d+c/200.0+case v when 7 then 500 when 30 then 1500 when 60 then 3000 when 90 then 4500 else 0 end)*499/500.0);
 if abs(worth-4999)>4999*0.02 then raise exception 'The offer must be worth €49.99; it is worth €%.', to_char(worth/100.0,'FM990.00') using errcode='22023'; end if;
 if who not in ('all','browser','phone_browser','phone','desktop') then raise exception 'Choose who sees it.' using errcode='22023'; end if;
 if lvl not between 10 and 200 then raise exception 'Choose a level from 10 to 200.' using errcode='22023'; end if;
 if hours not between 1 and 336 then raise exception 'Choose up to 336 hours (14 days).' using errcode='22023'; end if;
 update public.harvest_offers set stopped_at=now() where stopped_at is null and ends_at>now();
 insert into public.harvest_offers(diamonds,coins,vip_days,audience,min_level,ends_at,created_by)
  values(d,c,v,who,lvl,now()+make_interval(hours=>hours),me) returning id into offer;
 return offer;
end $f$;

-- After: offer_post is exactly the function above (md5 6e7d4f9a…, as supabase/special-offer.sql) and the table takes 10 to 200.
do $after$
begin
 if md5(pg_get_functiondef('public.offer_post(integer,integer,integer,text,integer,integer)'::regprocedure))<>'6e7d4f9a43cde06be7806c57fdb311e2'
  or (select pg_get_constraintdef(c.oid) from pg_constraint c where c.conrelid='public.harvest_offers'::regclass and c.conname='harvest_offers_min_level_check')
   is distinct from 'CHECK (((min_level >= 10) AND (min_level <= 200)))' then
  raise exception 'offer_post or the level check did not come out as written (copied as UTF-8?): nothing of this file is kept';
 end if;
end $after$;
