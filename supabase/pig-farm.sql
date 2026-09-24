-- The Pig Farm (level 29): truffles, and the truffle omelette from the Farm Kitchen (level 30).
-- 1. Family sharing: truffles and the truffle omelette can be gifted and requested like every other item (59 items). Only the
--    items list differs from estate-wave3.sql, whose bodies matched the live functions exactly on 24 Sep 2026 (harvest_social
--    prosrc md5 8ce099578574ef821587e579362f3fee, harvest_public_metrics ff97de95232fb9d1ee0ddc0185af60bf); limits, checks and
--    the reply are unchanged. tests/family-sharing.test.mjs keeps this list equal to Object.keys(ITEMS).
-- 2. Leaderboards: both count toward "goods produced". No new crop, so no new column; harvest_commit_farm is untouched.
-- Run after estate-wave3.sql.
CREATE OR REPLACE FUNCTION public.harvest_social(p_player uuid, p_action jsonb, p_request uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
#variable_conflict use_column
<<social>>
declare
 m public.family_members; target public.family_members; r public.family_social_requests;
 actor public.player_farms; other public.player_farms; kind text:=p_action->>'kind'; recipient uuid;
 d date:=(now() at time zone 'UTC')::date; tick bigint:=(extract(epoch from now())*1000)::bigint;
 item text; quantity integer; fid uuid; message text;
 items constant text[]:=array['corn','wheat','cabbage','pumpkin','sunflower','barley','lettuce','redcabbage','cauliflower','greenbeans','apples','berries','squash','polebeans','ciderapples','cherries','honey','grainmeal','fertilizer','salad','pickles','flour','feed','oil','milk','eggs','cheese','bread','pie','vegetables','applejuice','applepie','berrypreserves','berrytart','stew','orchardjuice','berrysmoothie','applecompote','applevinegar','pickledbeans','beangratin','orchardsalad','berrycheesecake','harvesthamper','squashsoup','beeswax','wool','yarn','cloth','cider','goatmilk','goatcheese','truffles','truffleomelette','candles','blanket','cherryjam','cherrypie','prizeproduce'];
begin
 -- Serialize the small family roster with the existing family revision lock, then farm rows in UUID order.
 -- This also prevents membership changes between eligibility checks and the transfer.
 perform 1 from public.family_revision where id for update;
 select * into m from public.family_members where player_id=p_player and left_at is null;
 if not found then raise exception 'Join a Farm Family first.'; end if;
 fid:=m.family_id;
 if kind='read' then
  return jsonb_build_object('members',(select coalesce(jsonb_agg(jsonb_build_object('id',s.player_id,'name',s.username)),'[]') from public.family_members fm join public.player_stats s on s.player_id=fm.player_id where fm.family_id=fid and fm.left_at is null and fm.player_id<>p_player),
   'requests',(select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('name',s.username)),'[]') from public.family_social_requests q join public.player_stats s on s.player_id=q.player_id where q.family_id=fid and q.day=d),
   'activity',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.family_social_actions a where (a.sender=p_player or a.recipient=p_player) and a.day=d));
 end if;
 if p_request is null then raise exception 'Missing request identifier.'; end if;
 if exists(select 1 from public.family_social_actions where id=p_request and sender=p_player) or exists(select 1 from public.family_social_requests where id=p_request and player_id=p_player) then return jsonb_build_object('message','Already completed.'); end if;
 if kind not in ('request','help','gift','fulfill') then raise exception 'Choose a social action.'; end if;
 if m.joined_at>tick-86400000 or not exists(select 1 from auth.users where id=p_player and created_at<now()-interval '48 hours') or not exists(select 1 from public.player_stats where player_id=p_player and level>=10) then raise exception 'Daily sharing opens at level 10, after 48 hours on your farm and 24 hours in your family.'; end if;
 if kind='request' then
  item:=p_action->>'item';quantity:=(p_action->>'quantity')::integer;
  if item is null or not (item=any(items)) or quantity is null or quantity not between 1 and 5 then raise exception 'Ask for 1–5 of a crop or good.'; end if;
  insert into public.family_social_requests(id,player_id,family_id,item,quantity,day) values(p_request,p_player,fid,item,quantity,d);
  return jsonb_build_object('message','Your family request is ready.','kind',kind,'item',item,'quantity',quantity);
 end if;
 recipient:=(p_action->>'recipient')::uuid;
 if kind='fulfill' then
  select * into r from public.family_social_requests where id=(p_action->>'request')::uuid and family_id=fid and day=d and fulfilled_by is null for update;
  if not found then raise exception 'This request is no longer available.'; end if;
  recipient:=r.player_id;item:=r.item;quantity:=r.quantity;
 elsif kind='gift' then
  item:=coalesce(p_action->>'item','wheat');quantity:=coalesce((p_action->>'quantity')::integer,3);
  if not (item=any(items)) or quantity not between 1 and 5 then raise exception 'Send 1–5 of a crop or good.'; end if;
 end if;
 if recipient is null or recipient=p_player then raise exception 'Choose another family member.'; end if;
 select * into target from public.family_members where player_id=recipient and family_id=fid and left_at is null;
 if not found or target.joined_at>tick-86400000 or not exists(select 1 from auth.users where id=recipient and created_at<now()-interval '48 hours') or not exists(select 1 from public.player_stats where player_id=recipient and level>=10) then raise exception 'This farmer is not eligible for daily sharing yet.'; end if;
 if (select count(*) from public.family_social_actions where sender=p_player and day=d and kind=social.kind)>=3 or (select count(*) from public.family_social_actions where recipient=social.recipient and day=d and kind=social.kind)>=3 then raise exception 'Daily limit reached (3 sent and 3 received per interaction).'; end if;
 perform 1 from public.player_farms where player_id in (p_player,recipient) order by player_id for update;
 select * into actor from public.player_farms where player_id=p_player;
 select * into other from public.player_farms where player_id=recipient;
 if actor.player_id is null or other.player_id is null then raise exception 'Farm unavailable.'; end if;
 if kind='help' then
  -- A small coin gift: help costs the sender exactly what the recipient receives. No minted currency.
  if (actor.state->>'coins')::bigint<5 then raise exception 'You need 5 coins to help.'; end if;
  actor.state:=jsonb_set(actor.state,'{coins}',to_jsonb((actor.state->>'coins')::bigint-5));
  other.state:=jsonb_set(other.state,'{coins}',to_jsonb((other.state->>'coins')::bigint+5));
 else
  if coalesce((actor.state#>>array['inventory',item])::integer,0)<quantity then raise exception 'You do not have enough goods.'; end if;
  actor.state:=jsonb_set(actor.state,array['inventory',item],to_jsonb((actor.state#>>array['inventory',item])::integer-quantity));
  other.state:=jsonb_set(other.state,array['inventory',item],to_jsonb(coalesce((other.state#>>array['inventory',item])::integer,0)+quantity));
 end if;
 insert into public.family_social_actions(id,sender,recipient,family_id,kind,day) values(p_request,p_player,recipient,fid,kind,d);
 if kind='fulfill' then update public.family_social_requests set fulfilled_by=p_player where id=r.id; end if;
 -- Balances + revisions + ledger all commit together; in-flight farm saves must retry.
 update public.player_farms set state=actor.state,revision=revision+1,updated_at=now() where player_id=p_player;
 update public.player_farms set state=other.state,revision=revision+1 where player_id=recipient;
 update public.player_stats set currency=(actor.state->>'coins')::integer where player_id=p_player;
 update public.player_stats set currency=(other.state->>'coins')::integer where player_id=recipient;
 -- The game shows the item's own name; "kind", "item" and "quantity" let it say what arrived.
 return jsonb_build_object('message',case kind when 'help' then 'You helped with 5 coins. Thank you!' when 'gift' then 'Your gift has arrived!' else 'Request fulfilled. Your family thanks you!' end,'kind',kind,'item',item,'quantity',quantity);
end $function$;

CREATE OR REPLACE FUNCTION public.harvest_public_metrics(farm jsonb)
 RETURNS TABLE(harvested_wheat bigint, harvested_corn bigint, harvested_barley bigint, harvested_lettuce bigint, harvested_cabbage bigint, harvested_cauliflower bigint, harvested_pumpkin bigint, harvested_redcabbage bigint, harvested_sunflower bigint, harvested_crops bigint, badges integer, deliveries integer, goods_produced bigint, items_sold bigint)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select coalesce((farm#>>'{stats,harvest_wheat}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_corn}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_barley}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_lettuce}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_cabbage}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_cauliflower}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_pumpkin}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_redcabbage}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_sunflower}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_wheat}')::bigint,0)+coalesce((farm#>>'{stats,harvest_corn}')::bigint,0)+coalesce((farm#>>'{stats,harvest_barley}')::bigint,0)+coalesce((farm#>>'{stats,harvest_lettuce}')::bigint,0)+coalesce((farm#>>'{stats,harvest_cabbage}')::bigint,0)+coalesce((farm#>>'{stats,harvest_cauliflower}')::bigint,0)+coalesce((farm#>>'{stats,harvest_pumpkin}')::bigint,0)+coalesce((farm#>>'{stats,harvest_redcabbage}')::bigint,0)+coalesce((farm#>>'{stats,harvest_sunflower}')::bigint,0)+coalesce((farm#>>'{stats,harvest_apples}')::bigint,0)+coalesce((farm#>>'{stats,harvest_berries}')::bigint,0)+coalesce((farm#>>'{stats,harvest_greenbeans}')::bigint,0)+coalesce((farm#>>'{stats,harvest_squash}')::bigint,0)+coalesce((farm#>>'{stats,harvest_polebeans}')::bigint,0)+coalesce((farm#>>'{stats,harvest_ciderapples}')::bigint,0)+coalesce((farm#>>'{stats,harvest_cherries}')::bigint,0),
  coalesce(jsonb_array_length(farm#>'{mastery,claimed}'),0),
  coalesce((farm#>>'{stats,deliveries}')::integer,0),
  coalesce((farm#>>'{stats,made_honey}')::bigint,0)+coalesce((farm#>>'{stats,made_grainmeal}')::bigint,0)+coalesce((farm#>>'{stats,made_fertilizer}')::bigint,0)+coalesce((farm#>>'{stats,made_salad}')::bigint,0)+coalesce((farm#>>'{stats,made_pickles}')::bigint,0)+coalesce((farm#>>'{stats,made_flour}')::bigint,0)+coalesce((farm#>>'{stats,made_feed}')::bigint,0)+coalesce((farm#>>'{stats,made_oil}')::bigint,0)+coalesce((farm#>>'{stats,made_milk}')::bigint,0)+coalesce((farm#>>'{stats,made_eggs}')::bigint,0)+coalesce((farm#>>'{stats,made_cheese}')::bigint,0)+coalesce((farm#>>'{stats,made_bread}')::bigint,0)+coalesce((farm#>>'{stats,made_pie}')::bigint,0)+coalesce((farm#>>'{stats,made_vegetables}')::bigint,0)+coalesce((farm#>>'{stats,made_stew}')::bigint,0)+coalesce((farm#>>'{stats,made_applejuice}')::bigint,0)+coalesce((farm#>>'{stats,made_applepie}')::bigint,0)+coalesce((farm#>>'{stats,made_berrypreserves}')::bigint,0)+coalesce((farm#>>'{stats,made_berrytart}')::bigint,0)+coalesce((farm#>>'{stats,made_orchardjuice}')::bigint,0)+coalesce((farm#>>'{stats,made_berrysmoothie}')::bigint,0)+coalesce((farm#>>'{stats,made_applecompote}')::bigint,0)+coalesce((farm#>>'{stats,made_applevinegar}')::bigint,0)+coalesce((farm#>>'{stats,made_pickledbeans}')::bigint,0)+coalesce((farm#>>'{stats,made_beangratin}')::bigint,0)+coalesce((farm#>>'{stats,made_orchardsalad}')::bigint,0)+coalesce((farm#>>'{stats,made_berrycheesecake}')::bigint,0)+coalesce((farm#>>'{stats,made_harvesthamper}')::bigint,0)+coalesce((farm#>>'{stats,made_squashsoup}')::bigint,0)+coalesce((farm#>>'{stats,made_beeswax}')::bigint,0)+coalesce((farm#>>'{stats,made_wool}')::bigint,0)+coalesce((farm#>>'{stats,made_yarn}')::bigint,0)+coalesce((farm#>>'{stats,made_cloth}')::bigint,0)+coalesce((farm#>>'{stats,made_cider}')::bigint,0)+coalesce((farm#>>'{stats,made_goatmilk}')::bigint,0)+coalesce((farm#>>'{stats,made_goatcheese}')::bigint,0)+coalesce((farm#>>'{stats,made_candles}')::bigint,0)+coalesce((farm#>>'{stats,made_blanket}')::bigint,0)+coalesce((farm#>>'{stats,made_cherryjam}')::bigint,0)+coalesce((farm#>>'{stats,made_cherrypie}')::bigint,0)+coalesce((farm#>>'{stats,made_prizeproduce}')::bigint,0)+coalesce((farm#>>'{stats,made_truffles}')::bigint,0)+coalesce((farm#>>'{stats,made_truffleomelette}')::bigint,0),
  coalesce((farm#>>'{stats,sold}')::bigint,0);
$function$;
