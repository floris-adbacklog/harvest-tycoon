-- The tractor's night shift (4 Oct 2026, farm-state.js): the hourly job (notify-hourly) needs to see it, so it sends no "crops ready"
-- for fields the shift harvests itself (rules.js readyCrops). The live definition of 4 Oct 2026 with one more key in the farm.
do $$
declare d text;n text;
begin
 d:=pg_get_functiondef('public.notification_candidates()'::regprocedure);
 n:=replace(d,'''comeback'', f.state -> ''comeback'', ''seenAt'', f.updated_at)','''comeback'', f.state -> ''comeback'', ''tractorShift'', f.state -> ''tractorShift'', ''seenAt'', f.updated_at)');
 if n=d then raise exception 'notification_candidates: the farm object was not found'; end if;
 execute n;
end $$;
