-- The admin can close Invite a friend for one farmer (18 Oct 2026, the owner: farmers cheat with Invite a friend, "gewoon mij de
-- mogelijkheid geven om te closen bij een speler ivm cheating"). closed_at is when (ms, like created_at); null is open. While it is
-- closed their link starts nothing (farm-api invite-service.js linkInvite, player-counts), Invite a friend says it is closed, and no
-- inviter reward reaches their farm (held back; paid on their next visit if the admin opens it again). The friend's own reward is not
-- touched. A farmer who never opened Invite a friend gets their code row when it is closed, so it stays closed. Safe to run again.
alter table public.player_invite_codes add column if not exists closed_at bigint;
