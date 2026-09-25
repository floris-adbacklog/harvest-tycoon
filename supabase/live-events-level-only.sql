-- Farm events are open to every farm from level 10 (25 Sep 2026): no email check (it moves to a separate, optional reward of
-- 10 diamonds, see email_checks and farm-api) and no waiting time. Only the trigger's gate changes, read from the live definition.
do $migration$
declare definition text; before text;
begin
 definition:=pg_get_functiondef('public.harvest_event_progress()'::regprocedure);before:=definition;
 definition:=replace(definition,'if not public.harvest_email_checked(new.player_id) or not exists(','if not exists(');
 if definition=before then raise exception 'harvest_event_progress: the email gate was not found'; end if;
 execute definition;
end
$migration$;
