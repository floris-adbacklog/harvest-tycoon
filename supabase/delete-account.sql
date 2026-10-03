-- Delete account in the game (3 Oct 2026): Settings › Privacy › Delete account, on the website and in the Android and iPhone apps (the
-- App Store asks for it inside the app). farm-api (account-delete-service.js) checks the farmer name typed in the game against the
-- account's own, refuses the admin accounts, then calls harvest_delete_account below for the signed-in farmer only and deletes the
-- Supabase Auth user after it (admin.auth.admin.deleteUser). At once, no grace period.
-- What goes and what stays follows the audit of the LIVE schema (read 3 Oct 2026): the farmer's own rows are deleted (farm, stats,
-- where and how they play, chat and private messages from both sides, reports they made, blocks, push, notices, popups seen, logs,
-- family membership, invites, partner links); rows other farmers need stay but lose the link (a family request they helped with, a
-- chat card that named them, a report about them, a staff gift's list of farmers). A family leader's place goes to the longest-standing
-- co-leader, else the longest-standing member, the game's own rule when a leader leaves (farm-state.js familyMutate, family_leave); a
-- family whose last member this was ends. Purchases (and partner payouts) are kept for the bookkeeping (Dutch law, 7 years), unlinked
-- from the account: player_id null, account_deleted_at set, a checkout still open expired; test purchases (no money) are deleted. The
-- table holds no email address. Re-runnable: run the whole file in the SQL editor; a second run changes nothing.

-- 1. Purchases kept without the account. player_id may be null (a deleted account); the foreign key stays RESTRICT, so deleting a user
-- any other way (the dashboard) still stops at their purchases instead of losing the link quietly. partner_id keeps the commission of
-- a deleted referred farmer with its partner (partner_stats below).
alter table public.harvest_purchases alter column player_id drop not null;
alter table public.harvest_purchases add column if not exists account_deleted_at timestamptz;
alter table public.harvest_purchases add column if not exists partner_id uuid references public.partners(user_id) on delete set null;

-- 2. Partner payouts are payment records too: a partner who deletes their account leaves them, without the link.
alter table public.partner_payouts alter column partner_id drop not null;
do $do$
begin
 if exists(select 1 from pg_constraint where conname='partner_payouts_partner_id_fkey' and conrelid='public.partner_payouts'::regclass and confdeltype<>'n') then
  alter table public.partner_payouts drop constraint partner_payouts_partner_id_fkey;
 end if;
 if not exists(select 1 from pg_constraint where conname='partner_payouts_partner_id_fkey' and conrelid='public.partner_payouts'::regclass) then
  alter table public.partner_payouts add constraint partner_payouts_partner_id_fkey foreign key (partner_id) references public.partners(user_id) on delete set null;
 end if;
end $do$;

-- 3. partner_stats: a referred farmer who deleted their account still counts for what the partner earned (their purchases carry
-- partner_id now), so the amount earned never drops below what was paid out. Patched from the LIVE definition (read on 3 Oct 2026),
-- only the paid list: a function patched already is left alone, one without the expected line stops the file.
do $do$
declare def text:=pg_get_functiondef('public.partner_stats(uuid)'::regprocedure);
begin
 if position('h.partner_id=p_partner' in def)>0 then return; end if;
 if position($a$and h.livemode and h.player_id<>p_partner),$a$ in def)=0 then raise exception 'partner_stats: the expected text was not found; read the live definition before changing it'; end if;
 execute replace(def,$a$and h.livemode and h.player_id<>p_partner),$a$,$b$and h.livemode and h.player_id<>p_partner
          union all select null, h.amount_cents from public.harvest_purchases h where h.player_id is null and h.partner_id=p_partner and h.status='credited' and h.livemode),$b$);
end $do$;
revoke all on function public.partner_stats(uuid) from public, anon, authenticated;

-- 4. The deletion, in one transaction. Returns how many rows each step touched (farm-api logs nothing personal from it; app_push says
-- whether OneSignal holds this farmer). Safe to run again for the same farmer: a retry after a failed deleteUser finds nothing left.
create or replace function public.harvest_delete_account(p_player uuid, p_name text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare
 v_name text; v_member public.family_members; v_heir uuid; n bigint; c jsonb:='{}'::jsonb;
 v_now bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
 v_dm_from text; v_dm_to text; v_zero text:='00000000-0000-0000-0000-000000000000';
begin
 if p_player is null then raise exception 'harvest_delete_account: no player'; end if;
 perform pg_advisory_xact_lock(hashtextextended('delete-account:'||p_player::text,0));
 -- Guards, also in farm-api (account-delete-service.js): never an admin account, and only with the farmer name typed exactly. A farmer
 -- whose stats are gone already (a retry) has no name left to type.
 if public.chat_staff_role(p_player)='admin' then raise exception 'This is an admin account and cannot be deleted here.'; end if;
 select s.username into v_name from public.player_stats s where s.player_id=p_player;
 if found and v_name is distinct from btrim(coalesce(p_name,'')) then raise exception 'Type your farmer name exactly to delete your account.'; end if;
 -- Money still owed to a partner needs a person to pay it to.
 if exists(select 1 from public.partner_payouts o where o.partner_id=p_player and o.status='requested') then
  raise exception 'Your partner payout is still open. Please contact support before you delete your account.';
 end if;
 v_dm_from:='dm:'||p_player::text||':%';v_dm_to:='dm:%:'||p_player::text;

 -- Family. The family lock first, as harvest_family_commit takes it, so a family action running now retries on the new revision.
 update public.family_revision set revision=revision+1 where id;
 select m.* into v_member from public.family_members m where m.player_id=p_player and m.family_id is not null and m.left_at is null;
 if found then
  if v_member.role='leader' then
   select m.id into v_heir from public.family_members m where m.family_id=v_member.family_id and m.left_at is null and m.player_id<>p_player
    order by (m.role='coleader') desc, m.joined_at, m.id::text limit 1;
   -- family_rank_chat posts the "Is now leader" card, as when a leader leaves.
   if v_heir is not null then update public.family_members set role='leader' where id=v_heir; c:=c||jsonb_build_object('family_new_leader',1); end if;
  end if;
  if not exists(select 1 from public.family_members m where m.family_id=v_member.family_id and m.left_at is null and m.player_id<>p_player) then
   update public.families set deleted_at=v_now where id=v_member.family_id and deleted_at is null;
   get diagnostics n=row_count;c:=c||jsonb_build_object('family_ended',n);
  end if;
 end if;
 delete from public.family_members where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('family_members',n);
 delete from public.family_invitations where recipient_id=p_player or invited_by=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('family_invitations',n);
 delete from public.family_requests where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('family_requests',n);
 update public.family_requests set resolved_by=null where resolved_by=p_player;
 delete from public.family_claims where player_id=p_player or reward_id in (select r.id from public.family_rewards r where r.player_id=p_player);get diagnostics n=row_count;c:=c||jsonb_build_object('family_claims',n);
 delete from public.family_rewards where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('family_rewards',n);
 delete from public.family_attempts where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('family_attempts',n);
 delete from public.family_receipts where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('family_receipts',n);
 -- Every week: a contribution left behind would make a finished order reward a farmer who is gone (and fail for the whole family).
 delete from public.family_contributions where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('family_contributions',n);
 delete from public.family_chest_players where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('family_chest_players',n);
 delete from public.family_top_state where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('family_top_state',n);
 delete from public.family_social_actions where sender=p_player or recipient=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('family_social_actions',n);
 delete from public.family_social_requests where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('family_social_requests',n);
 -- Other farmers' requests they helped with stay, without them (family_request_chat_given updates the request's chat card).
 update public.family_social_requests set fulfilled_by=nullif(fulfilled_by,p_player),helpers=array_remove(helpers,p_player),amounts=amounts-p_player::text
  where fulfilled_by=p_player or p_player=any(helpers) or amounts ? p_player::text;
 get diagnostics n=row_count;c:=c||jsonb_build_object('family_social_requests_unlinked',n);

 -- Events.
 delete from public.live_event_players where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('live_event_players',n);
 update public.live_events set created_by=null where created_by=p_player;

 -- Chat. Other farmers' messages keep their text but lose the structured link: a mention, who filled a request, who removed a member.
 update public.chat_messages set meta=jsonb_set(meta,'{mentions}',coalesce((select jsonb_agg(e) from jsonb_array_elements(meta->'mentions') e where e->>'id' is distinct from p_player::text),'[]'::jsonb))
  where sender<>p_player and jsonb_typeof(meta->'mentions')='array' and meta->'mentions' @> jsonb_build_array(jsonb_build_object('id',p_player::text));
 get diagnostics n=row_count;c:=c||jsonb_build_object('chat_mentions_unlinked',n);
 update public.chat_messages set meta=(meta-'fulfilled_by')||jsonb_build_object('fulfilled_name','A farmer') where sender<>p_player and meta->>'fulfilled_by'=p_player::text;
 get diagnostics n=row_count;c:=c||jsonb_build_object('chat_requests_unlinked',n);
 update public.chat_messages set meta=(meta-'by_id')||jsonb_build_object('by','A farmer') where sender<>p_player and meta->>'by_id'=p_player::text;
 get diagnostics n=row_count;c:=c||jsonb_build_object('chat_kicks_unlinked',n);
 -- Their own messages everywhere, and their private chats from both sides (the edits go with them).
 delete from public.chat_messages where sender=p_player or channel like v_dm_from or channel like v_dm_to;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_messages',n);
 delete from public.chat_message_edits where editor=p_player;
 delete from public.chat_reads where player_id=p_player or channel like v_dm_from or channel like v_dm_to;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_reads',n);
 delete from public.chat_push_state where player_id=p_player or channel like v_dm_from or channel like v_dm_to;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_push_state',n);
 -- Reports they made go; a report about them keeps the moderation action, not who or what.
 delete from public.chat_reports where reporter=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_reports',n);
 update public.chat_reports set sender=null,sender_name=null,body='(deleted)' where sender=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_reports_anonymised',n);
 update public.chat_reports set resolved_by=null where resolved_by=p_player;
 update public.chat_reports set channel=replace(channel,p_player::text,v_zero) where strpos(channel,p_player::text)>0;
 delete from public.chat_blocks where player_id=p_player or blocked_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_blocks',n);
 delete from public.chat_sanctions where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_sanctions',n);
 update public.chat_sanctions set by_player=null where by_player=p_player;
 delete from public.chat_settings where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_settings',n);

 -- Notices, push and pop-ups.
 delete from public.player_notices where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('player_notices',n);
 delete from public.push_subscriptions where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('push_subscriptions',n);
 delete from public.app_push_players where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('app_push',n);
 delete from public.notification_settings where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('notification_settings',n);
 delete from public.notification_state where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('notification_state',n);
 delete from public.popup_seen where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('popup_seen',n);
 delete from public.welcome_dm_sent where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('welcome_dm_sent',n);
 update public.welcome_dm_config set sender=null where sender=p_player;
 update public.popups set created_by=null where created_by=p_player;

 -- Staff: a moderator's role goes; what the staff did for others stays without them.
 delete from public.staff_roles where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('staff_roles',n);
 update public.staff_roles set granted_by=null where granted_by=p_player;
 update public.staff_donations set by_player=null where by_player=p_player;
 update public.staff_donations set recipients=array_remove(recipients,p_player) where p_player=any(recipients);get diagnostics n=row_count;c:=c||jsonb_build_object('staff_donations_unlinked',n);
 delete from public.admin_grants where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('admin_grants',n);
 update public.harvest_offers set created_by=null where created_by=p_player;
 delete from public.feedback_reports where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('feedback_reports',n);
 update public.feedback_reports set handled_by=null where handled_by=p_player;

 -- Invite a friend: a friend they invited keeps the farm, and its "invited by" says "A friend" (it held their name).
 update public.player_farms set state=jsonb_set(state,'{invite,by}','"A friend"'::jsonb)
  where player_id in (select r.invitee_id from public.referrals r where r.referrer_id=p_player) and jsonb_typeof(state->'invite')='object' and state->'invite' ? 'by';
 get diagnostics n=row_count;c:=c||jsonb_build_object('invitees_unlinked',n);
 delete from public.referrals where invitee_id=p_player or referrer_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('referrals',n);
 delete from public.player_invite_codes where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('player_invite_codes',n);

 -- Partners: a referred farmer's purchases stay their partner's; a partner's payouts stay, without the partner.
 update public.harvest_purchases h set partner_id=r.partner_id from public.partner_referrals r where r.player_id=p_player and h.player_id=p_player and h.partner_id is null;
 delete from public.partner_referrals where player_id=p_player or partner_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('partner_referrals',n);
 update public.partner_payouts set partner_id=null where partner_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('partner_payouts_kept',n);
 update public.harvest_purchases set partner_id=null where partner_id=p_player;
 delete from public.partners where user_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('partners',n);

 -- Purchases: kept for the bookkeeping, without the account (pending to expired: the purchase triggers only fire on pending to paid).
 delete from public.harvest_purchases where player_id=p_player and not livemode;get diagnostics n=row_count;c:=c||jsonb_build_object('test_purchases',n);
 update public.harvest_purchases set player_id=null,account_deleted_at=now(),status=case when status='pending' then 'expired' else status end where player_id=p_player;
 get diagnostics n=row_count;c:=c||jsonb_build_object('purchases_kept',n);

 -- Logs and how they play.
 delete from public.player_logs where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('player_logs',n);
 update public.player_logs set by_player=null where by_player=p_player;
 delete from public.player_seen where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('player_seen',n);
 delete from public.player_attribution where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('player_attribution',n);
 delete from public.email_checks where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('email_checks',n);
 delete from public.crazygames_accounts where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('crazygames_accounts',n);
 delete from public.account_move_backup where strpos("row"::text,p_player::text)>0;get diagnostics n=row_count;c:=c||jsonb_build_object('account_move_backup',n);

 -- The farm, and the stats last (this frees the farmer name).
 delete from public.player_farms where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('player_farms',n);
 delete from public.player_stats where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('player_stats',n);
 return c;
end $f$;
revoke all on function public.harvest_delete_account(uuid,text) from public, anon, authenticated;
grant execute on function public.harvest_delete_account(uuid,text) to service_role;
