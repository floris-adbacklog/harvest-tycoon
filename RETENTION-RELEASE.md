# Harvest Tycoon — retention update

## Implemented

- Rookie Boost keeps the initial 80% timer reduction for 30 minutes, then reduces it linearly to zero over 90 minutes. Running crops and batches keep their original timers. Starter inventory protection still ends after 30 minutes. No new save fields or backfill.
- Chores always award coins, XP, practice and quest progress. The server rolls only for an extra bonus. Base coins/XP are `max(1, floor(original reward × starting chance / 200))`; the bonus adds `floor(original reward / 2)`. Expected coins and XP never exceed the original success-only expectation at any practice level. Cooldowns, unlock order and practice caps stay intact. Faster completion of chore-count quests is intentional.
- Welcome Back appears after at least 30 minutes since the previous farm commit, using server time. It summarizes ready fields, completed batches and unlocked stall earnings, then links to the relevant activity. These are existing rewards awaiting collection, not new currency. The existing revision-checked commit acknowledges the return. Existing reward dialogs take precedence.
- Daily Farm Family sharing is available from the Members page: help by giving 5 coins, gift 3 wheat, request 1–5 wheat/corn/feed, and fulfil a request. Transfers use the sender's own balance/inventory. Receiving is immediate and today's sent/received activity is visible. No social diamonds or newly minted currency/items.
- Short live events support title, description, start/end, activation, 1–4 configured objectives, automatic participation/progress, qualification, rewards, settlement and durable claim records. Supported objectives: harvest crops, collect production batches, water, care, chores and deliveries. Events last 1–12 hours; the admin example lasts 2 hours. No event is automatically activated on installation.
- The existing admin dashboard now has event creation/editing, activation, participation counts and paginated per-player progress/qualification/allocated and paid reward records. Existing superadmin authentication is reused. Started event rules are immutable; operators can pause/resume an unended event or create a new configuration. Active events cannot overlap.
- Original image-generated finish flag is used on the event button, cards and admin section. Daily family sharing also has an original image-generated gift basket supported by farmer hands. Other artwork is reused. All game copy is English.

## Economy and abuse controls

Family: each account must be level 10, at least 48 hours old and in its current family for 24 hours. Each interaction type allows 3 sent and 3 received per UTC day, once per pair/type/day. One request per player/day, even after changing families. Self-transfers, stale/fulfilled requests, missing stock, replayed receipts and cross-family transfers are rejected. Membership is locked against concurrent changes; both farm revisions and ledger records update in one transaction. Transfers conserve resources, so additional accounts cannot mint resources through sharing.

Events: verified accounts aged at least 48 hours and level 10 can participate. Progress comes only from accepted gameplay receipts and server-owned stat deltas, never client-submitted scores or admin grants. A player must complete all objectives and contribute at least three times over ten minutes. Contributions count at most once every ten seconds. Completion time freezes after qualification, so further play cannot worsen reward priority.

Qualified participant count N determines per-player diamond allocation:

`min(diamondMax, diamondMin + floor(sqrt(N / participantStep)))`

Total pool = `min(poolCap, N × per-player allocation)`. Eligible players are ordered by qualification time, then player ID to break ties. The pool is allocated in that order, so late finishers may get fewer/no diamonds when exhausted; all qualified players receive the configured coins. Claims are atomic and idempotent. Each player may collect at most 6 event diamonds per UTC day; excess is forfeited and recorded as allocated versus paid. Rewards settle lazily on event list/results/claim after the end time, without a required scheduler. Disabled ended events can still settle and pay earned rewards. Player event history shows the latest 30 days (up to 50 events); admin history shows the latest 50, with 100-player results pages.

These controls bound issuance and remove resource creation from social transfers. Account verification and age are not proof of a unique human. Coordinated, aged alternate accounts remain an operational abuse risk; no device fingerprinting or new personal-data collection was introduced.

## Admin-adjustable settings

| Setting | Allowed range |
| --- | --- |
| Duration | 1–12 hours |
| Objectives | 1–4 unique objectives; targets 1–10,000 |
| Completion coins | 0–300 |
| Base diamonds | 0–1 |
| Maximum diamonds per player | 1–3 |
| Qualified participant growth step | 10–1,000 |
| Maximum event diamond pool | 0–200 |
| Active state | On/off until ended |

Rookie duration/taper and chore balance remain in `game/farm-state.js`. Family daily limits/eligibility/transfer quantities and the event daily diamond cap remain in SQL. They are deliberately not exposed as unrestricted admin economy overrides.

## Database and rollout

Live Supabase was inspected read-only on September 22, 2026: project `jnmdirvidffzxukbdmij`, PostgreSQL 17, healthy, `farm-api` version 64. Every deployed backend source file matched the uploaded ZIP. The four new tables do not exist in the live project. Existing farm/profile triggers were inspected. No production migration, function deployment or website deployment was performed.

New additive SQL:

1. `supabase/retention-social.sql`: `family_social_actions`, `family_social_requests`, indexes, RLS/ACLs and server-only `harvest_social` transaction.
2. `supabase/live-events.sql`: `live_events`, `live_event_players`, indexes, RLS/ACLs, configuration validation, accepted-action progress trigger, settlement and reward claim functions.

The central `harvest_commit_farm` function, existing family tables, save schema and player balances are not rewritten. New functions use `SECURITY INVOKER`; public/anonymous/authenticated direct execution and table access are revoked, and only `service_role` can use them. The SQL can be reapplied safely. Existing clients/receipts without `eventAction` remain compatible and simply do not accumulate event progress.

Recommended coordinated rollout:

1. Apply both SQL files via your normal reviewed Supabase migration process (create migration files with `supabase migration new` if using CLI history). Test against staging first.
2. Deploy the entire `supabase/functions/farm-api` directory, including `social-service.js`, `event-service.js`, `welcome-service.js` and the synced `farm-state.js`. Preserve existing JWT/import-map settings.
3. Run `pnpm install --frozen-lockfile`, then `pnpm run build:static` with the existing public Supabase URL/key. Publish `dist-static`. Existing package and lockfile remain unchanged. The supplied public/cloud bundle was rebuilt using the same public connection configuration as the upload.
4. Smoke-test two eligible family accounts, expired-session rejection, duplicate claims, the welcome dialog and one short configured event. Inspect admin results after the event ends.

Rollback: deactivate events, restore the previous frontend and farm-api together, and retain the four additive tables/ledgers. Old receipts have no eventAction and safely skip event tracking. If a trigger needs to be removed during an incident, drop only `harvest_event_progress` on `player_farms`; retain reward/claim data for reconciliation. Do not delete ledgers or reset paid rewards.

## Validation

- 623 Node gameplay/regression tests passed, including the adjusted old success-only and abrupt-boost expectations.
- 31 isolated PostgreSQL/PGlite assertions passed: additive SQL applied twice, help/gift/request conservation, sender/receiver/pair limits, self and membership checks, insufficient-stock rollback, age gates, action receipt replay, progress throttling, admin-grant exclusion, settlement, larger participant scaling, exhausted pool, daily diamond cap, duplicate claims and private ACLs.
- Browser bundle and static production build passed.
- Full test outputs: `retention-tests.txt`, `retention-sql-tests.txt`, `retention-build.txt`. Focused outputs: `p0-tests.txt`, `compatibility-tests.txt`.
- SQL tests use an isolated PostgreSQL/WASM database, not real player data. Install `@electric-sql/pglite@0.5.8` in a separate test directory and set `HARVEST_PGLITE_MODULE` to its `dist/index.js`, then run `node scripts/test-retention-sql.mjs`.
- Browser fixture results are recorded in `RETENTION-VISUAL-QA.md`; they do not replace a signed-in production smoke test.

The existing Supabase advisor report has warnings concerning notification SECURITY DEFINER functions, anonymous-access policies and disabled leaked-password protection. These predate this change and were not modified. Server-only tables also produce informational “RLS enabled, no policy” notices by design. References: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Generated asset

`public/assets/icons/live-events.png` — built-in image generation, original transparent finish flag. Reference artwork: `family-tournament.webp` and `chore-harvestfair.webp`.

Prompt: “Create one original Harvest Tycoon UI icon for short live events: a single waving black-and-ivory checkered finish flag on a warm carved wooden pole, small golden finial, tied with a forest-green ribbon and a few golden wheat ears at the base. Match the two supplied reference icons' polished hand-painted farm-game style, soft dimensional shading, warm saturated colours, thick readable forms, gold highlights, clean silhouette, three-quarter view. Transparent background with real alpha, no scenery, no border, no text, no watermark. Square image, centered object with generous safe padding, readable at 40 pixels.”

The original alpha is preserved without post-generation editing. No external stock artwork was used.

Additional asset: `public/assets/icons/family-sharing.png`, created with built-in image generation and the same two style references. Prompt: “Create one original square game UI icon for Harvest Tycoon’s daily family sharing: a small honey-coloured wooden farm gift basket containing three golden wheat ears and a ripe red apple, tied with a forest-green ribbon, gently supported from below by two friendly farmer hands with rolled cream sleeves. Match the supplied game icon references: polished hand-painted dimensional mobile farm-game illustration, warm gold and wood colours, soft highlights, lush green accents, readable thick shapes, clean silhouette, three-quarter view. Simple centred composition, readable at 48px. Real transparent alpha background, no scene, no platform, no text, no border, no watermark.” Integrated into daily sharing and its Family Members access button.
