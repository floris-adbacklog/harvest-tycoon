# Family invitations by player name — full release v6

Built on the complete Player Profiles v5 release. Profiles, top-ten leaderboards, trophies, family emblems, order rewards, gameplay and payments remain included.

## Player experience

- The family management screen replaces **Invite a friend / invite code** with **Invite a farmer**, a player-name search field and an Invite button for each eligible result.
- Only the family leader can send or cancel invitations. Pending outgoing invitations are listed below the search field.
- A recipient sees their invitation at the top of the Family Hall, including the family name, emblem, inviter and expiry, with **Accept invitation** and **Decline** buttons.
- Each player can have only **one pending invitation across all families**. A new invitation cannot overwrite an existing one.
- Invitations survive logout, expire after seven days, and can be declined without starting a join cooldown. Joining/creating a different family or dissolving the inviting family cancels a pending invitation.
- Existing entry rules apply: level 10, one family per player, the 48-hour rejoin cooldown, and at most six family members. These are checked again when an invitation is accepted. An invitation does not reserve a place.
- The Family Hall notification dot also highlights a pending invitation. Family data refreshes every 30 seconds while the game is visible.
- Open families can still be joined directly. Legacy invite codes no longer grant access and are no longer returned to the browser.

## Server deployment

Supabase project `jnmdirvidffzxukbdmij` is updated:

- Applied migration `family_player_name_invitations` (reviewable source: `supabase/family-invitations.sql`).
- `farm-api` version **37**, ACTIVE, JWT verification enabled.
- The service resolves the selected account by stable player ID; typed or forged display names never determine the recipient.
- A partial unique index enforces one pending invitation per recipient. Invitation changes, membership changes and action receipts share the existing atomic, revision-checked family transaction.
- Invitation data is service-only with RLS enabled and browser-role access revoked. Incoming invitations are exposed only to their recipient; outgoing invitations only to the current leader of that family.
- The protected `harvest_commit_farm` definition is unchanged: MD5 `3aee1c7fbd773babbe9017a3f543ba16`.
- For a fresh installation, apply `farm-family.sql` first and `family-invitations.sql` afterwards. For this existing project, SQL is already applied; do not rerun older family/leaderboard SQL over the live functions.

## Validation

- **261 automated tests passed**; static production build passed.
- New tests cover invitation eligibility, uniqueness, ownership, expiry, acceptance, decline, cancellation, legacy-code rejection, rate limits, stale search responses, tab changes and server-side target resolution.
- A rollback-only test ran against Supabase and passed: sending, competing revision rejection, the unique pending index, atomic acceptance, replay rejection, decline, reinvitation, RLS/ACL and the protected farm commit. No test users, test families or test invitations were retained. The generator is `scripts/test-family-invitations-sql.mjs`.
- Security Advisor reports the expected informational [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) notices for service-only tables. Browser access is deliberately revoked. Its existing [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) warning is unrelated to these changes; Auth settings were not modified.
- Browser/device visual verification and an authenticated live-player walkthrough were not available in this environment.

## Publish

The Supabase changes are already live. Publish this frontend through the existing GitHub/Vercel workflow, or deploy the included `dist-static/`, to show the new invitation screen to players.
