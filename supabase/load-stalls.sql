-- Loads that stalled (15 Oct 2026, the 12% report, option 5). When the farm does not finish loading, the page leaves a short note in its
-- browser tab (public/loading-screen.js LOAD_STALL_KEY) and the next farm load brings it along (src/supabase.js takeStall); farm-api
-- checks every field again and writes one row here (supabase/functions/farm-api/load-stall-service.js). Unlike farm_load_retry in Tag
-- Manager it needs no cookie consent, so every stall is counted, the iPhone app's too.
--  kind      auto (the farm opened again by itself), card (it showed Try again), reload_hung (its reload got no answer for 15 seconds,
--            then Try again), left (the page went while still loading), refresh (the player refreshed it by hand)
--  step      code, models, account, scene, village (the farm page's own steps) or frame (the farm page never showed itself)
--  percent   the loading bar; models: how many had arrived; view_s and total_s: seconds in view and in all; hidden: ever out of view
--  online    the browser's own word; protocol: h2, h3, http/1.1 or http/1.0; waiting: how many of the page's own files had not arrived,
--            files: the first five of them (their address without ?v=)
--  platform  as player_seen.platform (web, pwa, frame, android_app, galaxy_app, ios_app, crazygames, kongregate, discord); device: the
--            device type and browser, as the admin dashboard names them; staff: an admin account's
--  note_id   the note's own random id (made in the page, nowhere else): a load sent again with the same note counts it once
--  created_at the hour only, not the moment of the load that brought it (player_seen and the player log keep that moment)
-- No player id, IP address or user agent, and no exact time: a row is not linked to a farmer, so
-- supabase/delete-account.sql needs no change. farm-api deletes rows older than 90 days each time it writes one. Only farm-api (the
-- service role) writes or reads the table.
-- Release: this file, farm-api and the site in any order (a farm-api from before this ignores the note; one out before this file only logs
-- the error code). Before or with the site, the store apps' privacy answers (they load the site: NOTIFICATIONS-SETUP.md, Laadverslag).
-- Safe to run again.
--
-- For the owner (SQL editor), the last 7 days without the staff:
--  select kind, step, count(*) as stalls, round(avg(view_s)) as avg_seconds_in_view, round(avg(total_s)) as avg_seconds_in_all,
--   round(100.0*count(*) filter (where hidden)/count(*)) as pct_ever_hidden, count(*) filter (where online is false) as offline
--  from public.load_stalls where created_at>now()-interval '7 days' and not staff group by kind, step order by stalls desc;
--  select file, count(*) as stalls from public.load_stalls, unnest(files) as file
--  where created_at>now()-interval '7 days' and not staff group by file order by stalls desc limit 20;
--  select platform, device, count(*) as stalls from public.load_stalls
--  where created_at>now()-interval '7 days' and not staff group by platform, device order by stalls desc limit 20;

create table if not exists public.load_stalls (
 id bigint generated always as identity primary key,
 note_id uuid unique,
 created_at timestamptz not null default now(),
 platform text,
 device text,
 staff boolean not null default false,
 kind text not null check (kind in ('auto','card','reload_hung','left','refresh','part','lost','crash')),
 step text not null check (step in ('code','models','account','scene','village','frame')),
 percent smallint,
 models smallint,
 view_s integer,
 total_s integer,
 hidden boolean,
 online boolean,
 protocol text,
 waiting smallint,
 files text[] not null default '{}'
);
create index if not exists load_stalls_created on public.load_stalls(created_at);
alter table public.load_stalls enable row level security;
revoke all on public.load_stalls from anon, authenticated;
