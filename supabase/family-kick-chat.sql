-- A farmer removed from the family shows in the family chat as a card (29 Sep 2026). In family_members a removal looks the same
-- as leaving, so farm-api writes the card itself right after a successful removal (family-service.js); this only allows the kind.
alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
alter table public.chat_messages add constraint chat_messages_kind_check check (kind in ('message','request','rank','top','join','kick'));
