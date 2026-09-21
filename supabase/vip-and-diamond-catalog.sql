-- Additive release. Does not replace harvest_commit_farm or existing receipts.
begin;
alter table public.harvest_purchases
 drop constraint harvest_purchases_pack_check,
 drop constraint harvest_purchases_diamonds_check,
 drop constraint harvest_pack_amount_matches;
alter table public.harvest_purchases
 add constraint harvest_purchases_pack_check check(pack in ('50','100','150','300','500','600','1000','1250','2000','3500','starter')),
 add constraint harvest_purchases_diamonds_check check(diamonds in (50,100,150,300,500,600,1000,1250,2000,3500)),
 add constraint harvest_pack_amount_matches check(
  (pack in ('50','100','150') and diamonds=(case when pack~'^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=199) or
  (pack='500' and diamonds=500 and coins=0 and amount_cents=499) or
  (pack in ('300','600','1250') and diamonds=(case when pack~'^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=999) or
  (pack in ('1000','2000','3500') and diamonds=(case when pack~'^[0-9]+$' then pack::integer else 0 end) and coins=0 and amount_cents=2499) or
  (pack='starter' and diamonds=300 and coins=10000 and amount_cents=299));

-- Public status only. The authoritative entitlement stays in the private farm.
alter table public.player_stats add column if not exists vip_expires_at timestamptz;
revoke insert, update, delete on public.player_stats from anon, authenticated;
create or replace function public.harvest_project_vip() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 update public.player_stats set vip_expires_at =
  case when coalesce((new.state->>'vipExpiresAt')::bigint,0)>0
   then to_timestamp((new.state->>'vipExpiresAt')::double precision/1000) else null end
 where player_id=new.player_id;
 return new;
end;
$$;
revoke all on function public.harvest_project_vip() from public, anon, authenticated;
drop trigger if exists harvest_vip_projection on public.player_farms;
create trigger harvest_vip_projection after update of state on public.player_farms
 for each row when (old.state->>'vipExpiresAt' is distinct from new.state->>'vipExpiresAt')
 execute function public.harvest_project_vip();

-- Preserve the current live family implementation, adding one public property.
do $$
declare definition text;
begin
 select pg_get_functiondef('public.harvest_family_context(uuid,uuid)'::regprocedure) into definition;
 if position('''vip_expires_at'',p.vip_expires_at' in definition)=0 then
  if position('''last_active_at'',p.last_active_at' in definition)=0 then
   raise exception 'Family context changed: review its public player projection before migrating';
  end if;
  execute replace(definition,'''last_active_at'',p.last_active_at','''last_active_at'',p.last_active_at,''vip_expires_at'',p.vip_expires_at');
 end if;
end;
$$;
commit;
