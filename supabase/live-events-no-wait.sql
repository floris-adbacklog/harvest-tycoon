-- Farm events open as soon as a farm reaches level 10 (25 Sep 2026). The progress trigger no longer asks for an account that is
-- 48 hours old; a confirmed email address and level 10 remain. Only that one condition changes: the live definition of
-- harvest_event_progress is read and re-created with it removed, so nothing else in the function can drift from what is live.
do $migration$
declare definition text; before text;
begin
 definition:=pg_get_functiondef('public.harvest_event_progress()'::regprocedure);
 before:=definition;
 definition:=replace(definition,'created_at<now()-interval ''48 hours'' and ','');
 if definition=before then raise exception 'harvest_event_progress: the 48-hour condition was not found'; end if;
 execute definition;
end
$migration$;
