-- Additive rollout after farm-family.sql. No changes to harvest_commit_farm.
begin;
create table if not exists public.family_social_actions (
 id uuid primary key, sender uuid not null references auth.users(id), recipient uuid not null references auth.users(id),
 family_id uuid not null references public.families(id), kind text not null check(kind in ('help','gift','fulfill')),
 day date not null default (now() at time zone 'UTC')::date, created_at timestamptz not null default now(),
 check(sender<>recipient), unique(sender,recipient,kind,day)
);
create table if not exists public.family_social_requests (
 id uuid primary key, player_id uuid not null references auth.users(id), family_id uuid not null references public.families(id),
 item text not null check(item in ('wheat','corn','feed')), quantity integer not null check(quantity between 1 and 5),
 day date not null default (now() at time zone 'UTC')::date, fulfilled_by uuid references auth.users(id),
 unique(player_id,day)
);
alter table public.family_social_actions enable row level security;
alter table public.family_social_requests enable row level security;
revoke all on public.family_social_actions,public.family_social_requests from public,anon,authenticated;
grant all on public.family_social_actions,public.family_social_requests to service_role;
create index if not exists family_social_received on public.family_social_actions(recipient,day,kind);
create or replace function public.harvest_social(p_player uuid,p_action jsonb,p_request uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
#variable_conflict use_column
<<social>>
declare
 m public.family_members; target public.family_members; r public.family_social_requests;
 actor public.player_farms; other public.player_farms; kind text:=p_action->>'kind'; recipient uuid;
 d date:=(now() at time zone 'UTC')::date; tick bigint:=(extract(epoch from now())*1000)::bigint;
 item text; quantity integer; fid uuid; message text;
begin
 -- Serialize the small family roster with the existing family revision lock, then farm rows in UUID order.
 -- This also prevents membership changes between eligibility checks and the transfer.
 perform 1 from public.family_revision where id for update;
 select * into m from public.family_members where player_id=p_player and left_at is null;
 if not found then raise exception 'Join a Farm Family first.'; end if;
 fid:=m.family_id;
 if kind='read' then
  return jsonb_build_object('members',(select coalesce(jsonb_agg(jsonb_build_object('id',s.player_id,'name',s.username)),'[]') from public.family_members fm join public.player_stats s on s.player_id=fm.player_id where fm.family_id=fid and fm.left_at is null and fm.player_id<>p_player),
   'requests',(select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('name',s.username)),'[]') from public.family_social_requests q join public.player_stats s on s.player_id=q.player_id where q.family_id=fid and q.day=d),
   'activity',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.family_social_actions a where (a.sender=p_player or a.recipient=p_player) and a.day=d));
 end if;
 if p_request is null then raise exception 'Missing request identifier.'; end if;
 if exists(select 1 from public.family_social_actions where id=p_request and sender=p_player) or exists(select 1 from public.family_social_requests where id=p_request and player_id=p_player) then return jsonb_build_object('message','Already completed.'); end if;
 if kind not in ('request','help','gift','fulfill') then raise exception 'Choose a social action.'; end if;
 if m.joined_at>tick-86400000 or not exists(select 1 from auth.users where id=p_player and created_at<now()-interval '48 hours') or not exists(select 1 from public.player_stats where player_id=p_player and level>=10) then raise exception 'Daily sharing opens at level 10, after 48 hours on your farm and 24 hours in your family.'; end if;
 if kind='request' then
  item:=p_action->>'item';quantity:=(p_action->>'quantity')::integer;
  if item not in ('wheat','corn','feed') or item is null or quantity is null or quantity not between 1 and 5 then raise exception 'Request 1–5 wheat, corn or feed.'; end if;
  insert into public.family_social_requests(id,player_id,family_id,item,quantity,day) values(p_request,p_player,fid,item,quantity,d);
  return jsonb_build_object('message','Your family request is ready.');
 end if;
 recipient:=(p_action->>'recipient')::uuid;
 if kind='fulfill' then
  select * into r from public.family_social_requests where id=(p_action->>'request')::uuid and family_id=fid and day=d and fulfilled_by is null for update;
  if not found then raise exception 'This request is no longer available.'; end if;
  recipient:=r.player_id;item:=r.item;quantity:=r.quantity;
 elsif kind='gift' then item:='wheat';quantity:=3;
 end if;
 if recipient is null or recipient=p_player then raise exception 'Choose another family member.'; end if;
 select * into target from public.family_members where player_id=recipient and family_id=fid and left_at is null;
 if not found or target.joined_at>tick-86400000 or not exists(select 1 from auth.users where id=recipient and created_at<now()-interval '48 hours') or not exists(select 1 from public.player_stats where player_id=recipient and level>=10) then raise exception 'This farmer is not eligible for daily sharing yet.'; end if;
 if (select count(*) from public.family_social_actions where sender=p_player and day=d and kind=social.kind)>=3 or (select count(*) from public.family_social_actions where recipient=social.recipient and day=d and kind=social.kind)>=3 then raise exception 'Daily limit reached (3 sent and 3 received per interaction).'; end if;
 perform 1 from public.player_farms where player_id in (p_player,recipient) order by player_id for update;
 select * into actor from public.player_farms where player_id=p_player;
 select * into other from public.player_farms where player_id=recipient;
 if actor.player_id is null or other.player_id is null then raise exception 'Farm unavailable.'; end if;
 if kind='help' then
  -- A small coin gift: help costs the sender exactly what the recipient receives. No minted currency.
  if (actor.state->>'coins')::bigint<5 then raise exception 'You need 5 coins to help.'; end if;
  actor.state:=jsonb_set(actor.state,'{coins}',to_jsonb((actor.state->>'coins')::bigint-5));
  other.state:=jsonb_set(other.state,'{coins}',to_jsonb((other.state->>'coins')::bigint+5));
 else
  if coalesce((actor.state#>>array['inventory',item])::integer,0)<quantity then raise exception 'You do not have enough goods.'; end if;
  actor.state:=jsonb_set(actor.state,array['inventory',item],to_jsonb((actor.state#>>array['inventory',item])::integer-quantity));
  other.state:=jsonb_set(other.state,array['inventory',item],to_jsonb(coalesce((other.state#>>array['inventory',item])::integer,0)+quantity));
 end if;
 insert into public.family_social_actions(id,sender,recipient,family_id,kind,day) values(p_request,p_player,recipient,fid,kind,d);
 if kind='fulfill' then update public.family_social_requests set fulfilled_by=p_player where id=r.id; end if;
 -- Balances + revisions + ledger all commit together; in-flight farm saves must retry.
 update public.player_farms set state=actor.state,revision=revision+1,updated_at=now() where player_id=p_player;
 update public.player_farms set state=other.state,revision=revision+1 where player_id=recipient;
 update public.player_stats set currency=(actor.state->>'coins')::integer where player_id=p_player;
 update public.player_stats set currency=(other.state->>'coins')::integer where player_id=recipient;
 return jsonb_build_object('message',case kind when 'help' then 'You helped with 5 coins. Thank you!' when 'gift' then 'Your gift of 3 wheat has arrived!' else 'Request fulfilled. Your family thanks you!' end);
end $$;
revoke all on function public.harvest_social(uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.harvest_social(uuid,jsonb,uuid) to service_role;
commit;
