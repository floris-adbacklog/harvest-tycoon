-- A new member of the family shows in the family chat as a card of its own (29 Sep 2026), like a new rank
-- (family-rank-chat.sql): the member badge and "… is now a member." A farmer joins through harvest_family_commit as a new
-- family_members row, or as their row moving to this family or coming back after leaving; the founder of a new family starts as
-- leader and makes no card. A problem here never stops the join itself.
alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
alter table public.chat_messages add constraint chat_messages_kind_check check (kind in ('message','request','rank','top','join','kick','chest'));

create or replace function public.family_join_chat() returns trigger language plpgsql security definer set search_path to '' as $f$
declare nm text; av text; vip boolean;
begin
 if new.left_at is not null or new.role<>'member' then return new; end if;
 if tg_op='UPDATE' and old.family_id is not distinct from new.family_id and old.left_at is null then return new; end if;
 select ps.username, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, av, vip from public.player_stats ps where ps.player_id=new.player_id;
 insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_vip,body,kind,meta)
 values('family:'||new.family_id::text,new.player_id,coalesce(nm,'A farmer'),av,coalesce(vip,false),'Joined the family','join',jsonb_build_object('role',new.role));
 return new;
exception when others then return new;
end $f$;
revoke all on function public.family_join_chat() from public, anon, authenticated;
drop trigger if exists family_join_chat on public.family_members;
create trigger family_join_chat after insert or update on public.family_members for each row execute function public.family_join_chat();
