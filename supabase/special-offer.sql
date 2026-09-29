-- The special offer (29 Sep 2026): the admin puts together diamonds, coins and/or VIP time worth €49.99 at shop prices, sold once
-- per farmer for €4.99, one offer at a time, from level 14 like the Starter Pack (game/payments.js OFFER). Only the admin writes
-- offers (the admin panel, a Google admin session, like the pop-ups); only diamond-checkout creates an offer purchase, with the
-- contents taken from the offer; harvest_credit_purchase adds them to the farm once Stripe confirms the payment.
create table if not exists public.harvest_offers(
 id uuid primary key default gen_random_uuid(),
 diamonds integer not null default 0 check (diamonds between 0 and 20000),
 coins integer not null default 0 check (coins between 0 and 10000000),
 vip_days integer not null default 0 check (vip_days in (0,7,30)),
 audience text not null default 'all' check (audience in ('all','browser','phone_browser','phone','desktop')),
 min_level integer not null default 14 check (min_level between 14 and 200),
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null,
 stopped_at timestamptz,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 check (diamonds>0 or coins>0 or vip_days>0),
 check (ends_at>starts_at));
alter table public.harvest_offers enable row level security;
revoke all on public.harvest_offers from public, anon, authenticated;
grant select, insert, update on public.harvest_offers to service_role;

-- An offer purchase: pack 'offer', €4.99, the offer's contents and the offer it came from.
alter table public.harvest_purchases add column if not exists offer_id uuid references public.harvest_offers(id);
alter table public.harvest_purchases add column if not exists vip_days integer not null default 0;
alter table public.harvest_purchases drop constraint if exists harvest_purchases_pack_check;
alter table public.harvest_purchases add constraint harvest_purchases_pack_check check (pack = any (array['50','100','150','300','500','600','1000','1250','2000','3500','starter','offer']));
alter table public.harvest_purchases drop constraint if exists harvest_purchases_diamonds_check;
alter table public.harvest_purchases add constraint harvest_purchases_diamonds_check check (
 (pack='offer' and diamonds between 0 and 20000) or diamonds = any (array[50,100,150,300,500,600,1000,1250,2000,3500]));
alter table public.harvest_purchases drop constraint if exists harvest_pack_amount_matches;
alter table public.harvest_purchases add constraint harvest_pack_amount_matches check (
 (pack = any (array['50','100','150']) and diamonds=(case when pack ~ '^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=199) or
 (pack='500' and diamonds=500 and coins=0 and amount_cents=499) or
 (pack = any (array['300','600','1250']) and diamonds=(case when pack ~ '^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=999) or
 (pack = any (array['1000','2000','3500']) and diamonds=(case when pack ~ '^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=2499) or
 (pack='starter' and diamonds = any (array[300,500]) and coins=10000 and amount_cents=299) or
 (pack='offer' and offer_id is not null and amount_cents=499 and coins between 0 and 10000000 and vip_days in (0,7,30) and (diamonds>0 or coins>0 or vip_days>0)));
-- One checkout per farmer per offer, like the Starter Pack: only a Stripe session that expired frees it.
create unique index if not exists harvest_one_offer_per_player on public.harvest_purchases(player_id, offer_id)
 where pack='offer' and status<>'expired';

-- Crediting: as before for the packs and the Starter Pack; an offer adds its diamonds, its coins and its VIP days (after any VIP
-- still running, like buying VIP in the game).
create or replace function public.harvest_credit_purchase(p_purchase uuid, p_session text, p_payment text, p_event text, p_livemode boolean)
 returns jsonb language plpgsql set search_path to '' as $function$
declare purchase public.harvest_purchases%rowtype; farm_state jsonb; goods jsonb; crop text; vip_until bigint;
begin
 select * into purchase from public.harvest_purchases where id=p_purchase for update;
 if not found then raise exception 'Unknown purchase'; end if;
 if purchase.stripe_session_id is distinct from p_session or purchase.livemode is distinct from p_livemode then raise exception 'Payment mismatch'; end if;
 if p_session is null or p_payment is null or p_event is null or p_payment not like 'pi_%' or p_event not like 'evt_%' then raise exception 'Invalid payment reference'; end if;
 if purchase.status in ('credited','test_paid') then return jsonb_build_object('status',purchase.status,'duplicate',true); end if;
 if purchase.status<>'pending' then raise exception 'Purchase is not pending'; end if;
 if purchase.pack='starter' then
  if purchase.starter_expires_at is null or purchase.created_at<purchase.starter_expires_at-interval '7 days' or purchase.created_at>=purchase.starter_expires_at then raise exception 'Starter offer expired'; end if;
 end if;
 if purchase.livemode then
  select state into farm_state from public.player_farms where player_id=purchase.player_id for update;
  if not found then raise exception 'Farm is missing'; end if;
  farm_state:=jsonb_set(farm_state,'{diamonds}',to_jsonb(coalesce((farm_state->>'diamonds')::bigint,0)+purchase.diamonds));
  if purchase.pack in ('starter','offer') and purchase.coins>0 then
   farm_state:=jsonb_set(farm_state,'{coins}',to_jsonb(coalesce((farm_state->>'coins')::bigint,0)+purchase.coins));
  end if;
  if purchase.pack='starter' then
   goods:=coalesce(farm_state->'inventory','{}'::jsonb);
   foreach crop in array array['corn','wheat','cabbage','pumpkin','sunflower','barley','lettuce','redcabbage','cauliflower','greenbeans','apples','berries','squash','polebeans','ciderapples','cherries'] loop
    goods:=jsonb_set(goods,array[crop],to_jsonb(coalesce((goods->>crop)::integer,0)+1));
   end loop;
   farm_state:=jsonb_set(farm_state,'{inventory}',goods);
   farm_state:=jsonb_set(farm_state,'{starterPackClaimed}',to_jsonb(true));
  end if;
  if purchase.pack='offer' and purchase.vip_days>0 then
   vip_until:=greatest(coalesce((farm_state->>'vipExpiresAt')::bigint,0),(extract(epoch from now())*1000)::bigint)+purchase.vip_days::bigint*86400000;
   farm_state:=jsonb_set(farm_state,'{vipExpiresAt}',to_jsonb(vip_until));
   farm_state:=jsonb_set(farm_state,'{stats,vip_days}',to_jsonb(coalesce((farm_state#>>'{stats,vip_days}')::integer,0)+purchase.vip_days));
  end if;
  if purchase.pack in ('starter','offer') then
   update public.player_stats set currency=(farm_state->>'coins')::integer,updated_at=now() where player_id=purchase.player_id;
  end if;
  update public.player_farms set state=farm_state,revision=revision+1,updated_at=now() where player_id=purchase.player_id;
 end if;
 update public.harvest_purchases set status=case when livemode then 'credited' else 'test_paid' end,
  stripe_payment_id=p_payment,stripe_event_id=p_event,credited_at=now() where id=p_purchase;
 return jsonb_build_object('status',case when purchase.livemode then 'credited' else 'test_paid' end,'duplicate',false);
end $function$;

-- The admin panel (src/admin-dashboard.js): post an offer, list the last ten with how many farmers bought each, stop one. Only the
-- admin in a Google session (chat_staff_role, supabase/admin-google-only.sql), like the pop-ups. The worth is the same sum as
-- game/payments.js offerValueCents: a diamond at €4.99/500, 250 coins a diamond, VIP 7 days 500 diamonds and 30 days 1500; it must be
-- €49.99 within 2%. A new offer ends the one running now.
create or replace function public.offer_post(p_diamonds integer, p_coins integer, p_vip_days integer, p_audience text, p_min_level integer, p_hours integer)
returns uuid language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid());d integer:=coalesce(p_diamonds,0);c integer:=coalesce(p_coins,0);v integer:=coalesce(p_vip_days,0);
 who text:=coalesce(nullif(p_audience,''),'all');lvl integer:=coalesce(p_min_level,14);hours integer:=coalesce(p_hours,48);worth integer;offer uuid;
begin
 if public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if d not between 0 and 20000 or c not between 0 and 10000000 or v not in (0,7,30) then raise exception 'Choose amounts within the limits.' using errcode='22023'; end if;
 if d=0 and c=0 and v=0 then raise exception 'Put something in the offer.' using errcode='22023'; end if;
 worth:=round((d+c/250.0+case v when 7 then 500 when 30 then 1500 else 0 end)*499/500.0);
 if abs(worth-4999)>4999*0.02 then raise exception 'The offer must be worth €49.99; it is worth €%.', to_char(worth/100.0,'FM990.00') using errcode='22023'; end if;
 if who not in ('all','browser','phone_browser','phone','desktop') then raise exception 'Choose who sees it.' using errcode='22023'; end if;
 if lvl not between 14 and 200 then raise exception 'Choose a level from 14 to 200.' using errcode='22023'; end if;
 if hours not between 1 and 336 then raise exception 'Choose up to 336 hours (14 days).' using errcode='22023'; end if;
 update public.harvest_offers set stopped_at=now() where stopped_at is null and ends_at>now();
 insert into public.harvest_offers(diamonds,coins,vip_days,audience,min_level,ends_at,created_by)
  values(d,c,v,who,lvl,now()+make_interval(hours=>hours),me) returning id into offer;
 return offer;
end $f$;

create or replace function public.offer_list() returns jsonb language plpgsql stable security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'diamonds',o.diamonds,'coins',o.coins,'vipDays',o.vip_days,'audience',o.audience,'minLevel',o.min_level,
   'createdAt',o.created_at,'endsAt',o.ends_at,'active',o.stopped_at is null and o.ends_at>now(),
   'bought',(select count(*) from public.harvest_purchases p where p.offer_id=o.id and p.status in ('credited','test_paid'))) order by o.created_at desc)
  from (select * from public.harvest_offers order by created_at desc limit 10) o),'[]'::jsonb);
end $f$;

create or replace function public.offer_stop(p_id uuid) returns void language plpgsql security definer set search_path to '' as $f$
begin
 if public.chat_staff_role((select auth.uid())) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 update public.harvest_offers set stopped_at=now() where id=p_id and stopped_at is null;
end $f$;

do $g$
declare f text;
begin
 foreach f in array array['offer_post(integer,integer,integer,text,integer,integer)','offer_list()','offer_stop(uuid)'] loop
  execute format('revoke all on function public.%s from public, anon',f);
  execute format('grant execute on function public.%s to authenticated',f);
 end loop;
end $g$;
