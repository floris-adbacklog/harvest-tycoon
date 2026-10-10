-- Discord link (10 Oct 2026, the owner's "doe 2"): a player of the Discord Activity can play their harvesttycoon.com farm there.
-- Discord's Developer Policy forbids asking for a password inside the Activity, so the player signs in on harvesttycoon.com and says
-- yes there; a link ticket carries that yes back to the Activity (supabase/functions/discord-auth, ops discord, create, relink, peek,
-- begin, cancel, confirm, claim, status and unlink). A website farm played in Discord stays a website farm: its account is never
-- changed, only discord_accounts (supabase/discord.sql) gets a row naming it.
-- Release: paste this as it is in the SQL editor, then deploy the site, then the discord-auth that knows these ops (the old Activity
-- page cannot show the choice a new discord-auth asks for). Re-runnable: the table and its indexes are made if missing, and the
-- clean-up job is scheduled again; nothing else changes.

-- One ticket per "Play your farm here" question, for one Discord user. Only discord-auth (service_role) reads and writes it.
-- ticket_hash: the SHA-256 (hex) of the ticket; the ticket itself (32 random bytes) only ever travels to the Activity and in the link
-- to harvesttycoon.com, never stored. A ticket works 10 minutes (expires_at) and once (used_at).
-- key_hash: the SHA-256 (hex) of the ticket's key, 32 more random bytes that only the Activity has (never in an address): a new farm
-- or a sign-in needs ticket and key, so a ticket read from an address or a log opens nothing.
-- display_name: the player's own Discord username (unique on Discord, unlike the display name anyone can choose), only to show them on
-- the website's "Play this farm on Discord?" (Discord's Developer Terms: never shown to other players); emptied once the website said
-- yes or the ticket is done.
-- relink_from: the Discord-only farm this ticket replaces (op relink). On delete set null, not cascade: discord-auth deletes that farm
-- when the website says yes, and the ticket must outlive it for the Activity's claim; a ticket never keeps a deleted player's id.
-- linked_player: the website farm the player said yes for; its deletion takes the ticket with it.
-- state_hash, state_player, state_at: Link on the website (op begin), for Discord's answer to it (op confirm). state_hash is the
-- SHA-256 (hex) of a random state (32 bytes), which itself only travels in Discord's address and back, never stored; state_player the
-- website account that tapped Link, the only one whose confirm counts, in any tab or browser (on a phone Discord's app often opens
-- its answer in a new one); state_at when, for its 10 minutes. A new Link replaces them, a confirm empties them (a state links once):
-- all three or none. state_player on delete cascade: that account's deletion takes the ticket with it.
-- So harvest_delete_account (supabase/delete-account.sql) needs no line for this table: no row keeps a player id after a deletion.
create table if not exists public.discord_link_tickets (
 ticket_hash text primary key check (ticket_hash ~ '^[0-9a-f]{64}$'),
 discord_user_id text not null check (discord_user_id ~ '^[0-9]{17,20}$'),
 display_name text check (display_name is null or char_length(display_name) between 1 and 32),
 key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
 relink_from uuid references auth.users(id) on delete set null,
 linked_player uuid references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 used_at timestamptz,
 state_hash text unique check (state_hash ~ '^[0-9a-f]{64}$'),
 state_player uuid references auth.users(id) on delete cascade,
 state_at timestamptz,
 check ((state_hash is null)=(state_player is null) and (state_hash is null)=(state_at is null))
);
-- The open tickets of one Discord user (at most 10 at a time), the clean-up, and the three player columns (a deleted account finds its
-- tickets without reading the whole table). state_hash has its own index (unique).
create index if not exists discord_link_tickets_user on public.discord_link_tickets(discord_user_id, expires_at);
create index if not exists discord_link_tickets_expires on public.discord_link_tickets(expires_at);
create index if not exists discord_link_tickets_relink_from on public.discord_link_tickets(relink_from) where relink_from is not null;
create index if not exists discord_link_tickets_linked_player on public.discord_link_tickets(linked_player) where linked_player is not null;
create index if not exists discord_link_tickets_state_player on public.discord_link_tickets(state_player) where state_player is not null;
alter table public.discord_link_tickets enable row level security;
revoke all on public.discord_link_tickets from anon, authenticated;

-- Every 15 minutes, also when nobody starts the Activity: the Discord name and a Link's state (with the website account that tapped
-- it) go from tickets that are done, and tickets a day past their time go altogether (discord-auth does the same when it makes one).
select cron.unschedule('harvest-discord-link-tickets') where exists(select 1 from cron.job where jobname='harvest-discord-link-tickets');
select cron.schedule('harvest-discord-link-tickets','*/15 * * * *',$c$update public.discord_link_tickets set display_name=null where display_name is not null and (used_at is not null or linked_player is not null or expires_at<now()); update public.discord_link_tickets set state_hash=null, state_player=null, state_at=null where state_hash is not null and (used_at is not null or linked_player is not null or expires_at<now()); delete from public.discord_link_tickets where expires_at<now()-interval '1 day'$c$);
