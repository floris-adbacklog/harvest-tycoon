-- Restores the online-status window (a successful new farm action starts a thirty-minute online window).
--
-- Why this exists: activity-status.sql (18 Sep) made every real farm action stamp
-- player_stats.last_active_at. leaderboard-goods-sold.sql and orchard-expansion.sql (19 Sep) then
-- redefined harvest_commit_farm starting from the older leaderboard version and dropped that stamp,
-- so the column stopped updating and active players showed as offline after a few minutes.
--
-- This is the live definition (orchard crops, goods_produced, items_sold) with the stamp put back.
-- RULE FOR FUTURE MIGRATIONS: never rebuild harvest_commit_farm from an older .sql file. Read the
-- live definition (select pg_get_functiondef('public.harvest_commit_farm(uuid,bigint,jsonb,jsonb,text,integer,integer)'::regprocedure))
-- and change only what the migration is about.
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
 insert into public.player_stats(player_id,username,currency,level,harvested_wheat,harvested_corn,harvested_barley,harvested_lettuce,harvested_cabbage,harvested_cauliflower,harvested_pumpkin,harvested_redcabbage,harvested_sunflower,harvested_apples,harvested_berries,harvested_greenbeans,harvested_crops,badges,deliveries,goods_produced,items_sold,updated_at,last_active_at)
  select p_player,p_username,p_currency,p_level,m.harvested_wheat,m.harvested_corn,m.harvested_barley,m.harvested_lettuce,m.harvested_cabbage,m.harvested_cauliflower,m.harvested_pumpkin,m.harvested_redcabbage,m.harvested_sunflower,coalesce((p_state#>>'{stats,harvest_apples}')::bigint,0),coalesce((p_state#>>'{stats,harvest_berries}')::bigint,0),coalesce((p_state#>>'{stats,harvest_greenbeans}')::bigint,0),m.harvested_crops,m.badges,m.deliveries,m.goods_produced,m.items_sold,now(),
   -- Creating a farm (p_expected=0) is not activity; every later committed action is.
   case when p_expected>0 then clock_timestamp() else null end
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
   items_sold=excluded.items_sold,updated_at=now(),
   last_active_at=coalesce(excluded.last_active_at,public.player_stats.last_active_at);
 return true;
end $$;
revoke execute on function public.harvest_commit_farm(uuid,bigint,jsonb,jsonb,text,integer,integer) from public,anon,authenticated;
grant execute on function public.harvest_commit_farm(uuid,bigint,jsonb,jsonb,text,integer,integer) to service_role;

-- Catch up rows that missed the stamp: every farm commit also bumps player_farms.updated_at, so it is
-- the true time of each player's last action. Only ever moves last_active_at forward.
update public.player_stats as s set last_active_at=f.updated_at
 from public.player_farms as f
 where f.player_id=s.player_id and f.updated_at>coalesce(s.last_active_at,'-infinity'::timestamptz);
