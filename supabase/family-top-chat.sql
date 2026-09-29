-- A new top farmer in the family shows in the family chat as a card of its own (29 Sep 2026), like a new rank
-- (family-rank-chat.sql): the top farmer's crown, who it is and their Family Chest points this week. Checked at most once an
-- hour (pg_cron, minute 35): per family the member with the most chest points this week, the same rule as the game
-- (public/farm-state.js familyTopFarmer: members only, more than 0 points, a tie goes to the lowest player ID). A card goes out
-- when that farmer differs from the last check, also when a new week starts; family_top_state remembers the last one. The
-- first run only writes down who is on top now, so it sends no cards. A problem with one card never stops the others.
alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
alter table public.chat_messages add constraint chat_messages_kind_check check (kind in ('message','request','rank','top'));

create table if not exists public.family_top_state(
 family_id uuid primary key references public.families(id) on delete cascade,
 week integer not null,
 player_id uuid not null,
 updated_at timestamptz not null default now());
alter table public.family_top_state enable row level security;
revoke all on public.family_top_state from anon, authenticated;

create or replace function public.family_top_check() returns integer language plpgsql security definer set search_path to '' as $f$
declare wk integer:=floor((extract(epoch from now())*1000-4*86400000)/(7*86400000))::integer;
 r record; prev public.family_top_state; nm text; av text; vip boolean; cards integer:=0;
begin
 for r in
  select distinct on (cp.family_id) cp.family_id, cp.player_id, cp.points
  from public.family_chest_players cp
  join public.family_members m on m.player_id=cp.player_id and m.family_id=cp.family_id and m.left_at is null
  join public.families f on f.id=cp.family_id and f.deleted_at is null
  where cp.week=wk and cp.points>0
  order by cp.family_id, cp.points desc, cp.player_id::text
 loop
  select * into prev from public.family_top_state s where s.family_id=r.family_id;
  if found and (prev.week<>wk or prev.player_id<>r.player_id) then
   begin
    select ps.username, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, av, vip from public.player_stats ps where ps.player_id=r.player_id;
    insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_vip,body,kind,meta)
    values('family:'||r.family_id::text,r.player_id,coalesce(nm,'A farmer'),av,coalesce(vip,false),'Is the new top farmer','top',
     jsonb_build_object('points',r.points,'week',wk));
    cards:=cards+1;
   exception when others then null;
   end;
  end if;
  insert into public.family_top_state(family_id,week,player_id,updated_at) values(r.family_id,wk,r.player_id,now())
   on conflict(family_id) do update set week=excluded.week,player_id=excluded.player_id,updated_at=now();
 end loop;
 return cards;
end $f$;
revoke all on function public.family_top_check() from public, anon, authenticated;

select cron.unschedule('harvest-family-top') where exists(select 1 from cron.job where jobname='harvest-family-top');
select cron.schedule('harvest-family-top','35 * * * *','select public.family_top_check()');
-- The first run: writes down today's top farmers, without cards.
select public.family_top_check();
