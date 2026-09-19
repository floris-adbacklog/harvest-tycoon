-- Orchard counters and 12-crop Starter Pack. Existing rows and paid receipts are retained.
begin;
alter table public.player_stats add column harvested_apples bigint not null default 0 check(harvested_apples>=0);
create index player_stats_harvested_apples_ranking on public.player_stats(harvested_apples desc,player_id);
alter table public.player_stats add column harvested_berries bigint not null default 0 check(harvested_berries>=0);
create index player_stats_harvested_berries_ranking on public.player_stats(harvested_berries desc,player_id);
alter table public.player_stats add column harvested_greenbeans bigint not null default 0 check(harvested_greenbeans>=0);
create index player_stats_harvested_greenbeans_ranking on public.player_stats(harvested_greenbeans desc,player_id);

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
  coalesce((farm#>>'{stats,harvest_wheat}')::bigint,0)+coalesce((farm#>>'{stats,harvest_corn}')::bigint,0)+coalesce((farm#>>'{stats,harvest_barley}')::bigint,0)+coalesce((farm#>>'{stats,harvest_lettuce}')::bigint,0)+coalesce((farm#>>'{stats,harvest_cabbage}')::bigint,0)+coalesce((farm#>>'{stats,harvest_cauliflower}')::bigint,0)+coalesce((farm#>>'{stats,harvest_pumpkin}')::bigint,0)+coalesce((farm#>>'{stats,harvest_redcabbage}')::bigint,0)+coalesce((farm#>>'{stats,harvest_sunflower}')::bigint,0)+coalesce((farm#>>'{stats,harvest_apples}')::bigint,0)+coalesce((farm#>>'{stats,harvest_berries}')::bigint,0)+coalesce((farm#>>'{stats,harvest_greenbeans}')::bigint,0),
  coalesce(jsonb_array_length(farm#>'{mastery,claimed}'),0),
  coalesce((farm#>>'{stats,deliveries}')::integer,0),
  coalesce((farm#>>'{stats,made_honey}')::bigint,0)+coalesce((farm#>>'{stats,made_grainmeal}')::bigint,0)+coalesce((farm#>>'{stats,made_fertilizer}')::bigint,0)+coalesce((farm#>>'{stats,made_salad}')::bigint,0)+coalesce((farm#>>'{stats,made_pickles}')::bigint,0)+coalesce((farm#>>'{stats,made_flour}')::bigint,0)+coalesce((farm#>>'{stats,made_feed}')::bigint,0)+coalesce((farm#>>'{stats,made_oil}')::bigint,0)+coalesce((farm#>>'{stats,made_milk}')::bigint,0)+coalesce((farm#>>'{stats,made_eggs}')::bigint,0)+coalesce((farm#>>'{stats,made_cheese}')::bigint,0)+coalesce((farm#>>'{stats,made_bread}')::bigint,0)+coalesce((farm#>>'{stats,made_pie}')::bigint,0)+coalesce((farm#>>'{stats,made_vegetables}')::bigint,0)+coalesce((farm#>>'{stats,made_stew}')::bigint,0)+coalesce((farm#>>'{stats,made_applejuice}')::bigint,0)+coalesce((farm#>>'{stats,made_applepie}')::bigint,0)+coalesce((farm#>>'{stats,made_berrypreserves}')::bigint,0)+coalesce((farm#>>'{stats,made_berrytart}')::bigint,0),
  coalesce((farm#>>'{stats,sold}')::bigint,0);
$function$;

CREATE OR REPLACE FUNCTION public.harvest_commit_farm(p_player uuid, p_expected bigint, p_state jsonb, p_receipts jsonb, p_username text, p_currency integer, p_level integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if p_expected=0 then
  insert into public.player_farms(player_id,state,revision,receipts)
   values(p_player,p_state,1,p_receipts) on conflict do nothing;
 else
  update public.player_farms set state=p_state,revision=revision+1,receipts=p_receipts,updated_at=now()
   where player_id=p_player and revision=p_expected;
 end if;
 if not found then return false; end if;
 insert into public.player_stats(player_id,username,currency,level,harvested_wheat,harvested_corn,harvested_barley,harvested_lettuce,harvested_cabbage,harvested_cauliflower,harvested_pumpkin,harvested_redcabbage,harvested_sunflower,harvested_apples,harvested_berries,harvested_greenbeans,harvested_crops,badges,deliveries,goods_produced,items_sold,updated_at)
  select p_player,p_username,p_currency,p_level,m.harvested_wheat,m.harvested_corn,m.harvested_barley,m.harvested_lettuce,m.harvested_cabbage,m.harvested_cauliflower,m.harvested_pumpkin,m.harvested_redcabbage,m.harvested_sunflower,coalesce((p_state#>>'{stats,harvest_apples}')::bigint,0),coalesce((p_state#>>'{stats,harvest_berries}')::bigint,0),coalesce((p_state#>>'{stats,harvest_greenbeans}')::bigint,0),m.harvested_crops,m.badges,m.deliveries,m.goods_produced,m.items_sold,now()
  from public.harvest_public_metrics(p_state) as m
  on conflict(player_id) do update set currency=excluded.currency,level=excluded.level,
   harvested_wheat=excluded.harvested_wheat,
   harvested_corn=excluded.harvested_corn,
   harvested_barley=excluded.harvested_barley,
   harvested_lettuce=excluded.harvested_lettuce,
   harvested_cabbage=excluded.harvested_cabbage,
   harvested_cauliflower=excluded.harvested_cauliflower,
   harvested_pumpkin=excluded.harvested_pumpkin,
   harvested_redcabbage=excluded.harvested_redcabbage,
   harvested_sunflower=excluded.harvested_sunflower,
   harvested_apples=excluded.harvested_apples,harvested_berries=excluded.harvested_berries,harvested_greenbeans=excluded.harvested_greenbeans,harvested_crops=excluded.harvested_crops,
   badges=excluded.badges,
   deliveries=excluded.deliveries,
   goods_produced=excluded.goods_produced,
   items_sold=excluded.items_sold,updated_at=now();
 return true;
end $function$;

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
   foreach crop in array array['corn','wheat','cabbage','pumpkin','sunflower','barley','lettuce','redcabbage','cauliflower','apples','berries','greenbeans'] loop
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
revoke execute on function public.harvest_public_metrics(jsonb) from public,anon,authenticated;
grant execute on function public.harvest_public_metrics(jsonb) to service_role;
revoke execute on function public.harvest_commit_farm(uuid,bigint,jsonb,jsonb,text,integer,integer) from public,anon,authenticated;
grant execute on function public.harvest_commit_farm(uuid,bigint,jsonb,jsonb,text,integer,integer) to service_role;
revoke execute on function public.harvest_credit_purchase(uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.harvest_credit_purchase(uuid,text,text,text,boolean) to service_role;
commit;
