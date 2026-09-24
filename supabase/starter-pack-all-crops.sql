-- The Starter Pack gives one of every crop in the game (24 Sep 2026): the four newer crops (squash, pole beans, cider apples,
-- cherries) were missing from the list below. The rest of harvest_credit_purchase is unchanged from the live function.
-- game/farm-state.js STARTER_PACK_CROPS is Object.keys(CROPS); tests/orchard-expansion.test.mjs keeps this list equal to it.
CREATE OR REPLACE FUNCTION public.harvest_credit_purchase(p_purchase uuid, p_session text, p_payment text, p_event text, p_livemode boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare purchase public.harvest_purchases%rowtype; farm_state jsonb; goods jsonb; crop text;
begin
 select * into purchase from public.harvest_purchases where id=p_purchase for update;
 if not found then raise exception 'Unknown purchase'; end if;
 if purchase.stripe_session_id is distinct from p_session or purchase.livemode is distinct from p_livemode then raise exception 'Payment mismatch'; end if;
 if p_session is null or p_payment is null or p_event is null or p_payment not like 'pi_%' or p_event not like 'evt_%' then raise exception 'Invalid payment reference'; end if;
 if purchase.status in ('credited','test_paid') then return jsonb_build_object('status',purchase.status,'duplicate',true); end if;
 if purchase.status<>'pending' then raise exception 'Purchase is not pending'; end if;
 if purchase.pack='starter' then
  -- Checkout records this deadline from the Auth API's verified account date.
  -- The private receipt cannot be written by browser clients.
  if purchase.starter_expires_at is null or purchase.created_at<purchase.starter_expires_at-interval '72 hours' or purchase.created_at>=purchase.starter_expires_at then raise exception 'Starter offer expired'; end if;
 end if;
 if purchase.livemode then
  select state into farm_state from public.player_farms where player_id=purchase.player_id for update;
  if not found then raise exception 'Farm is missing'; end if;
  farm_state:=jsonb_set(farm_state,'{diamonds}',to_jsonb(coalesce((farm_state->>'diamonds')::bigint,0)+purchase.diamonds));
  if purchase.pack='starter' then
   farm_state:=jsonb_set(farm_state,'{coins}',to_jsonb(coalesce((farm_state->>'coins')::bigint,0)+purchase.coins));
   goods:=coalesce(farm_state->'inventory','{}'::jsonb);
   foreach crop in array array['corn','wheat','cabbage','pumpkin','sunflower','barley','lettuce','redcabbage','cauliflower','greenbeans','apples','berries','squash','polebeans','ciderapples','cherries'] loop
    goods:=jsonb_set(goods,array[crop],to_jsonb(coalesce((goods->>crop)::integer,0)+1));
   end loop;
   farm_state:=jsonb_set(farm_state,'{inventory}',goods);
   farm_state:=jsonb_set(farm_state,'{starterPackClaimed}',to_jsonb(true));
   update public.player_stats set currency=(farm_state->>'coins')::integer,updated_at=now() where player_id=purchase.player_id;
  end if;
  update public.player_farms set state=farm_state,revision=revision+1,updated_at=now() where player_id=purchase.player_id;
 end if;
 update public.harvest_purchases set status=case when livemode then 'credited' else 'test_paid' end,
  stripe_payment_id=p_payment,stripe_event_id=p_event,credited_at=now() where id=p_purchase;
 return jsonb_build_object('status',case when purchase.livemode then 'credited' else 'test_paid' end,'duplicate',false);
end $function$;
