-- VIP of 60 or 90 days in a special offer (30 Sep 2026): worth two or three of the shop's 30-day plan (3000 and 4500 diamonds),
-- as game/payments.js OFFER.vipDiamonds. For a database that already ran special-offer.sql (which now has the same rules).
alter table public.harvest_offers drop constraint if exists harvest_offers_vip_days_check;
alter table public.harvest_offers add constraint harvest_offers_vip_days_check check (vip_days in (0,7,30,60,90));
alter table public.harvest_purchases drop constraint if exists harvest_pack_amount_matches;
alter table public.harvest_purchases add constraint harvest_pack_amount_matches check (
 (pack = any (array['50','100','150']) and diamonds=(case when pack ~ '^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=199) or
 (pack='500' and diamonds=500 and coins=0 and amount_cents=499) or
 (pack = any (array['300','600','1250']) and diamonds=(case when pack ~ '^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=999) or
 (pack = any (array['1000','2000','3500']) and diamonds=(case when pack ~ '^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=2499) or
 (pack='starter' and diamonds = any (array[300,500]) and coins=10000 and amount_cents=299) or
 (pack='offer' and offer_id is not null and amount_cents=499 and coins between 0 and 10000000 and vip_days in (0,7,30,60,90) and (diamonds>0 or coins>0 or vip_days>0)));

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
 if lvl not between 14 and 200 then raise exception 'Choose a level from 14 to 200.' using errcode='22023'; end if;
 if hours not between 1 and 336 then raise exception 'Choose up to 336 hours (14 days).' using errcode='22023'; end if;
 update public.harvest_offers set stopped_at=now() where stopped_at is null and ends_at>now();
 insert into public.harvest_offers(diamonds,coins,vip_days,audience,min_level,ends_at,created_by)
  values(d,c,v,who,lvl,now()+make_interval(hours=>hours),me) returning id into offer;
 return offer;
end $f$;
