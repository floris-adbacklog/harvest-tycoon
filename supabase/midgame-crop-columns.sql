-- Per-crop harvest columns for the midgame crops (squash, pole beans, cider apples and, ahead of wave 2, cherries), like the
-- orchard crops got in orchard-expansion.sql. The farm-api profile read (player-profile-service.js) asks for harvested_<crop> for
-- every crop in the game, so without these columns every farmer profile failed after the midgame update; the leaderboard's
-- crop categories read them too. authenticated reads player_stats table-wide (RLS: signed-in, non-anonymous), so the new
-- columns need no extra grant.
-- harvest_commit_farm below is the live definition read on 23 Sep 2026 (md5 3aee1c7fbd773babbe9017a3f543ba16) with only the four
-- new columns added to its insert and update. Existing farms are filled in from their saved statistics.
alter table public.player_stats add column if not exists harvested_squash bigint not null default 0 check(harvested_squash>=0);
alter table public.player_stats add column if not exists harvested_polebeans bigint not null default 0 check(harvested_polebeans>=0);
alter table public.player_stats add column if not exists harvested_ciderapples bigint not null default 0 check(harvested_ciderapples>=0);
alter table public.player_stats add column if not exists harvested_cherries bigint not null default 0 check(harvested_cherries>=0);
create index if not exists player_stats_harvested_squash_ranking on public.player_stats(harvested_squash desc,player_id);
create index if not exists player_stats_harvested_polebeans_ranking on public.player_stats(harvested_polebeans desc,player_id);
create index if not exists player_stats_harvested_ciderapples_ranking on public.player_stats(harvested_ciderapples desc,player_id);
create index if not exists player_stats_harvested_cherries_ranking on public.player_stats(harvested_cherries desc,player_id);

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
 insert into public.player_stats(player_id,username,currency,level,harvested_wheat,harvested_corn,harvested_barley,harvested_lettuce,harvested_cabbage,harvested_cauliflower,harvested_pumpkin,harvested_redcabbage,harvested_sunflower,harvested_apples,harvested_berries,harvested_greenbeans,harvested_squash,harvested_polebeans,harvested_ciderapples,harvested_cherries,harvested_crops,badges,deliveries,goods_produced,items_sold,updated_at,last_active_at)
  select p_player,p_username,p_currency,p_level,m.harvested_wheat,m.harvested_corn,m.harvested_barley,m.harvested_lettuce,m.harvested_cabbage,m.harvested_cauliflower,m.harvested_pumpkin,m.harvested_redcabbage,m.harvested_sunflower,coalesce((p_state#>>'{stats,harvest_apples}')::bigint,0),coalesce((p_state#>>'{stats,harvest_berries}')::bigint,0),coalesce((p_state#>>'{stats,harvest_greenbeans}')::bigint,0),coalesce((p_state#>>'{stats,harvest_squash}')::bigint,0),coalesce((p_state#>>'{stats,harvest_polebeans}')::bigint,0),coalesce((p_state#>>'{stats,harvest_ciderapples}')::bigint,0),coalesce((p_state#>>'{stats,harvest_cherries}')::bigint,0),m.harvested_crops,m.badges,m.deliveries,m.goods_produced,m.items_sold,now(),
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
   harvested_apples=excluded.harvested_apples,harvested_berries=excluded.harvested_berries,harvested_greenbeans=excluded.harvested_greenbeans,
   harvested_squash=excluded.harvested_squash,harvested_polebeans=excluded.harvested_polebeans,harvested_ciderapples=excluded.harvested_ciderapples,harvested_cherries=excluded.harvested_cherries,harvested_crops=excluded.harvested_crops,
   badges=excluded.badges,
   deliveries=excluded.deliveries,
   goods_produced=excluded.goods_produced,
   items_sold=excluded.items_sold,updated_at=now(),
   last_active_at=coalesce(excluded.last_active_at,public.player_stats.last_active_at);
 return true;
end $function$;

update public.player_stats s set
 harvested_squash=coalesce((f.state#>>'{stats,harvest_squash}')::bigint,0),
 harvested_polebeans=coalesce((f.state#>>'{stats,harvest_polebeans}')::bigint,0),
 harvested_ciderapples=coalesce((f.state#>>'{stats,harvest_ciderapples}')::bigint,0),
 harvested_cherries=coalesce((f.state#>>'{stats,harvest_cherries}')::bigint,0)
from public.player_farms f
where f.player_id=s.player_id and coalesce((f.state#>>'{stats,harvest_squash}')::bigint,0)+coalesce((f.state#>>'{stats,harvest_polebeans}')::bigint,0)+coalesce((f.state#>>'{stats,harvest_ciderapples}')::bigint,0)+coalesce((f.state#>>'{stats,harvest_cherries}')::bigint,0)>0;
