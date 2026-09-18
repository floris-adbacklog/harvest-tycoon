-- Disposable fixtures. ROLLBACK removes every user, purchase and farm created here.
begin;
do $$
declare u uuid:=gen_random_uuid(); old_u uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); t uuid:=gen_random_uuid(); late uuid:=gen_random_uuid();
 result jsonb; farm jsonb; rev bigint; crop text; blocked boolean:=false;
begin
 insert into auth.users(id,aud,role,created_at) values(u,'authenticated','authenticated',now()-interval '1 hour'),(old_u,'authenticated','authenticated',now()-interval '4 days');
 insert into public.player_farms(player_id,state) values(u,'{"coins":180,"diamonds":7,"inventory":{"wheat":4,"feed":2},"plots":[{"id":0,"crop":"corn"}]}'::jsonb),(old_u,'{"coins":180,"diamonds":7,"inventory":{}}'::jsonb);
 insert into public.harvest_purchases(id,player_id,pack,diamonds,coins,amount_cents,price_id,livemode,stripe_session_id)
 values(p,u,'starter',300,10000,299,'price_fixture',true,'cs_starter_fixture');
 update public.harvest_purchases set starter_expires_at=now()+interval '71 hours' where id=p;
 set local role service_role;
 perform public.harvest_credit_purchase(p,'cs_starter_fixture','pi_starter_fixture','evt_starter_fixture',true);
 result:=public.harvest_credit_purchase(p,'cs_starter_fixture','pi_starter_fixture','evt_second_event_fixture',true);
 select state,revision into farm,rev from public.player_farms where player_id=u;
 if farm->>'coins'<>'10180' or farm->>'diamonds'<>'307' or farm->'inventory'->>'wheat'<>'5' or farm->'inventory'->>'feed'<>'2' or rev<>2 or not (result->>'duplicate')::boolean then raise exception 'Starter rewards or duplicate detection failed'; end if;
 foreach crop in array array['corn','cabbage','pumpkin','sunflower','barley','lettuce','redcabbage','cauliflower'] loop
  if farm->'inventory'->>crop is distinct from '1' then raise exception 'Missing crop %',crop; end if;
 end loop;
 if farm?'seedInventory' or farm->'plots' is distinct from '[{"id":0,"crop":"corn"}]'::jsonb then raise exception 'Starter changed planting or added a separate inventory'; end if;
 begin
  insert into public.harvest_purchases(id,player_id,pack,diamonds,coins,amount_cents,price_id,livemode) values(gen_random_uuid(),u,'starter',300,10000,299,'price_fixture',true);
 exception when unique_violation then blocked:=true; end;
 if not blocked then raise exception 'A second live Starter Pack was allowed'; end if;
 insert into public.harvest_purchases(id,player_id,pack,diamonds,coins,amount_cents,price_id,livemode,stripe_session_id) values(t,u,'starter',300,10000,299,'price_test_fixture',false,'cs_starter_test_fixture');
 update public.harvest_purchases set starter_expires_at=now()+interval '71 hours' where id=t;
 perform public.harvest_credit_purchase(t,'cs_starter_test_fixture','pi_starter_test_fixture','evt_starter_test_fixture',false);
 if (select state from public.player_farms where player_id=u) is distinct from farm then raise exception 'Test payment changed the live farm'; end if;
 insert into public.harvest_purchases(id,player_id,pack,diamonds,coins,amount_cents,price_id,livemode,stripe_session_id) values(late,old_u,'starter',300,10000,299,'price_fixture',true,'cs_starter_late_fixture');
 update public.harvest_purchases set starter_expires_at=now()-interval '24 hours' where id=late;
 blocked:=false;
 begin perform public.harvest_credit_purchase(late,'cs_starter_late_fixture','pi_starter_late_fixture','evt_starter_late_fixture',true);
 exception when raise_exception then if sqlerrm='Starter offer expired' then blocked:=true; else raise; end if; end;
 if not blocked then raise exception 'An expired starter offer was credited'; end if;
 if has_table_privilege('authenticated','public.harvest_purchases','INSERT') or has_function_privilege('authenticated','public.harvest_credit_purchase(uuid,text,text,text,boolean)','EXECUTE') then raise exception 'Client credit permission leaked'; end if;
end $$;
rollback;
