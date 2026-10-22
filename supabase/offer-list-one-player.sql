-- App Review's demo account keeps its own offer (22 Oct 2026, the owner: "haal apple demo account eruit, moet gewoon blijven, kan niet
-- gestopt worden"): the admin's offer list shows only offers for everyone (offer_list), and Stop never ends an offer for one farmer
-- (offer_stop). Based on the live functions read on 22 Oct 2026: offer_list md5 eb6b500e241934260561df05ccc6ed96, offer_stop md5
-- baf2a6aea42fb1e4d33ed87224f4530b; each is patched once (run again, it changes nothing).
do $$ declare d text; begin
 d:=pg_get_functiondef('public.offer_list()'::regprocedure);
 if position('where player_id is null order by created_at desc limit 10' in d)=0 then
  if md5(d)<>'eb6b500e241934260561df05ccc6ed96' then raise exception 'offer_list is not the one read on 22 Oct 2026'; end if;
  d:=replace(d,'from public.harvest_offers order by created_at desc limit 10','from public.harvest_offers where player_id is null order by created_at desc limit 10');
  if position('where player_id is null order by created_at desc limit 10' in d)=0 then raise exception 'offer_list: the list line was not found'; end if;
  execute d;
 end if;
 d:=pg_get_functiondef('public.offer_stop(uuid)'::regprocedure);
 if position('stopped_at is null and player_id is null;' in d)=0 then
  if md5(d)<>'baf2a6aea42fb1e4d33ed87224f4530b' then raise exception 'offer_stop is not the one read on 22 Oct 2026'; end if;
  d:=replace(d,'where id=p_id and stopped_at is null;','where id=p_id and stopped_at is null and player_id is null;');
  if position('stopped_at is null and player_id is null;' in d)=0 then raise exception 'offer_stop: the stop line was not found'; end if;
  execute d;
 end if;
end $$;
select md5(pg_get_functiondef('public.offer_list()'::regprocedure)) offer_list_md5, md5(pg_get_functiondef('public.offer_stop(uuid)'::regprocedure)) offer_stop_md5;
