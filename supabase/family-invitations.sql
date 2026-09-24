-- Player-name invitations. Apply AFTER farm-family.sql; never changes harvest_commit_farm.
-- Service-only state with one pending invitation per recipient across ALL families.
create table if not exists public.family_invitations (
 id uuid primary key,
 family_id uuid not null references public.families(id),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 invited_by uuid not null references auth.users(id) on delete cascade,
 created_at bigint not null,
 expires_at bigint not null check(expires_at>created_at),
 status text not null check(status in ('pending','accepted','declined','cancelled','expired')),
 resolved_at bigint,
 check(recipient_id<>invited_by),
 check((status='pending' and resolved_at is null) or (status<>'pending' and resolved_at is not null))
);
create unique index if not exists family_invitations_one_pending on public.family_invitations(recipient_id) where status='pending';
create index if not exists family_invitations_family_pending on public.family_invitations(family_id) where status='pending';
alter table public.family_invitations enable row level security;
revoke all on public.family_invitations from public,anon,authenticated;
grant select,insert,update on public.family_invitations to service_role;

CREATE OR REPLACE FUNCTION public.harvest_family_context(p_player uuid, p_request uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object(
 'revision',(select revision from public.family_revision where id),
 'now',floor(extract(epoch from statement_timestamp())*1000)::bigint,
 'families',coalesce((select jsonb_agg(to_jsonb(t)) from public.families t),'[]'::jsonb),
 'members',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_members t),'[]'::jsonb),
 'invitations',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_invitations t where t.status='pending'),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_orders t),'[]'::jsonb),
 'contributions',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_contributions t),'[]'::jsonb),
 'results',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_week_results t),'[]'::jsonb),
 'rewards',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_rewards t),'[]'::jsonb),
 'attempts',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_attempts t),'[]'::jsonb),
 'weeks',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_weeks t),'[]'::jsonb),
 'players',coalesce((select jsonb_agg(jsonb_build_object('player_id',p.player_id,'username',p.username,'level',p.level,'last_active_at',p.last_active_at)) from public.player_stats p where p.player_id=p_player or exists(select 1 from public.family_members m where m.player_id=p.player_id and m.left_at is null) or exists(select 1 from public.family_invitations i where i.status='pending' and (i.recipient_id=p.player_id or i.invited_by=p.player_id))),'[]'::jsonb),
 'receipt',(select jsonb_build_object('result',r.result,'failed',r.failed) from public.family_receipts r where r.player_id=p_player and r.request_id=p_request))
$function$
;

CREATE OR REPLACE FUNCTION public.harvest_family_commit(p_player uuid, p_expected_family bigint, p_expected_farm bigint, p_week integer, p_changes jsonb, p_settled integer[], p_write_farm boolean, p_state jsonb, p_receipts jsonb, p_username text, p_currency integer, p_level integer, p_request uuid DEFAULT NULL::uuid, p_result jsonb DEFAULT '{}'::jsonb, p_failed boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare current_revision bigint; w integer; r public.family_rewards; existing public.family_rewards;
begin
 -- Tiny player base: serialize family writes; farm-only actions remain independent.
 select revision into current_revision from public.family_revision where id for update;
 if current_revision<>p_expected_family then return false; end if;
 if p_week<>floor((extract(epoch from clock_timestamp())*1000-345600000)/604800000)::integer then return false; end if;
 if not exists(select 1 from public.player_farms where player_id=p_player and revision=p_expected_farm) then return false; end if;
 if p_request is not null and exists(select 1 from public.family_receipts where player_id=p_player and request_id=p_request) then return false; end if;
 foreach w in array coalesce(p_settled,'{}'::integer[]) loop
  perform pg_advisory_xact_lock(1178684745,w);
  if w>=p_week or exists(select 1 from public.family_weeks where week=w) then return false; end if;
 end loop;
 if p_write_farm then
  if p_failed or p_request is null then raise exception 'Invalid family commit'; end if;
  if not public.harvest_commit_farm(p_player,p_expected_farm,p_state,p_receipts,p_username,p_currency,p_level) then return false; end if;
 end if;
 -- Any exception below rolls back harvest_commit_farm as well.
 -- The weekly contribution lock cannot be moved by an upsert.
 if exists(select 1 from jsonb_populate_recordset(null::public.family_contributions,coalesce(p_changes->'contributions','[]')) n join public.family_contributions old using(player_id,week) where old.family_id<>n.family_id or n.points<old.points) then raise exception 'Invalid contribution change'; end if;
 for r in select * from jsonb_populate_recordset(null::public.family_rewards,coalesce(p_changes->'rewards','[]')) loop
  select * into existing from public.family_rewards where id=r.id;
  if existing.id is not null and (existing.player_id<>r.player_id or existing.coins<>r.coins or existing.xp<>r.xp or existing.diamonds<>r.diamonds or existing.claimed_at is not null) then raise exception 'Immutable reward'; end if;
  if r.claimed_at is not null and (not p_write_farm or r.player_id<>p_player or existing.id is null) then raise exception 'Invalid claim'; end if;
 end loop;
 insert into public.families select * from jsonb_populate_recordset(null::public.families,coalesce(p_changes->'families','[]')) on conflict(id) do update set name=excluded.name,emblem=excluded.emblem,invite_code=excluded.invite_code,is_open=excluded.is_open,created_at=excluded.created_at,renamed_at=excluded.renamed_at,deleted_at=excluded.deleted_at;
 insert into public.family_members select * from jsonb_populate_recordset(null::public.family_members,coalesce(p_changes->'members','[]')) on conflict(player_id) do update set id=excluded.id,family_id=excluded.family_id,role=excluded.role,joined_at=excluded.joined_at,left_at=excluded.left_at,cooldown_until=excluded.cooldown_until;
 -- Resolve previous invitations before inserting replacements for a recipient.
 if exists(select 1 from jsonb_populate_recordset(null::public.family_invitations,coalesce(p_changes->'invitations','[]')) n join public.family_invitations old using(id) where old.recipient_id<>n.recipient_id or old.family_id<>n.family_id or old.invited_by<>n.invited_by or old.created_at<>n.created_at or old.expires_at<>n.expires_at or old.status<>'pending') then raise exception 'Invalid invitation change'; end if;
 update public.family_invitations old set status=n.status,resolved_at=n.resolved_at from jsonb_populate_recordset(null::public.family_invitations,coalesce(p_changes->'invitations','[]')) n where old.id=n.id and n.status<>'pending';
 insert into public.family_invitations select n.* from jsonb_populate_recordset(null::public.family_invitations,coalesce(p_changes->'invitations','[]')) n where not exists(select 1 from public.family_invitations old where old.id=n.id);
 insert into public.family_orders select * from jsonb_populate_recordset(null::public.family_orders,coalesce(p_changes->'orders','[]')) on conflict(family_id,week) do update set lines=excluded.lines,filled=excluded.filled,member_count=excluded.member_count,value=excluded.value,created_at=excluded.created_at,completed_at=excluded.completed_at;
 insert into public.family_contributions select * from jsonb_populate_recordset(null::public.family_contributions,coalesce(p_changes->'contributions','[]')) on conflict(player_id,week) do update set family_id=excluded.family_id,points=excluded.points,order_points=excluded.order_points,extra_points=excluded.extra_points,lines=excluded.lines,last_at=excluded.last_at;
 insert into public.family_week_results select * from jsonb_populate_recordset(null::public.family_week_results,coalesce(p_changes->'results','[]')) on conflict(week,family_id) do nothing;
 insert into public.family_rewards select * from jsonb_populate_recordset(null::public.family_rewards,coalesce(p_changes->'rewards','[]')) on conflict(id) do update set player_id=excluded.player_id,week=excluded.week,kind=excluded.kind,coins=excluded.coins,xp=excluded.xp,diamonds=excluded.diamonds,created_at=excluded.created_at,expires_at=excluded.expires_at,claimed_at=excluded.claimed_at;
 insert into public.family_attempts select * from jsonb_populate_recordset(null::public.family_attempts,coalesce(p_changes->'attempts','[]')) on conflict(player_id) do update set window_at=excluded.window_at,count=excluded.count;
 insert into public.family_weeks select * from jsonb_populate_recordset(null::public.family_weeks,coalesce(p_changes->'weeks','[]')) on conflict(week) do nothing;
 for r in select * from jsonb_populate_recordset(null::public.family_rewards,coalesce(p_changes->'rewards','[]')) where claimed_at is not null loop
  insert into public.family_claims(reward_id,player_id,claimed_at) values(r.id,r.player_id,r.claimed_at);
 end loop;
 if exists(select 1 from public.family_members where left_at is null and family_id is not null group by family_id having count(*)>10 or count(*) filter(where role='leader')<>1) then raise exception 'Invalid family membership'; end if;
 if exists(select 1 from public.family_orders o, lateral jsonb_each_text(o.filled) f where not (o.lines ? f.key) or f.value::bigint<0 or f.value::bigint>(o.lines->>f.key)::bigint) then raise exception 'Order overflow'; end if;
 if p_request is not null then
  insert into public.family_receipts values(p_player,p_request,p_result,p_failed,floor(extract(epoch from clock_timestamp())*1000)::bigint);
 end if;
 update public.family_revision set revision=revision+1 where id;
 return true;
end $function$
;

revoke all on function public.harvest_family_context(uuid,uuid) from public,anon,authenticated;
grant execute on function public.harvest_family_context(uuid,uuid) to service_role;
revoke all on function public.harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean) to service_role;
