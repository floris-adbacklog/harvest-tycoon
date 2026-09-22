-- Additive, server-only short-event framework. Run after schema-online.sql.
begin;
create table if not exists public.live_events (
 id uuid primary key, title text not null check(length(title) between 3 and 80), description text not null default '' check(length(description)<=500),
 starts_at timestamptz not null, ends_at timestamptz not null, active boolean not null default false,
 objectives jsonb not null, rewards jsonb not null, settled_at timestamptz, created_by uuid not null references auth.users(id),
 participants integer not null default 0, qualified integer not null default 0, diamond_pool integer not null default 0,
 check(ends_at>=starts_at+interval '1 hour' and ends_at<=starts_at+interval '12 hours')
);
create table if not exists public.live_event_players (
 event_id uuid references public.live_events(id), player_id uuid references auth.users(id), progress jsonb not null default '{}',
 actions integer not null default 0, joined_at timestamptz not null default now(), last_at timestamptz not null default now(),
 qualified boolean not null default false, coins integer not null default 0, diamonds integer not null default 0,
 claimed_at timestamptz, paid_diamonds integer not null default 0,
 primary key(event_id,player_id)
);
alter table public.live_events enable row level security;
alter table public.live_event_players enable row level security;
revoke all on public.live_events,public.live_event_players from public,anon,authenticated;
grant all on public.live_events,public.live_event_players to service_role;
create index if not exists live_event_player_claims on public.live_event_players(player_id,claimed_at);
-- Config validation also protects SQL/operator mistakes, not only the admin form.
create or replace function public.harvest_event_validate() returns trigger language plpgsql security invoker set search_path='' as $$
declare objective jsonb; k text;
begin
 perform pg_advisory_xact_lock(724919);
 if TG_OP='UPDATE' and old.starts_at<=now() and (new.title<>old.title or new.description<>old.description or new.starts_at<>old.starts_at or new.ends_at<>old.ends_at or new.objectives<>old.objectives or new.rewards<>old.rewards) then raise exception 'Started events are frozen. Create a new event to change the rules.'; end if;
 if new.active and new.ends_at>now() and exists(select 1 from public.live_events e where e.id<>new.id and e.active and e.starts_at<new.ends_at and e.ends_at>new.starts_at) then raise exception 'Active events cannot overlap.'; end if;
 if jsonb_typeof(new.objectives)<>'array' or jsonb_array_length(new.objectives) not between 1 and 4 then raise exception 'Choose 1–4 objectives.'; end if;
 for objective in select value from jsonb_array_elements(new.objectives) loop
  if coalesce(objective->>'stat','') not in ('harvested','produced','watered','tended','chores','deliveries') or coalesce((objective->>'target')::integer,0) not between 1 and 10000 then raise exception 'Invalid event objective.'; end if;
 end loop;
 if (select count(distinct value->>'stat') from jsonb_array_elements(new.objectives))<>jsonb_array_length(new.objectives) then raise exception 'Objectives must be unique.'; end if;
 foreach k in array array['coins','diamondMin','diamondMax','participantStep','poolCap'] loop
  if not new.rewards ? k or jsonb_typeof(new.rewards->k)<>'number' or (new.rewards->>k)::numeric<>trunc((new.rewards->>k)::numeric) then raise exception 'Reward settings must be whole numbers.'; end if;
 end loop;
 if (new.rewards->>'coins')::integer not between 0 and 300 or (new.rewards->>'diamondMin')::integer not between 0 and 1 or (new.rewards->>'diamondMax')::integer not between 1 and 3 or (new.rewards->>'participantStep')::integer not between 10 and 1000 or (new.rewards->>'poolCap')::integer not between 0 and 200 then raise exception 'Reward settings exceed safe limits.'; end if;
 return new;
end $$;
drop trigger if exists harvest_event_validate on public.live_events;
create trigger harvest_event_validate before insert or update on public.live_events for each row execute function public.harvest_event_validate();
-- Only receipts from an accepted gameplay action count. Admin grants and wallet transfers cannot create event progress.
create or replace function public.harvest_event_progress() returns trigger language plpgsql security invoker set search_path='' as $$
declare e public.live_events; p public.live_event_players; o jsonb; receipt jsonb; delta integer; value integer; changed boolean; stat text; action text;
begin
 receipt:=new.receipts->-1;action:=receipt->>'eventAction';
 if receipt is null or receipt->>'id' is not distinct from old.receipts->-1->>'id' or action is null then return new; end if;
 if not exists(select 1 from auth.users where id=new.player_id and created_at<now()-interval '48 hours' and email_confirmed_at is not null) or not exists(select 1 from public.player_stats where player_id=new.player_id and level>=10) then return new; end if;
 for e in select * from public.live_events where active and starts_at<=now() and ends_at>now() and settled_at is null order by id for share loop
  select * into p from public.live_event_players where event_id=e.id and player_id=new.player_id;
  if not found then p.progress:='{}';p.actions:=0;p.joined_at:=now();p.last_at:=now()-interval '10 seconds';end if;
  if p.last_at>now()-interval '10 seconds' then continue; end if;
  -- Freeze the qualifying completion time so further play never worsens reward priority.
  if p.actions>=3 and p.last_at>=p.joined_at+interval '10 minutes' and not exists(select 1 from jsonb_array_elements(e.objectives) obj where coalesce((p.progress->>(obj->>'stat'))::integer,0)<(obj->>'target')::integer) then continue; end if;
  changed:=false;
  for o in select * from jsonb_array_elements(e.objectives) loop
   stat:=o->>'stat';
   if not ((stat in ('harvested','watered','tended') and action in ('field','tractor','collect_all')) or (stat='produced' and action in ('collect','collect_all')) or (stat='chores' and action='chore') or (stat='deliveries' and action='delivery')) then continue; end if;
   delta:=greatest(0,coalesce((new.state#>>array['stats',stat])::integer,0)-coalesce((old.state#>>array['stats',stat])::integer,0));
   value:=least((o->>'target')::integer,coalesce((p.progress->>stat)::integer,0)+delta);
   if delta>0 then changed:=true;p.progress:=jsonb_set(p.progress,array[stat],to_jsonb(value));end if;
  end loop;
  if changed then
   insert into public.live_event_players(event_id,player_id,progress,actions,joined_at,last_at) values(e.id,new.player_id,p.progress,p.actions+1,p.joined_at,now())
    on conflict(event_id,player_id) do update set progress=excluded.progress,actions=excluded.actions,last_at=excluded.last_at;
  end if;
 end loop;
 return new;
end $$;
drop trigger if exists harvest_event_progress on public.player_farms;
create trigger harvest_event_progress after update on public.player_farms for each row execute function public.harvest_event_progress();
-- Settlement can be retried. The event lock freezes a single participation count and distribution.
create or replace function public.harvest_event_settle(p_event uuid) returns void language plpgsql security invoker set search_path='' as $$
declare e public.live_events; n integer; per_player integer; budget integer;
begin
 select * into e from public.live_events where id=p_event for update;
 if not found or e.ends_at>now() or e.settled_at is not null then return; end if;
 update public.live_event_players p set qualified=(actions>=3 and last_at>=joined_at+interval '10 minutes' and not exists(select 1 from jsonb_array_elements(e.objectives) o where coalesce((p.progress->>(o->>'stat'))::integer,0)<(o->>'target')::integer)) where event_id=p_event;
 select count(*) into n from public.live_event_players where event_id=p_event and qualified;
 per_player:=least((e.rewards->>'diamondMax')::integer,(e.rewards->>'diamondMin')::integer+floor(sqrt(n::numeric/(e.rewards->>'participantStep')::integer))::integer);
 budget:=least((e.rewards->>'poolCap')::integer,n*per_player);
 -- Completed players are ordered by completion time, UUID as deterministic tie-break. The first three also win a
 -- podium prize on top (1st +300 coins +2 diamonds, 2nd +200 +1, 3rd +100 +1); the daily diamond cap still applies at claim.
 -- Live since 2026-09-22 (migration harvest_event_podium_prizes, also in live-events-podium.sql).
 with ranked as (select player_id,row_number() over(order by last_at,player_id) as rank from public.live_event_players where event_id=p_event and qualified)
 update public.live_event_players p set coins=(e.rewards->>'coins')::integer+(case r.rank when 1 then 300 when 2 then 200 when 3 then 100 else 0 end),
  diamonds=greatest(0,least(per_player,budget-((r.rank-1)*per_player)::integer))+(case r.rank when 1 then 2 when 2 then 1 when 3 then 1 else 0 end)
  from ranked r where p.event_id=p_event and p.player_id=r.player_id;
 update public.live_events set settled_at=now(),participants=(select count(*) from public.live_event_players where event_id=p_event),qualified=n,diamond_pool=budget where id=p_event;
end $$;
create or replace function public.harvest_event_claim(p_player uuid,p_event uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.live_event_players; farm public.player_farms; paid integer; used integer;
begin
 -- Farm first: same lock order as ordinary gameplay and its progress trigger.
 select * into farm from public.player_farms where player_id=p_player for update;
 perform public.harvest_event_settle(p_event);
 select * into p from public.live_event_players where player_id=p_player and event_id=p_event for update;
 if not found or not p.qualified or not exists(select 1 from public.live_events where id=p_event and settled_at is not null) then raise exception 'Complete the event objectives and wait for results.'; end if;
 if p.claimed_at is not null then return jsonb_build_object('message','This reward was already collected.'); end if;
 select coalesce(sum(paid_diamonds),0) into used from public.live_event_players where player_id=p_player and claimed_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC');
 paid:=least(p.diamonds,greatest(0,6-used));
 farm.state:=jsonb_set(jsonb_set(farm.state,'{coins}',to_jsonb((farm.state->>'coins')::integer+p.coins)),'{diamonds}',to_jsonb((farm.state->>'diamonds')::integer+paid));
 update public.player_farms set state=farm.state,revision=revision+1,updated_at=now() where player_id=p_player;
 update public.player_stats set currency=(farm.state->>'coins')::integer where player_id=p_player;
 update public.live_event_players set claimed_at=now(),paid_diamonds=paid where event_id=p_event and player_id=p_player;
 return jsonb_build_object('message','Event rewards collected!','coins',p.coins,'diamonds',paid);
end $$;
-- Live since 2026-09-22 (migration harvest_retention_account_eligibility_permissions): the progress trigger reads these
-- three columns as service_role; without them every farm save failed.
grant select(id,created_at,email_confirmed_at) on auth.users to service_role;
revoke all on function public.harvest_event_validate(),public.harvest_event_progress(),public.harvest_event_settle(uuid),public.harvest_event_claim(uuid,uuid) from public,anon,authenticated;
grant execute on function public.harvest_event_validate(),public.harvest_event_progress(),public.harvest_event_settle(uuid),public.harvest_event_claim(uuid,uuid) to service_role;
commit;
