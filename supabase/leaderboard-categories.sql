-- Public farming counters only. Diamonds and farm state remain private.
alter table public.player_stats
 add column harvested_wheat bigint not null default 0 check(harvested_wheat>=0),
 add column harvested_corn bigint not null default 0 check(harvested_corn>=0),
 add column harvested_barley bigint not null default 0 check(harvested_barley>=0),
 add column harvested_lettuce bigint not null default 0 check(harvested_lettuce>=0),
 add column harvested_cabbage bigint not null default 0 check(harvested_cabbage>=0),
 add column harvested_cauliflower bigint not null default 0 check(harvested_cauliflower>=0),
 add column harvested_pumpkin bigint not null default 0 check(harvested_pumpkin>=0),
 add column harvested_redcabbage bigint not null default 0 check(harvested_redcabbage>=0),
 add column harvested_sunflower bigint not null default 0 check(harvested_sunflower>=0),
 add column harvested_crops bigint not null default 0 check(harvested_crops>=0),
 add column badges integer not null default 0 check(badges>=0),
 add column deliveries integer not null default 0 check(deliveries>=0);

create function public.harvest_public_metrics(farm jsonb)
returns table(harvested_wheat bigint,harvested_corn bigint,harvested_barley bigint,harvested_lettuce bigint,harvested_cabbage bigint,harvested_cauliflower bigint,harvested_pumpkin bigint,harvested_redcabbage bigint,harvested_sunflower bigint,harvested_crops bigint,badges integer,deliveries integer)
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
  coalesce((farm#>>'{stats,deliveries}')::integer,0);
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
 insert into public.player_stats(player_id,username,currency,level,harvested_wheat,harvested_corn,harvested_barley,harvested_lettuce,harvested_cabbage,harvested_cauliflower,harvested_pumpkin,harvested_redcabbage,harvested_sunflower,harvested_crops,badges,deliveries,updated_at)
  select p_player,p_username,p_currency,p_level,m.harvested_wheat,m.harvested_corn,m.harvested_barley,m.harvested_lettuce,m.harvested_cabbage,m.harvested_cauliflower,m.harvested_pumpkin,m.harvested_redcabbage,m.harvested_sunflower,m.harvested_crops,m.badges,m.deliveries,now()
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
   deliveries=excluded.deliveries,updated_at=now();
 return true;
end $$;
revoke execute on function public.harvest_commit_farm(uuid,bigint,jsonb,jsonb,text,integer,integer) from public,anon,authenticated;
grant execute on function public.harvest_commit_farm(uuid,bigint,jsonb,jsonb,text,integer,integer) to service_role;

-- Existing progress is backfilled without changing any farm or balance.
update public.player_stats as p set harvested_wheat=m.harvested_wheat,harvested_corn=m.harvested_corn,harvested_barley=m.harvested_barley,harvested_lettuce=m.harvested_lettuce,harvested_cabbage=m.harvested_cabbage,harvested_cauliflower=m.harvested_cauliflower,harvested_pumpkin=m.harvested_pumpkin,harvested_redcabbage=m.harvested_redcabbage,harvested_sunflower=m.harvested_sunflower,harvested_crops=m.harvested_crops,badges=m.badges,deliveries=m.deliveries
 from public.player_farms as f cross join lateral public.harvest_public_metrics(f.state) as m where p.player_id=f.player_id;
create index player_stats_level_ranking on public.player_stats(level desc,player_id);
create index player_stats_harvested_wheat_ranking on public.player_stats(harvested_wheat desc,player_id);
create index player_stats_harvested_corn_ranking on public.player_stats(harvested_corn desc,player_id);
create index player_stats_harvested_barley_ranking on public.player_stats(harvested_barley desc,player_id);
create index player_stats_harvested_lettuce_ranking on public.player_stats(harvested_lettuce desc,player_id);
create index player_stats_harvested_cabbage_ranking on public.player_stats(harvested_cabbage desc,player_id);
create index player_stats_harvested_cauliflower_ranking on public.player_stats(harvested_cauliflower desc,player_id);
create index player_stats_harvested_pumpkin_ranking on public.player_stats(harvested_pumpkin desc,player_id);
create index player_stats_harvested_redcabbage_ranking on public.player_stats(harvested_redcabbage desc,player_id);
create index player_stats_harvested_sunflower_ranking on public.player_stats(harvested_sunflower desc,player_id);
create index player_stats_harvested_crops_ranking on public.player_stats(harvested_crops desc,player_id);
create index player_stats_badges_ranking on public.player_stats(badges desc,player_id);
create index player_stats_deliveries_ranking on public.player_stats(deliveries desc,player_id);
