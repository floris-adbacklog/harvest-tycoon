-- More room in one chat message (26 Oct 2026, owner): up to 5 farmers tagged ("tot 5"; was 3, supabase/chat-mentions.sql) and up to
-- 300 characters ("iets meer tekens"; was 200, supabase/chat.sql). Every other rule stays as it is.
-- Mentions: only the count in the trigger that checks a message's mentions changes; still the name of now in the words, family members
-- only in Family, never yourself, the same farmer twice counts once (distinct), 10 different farmers an hour, a push per 3 minutes per
-- chat, blocks. chat_send(text,text,uuid[]) already hands on up to 20 ids, so it stays as it is.
-- Length: chat_send(text,text) (every chat) and chat_mod_edit (the staff's edit) check 1-200; the table allows 500 since
-- chat-broadcast-dm.sql, so only these two change. Five names of 20 characters take about 110 of them.
-- Each function is patched from its LIVE definition (read 26 Oct 2026: chat_mentions_tag md5 9659aebcf56f39cf4316c0b104d6729c,
-- chat_send(text,text) 6d15c44f359dbc839669ffdf7b9e6aae, chat_mod_edit b828f10a63d45f888d3dd015cd4990d9): one done already is left
-- alone, one without the expected text stops the whole file with an error, nothing half-done. Re-runnable. Run it before the site
-- goes out: a game that allows 5 and 300 meeting the old 3 and 200 refuses the extra with the old text.
create or replace function pg_temp.chat_more_room(p_fn regprocedure, p_old text, p_new text) returns void language plpgsql as $f$
declare def text:=pg_get_functiondef(p_fn);
begin
 if position(p_new in def)>0 then return; end if;
 if position(p_old in def)=0 then raise exception using message=format('%s: the expected text was not found; read the live definition before changing it', p_fn); end if;
 execute replace(def,p_old,p_new);
end $f$;

begin;
select pg_temp.chat_more_room('public.chat_mentions_tag()',
 $o$if cardinality(ids)>3 then raise exception 'Mention up to 3 farmers in one message.' using errcode='22023'; end if;$o$,
 $n$if cardinality(ids)>5 then raise exception 'Mention up to 5 farmers in one message.' using errcode='22023'; end if;$n$);
select pg_temp.chat_more_room('public.chat_send(text,text)',
 $o$if char_length(body)<1 or char_length(body)>200 then raise exception 'Write 1–200 characters.' using errcode='22023'; end if;$o$,
 $n$if char_length(body)<1 or char_length(body)>300 then raise exception 'Write 1–300 characters.' using errcode='22023'; end if;$n$);
select pg_temp.chat_more_room('public.chat_mod_edit(uuid,text)',
 $o$if char_length(clean)<1 or char_length(clean)>200 then raise exception 'Write 1–200 characters.' using errcode='22023'; end if;$o$,
 $n$if char_length(clean)<1 or char_length(clean)>300 then raise exception 'Write 1–300 characters.' using errcode='22023'; end if;$n$);
commit;
