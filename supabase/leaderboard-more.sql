-- Six more leaderboards, all from data the game already keeps: events finished, biggest farm (fields), chores done,
-- helping-hand rounds, estate projects and longest daily streak. harvest_commit_farm is left untouched: a separate
-- BEFORE trigger on player_stats reads the farm state that commit just wrote and fills the new columns. It can never
-- block a save: any surprise in the state keeps the old value. "Events finished" is kept up to date when an event is
-- settled. Run after live-events-podium.sql.
alter table public.player_stats
 add column if not exists events_finished integer not null default 0,
 add column if not exists farm_fields integer not null default 0,
 add column if not exists chores_done integer not null default 0,
 add column if not exists helping_rounds integer not null default 0,
 add column if not exists estate_projects integer not null default 0,
 add column if not exists best_streak integer not null default 0;

create or replace function public.harvest_stats_extras() returns trigger language plpgsql security invoker set search_path='' as $$
declare farm jsonb; whole constant text:='^[0-9]{1,9}$';
begin
 select state into farm from public.player_farms where player_id=new.player_id;
 if farm is null then return new; end if;
 if jsonb_typeof(farm->'plots')='array' then new.farm_fields:=jsonb_array_length(farm->'plots'); end if;
 if farm#>>'{stats,chores}' ~ whole then new.chores_done:=(farm#>>'{stats,chores}')::integer; end if;
 if farm#>>'{activities,rounds}' ~ whole then new.helping_rounds:=(farm#>>'{activities,rounds}')::integer; end if;
 if farm#>>'{estate,completed}' ~ whole then new.estate_projects:=(farm#>>'{estate,completed}')::integer; end if;
 if farm#>>'{login,best}' ~ whole then new.best_streak:=(farm#>>'{login,best}')::integer; end if;
 return new;
exception when others then return new;
end $$;
revoke all on function public.harvest_stats_extras() from public,anon,authenticated;
drop trigger if exists player_stats_extras on public.player_stats;
create trigger player_stats_extras before insert or update on public.player_stats for each row execute function public.harvest_stats_extras();

-- Settlement also refreshes "events finished" for everyone who qualified (same body as live-events-podium.sql plus
-- that one update).
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
 with ranked as (select player_id,row_number() over(order by last_at,player_id) as rank from public.live_event_players where event_id=p_event and qualified)
 update public.live_event_players p set coins=(e.rewards->>'coins')::integer+(case r.rank when 1 then 300 when 2 then 200 when 3 then 100 else 0 end),
  diamonds=greatest(0,least(per_player,budget-((r.rank-1)*per_player)::integer))+(case r.rank when 1 then 2 when 2 then 1 when 3 then 1 else 0 end)
  from ranked r where p.event_id=p_event and p.player_id=r.player_id;
 update public.live_events set settled_at=now(),participants=(select count(*) from public.live_event_players where event_id=p_event),qualified=n,diamond_pool=budget where id=p_event;
 update public.player_stats s set events_finished=(select count(*) from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified)
  where s.player_id in (select player_id from public.live_event_players where event_id=p_event and qualified);
end $$;

-- Fill the new columns for everyone once: the update runs the trigger for every row.
update public.player_stats s set events_finished=(select count(*) from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified);
