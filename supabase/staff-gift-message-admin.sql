-- Only the admin writes a message with a gift (1 Oct 2026): a moderator can still send coins and diamonds, without words of their
-- own, so no farmer gets a text from the staff the admin did not write. As live on 1 Oct 2026 (md5 86551f7fb080cad79b37a052a3a23c89,
-- staff-gift-per-level.sql), with one check more; the same arguments, so the grants stay as they are.
create or replace function public.staff_donate(p_coins integer, p_diamonds integer, p_message text, p_audience text default 'all', p_player uuid default null, p_per_level boolean default false)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); msg text:=nullif(regexp_replace(btrim(coalesce(p_message,'')),'\s+',' ','g'),''); c int; l int; d int; n int; parts text[];
 who text:=coalesce(p_audience,'all'); farmers uuid[]; note text; per boolean:=coalesce(p_per_level,false);
begin
 if public.chat_staff_role(me) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 if msg is not null and public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Only the admin can add a message to a gift.' using errcode='42501'; end if;
 if p_coins is null or p_diamonds is null or p_coins<0 or p_diamonds<0 or (p_coins=0 and p_diamonds=0) then raise exception 'Give some coins or diamonds.' using errcode='22023'; end if;
 if char_length(coalesce(msg,''))>120 then raise exception 'Keep the message under 120 characters.' using errcode='22023'; end if;
 if msg is not null and (public.chat_is_rude(msg) or msg ~* '(https?://|www\.)') then raise exception 'Please keep the message friendly, without links.' using errcode='22023'; end if;
 if who not in ('all','active','online','player') then raise exception 'Choose who gets the gift.' using errcode='22023'; end if;
 farmers:=case who
  when 'active' then array(select s.player_id from public.player_stats s where s.last_active_at>now()-interval '7 days')
  when 'online' then array(select s.player_id from public.player_stats s where s.last_active_at>now()-interval '30 minutes')
  when 'player' then array(select s.player_id from public.player_stats s where s.player_id=p_player)
  end;
 if who='player' and coalesce(array_length(farmers,1),0)=0 then raise exception 'Choose the farmer who gets the gift.' using errcode='22023'; end if;
 if who<>'all' and coalesce(array_length(farmers,1),0)=0 then raise exception 'Nobody to give it to right now.' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-donate',0));
 select coalesce(sum(x.coins) filter (where not x.per_level),0),coalesce(sum(x.coins) filter (where x.per_level),0),coalesce(sum(x.diamonds),0),count(*) into c,l,d,n
  from public.staff_donations x where (x.created_at at time zone 'UTC')::date=(now() at time zone 'UTC')::date;
 if n>=5 then raise exception 'Today''s 5 gifts have been sent. Try again tomorrow.' using errcode='54000'; end if;
 if d+p_diamonds>50 then raise exception 'Today there is room for % more diamonds.', 50-d using errcode='22023'; end if;
 if per and l+p_coins>50 then raise exception 'Today there is room for % more coins per level.', 50-l using errcode='22023'; end if;
 if not per and c+p_coins>1000 then raise exception 'Today there is room for % more coins.', 1000-c using errcode='22023'; end if;
 insert into public.staff_donations(coins,diamonds,message,by_player,audience,recipients,per_level) values(p_coins,p_diamonds,msg,me,who,farmers,per);
 parts:=array_remove(array[case when p_diamonds>0 then p_diamonds::text||' diamonds' end, case when p_coins>0 then p_coins::text||case when per then ' coins for every level' else ' coins' end end],null);
 note:='Donation: you received '||array_to_string(parts,' + ')||'.'||coalesce(' “'||msg||'”','');
 if who='all' then insert into public.player_notices(player_id,kind,body) values(null,'donation',note);
 else insert into public.player_notices(player_id,kind,body) select f,'donation',note from unnest(farmers) f; end if;
 return jsonb_build_object('coins',1000-c-case when per then 0 else p_coins end,'perLevel',50-l-case when per then p_coins else 0 end,'diamonds',50-d-p_diamonds,'gifts',4-n,
  'audience',who,'farmers',case when who='all' then null else array_length(farmers,1) end);
end $function$;
