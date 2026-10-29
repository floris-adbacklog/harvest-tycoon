-- The family badge beside a name in the chat (29 Oct 2026, the owner: "Toon naast chat family badge als je erop klikt open family
-- profile"): for the senders on screen, the family each one is in now, with its name and emblem (src/chat-client.js families). The game
-- reads no family table itself (families and family_members are closed to it), so this function answers only that: a farmer's current
-- family, never who else is in it or anything private (invite code, join rules). At most 100 farmers a call; signed-in players only.
-- New, nothing replaced: run it any time. Before it runs the chat simply shows no badge.
create or replace function public.chat_families(p_players uuid[])
 returns table(player_id uuid, family_id uuid, name text, emblem text)
 language sql stable security definer set search_path to ''
as $function$
 select m.player_id, f.id, f.name, f.emblem
 from public.family_members m
 join public.families f on f.id = m.family_id
 where m.player_id = any(coalesce(p_players[1:100], '{}'::uuid[]))
   and m.left_at is null
   and f.deleted_at is null
$function$;
revoke all on function public.chat_families(uuid[]) from public, anon;
grant execute on function public.chat_families(uuid[]) to authenticated;
