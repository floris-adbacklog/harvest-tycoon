-- A new rank in the family shows in the family chat as a card of its own (29 Sep 2026), like a request for goods
-- (family-request-chat.sql): the rank's badge, who it is and whether it was a promotion or a demotion. Every rank change goes
-- through harvest_family_commit as an update of the farmer's family_members row, so one trigger catches them all: a farmer made
-- co-leader, honorary or member, the leadership handed over, and the longest-standing member taking over from a leader who left.
-- Joining another family or leaving is not a rank change and makes no card. A problem here never stops the change itself.
alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
alter table public.chat_messages add constraint chat_messages_kind_check check (kind in ('message','request','rank','top','join'));

create or replace function public.family_rank_chat() returns trigger language plpgsql security definer set search_path to '' as $f$
declare nm text; av text; vip boolean;
begin
 select ps.username, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, av, vip from public.player_stats ps where ps.player_id=new.player_id;
 insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_vip,body,kind,meta)
 values('family:'||new.family_id::text,new.player_id,coalesce(nm,'A farmer'),av,coalesce(vip,false),
  left(format('Is now %s',new.role),200),'rank',jsonb_build_object('from',old.role,'to',new.role));
 return new;
exception when others then return new;
end $f$;
revoke all on function public.family_rank_chat() from public, anon, authenticated;
drop trigger if exists family_rank_chat on public.family_members;
create trigger family_rank_chat after update of role on public.family_members for each row
 when (old.role is distinct from new.role and old.family_id=new.family_id and old.left_at is null and new.left_at is null)
 execute function public.family_rank_chat();
