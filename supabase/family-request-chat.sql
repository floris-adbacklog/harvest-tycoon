-- A request for goods shows in the family chat as a card of its own (29 Sep 2026): who asks, for what, and a button to give it,
-- apart from the farmers' own messages. chat_messages gets a kind ('message' or 'request') and, for a request, its details
-- (meta: request, item, quantity; once given: fulfilled_by and fulfilled_name). A trigger writes the card when a request is
-- made and marks it given when a farmer fills it; the chat shows it live through Realtime (src/chat-ui.js). The card counts as
-- unread like any family message. A problem here never stops the request itself.
alter table public.chat_messages add column if not exists kind text not null default 'message';
alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
alter table public.chat_messages add constraint chat_messages_kind_check check (kind in ('message','request'));
alter table public.chat_messages add column if not exists meta jsonb;

create or replace function public.family_request_chat() returns trigger language plpgsql security definer set search_path to '' as $f$
declare nm text; av text; vip boolean;
begin
 select ps.username, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, av, vip from public.player_stats ps where ps.player_id=new.player_id;
 insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_vip,body,kind,meta)
 values('family:'||new.family_id::text,new.player_id,coalesce(nm,'A farmer'),av,coalesce(vip,false),
  left(format('Asks for %s %s',new.quantity,new.item),200),'request',
  jsonb_build_object('request',new.id,'item',new.item,'quantity',new.quantity));
 return new;
exception when others then return new;
end $f$;
revoke all on function public.family_request_chat() from public, anon, authenticated;
drop trigger if exists family_request_chat on public.family_social_requests;
create trigger family_request_chat after insert on public.family_social_requests for each row execute function public.family_request_chat();

create or replace function public.family_request_chat_given() returns trigger language plpgsql security definer set search_path to '' as $f$
declare nm text;
begin
 if new.fulfilled_by is not null and old.fulfilled_by is distinct from new.fulfilled_by then
  select ps.username into nm from public.player_stats ps where ps.player_id=new.fulfilled_by;
  update public.chat_messages set meta=coalesce(meta,'{}'::jsonb)||jsonb_build_object('fulfilled_by',new.fulfilled_by,'fulfilled_name',coalesce(nm,'A farmer'))
   where channel='family:'||new.family_id::text and kind='request' and meta->>'request'=new.id::text;
 end if;
 return new;
exception when others then return new;
end $f$;
revoke all on function public.family_request_chat_given() from public, anon, authenticated;
drop trigger if exists family_request_chat_given on public.family_social_requests;
create trigger family_request_chat_given after update of fulfilled_by on public.family_social_requests for each row execute function public.family_request_chat_given();
