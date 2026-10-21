-- The graphics chip and the mode behind a stalled or lost farm (21 Oct 2026: a Pixel 10 Pro Fold player lost the 3D view and in the end the
-- app closed at every start; the owner picked options 1-4). Two columns on public.load_stalls (supabase/load-stalls.sql):
-- gpu, the graphics chip's name as the browser tells it (public/graphics-mode.js gpuName; at most 100 characters, cut again by farm-api
-- load-stall-service.js stallGpu), and gfx, the mode the farm ran in ('full', 'noshadow' on a PowerVR or Imagination GPU, 'simple' after
-- trouble or by choice). And two new kinds, written by the farm itself (public/loading-screen.js noteOnDevice): 'lost' the 3D view was
-- lost during play or while loading, 'crash' the last start ended under the player without a minute of play. No player id, as before.
-- Release: this file first, then farm-api (it writes the two columns and the new kinds; before this file its insert would fail), then the
-- site. Safe to run again.
alter table public.load_stalls add column if not exists gpu text check (char_length(gpu) <= 100);
alter table public.load_stalls add column if not exists gfx text check (gfx in ('full','noshadow','simple'));
alter table public.load_stalls drop constraint if exists load_stalls_kind_check;
alter table public.load_stalls add constraint load_stalls_kind_check check (kind in ('auto','card','reload_hung','left','refresh','part','lost','crash'));
-- For the owner (SQL editor), the last 7 days without the staff: which graphics chips lose the 3D view or close under the player.
--  select gpu, gfx, kind, count(*) as farms from public.load_stalls
--  where created_at>now()-interval '7 days' and not staff and kind in ('lost','crash','card') group by gpu, gfx, kind order by farms desc limit 30;
