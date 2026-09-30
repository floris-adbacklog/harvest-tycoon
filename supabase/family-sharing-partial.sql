-- Family requests filled together (30 Sep 2026): "Give what you have" gives as many as you have, up to what the request still
-- needs; the request fills up from several farmers (given of quantity, and who helped) and is fulfilled once it is full. Each gift
-- still counts as one of the giver's three a day. The receiver's own limit counts requests, not gifts: a farmer asks once a day
-- (the unique player_id, day), so several helpers on that one request never add up to more than was asked for.
-- Built on the live harvest_social read on 30 Sep 2026 (md5 a74f2430db7015e6a484f9e22bcfbbdd); every change fails loudly if its
-- line is not there. The chat card (family_request_chat_given) also shows how full the request is.
alter table public.family_social_requests add column if not exists given integer not null default 0;
alter table public.family_social_requests add column if not exists helpers uuid[] not null default '{}';
-- Requests filled before today's change: full, by the farmer who filled them.
update public.family_social_requests set given=quantity, helpers=array[fulfilled_by] where fulfilled_by is not null and given=0;

do $migration$
declare definition text; before text;
 edits text[][]:=array[
  -- A variable for what this gift gives (the table has its own "quantity" column, and the function prefers columns).
  [' help bigint;',' help bigint; gave integer;'],
  -- Only what the request still needs.
  ['recipient:=r.player_id;item:=r.item;quantity:=r.quantity;','recipient:=r.player_id;item:=r.item;quantity:=r.quantity-r.given;'],
  -- The receiver's limit: three requests helped a day, however many farmers help with each.
  ['or (select count(*) from public.family_social_actions where recipient=social.recipient and day=d and kind=social.kind)>=3 then',
   'or (kind<>''fulfill'' and (select count(*) from public.family_social_actions where recipient=social.recipient and day=d and kind=social.kind)>=3) or (kind=''fulfill'' and r.given=0 and (select count(*) from public.family_social_requests q where q.player_id=social.recipient and q.day=d and q.given>0)>=3) then'],
  -- Give what you have, up to what is still needed.
  [' else'||chr(10)||'  if coalesce((actor.state#>>array[''inventory'',item])::integer,0)<quantity then',
   ' else'||chr(10)||'  if kind=''fulfill'' then quantity:=least(quantity,coalesce((actor.state#>>array[''inventory'',item])::integer,0)); if quantity<1 then raise exception ''You have none of this to give yet.''; end if; end if;'||chr(10)||'  if coalesce((actor.state#>>array[''inventory'',item])::integer,0)<quantity then'],
  -- The request fills up; it is fulfilled (by the farmer who completes it) once it is full.
  ['if kind=''fulfill'' then update public.family_social_requests set fulfilled_by=p_player where id=r.id; end if;',
   'if kind=''fulfill'' then gave:=quantity; update public.family_social_requests set given=r.given+gave, helpers=case when p_player=any(r.helpers) then r.helpers else r.helpers||p_player end, fulfilled_by=case when r.given+gave>=r.quantity then p_player end where id=r.id; end if;'],
  -- What the giver hears: how full the request is now, or that it is complete.
  ['when ''gift'' then ''Your gift has arrived!'' else ''Request fulfilled. Your family thanks you!'' end,''kind'',kind,''item'',item,''quantity'',quantity);',
   'when ''gift'' then ''Your gift has arrived!'' when ''fulfill'' then case when r.given+quantity>=r.quantity then ''Request fulfilled. Your family thanks you!'' else format(''You gave %s. %s of %s are in.'',quantity,r.given+quantity,r.quantity) end else ''Request fulfilled. Your family thanks you!'' end,''kind'',kind,''item'',item,''quantity'',quantity,''given'',case when kind=''fulfill'' then r.given+quantity end,''needed'',case when kind=''fulfill'' then r.quantity end);']
 ];
 i int;
begin
 definition:=pg_get_functiondef('public.harvest_social(uuid,jsonb,uuid)'::regprocedure);
 if position('gave integer' in definition)>0 then raise notice 'harvest_social already fills requests together'; return; end if;
 for i in 1..array_length(edits,1) loop
  before:=definition;definition:=replace(definition,edits[i][1],edits[i][2]);
  if definition=before then raise exception 'harvest_social: change % did not find its line', i; end if;
 end loop;
 execute definition;
end
$migration$;

-- The request card in the family chat: how full it is (given of quantity) as it fills, and who completed it.
create or replace function public.family_request_chat_given() returns trigger language plpgsql security definer set search_path to '' as $f$
declare nm text;
begin
 if new.given is distinct from old.given or new.fulfilled_by is distinct from old.fulfilled_by then
  if new.fulfilled_by is not null then select ps.username into nm from public.player_stats ps where ps.player_id=new.fulfilled_by; end if;
  update public.chat_messages set meta=coalesce(meta,'{}'::jsonb)||jsonb_build_object('given',new.given,'helpers',cardinality(new.helpers))
    ||case when new.fulfilled_by is not null then jsonb_build_object('fulfilled_by',new.fulfilled_by,'fulfilled_name',coalesce(nm,'A farmer')) else '{}'::jsonb end
   where channel='family:'||new.family_id::text and kind='request' and meta->>'request'=new.id::text;
 end if;
 return new;
exception when others then return new;
end $f$;
drop trigger if exists family_request_chat_given on public.family_social_requests;
create trigger family_request_chat_given after update of fulfilled_by, given on public.family_social_requests for each row execute function public.family_request_chat_given();
