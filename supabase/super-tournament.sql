-- The Super Tournament (3 Nov 2026, the owner; rules in game/tournament.js). The admin starts one by hand from the dashboard (farm-api
-- tournament-service.js); everyone from level 1 takes part with their first counted action; the score is what the farm's own
-- counters (state.stats, and state.xp) rose by in the farmer's actions while it ran, so nothing new is measured; at the end the pot
-- (a few diamonds and coins per farmer with at least minScore points, up to a maximum) goes to the top places, which the farmers
-- collect in the game. Two small tables of its own, the owner's choice ("Eén kleine nieuwe tabel voor de toernooien"): the hourly
-- events (live_events) are not touched. Only farm-api (service role) reads or writes them.
-- Run once in the SQL editor, before farm-api and the site of this change go live (nothing calls it until then). Safe to run again.

create table if not exists public.harvest_tournaments(
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind ~ '^[a-z]{2,20}$'),
 pick text check (pick is null or pick ~ '^[a-z]{2,30}$'),
 title text not null check (char_length(title) between 3 and 80),
 -- [["harvested",1],["produced",2]]: the counters it scores and their weights (game/tournament.js tournamentScoring).
 scoring jsonb not null check (jsonb_typeof(scoring)='array' and jsonb_array_length(scoring) between 1 and 6),
 -- {"diamondsPerPlayer":2,"coinsPerPlayer":2000,"maxDiamonds":2000,"maxCoins":4000000,"placeStep":10,"minScore":10,"winners":0}
 settings jsonb not null,
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null,
 stopped_at timestamptz,
 settled_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 participants integer,
 counted integer,
 pot_diamonds integer,
 pot_coins integer,
 places integer,
 check (ends_at>starts_at and ends_at<=starts_at+interval '72 hours')
);
create index if not exists harvest_tournaments_open on public.harvest_tournaments(ends_at) where settled_at is null;
create table if not exists public.harvest_tournament_players(
 tournament_id uuid not null references public.harvest_tournaments(id) on delete cascade,
 -- on delete cascade: a deleted account (harvest_delete_account deletes auth.users) takes its rows with it.
 player_id uuid not null references auth.users(id) on delete cascade,
 score bigint not null default 0 check (score>=0),
 scored_at timestamptz not null default now(),
 joined_at timestamptz not null default now(),
 place integer,
 coins integer not null default 0,
 diamonds integer not null default 0,
 claimed_at timestamptz,
 primary key(tournament_id,player_id)
);
create index if not exists harvest_tournament_rank on public.harvest_tournament_players(tournament_id,score desc,scored_at,player_id);
create index if not exists harvest_tournament_owed on public.harvest_tournament_players(player_id) where claimed_at is null and diamonds+coins>0;
alter table public.harvest_tournaments enable row level security;
alter table public.harvest_tournament_players enable row level security;
revoke all on public.harvest_tournaments, public.harvest_tournament_players from public, anon, authenticated;
grant select, insert, update on public.harvest_tournaments, public.harvest_tournament_players to service_role;

-- After every farm action (a new receipt from farm-api, as the family chest and the events see one): the growth of the running
-- tournament's counters, weighted, is added to the farmer's score. The first one makes the farmer a participant, from level 1.
-- A tournament can never stop a farm from saving.
create or replace function public.harvest_tournament_track()
 returns trigger language plpgsql security definer set search_path to '' as $function$
declare t public.harvest_tournaments; receipt jsonb; item jsonb; stat text; pts bigint:=0;
begin
 receipt:=new.receipts->-1;
 if receipt is null or receipt->>'id' is not distinct from old.receipts->-1->>'id' then return new; end if;
 if new.state->'stats' is not distinct from old.state->'stats' and new.state->'xp' is not distinct from old.state->'xp' then return new; end if;
 select * into t from public.harvest_tournaments where settled_at is null and stopped_at is null and starts_at<=now() and ends_at>now() order by starts_at desc limit 1;
 if not found then return new; end if;
 for item in select * from jsonb_array_elements(t.scoring) loop
  stat:=item->>0;
  pts:=pts+greatest(0,
   coalesce((case when stat='xp' then new.state->>'xp' else new.state->'stats'->>stat end)::numeric,0)
   -coalesce((case when stat='xp' then old.state->>'xp' else old.state->'stats'->>stat end)::numeric,0))::bigint*greatest(1,(item->>1)::integer);
 end loop;
 if pts<=0 then return new; end if;
 insert into public.harvest_tournament_players(tournament_id,player_id,score,scored_at) values(t.id,new.player_id,pts,now())
  on conflict(tournament_id,player_id) do update set score=public.harvest_tournament_players.score+excluded.score,scored_at=now();
 return new;
exception when others then return new;
end $function$;
revoke all on function public.harvest_tournament_track() from public, anon, authenticated;
drop trigger if exists harvest_tournament_track on public.player_farms;
create trigger harvest_tournament_track after update on public.player_farms for each row execute function public.harvest_tournament_track();

-- The results, once the tournament has ended or the admin stopped it: who counted (minScore or more), the pot, and each paid place's
-- prize, ranked by score, the earlier to reach it first (game/tournament.js tournamentPot / tournamentShares: the same numbers).
-- Safe to call again: a settled tournament stays as it is.
create or replace function public.harvest_tournament_settle(p_tournament uuid)
 returns void language plpgsql security definer set search_path to '' as $function$
declare t public.harvest_tournaments; s jsonb; n integer; total integer; pd bigint; pc bigint; v_places integer; rest numeric;
begin
 select * into t from public.harvest_tournaments where id=p_tournament for update;
 if not found or t.settled_at is not null or (t.stopped_at is null and t.ends_at>now()) then return; end if;
 s:=t.settings;
 select count(*) into total from public.harvest_tournament_players where tournament_id=t.id;
 select count(*) into n from public.harvest_tournament_players where tournament_id=t.id and score>=(s->>'minScore')::bigint;
 pd:=least((s->>'maxDiamonds')::bigint,n*(s->>'diamondsPerPlayer')::bigint);
 pc:=least((s->>'maxCoins')::bigint,n*(s->>'coinsPerPlayer')::bigint);
 -- winners: a set number of winning places (the owner, 3 Nov 2026); 0 or none: one per placeStep farmers.
 v_places:=case when n<80 then least(3,n) when coalesce((s->>'winners')::integer,0)>0 then least(n,greatest(3,(s->>'winners')::integer)) else least(n,greatest(3,floor(n/(s->>'placeStep')::numeric)::integer)) end;
 rest:=case when v_places>3 then 0.5/(v_places-3) else 0 end;
 with ranked as (
  select player_id,row_number() over(order by score desc,scored_at,player_id) as place
  from public.harvest_tournament_players where tournament_id=t.id and score>=(s->>'minScore')::bigint
 ), share as (
  select player_id,place,case
   when v_places=1 then 1
   when v_places=2 then (array[0.625,0.375])[place]
   when v_places=3 then (array[0.5,0.3,0.2])[place]
   when place<=3 then (array[0.25,0.15,0.1])[place]
   else rest end::numeric as part
  from ranked where place<=v_places
 )
 update public.harvest_tournament_players p set place=share.place,diamonds=least(500,floor(pd*share.part))::integer,coins=least(1000000,floor(pc*share.part))::integer   -- one farmer wins at most 500 diamonds and 1,000,000 coins (the owner)
  from share where p.tournament_id=t.id and p.player_id=share.player_id;
 update public.harvest_tournaments set settled_at=now(),participants=total,counted=n,pot_diamonds=pd,pot_coins=pc,places=v_places where id=t.id;
end $function$;
revoke all on function public.harvest_tournament_settle(uuid) from public, anon, authenticated;
grant execute on function public.harvest_tournament_settle(uuid) to service_role;

-- A winner collects their prize in the game, once (the same steps as harvest_event_claim: the farm first, then the tournament).
create or replace function public.harvest_tournament_claim(p_player uuid, p_tournament uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare p public.harvest_tournament_players; farm public.player_farms;
begin
 select * into farm from public.player_farms where player_id=p_player for update;
 if not found then raise exception 'No farm.'; end if;
 perform public.harvest_tournament_settle(p_tournament);
 select * into p from public.harvest_tournament_players where player_id=p_player and tournament_id=p_tournament for update;
 if not found or p.place is null or p.diamonds+p.coins<=0 or not exists(select 1 from public.harvest_tournaments where id=p_tournament and settled_at is not null) then
  raise exception 'This tournament has no prize for you.'; end if;
 if p.claimed_at is not null then return jsonb_build_object('message','This prize was already collected.','coins',0,'diamonds',0); end if;
 farm.state:=jsonb_set(jsonb_set(farm.state,'{coins}',to_jsonb(coalesce((farm.state->>'coins')::bigint,0)+p.coins)),'{diamonds}',to_jsonb(coalesce((farm.state->>'diamonds')::bigint,0)+p.diamonds));
 update public.player_farms set state=farm.state,revision=revision+1,updated_at=now() where player_id=p_player;
 update public.player_stats set currency=(farm.state->>'coins')::bigint where player_id=p_player;
 update public.harvest_tournament_players set claimed_at=now() where tournament_id=p_tournament and player_id=p_player;
 return jsonb_build_object('message','Tournament prize collected!','coins',p.coins,'diamonds',p.diamonds,'place',p.place);
end $function$;
revoke all on function public.harvest_tournament_claim(uuid,uuid) from public, anon, authenticated;
grant execute on function public.harvest_tournament_claim(uuid,uuid) to service_role;

-- The automatic pilot (the owner: "Maak in admin panel ook mogelijk om het op automatische piloot te doen, bv elke woensdag om 9:16 uur
-- gametijd"): a plan starts the same tournament every week on its day at its time, in UTC (game time, as the admin dashboard
-- shows it). The admin makes, turns on and off and removes plans in the dashboard (farm-api); news: the News farm-api wrote with the
-- plan, in every language, posted when it starts.
create table if not exists public.harvest_tournament_plans(
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind ~ '^[a-z]{2,20}$'),
 pick text check (pick is null or pick ~ '^[a-z]{2,30}$'),
 title text not null check (char_length(title) between 3 and 80),
 scoring jsonb not null check (jsonb_typeof(scoring)='array' and jsonb_array_length(scoring) between 1 and 6),
 settings jsonb not null,
 weekday smallint not null check (weekday between 0 and 6),   -- 0 Sunday … 6 Saturday, as extract(dow)
 at_minute smallint not null check (at_minute between 0 and 1439),   -- minutes after 00:00 UTC
 hours smallint not null check (hours between 1 and 72),
 news jsonb,   -- {"body":"…","texts":{"nl":{"body":"…"},…,"art":"tournament"}}
 active boolean not null default true,
 last_start timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.harvest_tournament_plans enable row level security;
revoke all on public.harvest_tournament_plans from public, anon, authenticated;
grant select, insert, update, delete on public.harvest_tournament_plans to service_role;

-- Random plans (3 Nov 2026, the owner: "start er random 3 per week", "elke keer een ander", "de tijd is ook random", "max 3 per week",
-- "zodat ook spelers buiten UTC kans maken", "24 tot 48 uur", "anders komt het in de knoei"): per_week set means the plan picks, every
-- week (Monday 00:00 UTC), that many different days with a time anywhere in the 24 hours, and each start its own length of 24 to 48 hours; pool: the kinds
-- it draws from (game/tournament.js TOURNAMENT_POOL, written by farm-api), never one of the last three tournaments' kinds.
alter table public.harvest_tournament_plans add column if not exists pool jsonb;
alter table public.harvest_tournament_plans add column if not exists per_week smallint;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='harvest_tournament_plans_per_week_check') then
  alter table public.harvest_tournament_plans add constraint harvest_tournament_plans_per_week_check check (per_week is null or per_week between 1 and 7);
 end if;
end $$;

-- A random plan's moments of one week (Monday 00:00 UTC at p_week): per_week different days, each at a minute of the day and with its
-- hours, the same every time it is asked (from the plan's id and the week), oldest first.
create or replace function public.harvest_tournament_slots(p_plan uuid, p_count integer, p_week timestamptz)
 returns table(at timestamptz, hours integer) language sql stable set search_path to '' as $f$
 select p_week+make_interval(days=>d,mins=>(('x'||substr(md5(p_plan::text||p_week::text||'m'||d),1,8))::bit(32)::bigint%1440)::integer),
  24+(('x'||substr(md5(p_plan::text||p_week::text||'h'||d),1,8))::bit(32)::bigint%25)::integer
 from (select d from generate_series(0,6) d order by md5(p_plan::text||p_week::text||'d'||d) limit greatest(1,least(7,p_count))) days
 order by 1;
$f$;
revoke all on function public.harvest_tournament_slots(uuid,integer,timestamptz) from public, anon, authenticated;

-- Every minute (cron): settle what ended, then start what a plan has due. A weekly plan: its day and time this week, within the hour
-- after it, once; skipped while another tournament runs. A random plan: its next moment this week that has come; while another runs it
-- waits and starts when that one has ended (still this week), so at most per_week a week and never two at once. Its News goes to
-- everyone, for as long as the tournament runs.
create or replace function public.harvest_tournament_autostart()
 returns void language plpgsql security definer set search_path to '' as $function$
declare p public.harvest_tournament_plans; slot timestamptz; len integer; tid uuid; week timestamptz; pick jsonb; recent text[];
 v_kind text; v_pick text; v_title text; v_scoring jsonb;
begin
 perform public.harvest_tournament_settle(t.id) from public.harvest_tournaments t where t.settled_at is null and (t.stopped_at is not null or t.ends_at<=now());
 for p in select * from public.harvest_tournament_plans where active for update skip locked loop
  if p.per_week is not null then
   week:=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC';
   select s.at,s.hours into slot,len from public.harvest_tournament_slots(p.id,p.per_week,week) s
    where s.at<=now() and (p.last_start is null or s.at>p.last_start) order by s.at limit 1;
   if slot is null then continue; end if;
   if exists(select 1 from public.harvest_tournaments where settled_at is null and stopped_at is null and ends_at>now()) then continue; end if;
   select array_agg(kind) into recent from (select kind from public.harvest_tournaments order by starts_at desc limit 3) r;
   select e into pick from jsonb_array_elements(coalesce(p.pool,'[]'::jsonb)) e where not (e->>'kind'=any(coalesce(recent,'{}'))) order by random() limit 1;
   if pick is null then select e into pick from jsonb_array_elements(coalesce(p.pool,'[]'::jsonb)) e order by random() limit 1; end if;
   v_kind:=coalesce(pick->>'kind',p.kind);v_pick:=null;v_title:=coalesce(pick->>'title',p.title);v_scoring:=coalesce(pick->'scoring',p.scoring);
   if v_kind='random' then continue; end if;
   update public.harvest_tournament_plans set last_start=slot where id=p.id;
   insert into public.harvest_tournaments(kind,pick,title,scoring,settings,starts_at,ends_at,created_by)
    values(v_kind,v_pick,v_title,v_scoring,p.settings,now(),now()+make_interval(hours=>len),p.created_by) returning id into tid;
   if p.news?'body' then
    insert into public.player_notices(player_id,kind,body,expires_at,texts,min_level,no_portals)
     values(null,'news',left(p.news->>'body',400),now()+make_interval(hours=>len),p.news->'texts',null,false);
   end if;
   continue;
  end if;
  -- This week's moment of the plan: the last time its weekday and minute came, now or before.
  slot:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'
   -make_interval(days=>((extract(dow from now() at time zone 'UTC')::integer-p.weekday+7)%7))+make_interval(mins=>p.at_minute);
  if slot>now() then slot:=slot-interval '7 days'; end if;
  -- Only within an hour of the moment (a plan made later, or the cron down for long, waits for next week), and once.
  if now()-slot>interval '1 hour' or (p.last_start is not null and p.last_start>=slot) then continue; end if;
  update public.harvest_tournament_plans set last_start=slot where id=p.id;
  if exists(select 1 from public.harvest_tournaments where settled_at is null and stopped_at is null and ends_at>now()) then continue; end if;
  insert into public.harvest_tournaments(kind,pick,title,scoring,settings,starts_at,ends_at,created_by)
   values(p.kind,p.pick,p.title,p.scoring,p.settings,now(),slot+make_interval(hours=>p.hours),p.created_by) returning id into tid;
  if p.news?'body' then
   insert into public.player_notices(player_id,kind,body,expires_at,texts,min_level,no_portals)
    values(null,'news',left(p.news->>'body',400),slot+make_interval(hours=>p.hours),p.news->'texts',null,false);
  end if;
 end loop;
exception when others then raise warning 'harvest_tournament_autostart: %',sqlerrm;
end $function$;
revoke all on function public.harvest_tournament_autostart() from public, anon, authenticated;
grant execute on function public.harvest_tournament_autostart() to service_role;
select cron.schedule('harvest-tournament-autostart','* * * * *','select public.harvest_tournament_autostart()');
