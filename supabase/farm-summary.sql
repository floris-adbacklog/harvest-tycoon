-- The Admin dashboard's All players list, fast (12 Oct 2026). farm-api (admin-analytics-service.js handleAdminPlayers) read six values out
-- of every farm's whole saved state: diamonds, days played, streak, beginner guide step and reward, family. 1,000 farms a request, and
-- each request also unpacked the farms of the pages before it: 957 ms a request on average since 16 Sep, 6.7 s for the last page of the
-- 5,801 farms of 12 Oct, all pages again every minute while the dashboard is open. The heaviest query of the database after Realtime.
-- Now every farm keeps those six values in a small column of its own, summary, written whenever its state is written (a save, a gift, a
-- purchase: every insert or update that sets state), and the list reads only that: under 60 ms for that last page in a test on the
-- live data. The values are the state's own: on 12 Oct all 5,803 farms gave exactly what the old list read. A farmer can read only
-- their own farm row (the policy on player_farms).
alter table public.player_farms add column if not exists summary jsonb;

create or replace function public.harvest_farm_summary(p_state jsonb)
 returns jsonb language sql immutable set search_path to '' as $function$
 select jsonb_build_object('diamonds',p_state->'diamonds','visits',p_state#>'{login,visits}','streak',p_state#>'{login,streak}',
  'guide',p_state#>'{onboarding,completed}','guideDone',p_state#>'{onboarding,rewardClaimed}','family',p_state#>'{family,familyId}')
$function$;
revoke all on function public.harvest_farm_summary(jsonb) from public, anon, authenticated;

-- Before the row is stored, so the new state is still in memory: no extra read, no second write.
create or replace function public.harvest_stamp_farm_summary()
 returns trigger language plpgsql set search_path to '' as $function$
begin
 new.summary:=public.harvest_farm_summary(new.state);
 return new;
end $function$;
revoke all on function public.harvest_stamp_farm_summary() from public, anon, authenticated;
drop trigger if exists harvest_farm_summary on public.player_farms;
create trigger harvest_farm_summary before insert or update of state on public.player_farms
 for each row execute function public.harvest_stamp_farm_summary();

-- Every farm saved before this, once: only the new column is written (state, revision and receipts stay as they are). 1,000 farms at a
-- time, so a farm being saved meanwhile waits a moment at most; run it again until it says UPDATE 0.
update public.player_farms f set summary=public.harvest_farm_summary(f.state)
 where f.player_id in (select p.player_id from public.player_farms p where p.summary is null limit 1000);
