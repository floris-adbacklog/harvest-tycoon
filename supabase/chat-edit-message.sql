-- Chat: moderators and the admin can edit a message (25 Sep 2026), for example to take a phone number out and keep the rest. The
-- same rules as sending apply. Everyone sees the change at once (realtime already sends updates) with "edited", or "edited by a
-- moderator" when it was not the writer. Each edit keeps the text before and after in chat_message_edits, for the admin only; it goes
-- together with the message (chat messages are deleted after 30 days).
alter table public.chat_messages add column if not exists edited_at timestamptz;
alter table public.chat_messages add column if not exists edited_by_moderator boolean not null default false;
create table if not exists public.chat_message_edits(
 id bigint generated always as identity primary key,
 message_id uuid not null references public.chat_messages(id) on delete cascade,
 editor uuid not null references auth.users(id) on delete cascade,
 before text not null,
 after text not null,
 edited_at timestamptz not null default now()
);
alter table public.chat_message_edits enable row level security;
revoke all on public.chat_message_edits from anon, authenticated;

create or replace function public.chat_mod_edit(p_message uuid, p_body text) returns jsonb language plpgsql security definer set search_path to '' as $f$
declare me uuid:=(select auth.uid()); clean text; msg public.chat_messages;
begin
 if public.chat_staff_role(me) is null then raise exception 'Not authorized.' using errcode='42501'; end if;
 clean:=regexp_replace(btrim(coalesce(p_body,'')),'\s+',' ','g');
 if char_length(clean)<1 or char_length(clean)>200 then raise exception 'Write 1–200 characters.' using errcode='22023'; end if;
 if clean ~* '(https?://|www\.|\m[a-z0-9-]{2,}\.(com|net|org|nl|be|de|eu|io|gg|ly|me|app|xyz|ru|co|info|biz|tk|link|site|shop)\M)' then raise exception 'Links are not allowed in the chat.' using errcode='22023'; end if;
 if public.chat_is_rude(clean) then raise exception 'Please keep it friendly.' using errcode='22023'; end if;
 select * into msg from public.chat_messages where id=p_message for update;
 if not found then raise exception 'This message is gone.' using errcode='P0002'; end if;
 if msg.body=clean then return to_jsonb(msg); end if;
 insert into public.chat_message_edits(message_id,editor,before,after) values (msg.id,me,msg.body,clean);
 update public.chat_messages set body=clean, edited_at=now(), edited_by_moderator=(me<>msg.sender) where id=msg.id returning * into msg;
 return to_jsonb(msg);
end $f$;
revoke all on function public.chat_mod_edit(uuid,text) from public, anon;
grant execute on function public.chat_mod_edit(uuid,text) to authenticated;
