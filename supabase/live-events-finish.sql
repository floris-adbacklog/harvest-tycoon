-- Farm events (30 Sep 2026): every goal done is finished, the first to get there wins most. The rule that a finisher also needed 3
-- contributions over at least 10 minutes is gone: in the settlement (who is paid) and in the progress trigger (where a finished
-- farmer's finish time is frozen, so playing on never costs a place). The rest of both functions is the live code.
do $migration$
declare definition text; before text;
begin
 definition:=pg_get_functiondef('public.harvest_event_settle(uuid)'::regprocedure);
 before:=definition;
 definition:=replace(definition,'set qualified=(actions>=3 and last_at>=joined_at+interval ''10 minutes'' and not exists(','set qualified=(not exists(');
 if definition=before then raise exception 'harvest_event_settle: the qualifying rule was not found'; end if;
 execute definition;

 definition:=pg_get_functiondef('public.harvest_event_progress()'::regprocedure);
 before:=definition;
 definition:=replace(definition,'if not fresh and p.actions>=3 and p.last_at>=p.joined_at+interval ''10 minutes'' and not exists(','if not fresh and not exists(');
 if definition=before then raise exception 'harvest_event_progress: the qualifying rule was not found'; end if;
 execute definition;
end
$migration$;
