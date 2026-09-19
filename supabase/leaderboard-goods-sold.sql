-- Adds two aggregate public counters: lifetime production goods collected
-- (mirrors harvested_crops, but for made goods) and lifetime items sold at
-- the market (crops + goods combined; this stat did not exist before this
-- migration, so it starts at 0 for every player and counts from here on).
alter table public.player_stats
 add column goods_produced bigint not null default 0 check(goods_produced>=0),
 add column items_sold bigint not null default 0 check(items_sold>=0);

create or replace function public.harvest_public_metrics(farm jsonb)
returns table(harvested_wheat bigint,harvested_corn bigint,harvested_barley bigint,harvested_lettuce bigint,harvested_cabbage bigint,harvested_cauliflower bigint,harvested_pumpkin bigint,harvested_redcabbage bigint,harvested_sunflower bigint,harvested_crops bigint,badges integer,deliveries integer,goods_produced bigint,items_sold bigint)
language sql immutable security invoker set search_path='' as $$
 select coalesce((farm#>>'{stats,harvest_wheat}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_corn}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_barley}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_lettuce}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_cabbage}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_cauliflower}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_pumpkin}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_redcabbage}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_sunflower}')::bigint,0),
  coalesce((farm#>>'{stats,harvest_wheat}')::bigint,0)+coalesce((farm#>>'{stats,harvest_corn}')::bigint,0)+coalesce((farm#>>'{stats,harvest_barley}')::bigint,0)+coalesce((farm#>>'{stats,harvest_lettuce}')::bigint,0)+coalesce((farm#>>'{stats,harvest_cabbage}')::bigint,0)+coalesce((farm#>>'{stats,harvest_cauliflower}')::bigint,0)+coalesce((farm#>>'{stats,harvest_pumpkin}')::bigint,0)+coalesce((farm#>>'{stats,harvest_redcabbage}')::bigint,0)+coalesce((farm#>>'{stats,harvest_sunflower}')::bigint,0),
  coalesce(jsonb_array_length(farm#>'{mastery,claimed}'),0),
  coalesce((farm#>>'{stats,deliveries}')::integer,0),
  coalesce((farm#>>'{stats,made_honey}')::bigint,0)+coalesce((farm#>>'{stats,made_grainmeal}')::bigint,0)+coalesce((farm#>>'{stats,made_fertilizer}')::bigint,0)+coalesce((farm#>>'{stats,made_salad}')::bigint,0)+coalesce((farm#>>'{stats,made_pickles}')::bigint,0)+coalesce((farm#>>'{stats,made_flour}')::bigint,0)+coalesce((farm#>>'{stats,made_feed}')::bigint,0)+coalesce((farm#>>'{stats,made_oil}')::bigint,0)+coalesce((farm#>>'{stats,made_milk}')::bigint,0)+coalesce((farm#>>'{stats,made_eggs}')::bigint,0)+coalesce((farm#>>'{stats,made_cheese}')::bigint,0)+coalesce((farm#>>'{stats,made_bread}')::bigint,0)+coalesce((farm#>>'{stats,made_pie}')::bigint,0)+coalesce((farm#>>'{stats,made_vegetables}')::bigint,0),
  coalesce((farm#>>'{stats,sold}')::bigint,0);
$$;
revoke execute on function public.harvest_public_metrics(jsonb) from public,anon,authenticated;
grant execute on function public.harvest_public_metrics(jsonb) to service_role;

create or replace function public.harvest_commit_farm(p_player uuid,p_expected bigint,p_state jsonb,p_receipts jsonb,p_username text,p_currency integer,p_level integer)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_expected=0 then
  insert into public.player_farms(player_id,state,revision,receipts)
   values(p_player,p_state,1,p_receipts) on conflict do nothing;
 else
  update public.player_farms set state=p_state,revision=revision+1,receipts=p_receipts,updated_at=now()
   where player_id=p_player and revision=p_expected;
 end if;
 if not found then return false; end if;
 insert into public.player_stats(player_id,username,currency,level,harvested_wheat,harvested_corn,harvested_barley,harvested_lettuce,harvested_cabbage,harvested_cauliflower,harvested_pumpkin,harvested_redcabbage,harvested_sunflower,harvested_crops,badges,deliveries,goods_produced,items_sold,updated_at)
  select p_player,p_username,p_currency,p_level,m.harvested_wheat,m.harvested_corn,m.harvested_barley,m.harvested_lettuce,m.harvested_cabbage,m.harvested_cauliflower,m.harvested_pumpkin,m.harvested_redcabbage,m.harvested_sunflower,m.harvested_crops,m.badges,m.deliveries,m.goods_produced,m.items_sold,now()
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
   harvested_crops=excluded.harvested_crops,
   badges=excluded.badges,
   deliveries=excluded.deliveries,
   goods_produced=excluded.goods_produced,
   items_sold=excluded.items_sold,updated_at=now();
 return true;
end $$;
revoke execute on function public.harvest_commit_farm(uuid,bigint,jsonb,jsonb,text,integer,integer) from public,anon,authenticated;
grant execute on function public.harvest_commit_farm(uuid,bigint,jsonb,jsonb,text,integer,integer) to service_role;

-- Existing progress is backfilled without changing any farm or balance.
-- items_sold will backfill to 0 for everyone: it was never tracked before this migration.
update public.player_stats as p set goods_produced=m.goods_produced,items_sold=m.items_sold
 from public.player_farms as f cross join lateral public.harvest_public_metrics(f.state) as m where p.player_id=f.player_id;
create index player_stats_goods_produced_ranking on public.player_stats(goods_produced desc,player_id);
create index player_stats_items_sold_ranking on public.player_stats(items_sold desc,player_id);
