-- Farm Family: additive, re-runnable migration. Never replaces harvest_commit_farm.
-- Rules and tuning: game/farm-state.js. Only the authenticated Edge Function
-- can call these service-only RPCs. All farm + family writes are one transaction.
create table if not exists public.families (id uuid primary key, name text not null check (length(name) between 3 and 20), emblem text not null, invite_code text not null check (length(invite_code)=6), is_open boolean not null default false, created_at bigint not null, renamed_at bigint, deleted_at bigint);
create table if not exists public.family_members (id uuid not null unique, player_id uuid primary key references auth.users(id), family_id uuid references public.families(id), role text not null check (role in ('leader','member')), joined_at bigint not null, left_at bigint, cooldown_until bigint);
create table if not exists public.family_orders (family_id uuid references public.families(id), week integer, lines jsonb not null, filled jsonb not null default '{}', member_count integer not null check (member_count between 1 and 10), value bigint not null check (value>0), created_at bigint not null, completed_at bigint, primary key(family_id,week));
create table if not exists public.family_contributions (family_id uuid not null references public.families(id), week integer, player_id uuid references auth.users(id), points bigint not null check (points>=0), order_points bigint not null check (order_points>=0), extra_points bigint not null check (extra_points>=0), lines jsonb not null, last_at bigint not null, primary key(player_id,week), check (points=order_points+extra_points));
create table if not exists public.family_week_results (week integer, family_id uuid references public.families(id), rank integer not null check (rank>0), points bigint not null, active_members integer not null, diamonds_pool integer not null, name text not null, emblem text not null, settled_at bigint not null, primary key(week,family_id), unique(week,rank));
create table if not exists public.family_rewards (id text primary key, player_id uuid not null references auth.users(id), week integer not null, kind text not null check (kind in ('order','tournament')), coins bigint not null check (coins>=0), xp bigint not null check (xp>=0), diamonds integer not null check (diamonds>=0), created_at bigint not null, expires_at bigint not null, claimed_at bigint, unique(player_id,week,kind));
create table if not exists public.family_attempts (player_id uuid primary key references auth.users(id), window_at bigint not null, count integer not null check (count>=0));
create table if not exists public.family_weeks (week integer primary key, settled_at bigint not null, pool integer not null check (pool>=0));
create unique index if not exists families_live_name on public.families(lower(name)) where deleted_at is null;
create unique index if not exists families_live_code on public.families(invite_code) where deleted_at is null;
create index if not exists family_members_family on public.family_members(family_id) where left_at is null;
create index if not exists family_contributions_week on public.family_contributions(week,family_id);
create index if not exists family_rewards_player on public.family_rewards(player_id,expires_at) where claimed_at is null;
create table if not exists public.family_revision (id boolean primary key default true check (id), revision bigint not null default 0);
insert into public.family_revision(id) values(true) on conflict do nothing;
create table if not exists public.family_receipts (player_id uuid references auth.users(id), request_id uuid, result jsonb not null, failed boolean not null, created_at bigint not null, primary key(player_id,request_id));
create table if not exists public.family_claims (reward_id text references public.family_rewards(id), player_id uuid references auth.users(id), claimed_at bigint not null, primary key(reward_id,player_id));
alter table public.families enable row level security;
revoke all on public.families from public, anon, authenticated;
grant select, insert, update on public.families to service_role;
alter table public.family_members enable row level security;
revoke all on public.family_members from public, anon, authenticated;
grant select, insert, update on public.family_members to service_role;
alter table public.family_orders enable row level security;
revoke all on public.family_orders from public, anon, authenticated;
grant select, insert, update on public.family_orders to service_role;
alter table public.family_contributions enable row level security;
revoke all on public.family_contributions from public, anon, authenticated;
grant select, insert, update on public.family_contributions to service_role;
alter table public.family_week_results enable row level security;
revoke all on public.family_week_results from public, anon, authenticated;
grant select, insert, update on public.family_week_results to service_role;
alter table public.family_rewards enable row level security;
revoke all on public.family_rewards from public, anon, authenticated;
grant select, insert, update on public.family_rewards to service_role;
alter table public.family_attempts enable row level security;
revoke all on public.family_attempts from public, anon, authenticated;
grant select, insert, update on public.family_attempts to service_role;
alter table public.family_weeks enable row level security;
revoke all on public.family_weeks from public, anon, authenticated;
grant select, insert, update on public.family_weeks to service_role;
alter table public.family_revision enable row level security;
revoke all on public.family_revision from public, anon, authenticated;
grant select, insert, update on public.family_revision to service_role;
alter table public.family_receipts enable row level security;
revoke all on public.family_receipts from public, anon, authenticated;
grant select, insert, update on public.family_receipts to service_role;
alter table public.family_claims enable row level security;
revoke all on public.family_claims from public, anon, authenticated;
grant select, insert, update on public.family_claims to service_role;

-- A single statement gives the rules engine a consistent MVCC snapshot.
-- Raw context never leaves the service role. Public view is an explicit whitelist.
create or replace function public.harvest_family_context(p_player uuid, p_request uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $fn$
 select jsonb_build_object(
 'revision',(select revision from public.family_revision where id),
 'now',floor(extract(epoch from statement_timestamp())*1000)::bigint,
 'families',coalesce((select jsonb_agg(to_jsonb(t)) from public.families t),'[]'::jsonb),
 'members',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_members t),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_orders t),'[]'::jsonb),
 'contributions',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_contributions t),'[]'::jsonb),
 'results',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_week_results t),'[]'::jsonb),
 'rewards',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_rewards t),'[]'::jsonb),
 'attempts',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_attempts t),'[]'::jsonb),
 'weeks',coalesce((select jsonb_agg(to_jsonb(t)) from public.family_weeks t),'[]'::jsonb),
 'players',coalesce((select jsonb_agg(jsonb_build_object('player_id',p.player_id,'username',p.username,'level',p.level,'last_active_at',p.last_active_at)) from public.player_stats p join public.family_members m on m.player_id=p.player_id where m.left_at is null),'[]'::jsonb),
 'receipt',(select jsonb_build_object('result',r.result,'failed',r.failed) from public.family_receipts r where r.player_id=p_player and r.request_id=p_request))
$fn$;

create or replace function public.harvest_family_commit(
 p_player uuid, p_expected_family bigint, p_expected_farm bigint,
 p_week integer, p_changes jsonb, p_settled integer[], p_write_farm boolean,
 p_state jsonb, p_receipts jsonb, p_username text, p_currency integer, p_level integer,
 p_request uuid default null, p_result jsonb default '{}', p_failed boolean default false)
returns boolean language plpgsql security invoker set search_path='' as $fn$
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
end $fn$;
revoke all on function public.harvest_family_context(uuid,uuid) from public,anon,authenticated;
grant execute on function public.harvest_family_context(uuid,uuid) to service_role;
revoke all on function public.harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.harvest_family_commit(uuid,bigint,bigint,integer,jsonb,integer[],boolean,jsonb,jsonb,text,integer,integer,uuid,jsonb,boolean) to service_role;
