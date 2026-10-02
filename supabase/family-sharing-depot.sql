-- Family requests work like the Trade Depot (2 Oct 2026). A request stays open until the family has filled it, for up to 3 days (it
-- used to end at midnight UTC). Every farmer adds to it as often as they like and chooses how many: 1, 5 or all they have; each
-- part arrives at once, and what is in stays in. Giving to a request no longer uses one of the 3 daily actions (help and gifts keep
-- theirs). A farmer has one open request at a time and asks at most once a day, for the same amounts as before.
-- harvest_social is ahead of every copy in this folder, so the live function is changed in place, part by part; each part must be
-- found exactly once, or nothing changes and it says which part to look at.
alter table public.family_social_requests add column if not exists amounts jsonb not null default '{}'::jsonb;
alter table public.family_social_requests add column if not exists filled_at timestamptz;
-- One help and one gift per farmer and member a day stays; giving to a request can happen as often as there is something to give.
alter table public.family_social_actions drop constraint if exists family_social_actions_sender_recipient_kind_day_key;
create unique index if not exists family_social_actions_once_a_day on public.family_social_actions(sender,recipient,kind,day) where kind<>'fulfill';

do $patch$
declare d text; parts text[][]; i int; n int;
begin
 select pg_get_functiondef(p.oid) into strict d from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname='harvest_social';
 if position('Your last request is still open.' in d)>0 then return; end if;
 parts:=array[
  -- 1. The list: open requests of the last 3 days, and the ones filled today or in the last day.
  array[$o$where q.family_id=fid and q.day=d),$o$,
        $n$where q.family_id=fid and q.day>=d-2 and (q.fulfilled_by is null or q.day=d or q.filled_at>now()-interval '1 day')),$n$],
  -- 2. Asking: once a day, and one open request at a time.
  array[$o$  insert into public.family_social_requests(id,player_id,family_id,item,quantity,day) values(p_request,p_player,fid,item,quantity,d);$o$,
        $n$  if exists(select 1 from public.family_social_requests q where q.player_id=p_player and q.day=d) then raise exception 'You asked today already. Ask again tomorrow.'; end if;
  if exists(select 1 from public.family_social_requests q where q.player_id=p_player and q.fulfilled_by is null and q.day>=d-2) then raise exception 'Your last request is still open. It stays open for 3 days, or until your family fills it.'; end if;
  insert into public.family_social_requests(id,player_id,family_id,item,quantity,day) values(p_request,p_player,fid,item,quantity,d);$n$],
  -- 3. Giving: to a request of the last 3 days that is not full yet.
  array[$o$where id=(p_action->>'request')::uuid and family_id=fid and day=d and fulfilled_by is null for update;$o$,
        $n$where id=(p_action->>'request')::uuid and family_id=fid and day>=d-2 and fulfilled_by is null for update;$n$],
  -- 4. How many: what the farmer chose (1, 5 or all), never more than is still needed or than they have.
  array[$o$recipient:=r.player_id;item:=r.item;quantity:=r.quantity-r.given;$o$,
        $n$recipient:=r.player_id;item:=r.item;quantity:=r.quantity-r.given;
  if (p_action->>'quantity') ~ '^[0-9]{1,6}$' then quantity:=least(quantity,greatest(1,(p_action->>'quantity')::integer)); end if;$n$],
  -- 5. The 3-a-day limits are for help and gifts only.
  array[$o$if (select count(*) from public.family_social_actions where sender=p_player and day=d and kind=social.kind)>=3 or (kind<>'fulfill' and (select count(*) from public.family_social_actions where recipient=social.recipient and day=d and kind=social.kind)>=3) or (kind='fulfill' and r.given=0 and (select count(*) from public.family_social_requests q where q.player_id=social.recipient and q.day=d and q.given>0)>=3) then$o$,
        $n$if kind<>'fulfill' and ((select count(*) from public.family_social_actions where sender=p_player and day=d and kind=social.kind)>=3 or (select count(*) from public.family_social_actions where recipient=social.recipient and day=d and kind=social.kind)>=3) then$n$],
  -- 6. Who gave how many, and when it was full.
  array[$o$fulfilled_by=case when r.given+gave>=r.quantity then p_player end where id=r.id;$o$,
        $n$amounts=jsonb_set(r.amounts,array[p_player::text],to_jsonb(coalesce((r.amounts->>p_player::text)::integer,0)+gave)), fulfilled_by=case when r.given+gave>=r.quantity then p_player end, filled_at=case when r.given+gave>=r.quantity then now() end where id=r.id;$n$]
 ];
 for i in 1..array_length(parts,1) loop
  n:=(length(d)-length(replace(d,parts[i][1],'')))/length(parts[i][1]);
  if n<>1 then raise exception 'harvest_social is not as expected (part %): change it by hand', i; end if;
  d:=replace(d,parts[i][1],parts[i][2]);
 end loop;
 execute d;
end $patch$;
