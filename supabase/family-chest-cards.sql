-- A Family Chest tier in the family chat (5 Oct 2026, the owner's choice): when the family opens the wooden, iron, silver or golden
-- chest of the week, its chat gets a card of its own, like a new top farmer (family-top-chat.sql): the chest's picture, "Your family
-- opened the Iron chest!" and who gets its rewards (src/chat-ui.js, chestRow). Re-runnable.
--  - The points: harvest_family_chest (family-chest.sql) adds them to family_chests after every farm action. That function stays as
--    it is; a trigger of its own on family_chests compares the points before and after. Its WHEN only lets a step that crosses a
--    tier through (a few comparisons, no function call), so an ordinary farm action costs nothing extra. The tiers are
--    FAMILY_CHEST_TIERS in game/farm-state.js (1,500 / 5,000 / 12,000 / 25,000; tests/family-chest-cards.test.mjs keeps them the same).
--  - One card per tier and week, never two: a family's updates of its chest row wait for each other (the row lock), so each crossing
--    is seen once, and a unique index on the card (family channel, week, tier) refuses a second one whatever happens. A step that
--    crosses two tiers at once gets one card, for the higher chest; a tier passed before gets none.
--  - A chat message needs a sender, so the card goes out in the name of the family's top farmer of the week (most chest points, a
--    tie to the lowest player ID, as family-top-chat.sql), else any member. The game shows it as the family's card, not as their
--    message, and a farmer who blocked that member still sees it. The text is for a game from before this card, which shows it as
--    a plain message.
--  - No push: the chat only pushes private messages, the Crew and mentions (chat_dm_push, chat_crew_push, chat_mention_push); a card
--    has no mentions. It counts as unread in the family chat, like the other cards.
--  - A problem with the card never stops the farm action or its chest points: the card's own exception block swallows it (without
--    it, harvest_family_chest's would, and the action's points would be lost with it).

-- 1. The kind. Keeps every kind the live check allows (another file may have added one since) and adds 'chest'.
do $do$
declare kinds text;
begin
 select string_agg(quote_literal(k),',' order by n) into kinds from (
  select k, min(n) as n from (
   select r.m[1] as k, r.n from pg_constraint c, regexp_matches(pg_get_constraintdef(c.oid),'''([a-z_]+)''','g') with ordinality as r(m,n)
    where c.conrelid='public.chat_messages'::regclass and c.conname='chat_messages_kind_check'
   union all
   select y.k, 100+y.n from unnest(array['message','request','rank','top','join','kick','chest']) with ordinality as y(k,n)) z
  group by k) w;
 alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
 execute format('alter table public.chat_messages add constraint chat_messages_kind_check check (kind in (%s))',kinds);
end $do$;

-- 2. The guard: one chest card per family, week and tier (only chest cards are in this index, a handful a week).
create unique index if not exists chat_messages_chest_once on public.chat_messages(channel,(meta->>'week'),(meta->>'tier')) where kind='chest';

-- 3. The card.
create or replace function public.family_chest_card() returns trigger language plpgsql security definer set search_path to '' as $f$
declare was bigint; tier text; chest text; who uuid; nm text; av text; vip boolean;
begin
 -- The highest tier this step crossed (FAMILY_CHEST_TIERS). Worked out in here, so the exception block below covers it too.
 was:=case when tg_op='UPDATE' then old.points else 0 end;
 tier:=case when was<25000 and new.points>=25000 then 'gold' when was<12000 and new.points>=12000 then 'silver'
  when was<5000 and new.points>=5000 then 'iron' when was<1500 and new.points>=1500 then 'wood' end;
 if tier is null then return null; end if;
 chest:=case tier when 'gold' then 'Golden chest' when 'silver' then 'Silver chest' when 'iron' then 'Iron chest' else 'Wooden chest' end;
 select m.player_id into who from public.family_members m
  left join public.family_chest_players cp on cp.family_id=m.family_id and cp.week=new.week and cp.player_id=m.player_id
  where m.family_id=new.family_id and m.left_at is null
  order by coalesce(cp.points,0) desc, m.player_id::text limit 1;
 if who is null then return null; end if;
 select ps.username, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, av, vip from public.player_stats ps where ps.player_id=who;
 insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_vip,body,kind,meta)
 values('family:'||new.family_id::text,who,coalesce(nm,'A farmer'),av,coalesce(vip,false),format('Our family opened the %s!',chest),'chest',
  jsonb_build_object('tier',tier,'week',new.week,'points',new.points))
 on conflict do nothing;
 return null;
exception when others then return null;
end $f$;
revoke all on function public.family_chest_card() from public, anon, authenticated;

-- 4. Two triggers, as a WHEN can only look at the old points on an update: a step that crosses a tier, and a week's first points
--    that already reach one.
drop trigger if exists family_chest_card on public.family_chests;
create trigger family_chest_card after update of points on public.family_chests for each row
 when ((old.points<1500 and new.points>=1500) or (old.points<5000 and new.points>=5000) or (old.points<12000 and new.points>=12000) or (old.points<25000 and new.points>=25000))
 execute function public.family_chest_card();
drop trigger if exists family_chest_card_first on public.family_chests;
create trigger family_chest_card_first after insert on public.family_chests for each row
 when (new.points>=1500)
 execute function public.family_chest_card();

-- Check (read-only), after running this file:
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.chat_messages'::regclass and conname='chat_messages_kind_check';
-- select tgname, pg_get_triggerdef(oid) from pg_trigger where tgrelid='public.family_chests'::regclass and not tgisinternal;
-- select channel, sender_name, body, meta, created_at from public.chat_messages where kind='chest' order by created_at desc limit 20;
