-- Only server functions can create purchases or credit diamonds.
create table public.harvest_purchases (
 id uuid primary key,
 player_id uuid not null references auth.users(id) on delete restrict,
 pack text not null check(pack in ('100','600','2000')),
 diamonds integer not null check(diamonds in (100,600,2000)),
 amount_cents integer not null check(amount_cents in (199,999,2499)),
 price_id text not null,
 livemode boolean not null,
 stripe_session_id text unique,
 stripe_payment_id text unique,
 stripe_event_id text unique,
 status text not null default 'pending' check(status in ('pending','credited','test_paid')),
 created_at timestamptz not null default now(),
 credited_at timestamptz,
 constraint harvest_pack_amount_matches check(
  (pack='100' and diamonds=100 and amount_cents=199) or
  (pack='600' and diamonds=600 and amount_cents=999) or
  (pack='2000' and diamonds=2000 and amount_cents=2499))
);
create index harvest_purchases_player_created on public.harvest_purchases(player_id,created_at desc);
alter table public.harvest_purchases enable row level security;
revoke all on public.harvest_purchases from public,anon,authenticated;
grant select,insert,update on public.harvest_purchases to service_role;

create function public.harvest_credit_purchase(p_purchase uuid,p_session text,p_payment text,p_event text,p_livemode boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare purchase public.harvest_purchases%rowtype;
begin
 select * into purchase from public.harvest_purchases where id=p_purchase for update;
 if not found then raise exception 'Unknown purchase'; end if;
 if purchase.stripe_session_id is distinct from p_session or purchase.livemode is distinct from p_livemode then raise exception 'Payment mismatch'; end if;
 if p_session is null or p_payment is null or p_event is null or p_payment not like 'pi_%' or p_event not like 'evt_%' then raise exception 'Invalid payment reference'; end if;
 if purchase.status in ('credited','test_paid') then return jsonb_build_object('status',purchase.status,'duplicate',true); end if;
 if purchase.livemode then
  -- Row locking plus a revision increment prevents in-flight farming actions
  -- from overwriting a payment. They retry against the new revision.
  update public.player_farms set
   state=jsonb_set(state,'{diamonds}',to_jsonb(coalesce((state->>'diamonds')::bigint,0)+purchase.diamonds)),
   revision=revision+1,updated_at=now() where player_id=purchase.player_id;
  if not found then raise exception 'Farm is missing'; end if;
 end if;
 update public.harvest_purchases set status=case when livemode then 'credited' else 'test_paid' end,
  stripe_payment_id=p_payment,stripe_event_id=p_event,credited_at=now() where id=p_purchase;
 return jsonb_build_object('status',case when purchase.livemode then 'credited' else 'test_paid' end,'duplicate',false);
end $$;
revoke execute on function public.harvest_credit_purchase(uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.harvest_credit_purchase(uuid,text,text,text,boolean) to service_role;
