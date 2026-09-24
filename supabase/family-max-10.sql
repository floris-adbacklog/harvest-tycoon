-- Farm Families of up to 10 members (was 6). Re-runnable.
-- Patches the LIVE harvest_family_commit (only its "more than 6 members" check becomes "more than 10") instead of rebuilding it
-- from an older file, so anything deployed since stays as it is; and lets a weekly Family Order snapshot up to 10 members.
do $$
declare
 fn regprocedure:='public.harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean)'::regprocedure;
 def text:=pg_get_functiondef(fn);
begin
 if position('count(*)>10' in def)>0 then return; end if;
 if position('count(*)>6' in def)=0 then raise exception 'harvest_family_commit has no "count(*)>6" check; look at it before changing the family size'; end if;
 execute replace(def,'count(*)>6','count(*)>10');
end $$;
alter table public.family_orders drop constraint if exists family_orders_member_count_check;
alter table public.family_orders add constraint family_orders_member_count_check check (member_count between 1 and 10);
