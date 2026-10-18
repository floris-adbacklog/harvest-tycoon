-- Where a stalled farm start stopped and why (18 Oct 2026, the 12% report, option 1). Two columns on public.load_stalls
-- (supabase/load-stalls.sql): stage, how far src/game-cloud.js came (begin, watch, parts, game, farm, ready), and error, the first thing
-- that broke in the farm page as one line (public/loading-screen.js errorLine: name, message, file and line; at most 160 characters, any
-- e-mail address taken out by farm-api load-stall-service.js). No player id, as before.
-- Release: this file first, then farm-api (it writes the two columns; a farm-api from before ignores them), the site in any order.
-- Safe to run again.
alter table public.load_stalls add column if not exists stage text check (stage in ('begin','watch','parts','game','farm','ready'));
alter table public.load_stalls add column if not exists error text check (char_length(error) <= 160);
-- A new kind of note (review of 18 Oct 2026): 'part', the farm opened but one of the farm page's own parts broke on the way (its error in
-- error). The kind check is made again with it (load-stalls.sql has the same list for a new database).
alter table public.load_stalls drop constraint if exists load_stalls_kind_check;
alter table public.load_stalls add constraint load_stalls_kind_check check (kind in ('auto','card','reload_hung','left','refresh','part'));
-- For the owner (SQL editor), the last 7 days without the staff, where the farm page's start stopped:
--  select stage, error, count(*) as stalls from public.load_stalls
--  where created_at>now()-interval '7 days' and not staff and step='code' group by stage, error order by stalls desc limit 20;
-- and the parts that broke while the farm still opened:
--  select error, count(*) as farms from public.load_stalls
--  where created_at>now()-interval '7 days' and not staff and kind='part' group by error order by farms desc limit 20;
