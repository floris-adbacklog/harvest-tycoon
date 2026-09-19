# Farm Family update

Built from the attached latest repository (`f022c661-8c63-4c21-8758-ce0a6daeb474.zip`), preserving its newer Claude changes.

## Release status

- Supabase project: `jnmdirvidffzxukbdmij`.
- Migration `farm_family_cooperative_orders` applied successfully.
- `farm-api` deployed as **version 32**, status **ACTIVE**, JWT verification enabled.
- `harvest_commit_farm` was not replaced. Its definition hash stayed `3aee1c7fbd773babbe9017a3f543ba16` before and after deployment/testing.
- The frontend is supplied in this ZIP. Copy the repository contents into the existing GitHub project and deploy using its existing Vercel configuration (`npm run build:static`). No further SQL/server deployment is needed for this release.
- The ZIP also contains a matching `dist-static/` build. Never upload `node_modules` or local secrets.

## What players get

Farm Family and its Hall unlock at the shared level constant. Create an invite-only family, join by code or discover open families. A family can start solo and grow to six members. Share a weekly order, contribute extra tournament goods, collect personal reward entitlements, manage membership and see live/past tournament standings. All UI is English.

The Hall uses `house_008.glb` at (-9.3, -20.5), with `tower_008`, a signpost, table, garden bed and firewood nearby. Props are static and excluded from raycast target lists. The entire Hall has the existing padded building hitbox and a label button. Actual GLB bounds were checked against the neighbouring buildings and tower.

Four new generated transparent PNG icons are used for This week, Members, Tournament and Family management. They are also used in the page headers and Family topbar button; see `FARM-FAMILY-ARTWORK.md`.

## Rules and configurable values

`game/farm-state.js` is the source of truth. Run `node scripts/sync-game.mjs` after editing it. This also copies the existing presence module to the Edge Function without changing that source.

`FAMILY_MIN_LEVEL = 10` is shared by eligibility, Hall visibility, guide text, unlock announcements and tests. Test helpers accept a different minimum to exercise the gate. Legacy farms retain all existing unlocks; this new feature uses the new gate for everyone.

See the generated table below for `FAMILY_CONFIG`. Times are milliseconds. If increasing MAX_MEMBERS above six, also update the two corresponding structural SQL constraints in `farm-family.sql`.

| Constant | Default |
| --- | --- |
| `MAX_MEMBERS` | 6 |
| `MIN_CONTRIB_POINTS` | 500 |
| `JOIN_COOLDOWN_MS` | 172800000 |
| `RENAME_COOLDOWN_MS` | 604800000 |
| `ATTEMPTS_PER_HOUR` | 10 |
| `EXTRA_POINTS_CAP` | 30000 |
| `POOL_PER_ACTIVE_PLAYER` | 5 |
| `POOL_MAX` | 300 |
| `PLAYER_WEEK_DIAMOND_CAP` | 25 |
| `TOURNAMENT_MIN_POINTS` | 2000 |
| `ORDER_COIN_MULTIPLIER` | 1.25 |
| `ORDER_XP_PER_VALUE` | 0.01 |
| `ORDER_DIAMOND_BASE` | 1 |
| `ORDER_DIAMOND_MAX` | 3 |
| `ORDER_COMPLETION_DIAMONDS` | 4 |
| `REWARD_WEEKS` | 8 |
| `ORDER_MIN_VALUE_PER_MEMBER` | 16000 |
| `ORDER_MAX_VALUE_PER_MEMBER` | 30000 |
| `RANK_SHARES` | 0.5, 0.3, 0.2 |

The four deterministic order templates have four lines each: one crop, two crafted goods and Honey. Their target is fixed when the family first accesses that week, based on its membership then. The tested value band is per member. The 4–6 day completion goal is an initial balancing estimate, not a forced timer: stored goods, upgrades and frequent play can finish sooner. Review actual play after the first few weeks before retuning.

Order coins are each eligible player's **own order contribution value × 0.8 × 1.25**, rather than a full order payout to every member. Order XP is their own contribution value / 100. Eligibility for an order reward requires 500 points specifically from **order goods**; extras are only for tournament points, as requested. Eligible contributors also split four completion diamonds. Tournament eligibility uses all contribution points and current membership at settlement.

Leaving does not erase goods already supplied or earned reward entitlements. Order contributors can claim earned order rewards after leaving. Tournament eligibility is checked at settlement, before the first new-week membership mutation. Weekly diamond caps include both order and tournament entitlements, whether claimed yet or not. Claims can trigger the existing automatic level rewards separately. Missing ranks and capped leftovers are not redistributed to other ranks.

## API

All requests use the existing authenticated `farm-api` endpoint and active-session validation.

Read: `{ "operation": "family" }`. Returns `profile.player_id` (required by the existing bridge), `family` (sanitized display model) and `serverNow`. Reads do not update farm activity. The UI polls every 30 seconds while visible, never opens the modal automatically, and skips polling below the gate or before the farm is ready.

Mutations: `{ "operation": "action", "requestId": "<new UUID>", "action": { ... } }`.

| Action type | Payload fields |
| --- | --- |
| `family_create` | `name`, `emblem` (preset ID `0`–`11`) |
| `family_join` | `code`, or `familyId` for an open family |
| `family_leave` | none |
| `family_kick` | `memberId` (opaque member row ID) |
| `family_promote` | `memberId` |
| `family_rename` | `name` |
| `family_open` | `open` (boolean) |
| `family_code` | none; generates a replacement code |
| `family_contribute` | `week` from the current view, `item`, positive whole `count` |
| `family_tournament_goods` | `week`, `item`, positive whole `count` |
| `family_claim` | `rewardId` from the player's own reward list |

A successful mutation returns the regular farm state/profile/revision and `result.family`. A rejected action returns `ACTION_REJECTED`. An order contribution exceeding what is missing is rejected without deducting stock; the UI's Max button caps the request to missing stock. Old-week requests are rejected for review.

## Transactions, privacy and persistence

The service-only `harvest_family_context` RPC reads a consistent database snapshot. The Edge Function executes the shared rules, computes changed rows and calls `harvest_family_commit`. This RPC checks family and farm revisions and commits through the **existing live** `harvest_commit_farm`, in the same transaction as family updates and the unique claim record. Any SQL violation rolls back the farm write too. Revision conflicts restart the existing farm-api retry loop.

All eleven new tables have RLS enabled; direct public/anon/authenticated table permissions are revoked. Players read their own family through the authenticated Edge Function's explicit whitelist. Public family discovery and tournament cards contain only public summary information. No member balances, emails, player account IDs or activity timestamps reach the client; opaque member IDs are used for leader actions. Online booleans use the unchanged `src/presence.js` rule.

Permanent family receipts prevent replay even after the ordinary farm receipt window expires. Failed create/join attempts also commit their rate limit and receipt, without marking the player online. A unique (player, week) contribution row enforces the family contribution lock. Each claim inserts a unique (reward, player) row with its farm credit.

Lazy settlement is performed on the first family read/action after a week ends, under a transaction-level lock for that week. No cron job is required. For the present small player base, family writes also serialize through one revision row. The context currently reads retained family history into the service runtime. If the player base/history grows substantially, scope those reads and partition contention by family/week before scaling. No raw context is returned to clients.

## Verification and limitations

- Baseline: 201 tests passed before this work. Final: **222 tests passed**, zero failures.
- Complete output: `FARM-FAMILY-TEST-OUTPUT.txt`.
- Static production build passed; output: `FARM-FAMILY-BUILD-OUTPUT.txt`.
- SQL tests executed against Supabase inside one transaction ending in ROLLBACK: create, exact inventory deduction, stale revision, request replay, overfill rollback, completion entitlement, single claim, repeated claim rollback, RLS/ACL, action activity stamp and protected function checks. No test users, families, receipts or claims remain.
- Generate a fresh rollback-only SQL test with `node scripts/test-family-sql.mjs <output.sql>`; run it with administrative test access. Its generated IDs and UTC week are fresh for that run.
- `src/main.js`, `src/presence.js`, `src/analytics.js`, `public/play.html`, `public/scene-polish.js` and `supabase/restore-activity-status.sql` remain byte-identical to the uploaded repository. Existing 19 leaderboard categories and apiary/greenhouse `itemCount: 3` remain intact.
- One old progression test was narrowed to existing non-Family buildings: its previous broad “every non-purchased building is unlocked for legacy players” assertion cannot include a new level-gated Hall. Separate Family tests now cover this gate for legacy and guided farms.
- A browser binary was unavailable and its download failed, so a real mobile screenshot/session test was **not** completed. Responsive rules, topbar visibility, asset links, shared-model copies and authenticated bridge identity were checked in code/tests. Confirm the four tabs and Hall tapping on an actual mobile device after the frontend deployment.

## Files changed or added

Modified:

- `game/farm-state.js`
- `public/cloud/cloud.js`
- `public/cloud/game-cloud.js`
- `public/economy-ui.js`
- `public/farm-guide.js`
- `public/farm-state.js`
- `public/farm.html`
- `public/game.js`
- `public/visual-icons.js`
- `scripts/sync-game.mjs`
- `supabase/functions/farm-api/farm-state.js`
- `supabase/functions/farm-api/index.ts`
- `tests/progression.test.mjs`

Added:

- `FARM-FAMILY-ARTWORK.md`
- `FARM-FAMILY-BUILD-OUTPUT.txt`
- `FARM-FAMILY-NOTES.md`
- `FARM-FAMILY-TEST-OUTPUT.txt`
- `public/assets/icons/family-management.png`
- `public/assets/icons/family-members.png`
- `public/assets/icons/family-tournament.png`
- `public/assets/icons/family-weekly-order.png`
- `public/assets/models/firewood_001.glb`
- `public/assets/models/garden_bed_002.glb`
- `public/assets/models/house_008.glb`
- `public/assets/models/pointer_002.glb`
- `public/assets/models/table_002.glb`
- `public/assets/models/tower_008.glb`
- `public/family-ui.js`
- `public/family.css`
- `scripts/test-family-sql.mjs`
- `supabase/farm-family.sql`
- `supabase/functions/farm-api/family-service.js`
- `supabase/functions/farm-api/presence.js`
- `tests/farm-family.test.mjs`

`dist-static/` is regenerated from the updated public files. `EXPORT-CHECKSUMS.json` is refreshed for this release.
