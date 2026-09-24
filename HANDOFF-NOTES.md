# Handoff notes (latest state)

Work from THIS zip only. Do not restore older files from earlier chats. Run `npm test` before and after (448 tests pass for the avatar release; input ZIP baseline was 437).

## Latest: midgame expansion, wave 3 (levels 75–90) and Estate chapters 7–10 (2026-09-23)
- **Estate Workshop** (feature `estateworkshop`, L75, manor `house_005`): seven improvements (`IMPROVEMENTS`), each built once with coins + goods (action `improve` {improvement}), levels 75–88: Orchard ladders (trees/bushes/climbers grow back 20% faster, `cropDuration` regrowing), Glasshouse heating (Glasshouse batches −25%), Water tower (watering takes 30% off instead of 20%), Big hay loft (ranch herd 35% instead of 25%, `ranchSpeedup`), Market wagon (Valley Market customers after 2 h instead of 4, `valleyRestock`), Loading crane (next export contract after 6 h instead of 12, `depotRestock`), Merchant’s ledger (Market sales +10%, `marketSaleValue`, so the Valley Market too). `state.improvements` = list of built ids.
- **Prize produce** (L80): Glasshouse recipe (3 squash, 6 cauliflower, 3 red cabbage, 3 fertilizer → 1, 12 h), sells 9,800 (raised from 6,800 the same day: at 6,800 a Glasshouse slot earned more growing plain cauliflower; now about 350 an hour, the best Glasshouse use, like the wool blanket); never in the Factory. Used by the fair, exports, Valley Market baskets (a “star”), 2 village orders, 5 commissions, fields 85/90/95, estate upgrade 85, improvements and Estate chapter 10.
- **Trade Depot** (feature `tradedepot`, L85, warehouse `hangar_008` + `trailer_003` + `truck_005` + crates `prop_020/021`): one export contract (`state.depot.contract`): 1–4 goods worth `exportValue(level)` (60,000 at 85, +4,000 a level, max 120,000), paying 1.6× their normal price (rounded up to 100) + 10 diamonds + XP. `depot_load` {contract, item?} loads what the barn has (all goods without item); loaded goods stay loaded; a full trailer leaves in the same action. `depot_skip` only while nothing is loaded. Next contract 12 h after (6 with the crane). Contracts follow from `state.depot.serial` (`export-v1` + `mixBits`); a farm that can make no good ≥400 gets none yet. Double earnings doubles an export (like a delivery). Delivery orders link to it.
- **Grand Valley Fair** (feature `grandfair`, L90, long hall `house_023` + fairground): three classes a week (`familyWeek`, from Monday UTC; `state.fair`): Best harvest (a crop, 15,000), Finest goods (a good ≥1,000, 30,000), Best in show (3 prize produce + a good, 50,000). Entering (`fair_enter` {entry, week}) pays 1.5× value + XP + 5/5/10 diamonds and 1/2/3 fair stars (`stats.fair_stars`); all three in one week = grand champion (`stats.fair_champion`).
- All three are `LATE_FEATURES` (old farms wait for the level too), with More-menu entries, map pins and one dialog `#estate-place-dialog` (`public/estate-ui.js`). 12 quests appended after “Head of the herd” (204), 3 dailies, 2 village orders, 7 commissions (L78–90).
- **Estate chapters 7–10** (`PROJECTS`, `CHAPTER_DIAMONDS` +125/150/175/200): Golden meadows (L40), The weavers’ valley (L55), Orchard and ranch (L70), The grand estate (L85), each with a `level` that `startProject` checks; the screen shows the level and “/ 10”. On 23 Sep no farm had finished more than 3 chapters (checked live), so nobody skips or gets paid for a chapter out of order.
- **Map**: a new column at the east end of the trunk road (anchors `tradedepot`, `estateworkshop`, `grandfair`); a turned road piece (`ROADS[6]`, `turned:true`: laid along the model’s own length, so no pointed end) carries the road past the depot to the edge of the world. The east hill (`landscape_008`) is gone; trees of different sizes and pines stand around the new column. Pan range 20→24 (×SPREAD) so the column can be brought to the middle.
- **Supabase**: `harvest_estate_wave3_items` is LIVE (`supabase/estate-wave3.sql`): family sharing takes prize produce (57 items), “goods produced” counts it. `harvest_commit_farm` untouched. Do not replay.
- **Crop pressure follow-up** (same day): sunflowers were the bottleneck (14-24 h a field; candles, beeswax, honey and oil all start with them), so the Glasshouse also grows them (`glasssunflower`, L48: 2 fertilizer + 760 coins → 6 sunflowers, 8 h; never in the Factory), and Estate chapter 9 asks 25 cherry pies + 25 cherry jam (275 cherries) instead of 40 + 40 (440).
- **Balance pass over all three waves** (same day, value added per hour at normal prices): Graze the flock gives 3 wool from 4 barley (was 2: worse than feeding the sheep; now more wool per Sheep Barn hour, more barley per wool); cider sells 1,650 and takes 4 h (was 1,250 / 5 h, the weakest recipe from level 28 up); goat milk 185, goat cheese 1,350 (were 170 / 1,150, below the wave-1 goods); cherry jam 2,700, cherry pie 2,900 (were 2,300 / 2,500, no better than candles 10 levels earlier); the Bee Yard gives 4 honey + 3 beeswax per sunflower (was 5 + 2), so a candle costs one sunflower instead of 1.5. The ladder now climbs: wave 1 120-188/h, goats and candles 134-182/h, cherry goods 234-255/h, prize produce 351/h (the wool blanket, 346/h, is the one big 8-hour item). `tests/balance-expansion.test.mjs` guards it. To watch: with the Loading crane a very productive farm can send four trailers a day (40 diamonds).
- **250 quests** (46 appended after “Legend of the fair”): longer ladders for every expansion crop and good, sunflowers under glass, honey, the Glasshouse, the Valley Market (baskets and coins), prize produce, exports (trailers, goods loaded, coins), the fair (ribbons, champion, stars), and the estate story (8 and 10 chapters), fields (16 and all 28 extra), all 64 mastery medals and 100/300 upgrades. Every ladder climbs; gated ones carry `minLevel`/`requiresBuildings`. New quest art: `valley_coins`, `depot_coins`.
- **Farm buildings list**: buildings with finished batches come first (and move up live while the list is open), and a group “Places in the valley” lists the Valley Market, the Ranch, the Estate Workshop, the Trade Depot and the fair with one line on what is waiting there (customers, herd, improvements ready to build, trailer loaded / ready to send, ribbons this week); ready ones first, locked ones folded into “Places to unlock”. A card opens the place like the map does (`onPlace` → `openUtility`); its picture is a render of the place’s models (`public/assets/icons/place-<key>.png`), like the building cards, not the painted icon.
- **Orders only for what you can make** (24 Sep): `itemAvailable` now checks older (legacy) farms too (they skipped it and were offered e.g. candles without a Craft Workshop), the Factory no longer counts as a source by itself (it only makes in bulk what the farm’s own building makes), and an undelivered order on today’s board that the farm cannot make is swapped for one it can (`swapImpossibleOrders`, revision +1). The same check now keeps Valley Market baskets, export trailers and fair classes honest on older farms. Needs farm-api.
- **Daily streak** (24 Sep): after day 7 every day pays the day-7 gift (24 diamonds, 160 coins) until a day is missed, instead of starting again at day 1 (`checkIn` and the Today strip use `min(streak, 7)`). Needs farm-api.
- **Fields 29-40 rescheduled** (still 40 at most): levels 30, 34, 38, 42, 46, 50, 55, 60, 65, 70, 80, 90 (was 40-95, every five). Half of them now come while the trees (pole beans 31, cider apples 46, cherries 66) start to claim fields, the last where the content ends. Coins unchanged (300,000-1.4M); each asks goods available by its level, the newest among them (tested). On 23 Sep no farm had more than 21 fields.
- **Deploy**: push, then farm-api straight away (rules + new actions). notify-hourly unchanged (no new crop). Tests: `tests/estate-wave3.test.mjs`, `tests/balance-expansion.test.mjs`; 715 pass.

## Latest: bigger event prizes (2026-09-23)
- On top of the usual event reward: 1st +2,000 coins +20 diamonds, 2nd +1,000 +10, 3rd +500 +5, every later finisher +100 +1. The daily cap on collected event diamonds went from 6 to 30, so a first place is paid in full.
- Migration `harvest_event_bigger_prizes` is LIVE (`supabase/live-events-prizes.sql`: `harvest_event_settle` and `harvest_event_claim`, the live definitions with only those numbers changed; the live settle also keeps `events_finished` up to date, which the older SQL files did not have). Same numbers in `PODIUM` / `FINISHER_PRIZE` / `EVENT_DAY_DIAMONDS` (farm-api `event-service.js`) and on the event screen (`public/live-events-ui.js`); `tests/farm-events.test.mjs` keeps them equal.
- Deploy farm-api so the "if it ended now" standings show the new prizes (payment already uses them).
- **Twelve event templates** (24 Sep): migration `harvest_event_more_templates` is LIVE (`supabase/live-events-more.sql`): goals may also count one crop's harvest (`harvest_wheat`, `_corn`, `_lettuce`, `_barley`, `_greenbeans`, `_cabbage`) or eggs (`made_eggs`), all open to every farm at level 10 (crops unlocked by level 9, the coop is free; no Bakery or Dairy Barn); progress counts a crop on field/tractor actions and a good on collecting; seven new automatic events (The wheat race, Corn country, The egg hunt, Salad days, Beans and barley, The great harvest, Market garden). Same list in `EVENT_STATS` (farm-api) and `EVENT_GOALS` (event screen labels). Events already created keep their goals.
- **Fixed base + one list** (same day): automatic events pay a fixed 200 coins + 1 diamond to every finisher (`diamondMax` 2 → 1 in `harvest_event_schedule`; migration `harvest_event_fixed_base` is LIVE, `supabase/live-events-fixed-base.sql`, which also gave the two automatic events that had not started yet the same base). The event screen shows one list, “What you win when you finish”, with the total per place: 1st 2,200 coins + 21 diamonds, 2nd 1,200 + 11, 3rd 700 + 6, everyone else 300 + 2 (a range only for an event whose base is not fixed).

## Latest: midgame expansion, wave 2 (levels 54–70, 2026-09-23)
- **Content** (`game/farm-state.js`, synced): Goat Shed (L54, 72,000, `hangar_015`; goat milk from feed or lettuce + barley), goat cheese in the Dairy Barn (L55), Craft Workshop (L58, 90,000, `hangar_019`; beeswax candles, wool blankets from cloth + wool), cherries (L66, tree `tree_011`, regrows), cherry jam (Preserves, L67) and cherry pie (Bakery, L68). 19 quests appended after "The cider house", 8 dailies, 6 village orders, 6 commissions (L58–70), and the new goods in late fields (60–95) and estate upgrades (66/75/85).
- **Valley Market** (feature `valleymarket`, L62, free): three stalls, each a customer with one basket: one of the newest goods (`VALLEY_STARS`) plus one or two older goods, worth `valleyBasketValue(level)` (3,000 at 62, +150 a level, max 9,000), paying 1.5× the normal price (VIP and Double earnings apply, it counts as market sales). Sell or send the customer away; either way that stall gets its next customer 4 hours later. Baskets follow from the stall and a running number (`state.valley.serial`), so client and server agree; the rolls use `mixBits` because `calendarHash`'s low bits barely change between near-identical texts. Actions `valley_sell` / `valley_skip` {stall, basket}.
- **The Ranch** (feature `ranch`, L70): pick Sheep Barn, Goat Shed or Dairy Barn; every new batch there takes 25% less time (`recipeDuration`). First choice free, switching 15,000 coins. Action `ranch_focus` {focus, expectedCost}. `state.ranch`, `state.valley` are added to every save by `normalizeFarm`.
- Both features open at their level for every farm, old (legacy) ones included (`LATE_FEATURES` in `featureUnlocked`). UI: `public/valley-ui.js` (one dialog `#valley-dialog` in `farm.html`), More menu entries, map pins (utilities), and a Valley Market link on the Market screen.
- **Factory**: honey bottling (`mass_honey`, `FACTORY_HONEY`) is gone: honey comes from the Bee Yard (and its bulk version). A batch whose recipe no longer exists still shows ("Finished batch") and collects (jobs keep their output).
- **Farm**: Goat Shed + goat pen beside the sheep, Craft Workshop beside the Weaving Shed, Ranch + horse paddock by the pond, Valley Market (striped canopy `hangar_009`) behind the Juice Press on the top road. The two hills that were there are removed (moved further out they ran into the mountains) and pines stand at the foot of the mountains instead; the eastern hill and two field strips moved.
- **Supabase**: `harvest_valley_wave2_items` is LIVE (`supabase/valley-wave2.sql`): family sharing takes the 7 new items (56 in all) and the leaderboard totals count cherries and the 6 new goods; the `harvested_cherries` column came with `harvest_midgame_crop_columns`. Do not replay.
- **Deploy order**: push first, then straight away `farm-api` (rules) and `notify-hourly` (names) — until farm-api is deployed the new buttons are refused by the server.
- Tests: `tests/valley-wave2.test.mjs` (+ updated counts). 698 pass.

## Latest: midgame expansion, wave 1 (levels 28–47, 2026-09-23)
- **Content** (all in `game/farm-state.js`, synced): crops Squash (L28, `plant_002`), Pole beans (L31, climbing, `plant_009`), Cider apples (L46, tree, `tree_010`); buildings Bee Yard (L34, 18,000), Sheep Barn (L37, 26,000), Glasshouse (L40, 40,000), Weaving Shed (L43, 55,000); goods squash soup, beeswax, wool, yarn, cloth, cider. 11 recipes (squash soup in the Kitchen, cider in the Juice Press). The Glasshouse turns fertilizer + coins into a crate of 6–8 vegetables; the Factory never mass-produces it (`MASS_RECIPES` skips `glasshouse`). 23 quests appended after "A small fortune" (quests are stored by index: append only), 3 daily pools, 7 village orders (L32–47), 5 commissions, and the new goods in late field expansions and estate upgrades.
- **Farm** (`public/farm-layout.js`, `public/game.js`): the four yards stand on new ground east of the coop and Family Hall; the trunk road (`ROADS[0]`) now runs on to x≈44 and the two eastern backdrop hills in `farm-life.js` moved out. `YARD_EXTENT` keeps loose trees three steps clear of each yard (pasture included) and a tree that has to move never lands on a road. Fences, sunflowers and the flock are greyed out with their yard (`yardDecor`); the Bee Yard's hives are one tappable building (`addBuilding(..., {parts})`).
- **Art**: item icons painted with ChatGPT (256 px PNG + WebP, `public/assets/icons/`); building pictures are renders of the GLB models. The icons for waves 2–3 (cherries, goat milk/cheese, candles, blanket, cherry jam/pie, prize produce, valley market, trade depot, estate workshop, ranch, grand fair) are already in the folder, unused until those waves.
- **Supabase**: migration `harvest_midgame_wave1_items` is LIVE (`supabase/midgame-wave1.sql`): family gifts and requests accept the 9 new items, and the leaderboard totals count the new crops and goods. `harvest_commit_farm` untouched. Do not replay.
- **To deploy**: farm-api (rules changed) and notify-hourly (`names.js` regenerated), then the frontend. Journal: Glasshouse crates count as crops picked, not goods made.
- Tests: `tests/midgame-expansion.test.mjs` (unlock levels, full chains, Factory, orders timing, yard placement, assets). 688 pass.
- **Hotfix (same day)**: farmer profiles failed after this update because farm-api reads `harvested_<crop>` for every crop and the new crops had no column. Migration `harvest_midgame_crop_columns` is LIVE (`supabase/midgame-crop-columns.sql`): columns + ranking indexes for squash, pole beans, cider apples and (ahead of wave 2) cherries, and `harvest_commit_farm` fills them (live definition + those four columns). The crop leaderboards are now generated from `CROPS` (`src/leaderboard.js`), so a new crop gets its board automatically; `tests/crop-columns.test.mjs` fails when a crop has no column or is not written on save.
- Still to come: wave 2 (L50–70: Goat Shed, Craft Workshop, Valley Market, cherries, ranch) and wave 3 (L75–90: Estate Workshop, prize produce, Trade Depot + export orders, Grand Valley Fair).

## Latest: 20 selectable farmer avatars (2026-09-21)
- Start from this complete ZIP. The authoritative input was `b99c8096-e03e-4563-8752-dd8178777ef1.zip`; none of the older projects was used as source.
- Settings now starts with **Your farmer avatar**: current preview, expandable picker, 20 newly generated farmers + the original portrait, and an explicit Save avatar button. All are free cosmetics. Responsive 5/4/3-column grid with keyboard-operable radio controls, lazy-loaded transparent WebP assets.
- Avatar is saved to `player_stats.avatar_id`, so it follows the account across devices. The authenticated `avatar` farm-api operation validates the catalog and changes only the signed-in player's avatar/activity time. No balances or gameplay rules change. Unknown IDs fall back to the original portrait for display.
- Profiles, leaderboard, player search, family members and family invitation search display the selected avatar. Existing players retain the default until they choose another.
- Supabase migration `player_avatars` and **farm-api v48 are LIVE**. Do not replay the migration against production. Local record: `supabase/migrations/20260921181951_player_avatars.sql`. Existing RLS is unchanged; direct client UPDATE remains forbidden. Protected `harvest_commit_farm` and `harvest_credit_purchase` definitions were not modified.
- Assets: `public/assets/avatars/`; shared catalog: `public/player-avatars.js` (sync script copies to farm-api). Generation prompts and asset paths: `AVATAR-ARTWORK.md`. UI: `public/avatar-settings.js`, `public/player-avatars.css`, initialized in `src/game-cloud.js`.
- Validation: 448 tests pass, including authenticated endpoint ownership, invalid IDs, saved selection after reload/action, and picker error/retry handling. Static production build succeeds. Live migration checked with a transaction that was rolled back; family projection and database ID constraint passed.
- Frontend still needs normal Vercel deployment. `public/cloud/` and `dist-static/` have been rebuilt. Visual mobile/tablet/browser verification could not run: the browser refused the local preview URL (`ERR_BLOCKED_BY_CLIENT`). No real player avatar was changed during testing.

## What is new since Progression v7 / Family v6
- **Compact VIP layout**: the shop now has a smaller header, four short benefit labels with the existing wheat/buildings/coins/gift illustrations in a 2×2 grid, and compact plan cards. The inactive green subheading and long disclaimer are removed. Mobile keeps two benefit columns, with stacked plans. Purchase rules, costs, confirmations and server state are unchanged. See `VIP-COMPACT-UPDATE.md`.
- **VIP and four diamond packs (2026-09-21)**: standalone packs now give 150 / 500 / 1,250 / 3,500 diamonds for €1.99 / €4.99 / €9.99 / €24.99. See `VIP-DIAMOND-RELEASE.md` for exact Stripe IDs, rules, validation and deployment status. VIP costs 500 diamonds for 7 days or 1,500 for 30 days. Existing free reward amounts, building upgrade costs and Starter Pack are unchanged. VIP doubles Today rewards only while active. Old pending payment receipts retain their original amount.
- **Sign-up funnel** (`public/play.html`, `public/welcome.css`, `src/main.js`, `src/account-form.js`, `src/analytics.js`): sign-up is the default for new visitors, two fields (email, password), optional player name, forgot-password and reset flow, "Check your inbox" screen with resend, GTM `auth_*` events, logo no longer cropped on mobile. Tests: `tests/auth-gate.test.mjs`, `tests/account-form.test.mjs`, `tests/analytics.test.mjs`.
- **Settings + PWA**: "Sound settings" became **Settings** (gear icon; drawn gear `public/assets/icons/settings.svg` for the mobile menu). Manifest, icons (`public/assets/pwa/`), service worker (`public/sw.js`, caches nothing, shows push), install block (`public/install-ui.js`, `src/pwa.js`). Tests: `tests/pwa.test.mjs`.
- **Reminders (push + optional daily email)**: everything is opt-in and off by default.
  - Client: `src/notifications.js`, `src/push.js`, `public/notifications-ui.js`, block `#notify-settings` in `public/farm.html`. The block only shows when `notify-hourly?config` answers `enabled:true`.
  - Rules (pure, tested): `supabase/functions/notify-hourly/rules.js`. Crops and production ready are combined into ONE push per player per hour (max 4 a day, quiet hours 22:00-08:00 local, only when something NEW is ready, not while the game is open, stops after 7 days away). Daily gift reminder 09:00 local, streak-at-risk reminder 19:00 local (streak >= 3). Daily email at the hour the player picks, only when something is waiting.
  - Job: `job.js`, `mail.js`, `index.ts`, `names.js` (generated by `scripts/sync-game.mjs`; never edit by hand).
  - Tests: `tests/notifications.test.mjs`, `tests/push.test.mjs`, `tests/reminder-rules.test.mjs`.

## What is live in Supabase (project jnmdirvidffzxukbdmij)
- Tables: `notification_settings`, `push_subscriptions`, `notification_state`, `notification_job` (RLS on; players only read their own settings and subscriptions, all writes go through security-definer functions). SQL: `supabase/notifications.sql`, `supabase/notifications-job.sql`.
- Functions: `notification_save`, `notification_subscribe`, `notification_unsubscribe` (authenticated); `notification_begin_run`, `notification_add_emails`, `notification_candidates` (service role only).
- Edge Function `notify-hourly` (v4, `verify_jwt` off on purpose: cron call and unsubscribe link have no user; the job is limited to one run per clock hour). Secrets already set in the dashboard: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `RESEND_API_KEY`. Never put secrets in the repo or in `VITE_` variables.
- `pg_cron` job `notify-hourly` at minute 5 of every hour (`supabase/notifications-cron.sql`).
- Edge Function `farm-api` is live at v48 (avatar update based on inspected live v47, which exactly matched this input ZIP). Any change to it must start from the LIVE copy, not from an older file.
- Edge Functions `diamond-checkout` and `stripe-webhook` are live at v11. Migrations `double_paid_diamond_packs` and `vip_and_four_diamond_packs` are live. Old pending receipts remain valid.

## Rules that must not be broken
- `game/farm-state.js` is the source of truth; `scripts/sync-game.mjs` copies it. Never rebuild `harvest_commit_farm` from an older .sql file (it stamps `player_stats.last_active_at`, which drives the online dot).
- Online = an action in the last 30 minutes. Apiary and greenhouse give 3 items. Leaderboard has 19 categories. GTM is only in `play.html`.
- Vercel runs `npm run build:static` and rebuilds `dist-static/` and `public/cloud/`; the copies of those folders in this zip have been rebuilt for this release, and are rebuilt again on deploy.
- The 6 loose files in the repo root (`game.js`, `economy-ui.js`, ...) are not used; leave them.

## Not done yet
- Frontend deployment is still required: Supabase is live, but this ZIP has not been published to Vercel.
- VIP/shop responsive CSS is implemented. Visual browser QA at mobile/tablet widths was blocked because the browser policy refused the local test page; do not report it as visually verified. No real paid checkout was performed.
- No gameplay screenshot/clip on the sign-up page, no "play first, register later", no Google/Apple sign-in.
- Push has not been tested on real devices yet (needs the new build live). iPhone push only works from the home-screen app.

## Latest: pacing update (see PACING-UPDATE.md)
Guide order and XP, XP for slow crops, chores at level 4, mastery at level 7, sell-all confirmation, a one-time reminder question, next-unlock hint, pacing events. Tests: `tests/pacing.test.mjs`, `tests/pacing-ui.test.mjs`, `tests/confirm-dialog.test.mjs`. The level curve must not be made faster (top players reach level 36-40 in 3-5 days). Do not move an unlock to a LATER level.
Also new: diamond shop redesign (`public/shop.css`, one card layout, batch picker like the crop picker) and drawn icons for Reminders and Farm app in Settings.

UI polish (latest): leaderboard "Rank by" is now chips (`public/rank-picker.js`, hidden field `#leaderboard-category` kept for the rest of the code), remaining native selects share one style (`public/ui-polish.css`), Tests: `tests/rank-picker.test.mjs`, `tests/pwa.test.mjs`.

Profile and family polish (2026-09-21): every farmer profile shows the farmer illustration (`public/assets/farmer-avatar.webp`, trimmed and resized from the supplied artwork, in `renderPlayerProfile` in `src/player-profiles.js`) instead of the wheat icon; the initial stays as a small badge. The family emblem chooser (create form and leader settings) is a one-row picker with arrows, the picked emblem's name and "n of 21" (`public/emblem-picker.js`, styles in `public/family.css`); the tiles are still the radio field `emblem`, so the forms are unchanged, and `load()` in `public/family-ui.js` does not re-render while focus is inside a picker. The "Install app" button in the settings is a flex row so its icon and text share one centre line. Tests: `tests/emblem-picker.test.mjs`.

Sign-in page, member since, beginner reward (2026-09-21): (1) The logged-out desktop/tablet page is now a calm two-column page: logo, a small "NEW GAME · Opened on 16 September 2026" banner (Tony's account, the first one, was created 2026-09-16 21:12 UTC; it is static HTML in `public/play.html`, remove or reword it when the game is no longer new), the headline "Grow your farm into an empire.", one sentence, and a Grow › Craft › Trade capsule row with painted game icons (`.wart-*` sprite classes in `public/welcome.css`, same sprite sheets as `public/visual-icons.js`). Removed on purpose: the header with the second Sign-in button, the two taglines, the feature chips and the footer; the card no longer repeats "Free to play." in its subtitle, its small label and (desktop/tablet) the "Already have an account?" row are hidden. On phones the banner sits right under the logo. The optional name field says "Username". Tests: `tests/welcome-page.test.mjs`. (2) Farmer profiles show "Member since DD-MM-YYYY" (UTC, date only): `farm-api` reads the sign-up date from `auth.admin.getUserById` (`memberSince` in `supabase/functions/farm-api/player-profile-service.js`, nothing else of the account is returned; null when it cannot be read) and `renderPlayerProfile` hides the line when it is missing, so the client works before the function is deployed. (3) The one-time beginner-guide reward is now 50 diamonds (`BEGINNER_REWARD` in `game/farm-state.js`, synced to the other copies), shown on the sign-in page, in the guide card, in the mobile menu and in the guide texts (`public/beginner-ui.js` follows the constant). Players who already finished the guide keep the 20 they got. Deploy `farm-api` for (2) and (3): `npx supabase functions deploy farm-api --project-ref jnmdirvidffzxukbdmij --use-api`.

Installed app (PWA) layout (2026-09-21): the game frame `#farm-host` must stay `inset:0`. An earlier version inset it by `env(safe-area-inset-*)`, but the game inside the iframe reads the same safe areas itself (iOS shows them to same-origin frames), so they were counted twice: black bars above and below and sheets that stopped short of the bottom. The game now reads the bottom inset through one variable, `--safe-bottom` (`public/styles.css`; identical to the browser value). `public/app-mode.js` (loaded in `play.html` and `farm.html`) sets `html[data-app-mode=standalone]` only in the installed app and measures `--viewport-shortfall`: some iOS versions report a layout height a status bar short of the screen, which leaves a strip at the bottom where nothing can be tapped. `public/pwa-layout.css` (game frame) then takes that strip off the bottom inset and adds a soft veil under the status bar; `welcome.css` paints the strip in the colour of the bottom bar. Everything is scoped to the installed app, so the browser layout is untouched. Not verified on a real iPhone (no Xcode simulator here): if the bottom bar still looks off, ask for a screenshot and the value of `--viewport-shortfall` from the Safari Web Inspector. Tests: `tests/pwa-layout.test.mjs`.

Rewards, late game and live counts (2026-09-21): (1) Hands-on jobs ("A helping hand": greenhouse, apiary, paddock, workshop) now pay XP only and 1.5x the old XP (42 / 48 / 42 / 48, round bonus 60; `ACTIVE_STATIONS` and `ACTIVITY_ROUND_REWARD` in `game/farm-state.js`, `coins` kept at 0 so the shape is stable); the panel shows the XP picture. Goods from the jobs are unchanged. (2) 36 late-game quests were appended (ids 94-129, long ladders above what the strongest farm had on 2026-09-21: harvest 2,500-10,000, plant, water, tend, sell 1,000-20,000, earn 250k-5M, batches, deliveries, chores, hands-on jobs, farm rounds, dailies, stall, boosts, three crop masters; rewards 2,500-80,000 coins). `tests/quest-expansion.test.mjs` guards that the ladders climb and that none is already complete for that farm. Quest ids never move. (3) Coin and XP pictures instead of plain words: quest rewards (`.coin-reward`), the building upgrade coin button, the chore card and result (`.reward-line`, `.chore-prizes`); the star sprite (`data-art="xp"`) is centred and enlarged in `public/ui-polish.css` because it sat high in its cell. The level-up dialog has more room above its button. The wheat tip and "Choose quick-growing wheat" button were removed from the chores tab. (4) The sign-in page shows "N players" and "N online" (grey and green badge): public Edge Function `supabase/functions/player-counts` (verify_jwt off, counts rows of `player_stats`, online = active in the last 30 minutes, cached 30 s, returns nothing else) read by `src/player-counts.js`; the panel stays hidden when the function is unavailable. Deploy: `npx supabase functions deploy farm-api --project-ref jnmdirvidffzxukbdmij --use-api` (rules and quests, the client must not go live before it) and `npx supabase functions deploy player-counts --project-ref jnmdirvidffzxukbdmij --use-api --no-verify-jwt`. Tests: `tests/player-counts.test.mjs`, `tests/activities.test.mjs`.

Wider farm (2026-09-21): the map is laid out on a wider grid so buildings, stalls, pens and the tractor have room around them (their neighbours are 45% further apart; on a phone the bubbles no longer overlap). `public/farm-layout.js` holds `SPREAD` (1.45), one anchor per yard and `zone()/place()`: inside `decorate()` in `public/game.js` (and in `public/farm-life.js`) every model is placed through the current zone, so a yard (building + props + pens + fences + animals) moves as one piece to its anchor times `SPREAD`, loose scenery (trees, hills, roads, mountains) is spread with it and kept clear of the yards, and the fields never move (the default zone is `fields`; `decorate()` restores it). `addBuilding`/`addUtility` store the real position for the labels. To change the spacing, change `SPREAD` (tests in `tests/farm-layout.test.mjs` check the minimum room and reach); the pan limit, the shadow camera, the mountain ring and the meadow density follow it. New scenery must be placed inside a zone. To look at the scene without an account, run the game in a parent page that fakes `window.harvestBridge` (`takeInitial()` returns `{state, serverNow, profile}` from `createFarm()`), as the scratch harness did.

More props, 28 fields, white fences (2026-09-21): (1) `public/farm-props.js` scatters small props from the model pack around every yard (theme per yard: farm, home, work, green), beside the roads and as green clumps in the open ground, from a seeded generator (same farm on every visit) and only where nothing stands: `addExtraProps()` at the end of `decorate()` in `public/game.js` reads the real boxes in the scene, keeps the crops (28 fields) and the pond clear, and places nothing on a road. Every model it uses must be loaded (`modelNames` in game.js or `LIFE_MODELS`); `tests/farm-props.test.mjs` checks that. (2) The roads are one list (`ROADS` in `public/farm-layout.js`) used for the models, the roadside props and the fences: `fenceSegments()` leaves a gap wherever a road would cross a fence (the western boundary used to run over the trunk road), and the stone wall in `public/farm-life.js` does the same. (3) `MAX_PLOTS` is 28 (one more row): fields 25-28 cost 500,000 / 750,000 / 1,125,000 / 1,690,000 coins plus mixed supplies (`LATE_FIELD_COSTS`, `FIELD_MATERIALS` in `game/farm-state.js`); the field ground, the fences and the plant-free zone in `public/scene-polish.js` cover seven rows. Deploy `farm-api` for the field limit (the server enforces it). (4) The crops have white rail fences (`fence_008`, tinted) on the west and east sides only, the same distance from the outer fields; the north and south ends are open.

40 fields, 25 avatars, 25 emblems, compacter farm (2026-09-21): (1) ChatGPT had already deployed the server side (migrations `player_avatars`, `more_player_avatars`, farm-api v48/v49: MAX_PLOTS 40, level-gated fields 29-40, four extra emblems, four extra avatar IDs) without delivering files. `game/farm-state.js` is now an exact copy of that live file (no rules redeploy needed) and `supabase/migrations/20260921190403_more_player_avatars.sql` records the live avatar constraint (a test keeps it equal to `public/player-avatars.js`). (2) The four avatar IDs `pond-keeper`, `ranch-hand`, `cheese-maker`, `flower-tender` are stable database keys; they are the four farmer portraits (older woman with straw hat, woman with red bandana, bearded man with flat cap, man with glasses and beanie), named Pond keeper, Ranch hand, Cheese maker and Flower tender. The owl, fox, windmill and horseshoe mascots are the four new family emblems (`family-owl/fox/windmill/horseshoe`), not avatars. (3) The avatar picker is one row with arrows: `public/emblem-picker.js` is shared by the family emblems and the avatars (`field`, `noun`, `extraClass` options; it centres the chosen tile when its dialog first gets a size). (4) Scene: the ten field rows need the roads moved back, the camera (`fieldSpan`) frames every row, and `farm-layout.js` now keeps loose scenery out of the crops (`FIELD_BLOCK`; a bush at z=29 stood in the ninth row). (5) `SPREAD` is 1.3 (was 1.45): a little more compact, less panning sideways. `HOMES` in `farm-layout.js` lets a yard stand somewhere else than where it was designed: the apiary and the family hall swapped places (the hall stands east of the crops, far enough out not to hide them), the market stall waits by the road out at the front, and the chickens live in the coop pen. Juice press and preserves workshop are bigger buildings.

Layout changes after feedback (2026-09-21): the animal paddock now stands beside the trunk road below the dairy barn (`HOMES.paddock`), the chicken-coop pen is 15.4 x 11 with the coop in the middle (fences, ground patch and animals in `game.js`; the chickens live in it), the family hall moved further east and the market stall to the road out at the front. `tests/farm-layout.test.mjs` keeps every yard at least 5 apart and every loose tree/bush out of the crops.

Connection resilience ("A little pause / Your farm could not be reached", 2026-09-21): a laptop waking up, a wifi hand-over or one slow answer used to close the farm at once (`unavailable()` on the first failed check, the `offline` event and every failed request); refreshing fixed it. Now (`src/connection.js`, wired in `src/main.js` and `src/supabase.js`): (1) `farmRequest` repeats transient failures (no answer, timeout, 502/503/504/546, SERVER_UNAVAILABLE) after 0.4/1.2/2.8 s within a 30 s budget, with the same body and so the same request ID, and only for requests that cannot go wrong twice (`safeToRepeat`: load, actions with a request ID, search, profile, rename, avatar, reading the family; never a family change). (2) A failed request or check no longer closes the game: the frame shows "Reconnecting…" in its existing `#save-status` pill (`bridge.watchConnection`) and the parent checks again after 2/3/5/8 s; only a problem that lasts a minute becomes the pause screen. (3) `offline` waits 6 s, waking up or coming back online waits 1.8 s (and restarts the minute) before asking. (4) The pause screen keeps checking by itself and reopens the farm; a farm that cannot be opened at all goes straight to it. (5) The minute check asks only the farm (no `getUser()` lookup: the server validates the sign-in and a 401 signs out) and skips a hidden tab. (6) Analytics `connection_problem` / `connection_recovered` carry only a fixed reason (offline, timeout, network, server, other) and stage (reconnecting, paused), and the pause screen says which one it was. A 409 (changed in another tab) and a 401 still act at once. No server change or redeploy is needed; `tests/connection.test.mjs` and the extended `tests/auth-gate.test.mjs` cover it with a fake clock.

Estate upgrades, building levels 11-20 (2026-09-21, NOT live until `farm-api` is redeployed): with 40 fields, ten slots per building became the bottleneck for the endgame goods chains (the last twelve fields alone ask for hundreds of advanced goods). `game/farm-state.js`: `BASE_BUILDING_LEVEL` 10, `MAX_BUILDING_LEVEL` 20. Levels 1-10 are untouched (coins or diamonds, voucher). Levels 11-20 are `ESTATE_UPGRADES` (ten steps): farm level 26/30/34/38/42/50/58/66/75/85, coins 400k to 4.3M (the same for every building), and finished goods (bread and cheese first, harvest hampers and berry cheesecakes last); the price is coins or diamonds (570 to 6,145, about 700 coins to a diamond, continuing the curve of levels 1-10) and the 50% voucher halves the coins at every level; farm level and goods are needed whichever way you pay. Each level still adds one slot (20 at the top); speed goes on from 68% to 80% shorter at level 20 (`productionSpeed`, capped). `upgradeRequirements(state,building)` gives the level and goods of the next step. The building panel (`economy-ui.js`) shows "Estate upgrade to level N" with the goods and what is missing, and recipes with many slots get a "Max" batch button. Tests: `tests/estate-upgrades.test.mjs` (plus the changed longterm and diamonds-windmill tests). Deploy: `npx supabase functions deploy farm-api --project-ref jnmdirvidffzxukbdmij --use-api` BEFORE (or together with) publishing the client: until the server has the new rules it answers "fully upgraded" at level 10. No SQL change. Balance knobs: the table and `productionSpeed` only.

Factory (2026-09-21, NOT live until pushed AND `farm-api` + `notify-hourly` are redeployed): an endgame building, farm level 50, 100,000 coins (the price is only the entry: the real cost is upgrading it, see below), levels 1-20 like every production building (same coin/diamond upgrades and estate steps), model `hangar_007` (long white hall) with `hangar_022` (chimney) and `tower_010` (hopper) as yard props, south of the pond (`ANCHORS.factory`, `factoryYard()` keeps loose scenery out). It makes every production good in bulk: `MASS_RECIPES` in `game/farm-state.js` gives each of the 30 recipes a `mass_<id>` version, x20 for quick goods (batch of an hour or less) and x10 for slow ones, in exactly twice the time (`FACTORY_TIME_FACTOR`), ingredients, goods and XP scaled the same way (XP per ingredient unchanged), only for recipes the player already knows (`recipeUnlocked` checks `base`). Honey cannot come from a recipe, so `mass_honey` bottles 50 honey for 5,000 coins (100 each, honey sells for 35: no profit loop) in 135 minutes (twice a hive's 45/hour), XP 50; recipes may now cost coins (`recipe.coins`: `recipeAvailability` gives `price`/`poor`, `startSingleProduction` takes the coins, `recipeValue` counts them). Balance (`productionSlots/productionSpeed(level,'factory')`): the Factory gets one slot per four levels (1-5) and half the speed bonus, so a full Factory makes about 83% of one full specialised building for quick goods and 42% for slow ones (tests `at the top a specialised building always beats the Factory`): levels 11-20 of the other buildings stay worth having. A bulk batch counts as ONE batch for the batch-counting quests (`produced`, `parallel_batches`, including the 1,000+ ones), and diamonds cannot rush Factory batches (`finish_batch` refuses, "Finish production" skips them). Client: coin price chip in recipe cards (`costList`), Factory recipes ordered by source building, guards so a server that does not know the Factory yet cannot break `state.buildings` (`game.js`, `farm-client.js`), roadmap and supplier hints skip the bulk recipes. Rollout: push the client first (Vercel), then `npx supabase functions deploy farm-api ...` and `... notify-hourly ...` (names list).

Richer start (2026-09-21, new farms only, live after `farm-api` is redeployed): a new farm starts with `STARTER_COINS` 500 (was 180) and `STARTER_ITEMS` wheat 8 (was 4), corn 8 (was 0) and animal feed 10 (was 2), so the first minutes are not spent waiting: ten batches of eggs, corn to sell (40 each) or to mix into feed at the Mill, and coins for seeds and the second egg slot (the coop upgrade costs 112). Wheat is kept below the 12 that the first new field asks for, so that expansion (600 coins, 12 wheat, 6 corn) is still earned, just sooner. Existing farms are not touched. `createBaseFarm` in `game/farm-state.js` is the only place a farm is created (`farm-api` calls it on the first load).

Starter Pack opens at level 10 (2026-09-22, live after `farm-api` AND `diamond-checkout` are redeployed): the €2.99 welcome offer (300 diamonds, 10,000 coins, one of every crop) used to run for the first 72 hours of an account, so a new farmer met a shop in the first minutes. Now it opens when the farm reaches level 10 and lasts 72 hours from then. `game/farm-state.js` `stampStarterOffer` writes `state.starterOffer={unlockedAt}` (server time) in the action that crosses level 10, once; a farm that is already past level 10 when it is first seen gets `unlockedAt:0` (older players: no new offer). `game/payments.js` `starterEligibility(openedAt,claimed,now)` reads that moment (no moment or 0 = no offer); `supabase/functions/diamond-checkout/index.ts` reads it with `select('offer:state->starterOffer')` instead of `user.created_at` and still stores `starter_expires_at = opened + 72h`, so the SQL check in `harvest_credit_purchase` is unchanged and purchases opened before this stay valid. The button (`src/starter-pack-ui.js`) polls the catalogue every minute, so it appears within a minute of the level-up. No SQL, no client change. Tests: `tests/starter-pack.test.mjs`.


First-minutes pacing (2026-09-22, live after the client is pushed AND `farm-api` is redeployed: PUSH THE CLIENT FIRST, then redeploy `farm-api`): five changes so a new farmer gets the "aha" quickly. No SQL.
- **XP curve 2**, levels 1-10 cost 850 XP in total (was 1,980): level 2 at 15 XP, then 45, 85, 145, 225, 330, 465, 635, 850. From level 10 on every step is exactly what it was, so `xpForLevel(level) = oldXpForLevel(level) - 1130` from level 10. The first harvest (5 XP) plus its guide step (15 XP) is level 2. `state.xpCurve` (2) marks a farm as migrated; `normalizeFarm` -> `migrateXpCurve` moves an old farm to the new numbers ONCE, keeping its level and its share of the way to the next level (rounding is clamped below the next level; checked for every XP total 0-30,000). `levelOf`/`levelProgress` read a farm without `xpCurve` with the OLD curve, so a NEW client on a farm the server has not migrated yet shows the right level. The reverse does not hold: an OLD client (a tab that is still open) on a migrated farm reads the lower XP with the old formula and shows a level that is too low, and buildings that look locked, until the page is reloaded; the server itself is always right (`player_stats.level`, every rule). So the client goes first, `farm-api` after. `player_stats.level` is written from JS `levelOf`, there is no SQL level formula.
- **Beginner boost, first 30 minutes after a farm is created**: `state.rookieUntil = created + 30 min` (`createBaseFarm`); while `now < rookieUntil` new crops and new batches take 80% less time (`cropDuration`, `recipeDuration`; corn 15 min -> 3 min) and the Care marker comes 80% sooner (`careDelay`: the 30 s minimum shrinks too, so wheat Care is at 7.2 s of 24 s). Plain clock time, not play time. Crops and batches already running keep their times. Guided farms only; a farm without `rookieUntil` (every farm from before this) has no boost. UI: an hourglass button next to the diamonds (`#rookie-button`, built like the Family button; on a phone it takes a grid column, room for both), a small minutes badge, and a closable explanation screen (`public/rookie-ui.js`, opened by anything with `[data-rookie-open]`). Icon: `public/assets/icons/hourglass.svg`.
- **Starter corn and animal feed can not be sold in the same 30 minutes** (`state.keep = {corn:8, feed:10}`, `keptStock`/`sellableStock`, enforced in `sellCrops`; never more than what is in the barn, so using some shrinks it; what grows or is made on top can be sold). The market shows "N to sell · M kept, free in X min". Wheat is not kept.
- **At least 1 diamond per level-up** (`levelReward`: `max(1, floor(level/5))`), levels already paid are not paid again.
- **20 starter quests appended to `QUESTS`** (IDs 130-149, `STARTER_QUESTS`; 710 coins in total; coins ONLY, `xp:0` on each: with the beginner boost a farmer levels fast enough, every older quest still pays `QUEST_XP` = 15): water 3, plant 3, sell 5, care 2, earn 60, 6 eggs, 4 corn, 6 wheat, 4 lettuce, 2 batches, 2 chores, 4 milk, 1 daily challenge, sell 20, 10 harvests, 1 order, 6 feed, 12 corn, 2 cheese, earn 300. The beginner guide stays at 10 steps. On a guided farm the in-progress list is now sorted cheapest first (`questGroups`), still 3 at a time below level 6, 5 from level 6. Farms that already exceed these counters can claim them at once (about 710 coins once, no XP).
Consequences to keep in mind: everything that pays per level (coins, diamonds, Starter Pack at level 14) now arrives sooner; at minute 30 the timers jump back to normal (the hourglass and its screen say so). Existing farms keep their level; they do not get the boost or the kept goods. Tests: `tests/beginner-sprint.test.mjs`, `tests/pacing.test.mjs` (curve and migration).

Starter Pack opens at level 14 (2026-09-22, live after `farm-api` AND `diamond-checkout` are redeployed; no client change needed): it opens when diamond boosts unlock (`STARTER_LEVEL = FEATURE_LEVELS.boosts`, 14), so nobody is offered a pack of diamonds before they can spend one. Same mechanism as before (`stampStarterOffer`, 72 hours from the moment): a farm below 14 gets its moment when it crosses 14; a farm already past 14 that has no stamp yet gets `unlockedAt:0`; a moment that is already written is never moved or removed (at the time of the change nobody had an open window: both stamped farms had 0). `diamond-checkout` names level 14 in its message (a test ties that text to `STARTER_LEVEL`). Tests: `tests/starter-pack.test.mjs`.

Hands-on jobs at level 4, chores at level 10 (2026-09-22, live after the client is pushed AND `farm-api` is redeployed): `FEATURE_LEVELS.activities` 6 -> 4 (all four stops of "A helping hand": Greenhouse, Apiary, Animal paddock, Tool workshop, and with them honey/feed/fertilizer as available goods and the quests and daily tasks about them) and `FEATURE_LEVELS.chores` 4 -> 10. Moving chores LATER would take them from farms that already have them, so `migrateChoresLevel` (progression version 3, also what new farms are created with) adds `'chores'` to `progression.kept.features` for a guided farm that had reached level 4 (or had done a chore); it runs once per farm and keeps any other kept rights. A farm below level 4 gets chores at level 10 like a new one. The beginner step text says "Hands-on jobs open at level 4." Tests: `tests/helping-hands.test.mjs`, `tests/pacing.test.mjs`, `tests/progression.test.mjs`.
Balance to watch: a job pays 42-48 XP and a full round of four adds 60 more (240 XP per round, cooldowns 3-4 minutes) while levels 4 -> 10 cost 765 XP in total. Simulated, a farmer who only does jobs from level 4 reaches level 10 in about 10 minutes (level 6 after the first round). If that is too fast, lower `ACTIVE_STATIONS[*].xp` / `ACTIVITY_ROUND_REWARD.xp`. The starter quest "Chore time" now shows from level 10.

Slower early levels, A helping hand at level 8 (2026-09-22, supersedes the "XP curve 2" bullet and the "Hands-on jobs at level 4" entry above; live after the client is pushed AND `farm-api` is redeployed: PUSH THE CLIENT FIRST, an old client cannot read a converted farm):
- **XP curve 3**: levels 1-10 now cost 1,315 XP in total (curve 2 was 850 and flew an active beginner to level 10 in about an hour; the original 1,980). Level 2 is still 15 XP; then 55, 120, 215, 345, 515, 730, 995, 1,315; from level 10 on every step is the original one (`xpForLevel(11)` = 1,735). Curves are now a table (`EARLY_GAPS[2|3]`, curve 1 = none = the original formula); `state.xpCurve` says which one a farm is counted with; `migrateXpCurve` converts from ANY earlier curve once, keeping level and the share of progress inside the level (checked for every XP total 0-40,000 from curve 1 and curve 2); `levelOf`/`levelProgress` read a farm with its own curve until then; junk in the field counts as curve 1.
- **A helping hand at level 8** (`FEATURE_LEVELS.activities`, all four stops; was 6 originally, 4 for an hour) and **farm chores at level 10** (was 4). Both are LATER than the original, so `migrateFeatureLevels` (progression version 4, also what new farms are created with) keeps what a guided farm already had: chores from level 4, hands-on jobs from level 6, or as soon as it did one; it runs once and keeps other kept rights.
- Simulated (8 fields, water + care, sell): an active beginner is level 7-8 after the 30 minute boost and level 9-10 after about two hours (curve 2: level 9-10 after 30 minutes). Watch: a job is 42-48 XP and a full round 240 XP, so from level 8 jobs alone reach level 10 in about 9 minutes; lower `ACTIVE_STATIONS[*].xp` / `ACTIVITY_ROUND_REWARD.xp` if that is too fast.
Tests: `tests/pacing.test.mjs` (curves and conversion), `tests/helping-hands.test.mjs`, `tests/progression.test.mjs`.

Buildings dialog fixes, farmer titles every 5 levels (2026-09-22, live after the client is pushed; no server change):
- The Buildings dialog listed buildings in the order they are declared in code, not the order they unlock (Family Hall, level 10, showed first). It now sorts by `BUILDING_LEVELS` (or `minLevel` for a non-guided farm) before rendering. `public/economy-ui.js` `renderCatalog`.
- Family Hall's locked card had its own look: no lock icon, no "Locked ·" text, because `status()` gave it its own `kind:'family'` even while locked. It now only keeps that special kind (and its "Your weekly order & family" text) once it is actually open; locked, it is `kind:'locked'` with the same lock icon and "Locked · Reach level N." text as every other building.
- The top bar's farmer title stopped changing after level 5 ("Farm tycoon" forever, for up to level 95+ once fields keep expanding). `LEVEL_TITLES` in `game/farm-state.js` is now a ladder of 20 titles, one every 5 levels, reaching past the last field expansion (level 95) before it holds at "Legend of the valley". `levelTitle(level)` replaces the old 5-item array in `public/game.js`.
Tests: `tests/building-catalog-order.test.mjs`, `tests/level-titles.test.mjs`.

"Your farm menu" (the mobile More dialog) now shows everything, always (2026-09-22, live after the client is pushed; no server change): it used to hide every locked feature entirely (`el.hidden=!featureUnlocked(...)`), so a new farmer's menu had only 5 of 13 entries and the game felt emptier than it is. It now lists all 14 entries (added "A helping hand", which had no menu entry anywhere before — the only way in was the small 3D pins on the Greenhouse/Apiary/Paddock/Workshop), in the order they unlock (`FEATURE_LEVELS`); a locked one stays in place, greyscale with a lock badge (`.mobile-menu-grid button.locked` in `public/mobile.css`), its own subtitle swapped for "Reach level N.", and is a real `disabled` button so it cannot be tapped. The desktop side-tool bar (`#boosts-button`/`#estate-button`) is unaffected: it still hides what is not open, since there is no room there for a locked state. `public/progression-ui.js` `refresh()`, markup in `public/farm.html`.
Same review pass also fixed two things spotted in the Buildings dialog: cards were in declaration order rather than unlock-level order, and Family Hall's locked card had no lock icon / different wording than every other building (see the "Buildings dialog fixes" entry above). Tests: `tests/more-menu.test.mjs`.

Load-time: pinned vendor libraries and webfonts are now cached for a year (2026-09-22, live after the client is pushed; no server change): `three.module.js` + `three.core.js` + `lucide.min.js` under `/vendor/` (~2.4 MB together) and the four files under `/assets/fonts/` were served with `Cache-Control: public, max-age=0, must-revalidate` — a full revalidation round trip on every single page load, for files that (checked via git log) have never been edited in place, only added once. `vercel.json` now gives `/vendor/(.*)` and `/assets/fonts/(.*)` `public, max-age=31536000, immutable`. Everything the game itself ships (`/`, `*.html`, `/cloud/*`, and every other `public/*.js`/`*.css`/game icon) is untouched and still revalidates every load, on purpose: those change with releases and an old cached client must never run against a migrated server. Test: `tests/cache-headers.test.mjs`.
Reviewed the rest of this session's diff for correctness (in particular every coin-crediting path: `sellCrops`, `claimQuest`, `levelReward`, the XP/coin boost doubling in `applyFarmAction`) and found nothing wrong; also fixed two stray formatting slips from earlier edits (a mis-indented comment line, a stray blank line) in `game/farm-state.js`. Flagged three larger, riskier optimizations as separate follow-up tasks rather than doing them in this pass: bundling the ~23 render-blocking `public/*.css` files (and the ~20 unbundled game JS modules) for production, re-encoding oversized icon PNGs (`crops-v2.png` is 1.5 MB) to WebP, and removing or wiring up `src/presence.js`'s `createFarmPresence`, which is instantiated every session but never actually read anywhere (the leaderboard's online dot already comes from the server's leaderboard response).

Icon art re-encoded to WebP: 12.4 MB -> 2.6 MB for the 40 largest files (2026-09-22, live after the client is pushed; no server change; nothing was deleted, every original .png is still in the repo next to its .webp): the 3 sprite sheets (`crops-v2`, `goods-v2`, `interface-v2`, ~4.3 MB together) and the 37 standalone pictures ≥100 KB (family emblems, rank medals, the "grown" produce icons like `apples`/`stew`/`applejuice`, chore/activity illustrations, `vip`, `honey`, `lock`, `level-up`, `collect-all`, `instant-harvest`). Every one was checked pixel-for-pixel against a side-by-side render at full size before converting (`cwebp -q 90`; 74-86% smaller, no visible difference even on the gradient-heavy gold medals and the honey jar's glass). `game-items.png` (1.6 MB) was left untouched: it is not referenced anywhere in the client and converting an unused file saves nothing real.
This needed real care: `art()`'s `pictures` map in `public/visual-icons.js` is not the only place icon filenames are hardcoded. Also updated: `public/economy-ui.js` was already checked and does not touch any converted file (only building icons, none of which made the size cutoff); `public/vip-ui.js` (the VIP badge), `public/progression-ui.js` (the level-up celebration — `level-up` was never in the `pictures` map, it is its own hardcoded `<img>`), `public/welcome.css` (the sign-in page's decorative icon strip, its own CSS custom-property sprite lookup, independent of `art()`), and `public/play.html`+`public/farm.html` (the loading screen's three crop icons — only `apples` was large enough to convert; `wheat`/`corn` stay PNG). Every one of these was found only by an exhaustive final grep for `<name>.png` across the whole client after the "obvious" fix, which caught 4 real misses a first pass missed — worth repeating if more icons are converted later. `art()` picks the extension per key now (`webpPictures` Set in `visual-icons.js`), so an unconverted picture still correctly gets `.png`. Tests: `tests/webp-icons.test.mjs`; also updated `tests/vip.test.mjs` and `tests/chore-progression.test.mjs`, which asserted on the old `.png` paths.
Also added a `last_active_at` index on `player_stats` (Supabase migration, additive, already live): a report of the sign-in page's "N players / M online" counter loading slowly turned out NOT to be caused by a missing index (the table has 123 rows; a sequential scan of that is instant) — it is edge-function/PostgREST round-trip latency (~300-500ms measured against the live function, unaffected by the new index, confirmed by testing before and after). The index is harmless and helps once the table is much larger, but does not fix the reported slowness. A real fix would combine the function's two separate `count` queries (already run in parallel, so the win is only the second round trip) into one, e.g. a Postgres function called once via `.rpc()`; that needs a new SQL function plus an edge function code change and redeploy of `supabase/functions/player-counts`, not done here.
Reconsidered and abandoned an earlier plan to remove `src/presence.js`'s `createFarmPresence`: a first pass concluded it was dead code (nothing reads `bridge.presence`), which was wrong — an incomplete grep excluded matches in `src/game-cloud.js` (its filename contains "cloud", which an earlier `grep -v cloud` filtered out) and missed a line in `src/main.js` past a truncated read. It is very much alive: `presence.setRows(result.rows)` runs on every leaderboard fetch, and `presence.subscribe()` in `game-cloud.js` repaints the leaderboard's online dots every second from that data between fetches, without extra requests. Left untouched.

New farms also start with 6 barley, kept for the first 30 minutes (2026-09-22, live after the client is pushed AND `farm-api` is redeployed): `STARTER_ITEMS.barley=6`, `STARTER_KEEP.barley=6` — same rule as corn and animal feed (`sellableStock`/`keptStock` already generalise over any item in `state.keep`, no new mechanism needed). Barley itself unlocks for planting at level 5 same as before; a beginner just already has a first batch for the Mill's barley-feed recipe (also level 5) once they reach it. Tests: `tests/beginner-sprint.test.mjs`.

Bug fix: "A helping hand" in the mobile More menu opened Silo research instead (2026-09-22, live after the client is pushed; no server change): when `data-menu-utility="activities"` was added to the More menu this session, `game.js`'s `openUtility(key)` routed anything that wasn't `'stall'`/`'chores'` to `retention.openUtility(key)`, whose `renderUtility()` only ever understood `'tractor'` — everything else, including the new `'activities'`, silently fell through to its `else` branch and rendered Silo research (which then looked broken/locked to a player below level 18). `openUtility` now sends `'activities'` to `activities.open(Object.keys(ACTIVE_STATIONS)[0])` instead — the same dialog a station's 3D pin opens, starting at the first stop; "Your farm round" still shows and tracks all four. Test: `tests/more-menu.test.mjs`.

"A helping hand" opens a hub first: a clean 2x2 of all four stops (2026-09-22, live after the client is pushed; no server change): the More-menu entry used to jump straight into whichever station came first (Greenhouse) — confusing when you wanted the Apiary. It now opens `#activities-hub-dialog` (`public/activities-ui.js` `openHub()`/`renderHub()`), a small grid reusing the Buildings catalog's own `.building-catalog`/`.building-card` style: icon, name, one status pill ("Ready to help" / "Working · N/3 done" / "Returns in Xm"), no description text, no chevron on mobile — tap a card to open that station's job screen. Stays 2 columns on mobile too (`public/mobile.css`, `#activities-hub-dialog .building-catalog`), unlike the Buildings catalog which drops to one column there (its cards carry more text). Tapping a station's own 3D pin in the world still opens that station directly, unchanged — only the menu entry (which has no specific station in mind) goes through the hub. Bonus: the "Your farm round" strip (in the hub and in a station's own dialog) is now a row of tappable buttons, so you can jump straight from one stop to another without a trip back through the hub; only the stop already open is disabled. Tests: `tests/activities-hub.test.mjs`, `tests/more-menu.test.mjs`.

Building upgrades no longer wait for a running batch to finish (2026-09-22, live after the client is pushed AND `farm-api` is redeployed): `upgradeBuilding` used to throw "Finish and collect all current batches before upgrading" whenever any job was in progress. A running job's speed and output were always fixed at the moment it started (stored on the job itself, never re-read from the building's current level), so there was nothing that restriction was actually protecting — it just made a farmer wait. Upgrading now succeeds at once: the running batch keeps its own time and reward untouched, and the new, higher slot count (`productionSlots` reads the building's level live) is usable immediately for the next batch. `public/economy-ui.js`'s upgrade buttons and their note text no longer wait for `jobs.length` either. Tests: `tests/estate-upgrades.test.mjs`, `tests/production-slots.test.mjs`, `tests/diamond-options.test.mjs`.

Activities hub UX fix: a stop already counted this round showed a checkmark in front of "Ready to help" on its card (2026-09-22, live after the client is pushed; no server change), reading as both done and not done at once, and — since the icon only appeared on that one card — visibly shifting its "Ready to help" text out of line with the other three cards' pills (looked off-centre). The round strip above the grid already has its own clear marker for "already counted this round" (a different background colour and a checkmark badge on the stop's own icon), so the card's status pill no longer repeats it; it now only ever says what tapping the card right now would start. Test: `tests/activities-hub.test.mjs`.
Completing all four "A helping hand" stops in one round now also pays coins (2026-09-22, live after the client is pushed AND `farm-api` is redeployed): `ACTIVITY_ROUND_REWARD` was `{coins:0,xp:60}` — the round strip's own "All four stops: +0 coins · +60 XP" label was promising a coin reward that never actually paid out. Changed to `{coins:250,xp:60}`. Each individual stop still pays XP only (unchanged, `ACTIVE_STATIONS[*].coins` stays 0) — only finishing all four in one round pays the flat 250-coin bonus, on top of its XP. The completion toast now also names the coins on that last stop (`Farm round bonus: +250 coins!`), matching how quest-complete toasts already announce their coins. Tests: `tests/activities.test.mjs`.

RLS/grants audit (2026-09-22, already live — read-only checks plus one small additive fix): went through every public-schema table and function. All 19 existing tables have RLS enabled; 15 have zero policies (service-role only, via edge functions), and the 4 with a policy (`player_farms`, `player_stats`, `notification_settings`, `push_subscriptions`) are each correctly scoped to the caller's own row or, for `player_stats`, intentionally public (it is the leaderboard — `src/leaderboard.js` reads it directly, `currency`/"Most coins" is a real ranking category). All `harvest_*`/`notification_*` RPCs are correctly locked to the service role, except `harvest_stamp_player_stats` — a BEFORE INSERT/UPDATE trigger on `player_stats` that still had Postgres's default PUBLIC execute grant, unlike every other internal function. Not actually exploitable (`NEW` is unbound outside a real trigger fire), but inconsistent with the pattern everywhere else; revoked EXECUTE from `anon`/`authenticated` (migration `revoke_public_execute_on_stats_trigger`, additive, does not affect the trigger itself).

Admin gift panel: floris@millstone.nl only, coins/XP/diamonds, with an optional player notification (2026-09-22, live after the client is pushed AND `farm-api` is redeployed): opening any farmer's profile (leaderboard → search → a farmer) now shows an "Admin gift" box above "Back to leaderboard" — but only when signed in as `floris@millstone.nl`; everyone else's dialog is unchanged (`src/player-profiles.js`, `checkAdmin()`, lazily imports `./supabase.js` so every other test that loads this file does not need the real Supabase package installed). Enter any of coins/XP/diamonds, confirm, and it is added to that farmer's balance through the exact same `harvest_commit_farm` RPC every ordinary action already commits through — a new `admin_grant` operation on `farm-api` (`supabase/functions/farm-api/admin-service.js`), gated on `user.email` from the verified JWT (never anything the client claims), with its own per-gift caps (1,000,000 coins/XP, 5,000 diamonds — diamonds are the currency the Stripe packs sell) and a `admin_grants` audit table (who, whom, how much, when; RLS-locked like every other internal table).
Optional: ticking "Notify the player" (with an optional short message) queues a `state.pendingGift`, delivered once on that farmer's own next load (`farm-api index.ts`, same delivery point as level/chapter rewards — no separate push channel needed) and shown as a small "Donation!" popup with an icon per currency actually given, and the note if there was one (`public/game.js` `giftPopup()`, `#gift-dialog` in `public/farm.html`, styled like the level-up celebration in `public/progression.css`). The message is only ever set with `.textContent`, never interpolated into HTML.
Tests: `tests/admin-grant.test.mjs` (the service + index.ts wiring), `tests/admin-gift-popup.test.mjs` (the popup), `tests/player-profile-navigation.test.mjs` and `tests/online-client.test.mjs` (extended for the admin box and the gift delivery path).

Admin gift panel: polish + a real bug fix + seeds/goods (2026-09-22, live after the client is pushed AND `farm-api`
is redeployed): after the first version shipped, live testing turned up that giving coins to yourself showed
nothing — not even after a hard refresh. Root cause: `farm-api` had not actually been redeployed yet after the
commit that added `admin_grant` (confirmed on the live project: the deployed function had zero references to it),
so every grant was silently rejected as "Unknown request." and nothing was ever written. Not a code bug — but
while investigating, a real one was found alongside it: gifting *yourself* while your own farm is open in the same
tab does write to the database correctly, but your own already-loaded `state` has no reason to refetch on its own,
so the coin counter and the "Donation!" popup would still not show until a manual reload. Fixed: `give`'s success
handler now calls `window.harvestRefresh?.()` when the target is the signed-in player — the same reload path a
reconnect already uses — so both the balance and the popup (if notify was on) catch up immediately.
Also, per feedback: the box moved above the farmer's own profile content (the reason the dialog was opened, not an
afterthought below the stats); every field now carries its own icon (`art()`); the Give button is a proper
`.primary-button`; the native `confirm()` was replaced with the game's own `confirmAction()` dialog
(`public/confirm-dialog.js`, already used for the "sell all crops" confirmation); and the "Donation!" popup got a
big icon at the top, matching the level-up celebration.
New: the panel can now also give any single crop or production good (a dropdown grouped "Crops" / "Goods
produced", plus a quantity) — it lands in the target's inventory and counts exactly as actually getting it would:
a crop bumps `harvest_<crop>`, the `harvested` total and mastery progress (the badges players chase); a produced
good bumps `goods_produced` and its own `made_<item>` stat. Coins/XP/diamonds still touch no stats, as before.
Tests: `tests/admin-grant.test.mjs`, `tests/player-profile-navigation.test.mjs`, `tests/admin-gift-popup.test.mjs`.

Factory recipe list: grouped by source building and collapsed (2026-09-22, live after the client is pushed; no
server change): the Factory repeats every other building's whole recipe catalogue in bulk (31 recipes — one mass
version of every base recipe, plus bottled honey), which read as one very long scroll; every other building's own,
short recipe list was already fine as a flat list and stays exactly that. `public/economy-ui.js`'s per-recipe card
markup is now a shared `recipeCard(rid,r)` function; the Factory alone wraps its cards into `<details>` groups
("From the Dairy", "From the Bakery", …, "Honey bottling"), collapsed, reusing the same visual language as
`.future-unlocks`. Tests: `tests/factory.test.mjs`.

Factory follow-up: the pre-purchase preview had the same huge-scroll problem (2026-09-22, live after the client
is pushed; no server change): the previous fix only grouped the Factory's *working* recipe list (once built);
the "Bring this building to life" preview shown before buying it (`.construction-recipes`) builds its own,
separate flat list of the same 31 recipes and was untouched — still one very long scroll. Moved the grouping into
a shared `foldFactoryGroups()` helper (plus `sourceOf`/`sourceLabel`, now declared once at the top of
`renderBuilding` instead of duplicated) and used it for both lists. Test: `tests/factory.test.mjs`.

Factory preview: bottled honey now shows its coin cost (2026-09-22, live after the client is pushed; no server
change): the "Bring this building to life" preview (shown while the Factory is still locked/not built) builds its
rows from `itemList(r.input)` directly, not `costList()` — bottled honey has no ingredients, only a 5,000-coin
cost, so its row showed as a bare arrow into a honey icon, no coins mentioned at all. `previewCard()` now also
shows the coin cost when a recipe has one, same as the working recipe list already did.

Factory upgrades cost double (2026-09-22, live after the client is pushed AND `farm-api` is redeployed): every
production building's levels 10-20 upgrade shared the exact same coin price (`ESTATE_UPGRADES`), fine for a
100-1,400 coin building, but the Factory alone was built for 100,000 coins and effectively substitutes many
buildings' worth of production. `FACTORY_UPGRADE_MULTIPLIER=2` (`game/farm-state.js`) doubles `upgradeCost` for the
Factory only, at every level (1-9's own base price, and the shared 10-20 steps); nothing else — construction cost,
production speed/slots, and the diamond-upgrade alternative — changed. Deliberately no note about this on the
upgrade panel itself (asked for, then explicitly withdrawn) — the price shown is simply higher. Test:
`tests/factory.test.mjs`.

New: a separate admin dashboard at /admin.html — floris@millstone.nl only (2026-09-22, live after the client is
pushed AND `farm-api` is redeployed): who is online right now (the same 30-minute rule the leaderboard's online
dot already uses), the last 14 real signups (including one that signed up but never opened a farm — still worth
seeing), and a 7-day retention cohort. This is its own small page, not part of the main game bundle — it opens
straight to the dashboard if this browser already has a floris@millstone.nl session (same Supabase session
play.html keeps, same origin/storage), otherwise a plain sign-in form.
Three new read-only `farm-api` operations (`admin_online`, `admin_recent_players`, `admin_retention`,
`supabase/functions/farm-api/admin-analytics-service.js`), gated the same way `admin_grant` is — the account is
checked server-side from the verified JWT, never anything the page claims about itself. Reading real signup times
needs `auth.users`, which is not exposed through PostgREST; a narrow `admin_auth_signups` SQL function (additive
migration, EXECUTE revoked from anon/authenticated, real accounts only) is the only way in, the same pattern
`notification_subscribe` etc. already use.
The retention numbers are a stated approximation: "still active by day N" (last_active_at at or after signup-day +
N), not exact day-N-active retention — the game keeps no daily activity log to reconstruct that after the fact. A
day-offset that has not elapsed yet shows as "—", never a false 0%.
Build: `scripts/build-cloud.mjs` now has a third Vite entry (`admin:'src/admin.js'` → `public/cloud/admin.js`),
alongside the existing `cloud`/`game-cloud` ones — picked up automatically by the normal `npm run build:static`
Vercel already runs, no extra step. Tests: `tests/admin-analytics.test.mjs`.

Admin dashboard moved into the game itself, not a separate page (2026-09-22, live after the client is pushed AND
`farm-api` is redeployed): the earlier /admin.html + its own Vite build entry (src/admin.js, its own sign-in form)
is removed — one extra page and a second sign-in flow was more than this needed. Instead: a shield icon in the
topbar (`#admin-button`, hidden for everyone else), shown only once `checkAdmin()` (exported from
player-profiles.js, the same check the gift panel already uses) says yes, opening a dialog inside the game
(`src/admin-dashboard.js`, `createAdminDashboard(bridge)`, initialised once in `game-cloud.js` alongside the
player-profile/gift panel). Same three farm-api operations and the same `admin_auth_signups` SQL function as
before — nothing changed server-side. Tests: `tests/admin-analytics.test.mjs`, `tests/farm-ready.test.mjs`
(needed a `createAdminDashboard` mock added to its existing game-cloud.js sandbox).

Bug fix: every admin dashboard call showed "Your session has ended" (2026-09-22, live after the client is pushed
AND `farm-api` is redeployed): `bridge.request()` in `src/main.js` checks every farm-api response's
`profile.player_id` against the signed-in caller — a stale-tab/concurrent-session guard every reply is expected
to satisfy (every other handler already injects it: see `player-profile-service.js`'s own `respond()`). The three
new admin_* operations, and `admin_grant` itself, did not — a response with no `profile` field fails that check
too (`undefined !== a real uuid`), so a perfectly successful request still looked like a dead session on screen.
Fixed in both `admin-service.js` and `admin-analytics-service.js`; regression tests added so this cannot silently
come back. Caught live: the dashboard opened and looked right, but every section stayed empty with "Your session
has ended." where the data should have loaded.

Admin dashboard: visual polish (2026-09-22, live after the client is pushed; no server change): each card now
has its own line icon in the heading (radio for online, user-plus for recent players, trending-up for retention —
converted the same way every other plain icon-button in the game already is). Every player, online or in the
recent-players table, shows as a small initials-avatar circle, with a green corner dot when online (reuses the
game's own `.online-dot`/`.is-online` class, the same one the leaderboard uses). Retention percentages are now
colour-coded (green ≥50%, amber ≥25%, red below) so a pattern reads at a glance; the exact "N / total" figure is
still in the cell's title on hover. Tests: `tests/admin-analytics.test.mjs`.

## 2026-09-22 — ChatGPT retention update, cleaned up

- **Farm events**: the Events button sits next to Quests (desktop side tools) and as a card next to Daily rewards in the
  More menu (phones); no icon in the topbar. Below level 10 it follows the other locked features: hidden on desktop,
  greyed with a lock in More. The dialog is built from existing pieces (estate-intro, family-order-line, task-row,
  family-extra) and shows rewards to collect first, then the live event (or the next one during the break), and the
  top 10 with what each farmer earns (top 3 as podium cards).
- **Automatic events** (`supabase/live-events-schedule.sql`, migration `harvest_auto_live_events`, applied live):
  a 5-hour event starts every 6 hours (00/06/12/18 UTC), then a 1-hour break. pg_cron job `harvest-event-schedule`
  (every 15 min) creates the running event + the next two (deterministic id per slot) and settles ended ones.
  Five templates rotate; no deliveries (the order board can run empty). Rewards: 200 coins, 1–2 diamonds, pool 50.
- **farm-api `events`** (players): only running/upcoming/last-day events plus unclaimed rewards (30 days), a
  best-effort schedule fallback, `eligibility` (level, 48h, verified) and `standings` (top 10 + your rank).
- **Daily sharing**: calm entry card on the Family Members tab; its own screen with portraits, per-member Help/Gift,
  requests with stock checks, an item/quantity picker and a back link to the family.
- **Welcome Back**: a gift-style card with one button straight to what is waiting; no second "Welcome back" toast.
- **Chores**: the bonus is now goods (2 wheat, 2 lettuce, 2 corn, 1 apples, 1 cauliflower, 1 pumpkin) instead of
  extra coins/XP. The bar fills to the chore's own maximum; a find and a plain result look clearly different.
- **Market**: a card per item in stock (bigger art, coin icons, stock on the right), a compact price list for the rest.
- **Leaderboard** only ranks; your profile, name change and sign-out moved to the top of Settings. "Goods produced"
  chip is now "Goods made" (one line).
- The two new icons were 1.2–1.7 MB PNGs; now 384px with ~30–40 KB WebP versions.
- Deploy: farm-api (event-service.js, farm-state.js) and the frontend. Migration is already live.
- **Podium prizes** (migration `harvest_event_podium_prizes`, applied live; `supabase/live-events-podium.sql`): the
  first three to finish an event get +300 coins +2 diamonds, +200 +1, +100 +1 on top of the usual reward. Same
  numbers in `harvest_event_settle`, `PODIUM` (farm-api standings) and `PODIUM_PRIZES` (event screen); a test keeps
  them equal. The 6-event-diamonds-a-day cap at claim still applies.
- **Factory**: "What shall we make?" shows each source with its building art, the goods it makes, the recipe count and
  a green "N ready" badge; a "Ready now" filter lists only what can start right away; open groups stay open after an
  action. Slots: one every two levels, up to five (reached at level 9) — `FACTORY_MAX_SLOTS`; five keeps the rule that a
  level-20 specialised building always beats the Factory for the same good. Needs a farm-api redeploy (farm-state.js).
- **Tool dock**: Plant → Water → Care → Harvest (keys 1-4 follow). The tools sit straight in the dock; the chosen one
  only gets a soft fill (no frame, no box in a box). On phones: icon above the label, and no extra outline around the
  dock inside the bottom panel.
- **Installed app (PWA)**: a solid band in the app green behind the white status-bar text (instead of a dark veil over
  the farm); centred pop-ups stay clear of the notch and home indicator. Not tested on a physical iPhone.
- **Backdrop click** closes every open dialog through one delegated listener (dialogs created later, like events,
  sharing, Welcome Back and the starter pack, were missed). `data-keep-open` opts out (sign-in dialog).
- **Starter pack** fits a desktop screen without a scrollbar (four crops per row).
- **Less text** in menus (one short sentence each): quests, market, today, boosts, estate (projects, stall, chores,
  mastery), windmill/bakery notes, slot and upgrade notes; recipe cards now say "+N coins more than the ingredients".
- **Diamonds & boosts** opens like every other phone sheet (full width); empty "choose a field/batch" pickers become a
  single "No crops growing / No batches running" chip.
- **Toasts** (`public/toast-ui.js`): a painted icon in a tinted circle, a tone (reward, warning, info), "+N coins/XP/
  diamonds" as chips, a soft spring in and a timer bar. Messages are escaped before chips are added.
- **Beginner guide**: progress bar with the diamond reward, a timeline where only the current step shows its
  explanation, and an XP chip on every open step (also on the in-game beginner card).
- **Estate**: one lead line per tab (no big heading + paragraph), all four tabs on one row on phones ("Stall"),
  compact requirement chips, "The road ahead" folded into a details block, fewer notes.
- **Juice**: floating field rewards are chips with pictures; phones get an XP ring around the level badge; a short
  vibration on harvest, sale, reward, diamonds and level-up (`public/haptics.js`, touch devices only); an empty
  market offers "Go to your fields" / "Open buildings".
- **Tractor**: a status pill (Ready / Resting · Ns), the crop you plant as a chip that opens the crop picker, one card
  per job with fields and a coin price (or why there is nothing to do), and the fuel rule as one small line.
- **Seed shop**: one compact row per crop (picture, name + pace pill, time · sell price · use, seed price chip), the
  chosen crop framed in gold with a check; intro and yield guide are one line each. Planting floats "Planted" plus the
  seed cost as its own chip.
- **Diamonds & boosts (phones)**: each boost is one row with its price button on the right, status chips stay on one
  line, VIP plans sit side by side and the diamond packs are a 2x2 grid (about 27% shorter).
- **Player counts on the sign-in page**: shown at once from the last numbers remembered on the device (at most a day
  old), then refreshed; a failed request is retried after 3 and 10 seconds (it used to wait a minute, so the line
  often only appeared after a refresh); a background tab asks when it is shown; play.html preconnects to Supabase.
  Live logs (24h): p50 300 ms, p90 550 ms, cold starts up to 4.2 s, 8 of 482 requests failed.
- **Event progress fix** (migration `harvest_event_progress_baseline`, live; `supabase/live-events-baseline.sql`): the
  trigger skipped every save within 10 s of the last counted one and lost those deltas, so quick field-by-field play
  barely counted (e.g. 4 care counted after dozens). Each `live_event_players` row now keeps a `baseline`; progress =
  stats now − baseline. The 10 s only limit the contribution counter. Non-event stat increases (admin gifts,
  transfers, unrelated actions) move the baseline. Verified on production in a rolled-back transaction.
- **Six more leaderboards** (migration `harvest_more_leaderboards`, live; `supabase/leaderboard-more.sql`): events
  finished, longest daily streak (`login.best`), biggest farm (fields), chores, helping-hand rounds, estate projects.
  `harvest_commit_farm` untouched: a BEFORE trigger `player_stats_extras` fills the columns from the farm state and
  never blocks a save; settlement refreshes `events_finished`. Verified in a rolled-back transaction (0 mismatches).
- **Leaderboard UI**: a slim search field (helper text only while typing), "Rank by" as one line with the current
  board that folds open, rows as cards with podium tints, the online dot on the portrait and names on one line.
- **Family**: "This week" puts the order first and folds "Your rewards" below it (open when complete); order lines
  without stock show no disabled buttons; a shorter delivery note. Tournament shows one empty-state line instead of
  three empty places and no duplicate prize sentence. The invite search matches the leaderboard's slim search field.
- **Production buildings**: recipe cards have a head (picture, name, time, profit, XP), one row of small ingredient
  chips with the result, and the stepper next to an equally tall start button; status only when something is
  missing. Running batches are one row each (picture, name, amount, time left, bar) with Collect only when ready.
  Bakery on a phone: 3218 → ~2400 px.

## Collect all fix (production buildings)
- Since the compact batch rows, the old rule `.job-panel > .primary-button{width:100%}` made each row's Collect
  button as wide as the row, pushing the text out (phone and desktop). The row button now keeps its own width.
- Collect all is one calm green row: picture, "N batches ready", what it brings in ("6 Eggs · 2 Milk") and the
  button; on screens under 360px the button gets its own row. Ready batches hide the (full) bar and just say "Ready".

## Farm journal
- Level card: "Level N in X XP", the XP bar and the level-up reward as coin/diamond chips (no tagline).
- Four lifetime tiles, counted the way the leaderboards count: crops harvested (all harvest_* quantities), goods
  made (all made_* quantities, from honey to berry tart), quests done and deliveries. 2×2 on phones.
- Your collection has two tabs: Crops (discovered crops, "N picked") and Goods (every good, found once made at
  least once, "N made"). Compact cards, four across on phones.
- "Next on your farm" became "Coming up": picture, name, what it is (New crop/New building/New field/Recipe) and a
  level pill; the explanatory paragraph is gone. tests/journal.test.mjs covers it.
- Honey in the journal also counts the jars collected at the Apiary (finished Apiary jobs × 3), not only Factory
  honey; the "goods made" tile stays production only, like the Goods produced leaderboard.

## Quests
- Top: one progress line ("N of 150 quests done" + bar) instead of the intro sentence and the summary text; the
  Ready/In progress/Completed tabs use the light tab style with a count badge (green for Ready).
- Each quest is a card with its own picture (questArt: the crop/good/building/job it counts, e.g. made_eggs → eggs,
  watered → water can), a bar with "3 / 12", and the reward as a coin chip plus an XP chip (quests always paid
  XP; it was never shown). Ready cards are green with a Claim button; completed cards say "Completed ✓".
- Claim all (two or more ready): shows the total coins and XP and claims one by one with the normal quest action
  (no server change), continuing while newly revealed quests are ready too; one toast at the end.
  game.js claim(id,{quiet}) skips the per-quest toast for this.

## Farm stall, Farm buildings, Daily challenges, Delivery orders
- Farm stall: one card with the stall picture, coins waiting, a bar and "Full in 3h 12m" / "Full · collect to keep
  earning" (gold ring when full), Collect beside it; three fact chips (coins an hour, storage, level); the upgrade
  as "Level N" with gain chips (+18 an hour, +4h storage) and an Upgrade button with the price.
- Farm buildings: intro sentence and Grow/Produce/Sell strip removed; each building is a compact row (picture,
  name, level, coloured status pill: green ready, gold working, grey idle), two columns on desktop; "N recipes
  ready" is gone. Tractor, Silo research and Delivery cart are three small tiles under "Around the farm".
- Daily challenges: one bonus card ("Finish all three for a bonus" + chips, 0/3), then quest-style cards with a
  picture (questArt), a bar and coin/diamond/XP chips; Claim only when done, "Collected ✓" after.
- Delivery orders: one line "3 open orders · 3 ready to deliver"; each order shows tier + "+28% vs market", the
  title, the goods (missing ones marked), reward chips and Deliver; the story, the explanation paragraph and the
  "Market sale / Delivery bonus" line are gone. Replace sits in a small fold under the card.
- Shared: .reward-chips in retention.css (coins, diamonds, XP) and rewardChips() in retention-ui.js.
- Daily streak (top of "A new day on the farm"): the painted streak flame with "N-day streak" and your best, a big
  streak number; seven compact day tiles on one row (no side scrolling; check when collected, gift on day 7); today's
  gift as coin/diamond chips beside Collect. After collecting: "Collected today" and a calm "✓ Back tomorrow"
  instead of a disabled button.
- The streak leads with diamonds (the reward that matters): day tiles show each day's diamonds (day 7 the gift
  picture), today's gift chips and the check-in toast put diamonds before coins. rewardChips() keeps the order given.

## Starter Pack
- Rebuilt so it fits a phone without scrolling (558px instead of 905px): picture, name and a "20h left" pill;
  300 diamonds first (blue) and 10,000 coins; the twelve crops as one strip of small pictures ("+ one of every
  crop", names on hover); one "Buy for €2.99" button and "One purchase per account." The intro sentence, the
  crop names with ×1 and the storage explanation paragraph are gone. src/starter-pack-ui.js (goes live with the
  Vercel build) + public/starter-pack.css. Payment flow, texts while pending and eligibility are unchanged.

## Finish crops / Finish batches (diamond shop)
- "Finish one crop" / "Finish one batch" became "Finish crops" / "Finish batches": tick one or more fields or
  batches (Select N picks as many as your diamonds cover, Clear, Done); the button shows the total (10 each, e.g.
  "20 · Finish 2 crops"). Each one is still the normal finish_crop / finish_batch action (no server change), sent
  one after another; it stops at the first problem. A total of 150+ diamonds asks for confirmation first, like
  the big boosts. The batch card now has a building picture and the crop card a harvest picture, so the two are
  easier to tell apart. batchPicker got the same multi-select mode as the fertilizer field picker.

## Silo research
- One line on what it does (silo picture), the bonus you have now as two tiles (seed price, growing time; "0%"
  before any research), five steps with checks, and the next level as gain chips (−5% seed price, −10% growing
  time, +20 XP, matching upgradeSilo) beside Research with the coin price. At level 5: "All research done" and the
  disabled "Research complete ✓". The paragraph and the three stat boxes are gone; "Crops already growing keep
  their time." stays as one small line.

## Privacy policy, account deletion page, Google/Facebook sign-in
- public/privacy.html (https://www.harvesttycoon.com/privacy) and public/delete-account.html (/delete-account, for
  Meta's data deletion instructions), shared public/legal.css in the welcome page style. vercel.json rewrites give the
  clean URLs. Neither page loads a script (no GTM, no Pixel); tests/social-login.test.mjs checks that.
- Controller: Millstone, Acacialaan 18, 2282 AX Rijswijk, KvK
  89795857, floris@millstone.nl. Age: 16 and over (decided by the owner).
- Content is based on the live setup as of 23 Sep 2026: Supabase (eu-central-1, Frankfurt) for auth/database/
  functions, email + password only (212 email identities, no social ones yet), Stripe Checkout, Resend (daily email
  summary is live), web push (live), all reminders opt-in (defaults false), Vercel hosting, self-hosted fonts.
  GTM-NPF56JVR loads GA4 (G-XKY54Y1YKE) and the Meta Pixel (1378934253927674, PageView) on every visit WITHOUT a
  consent step; the owner chose to keep them running and describe them honestly. The policy therefore states no
  legal basis for those two tools. Dutch cookie rules normally require prior consent for tracking/advertising
  cookies: when a consent banner is added, update section 8 and the legal-basis list.
- Landing page: a one-line "For players aged 16 and over · Privacy Policy" under the sign-in card and a tiny footer
  (© 2026 Harvest Tycoon · Privacy Policy), pushed further down on phones. The deletion page is deliberately not in the
  footer (it is for Meta); the policy links to it in section 11.
- Sign in with Google / Facebook: src/social-login.js + main.js. Two compact buttons ("Google", "Facebook", accessible
  names "Continue with …") above a thin "or use your email" line, on the sign-in and create-account cards only.
  They stay hidden until the provider is switched on in Supabase (read from /auth/v1/settings), so nothing broken
  shows before setup. Uses signInWithOAuth with redirectTo /play.html; a new social player without a player name
  gets the existing "Meet your farmer." step. A cancelled/failed return says "Signing in with Google did not work…"
  instead of "That link has expired". To switch it on: Supabase → Authentication → Providers → Google / Facebook
  (client ID + secret from Google Cloud / Meta for Developers; their redirect URI is
  https://jnmdirvidffzxukbdmij.supabase.co/auth/v1/callback), and keep https://www.harvesttycoon.com/play.html in the
  allowed redirect URLs.
- Deletion requests are handled by hand. Deleting a user in the Supabase dashboard currently fails for many players:
  harvest_purchases.player_id is ON DELETE RESTRICT and family_*, live_event_players, family_social_* and admin_grants
  are NO ACTION. Delete or anonymise those rows first (purchases: keep, the account then stays as an anonymised shell
  with its email changed), or ask for an admin delete function.
- 404: public/404.html (Vercel serves it for every unknown URL): the farm behind a cream card with the tractor, a big
  404, "This field is empty." and "Back to the farm"; noindex, no scripts, absolute paths so it works at any depth.
- Google blocks OAuth inside in-app browsers ("disallowed_useragent"). Visitors from Meta ads land in the Facebook /
  Instagram browser, so there (and in Threads, TikTok, Snapchat, LinkedIn and Android web views) the Google button is
  left out; Facebook and email stay (social-login.js embeddedBrowser/usableProviders). Detection uses named app markers
  only, so the iPhone home-screen app (no "Safari" in its user agent) keeps Google.
- Facebook sign-in on the web always uses Facebook's login page in the browser (also Chrome on iPhone); only native
  apps with the Facebook SDK can switch to the Facebook app.
- Silo research: the five-step track is removed again (owner's request); the next level reads "Level 2 of 5".

## How to play
- Rebuilt (public/farm-guide.js, #help-content): the loop Plant › Harvest › Make › Sell in four pictures, then three
  short groups ("The basics", "Grow your farm", "Good to know") of cards with one sentence each; features that are not
  open yet show "Level N" (helping hand 8, family 10, events 10). Two columns on desktop. Title "How to play" like the
  menu entry. The water/care line follows harvestYield (+1 crop each, double XP for both).
- More menu: locked entries line up after the open ones, lowest unlock level first (CSS order on the grid item,
  100 + level), so a locked Farm events card sits with the level-10 entries instead of next to Daily rewards; once open,
  every entry is back in its usual place (events beside Daily rewards).

## Settings
- Every part is one calm card: account, avatar, sound, reminders, app. The account card shows your avatar (72px) and
  farmer name with Your profile / Change name / Sign out.
- A name the game picked at sign-up ("Sunny Acres 4821", account-form.js isRandomPlayerName, same word lists as
  randomPlayerName) gets a gold "Make the name your own" card with "Choose my farmer name" (empty field; the dialog
  button says "Save my name" from Settings, "Join the leaderboard" from the leaderboard). The separate Change name
  button is hidden while that card shows.
- Sound: the on/off switch sits on the heading's row; the intro sentence and slider descriptions are gone; "Play a test
  sound" is a small link. Sound and reminder tick boxes are real switches (role="switch").

## Admin dashboard
- Painted admin icon public/assets/icons/admin.svg (blue shield, gold rim and star), art key 'admin' (svgArt; lucide
  'shield' maps to it). Used on the More-menu card and in the dashboard heading; the desktop topbar button keeps a
  line icon like the other topbar buttons.
- Dashboard: three headline numbers (online now, new today from today's retention row, kept on day 1 weighted over
  the week), online chips, "Newest players" as a list (Level · coins, or "Never opened a farm", and "5h ago"), a
  shorter retention note. The farm-events controls are removed (src/admin-events.js deleted); events are fully
  automatic. The server's admin_events operation is left in place and unused.

## Family sharing with every crop and good (migration harvest_family_sharing_all_items, LIVE)
- supabase/family-sharing-all-items.sql, built from the live harvest_social read on 23 Sep 2026 and tested on the
  live database in a rolled-back transaction (gift 4 bread, request + fulfil 2 berry tart, an old gift without item =
  3 wheat, "diamonds" and 6 refused). Applied as migration harvest_family_sharing_all_items; afterwards the function
  holds all 40 items, the request item check is a format check, and only service_role can execute it (unchanged).
- Rules: a gift and a request are 1–5 of any crop or good; help stays 5 coins; all limits unchanged (level 10, 48 h
  on the farm, 24 h in the family, 3 sent / 3 received per kind a day, once per pair, one request a day). Nothing is
  created: goods move from one farm to the other.
- The item list lives in the SQL function (old farms do not all have every inventory key, so "is it in your
  inventory" is not a safe check). tests/family-sharing.test.mjs fails when ITEMS and that list differ: a new item
  needs the function updated too.
- UI (public/social-ui.js): Gift opens a picker under that member (everything you have in storage, with counts, 1–5
  up to your stock); Ask for goods lists every crop or good you have unlocked. Toasts name the item ("You sent 4
  Fresh bread to Anna."). The reply now also carries kind, item and quantity.
- No edge function change: farm-api passes the action through unchanged.

## Buildings that are not built yet
- The header says "NOT BUILT YET" instead of "LEVEL 1". The panel shows one status line: "Ready to build" (hammer) or
  "Opens at level 21" with "You are level 20 · almost there" / "30 levels to go" (lock); then "Makes" as picture chips
  of everything the building can make (six, then "+N more"); the full recipes folded under "See all N recipes"; and a
  Build button with the coin price only when it can be built ("You need N more coins" below it if short). A locked
  building shows the price as plain information instead of a greyed-out button. The buildings list says
  "Build for N coins".

## Speed pass and home-page SEO (24 Sep 2026; website only, no farm-api deploy needed)
- Music: public/assets/audio/harvest-meadow.flac (1.5 MB) is loaded first, the WAV (6.9 MB, sent uncompressed by
  Vercel) only if the FLAC cannot be fetched or decoded. FLAC is lossless: its built-in checksum equals the WAV's
  sample data, and Chrome decodes it with 0 samples different, so the seamless loop is unchanged.
- Pictures: the 23 remaining pictures of 40 KB or more and the 5 place renders are now WebP (same pixel size, about a
  quarter of the weight; checked side by side at 2x). The Buildings list and a building page ask
  `pictureFile(name)` in public/visual-icons.js instead of hardcoding `.png` (it opened ~815 KB of PNG before). The
  small building pictures (farmhouse, mill, dairy, coop, bakery, packing, stall, chores, factory) stay PNG. Every PNG
  original stays on disk. A new picture: add the WebP next to the PNG and its name to the list in visual-icons.js.
- Logo: every `<img>` uses harvest-tycoon-logo.webp (192 KB, full 1024 px) instead of the 696 KB PNG.
- Code: refreshArt() only calls lucide.createIcons() when an icon is still undrawn (Lucide keeps data-lucide on its
  svg, so it redrew every icon twice a second from the game loop). The map labels read the view size once per update
  instead of once per label (a drag step went from about 3.2 to 1.65 ms here). The building status lines are only
  written when their text changes.
- SEO (public/play.html, which the build also serves as /): title "Harvest Tycoon — Free Online 3D Farming Game",
  a 151-character description, canonical https://www.harvesttycoon.com/, Open Graph and Twitter card with
  public/assets/og-image.jpg (1200×630: the welcome farm with the logo), and WebSite structured data.
  public/robots.txt (everything open except the bare /farm.html frame) and public/sitemap.xml (/ and /privacy).
- Favicon: /favicon.ico (16, 32, 48 px) and /assets/favicon-96.png (Google wants a multiple of 48 px), both made from
  the app icon (assets/pwa/icon-512.png), linked from every page. Before, the tab icon was the 696 KB logo and
  /favicon.ico was a 404.
- Guard tests: tests/speed-seo.test.mjs.
- Files that are not used by the live site (reported only, nothing removed):
  - dist-static/ (304 files, 35 MB): build output. Vercel deletes and rebuilds it on every deploy, so the copy in git is
    stale.
  - public/cloud/ (5 files): also rebuilt on every deploy (vite, emptyOutDir).
  - The old copies from before public/: assets/ (113 files, 20 MB), 29 .js/.css/.html files in the root, cloud/.
  - About 60 release notes and test or build outputs in the root (*-TEST-OUTPUT.txt, *-BUILD-OUTPUT.txt,
    EXPORT-CHECKSUMS.json, two rollback-test .sql files).
  - The Next.js/vinext scaffold from the Sites era: app/, components/, hooks/, lib/, db/, drizzle/, examples/, build/,
    vite.config.ts (it imports .openai/hosting.json, which does not exist), next.config.ts, drizzle.config.ts.
    `npm run build/dev/start` use it; Vercel only runs build:static. Its packages (next, react, radix-ui, wrangler, ...)
    are still installed on every Vercel build.
  - public/file.svg, globe.svg, window.svg and favicon.svg (template leftovers).
  - 9 tracked .DS_Store files. There is no .gitignore.
- Not done, on purpose: long browser caching for /assets. Pictures have been replaced under the same name before
  (coop.png, family-sharing.png, live-events.png), so a long cache would show old art after a deploy. Safe only if a
  changed file always gets a new name.

## Cookie banner (24 Sep 2026; website only)
- public/cookie-consent.js shows a small card (bottom left, full width on phones): "Help a new farm game grow", "We
  use cookies to see what farmers enjoy and to measure our ads." and
  a Privacy Policy link (the policy names the tools). Accept is the filled button (the user asked for emphasis);
  Decline sits next to it at the same size, outlined and clearly readable. Do not shrink, fade or hide Decline: the
  Dutch DPA (AP) treats a hard-to-find or grey reject option as misleading.
- Google Tag Manager (and so GA and the Meta Pixel) now only loads after Accept: the loader at the top of play.html
  runs for a saved "accepted" younger than 12 months, and the banner starts it on Accept. The noscript GTM iframe is
  gone (it loaded GTM without asking). dataLayer events from before the choice wait in the page and are only sent if
  the visitor accepts.
- Choice: local storage harvest-tycoon:cookies = {choice, at}, kept 12 months, then asked again. Change it with
  "Cookie settings" in the home-page footer, under Privacy in the game's Settings, or /?cookie-settings (linked from
  the privacy policy). Decline removes _ga, _ga_*, _gid, _gat*, _gcl_*, _fbp and _fbc from our domain; declining after
  an earlier Accept reloads the page so the running tools stop.
- Privacy policy updated to match (24 Sep 2026): the "In short" line, the purpose and legal basis (consent), section
  8 (only after Accept, how to change it, what Decline removes) and the storage table.
- Tests: tests/cookie-consent.test.mjs; tests/analytics.test.mjs now expects one consent-gated loader.

## Double harvest booster and boost lengths (24 Sep 2026; client push AND farm-api deploy)
- New timed booster **Double harvest** (`BOOSTS.harvest`, art `double-harvest`, made by ChatGPT, 256 px WebP + PNG): every
  harvest while it runs gives twice the crops (1/2/3 become 2/4/6), also a crop that ripened before it started, regrowing
  crops and the tractor. XP per harvest is unchanged (that is Double XP); crop counters (quests, stats) count the real
  amount. It stacks with Double earnings and Instant harvest. Stored as `state.boosts.harvestUntil`.
- Timed boosts (Double XP, Double harvest, Double earnings) now run 30 min, 1 hour or 1 day (`BOOST_DURATIONS`,
  `BOOSTS[id].prices`):

  | Boost | 30 min | 1 hour | 1 day |
  |---|---|---|---|
  | Double XP | 50 | 90 | 300 |
  | Double harvest | 75 | 135 | 450 |
  | Double earnings | 100 | 180 | 600 |

  1 hour = 1.8x and 1 day = 6x the 30-minute price (nobody plays a whole day). Double harvest sits between XP and
  earnings: it doubles crops only, at most one waiting harvest per field, while Double earnings can double a whole
  warehouse. A loyal free player earns about 225 diamonds a week (day-7 gift 24/day + challenges 8/day), so 30 minutes is
  reachable 2-3 times a week; the day is mostly for buyers. Guard test: tests/double-harvest.test.mjs.
- Buying a timed boost that is still running adds the time after it (like VIP); "Already active" is gone.
- `buy_boost` takes an optional `length` ('30m', '1h', '1d'); an older game that sends none gets the 30-minute boost
  at the old price, so the old client keeps working. Push the client, then deploy farm-api straight away (until then
  the server refuses Double harvest and the longer lengths).
- Boosts screen: a small "30 min ⌄" dropdown before the status chip, each length with its price; the buy button shows
  the price of the one picked and says Extend while it runs. The pick resets to 30 minutes when the shop opens and
  after a purchase. The top bar shows "2× harvest · 24m". The field tooltip shows the doubled amount. Analytics:
  `diamond_action_completed` carries `action: 'harvest'` and `length`.

## Dropdowns (24 Sep 2026)
- public/pretty-select.js + pretty-select.css give every `<select>` in the game the game look: a soft button with a
  chevron and a short menu (group headings, pictures via `data-art`, a small second line via `data-note`, a price via
  `data-detail` + `data-detail-art`; the picked option is light blue). `data-pretty="compact"` is a small pill (boost
  lengths, the reminder hour); `data-native` would keep the browser's own control (nothing uses it).
- The real `<select>` stays in the page, hidden: forms still submit it, code that reads or sets `.value` works (setting
  it updates the button), and picking fires `input` and `change`. `watchSelects()` (game.js) also dresses selects that
  are drawn later. Keyboard: arrows, Home/End, typing to jump, Enter; Escape closes only the menu. It opens upward when
  there is no room below.
- Used by: boost lengths, reminder email hour, gift/request picker (pictures, "N in storage"), Family Order extra goods
  (pictures, "N in stock · N points each"), admin gift item (pictures). Tests: tests/pretty-select.test.mjs.

## Family tournament prizes raised (24 Sep 2026; farm-api deploy)
- `FAMILY_CONFIG`: first prize at least 100 diamonds (was 50), +25 for every other family that takes part this week
  (`TOURNAMENT_PER_EXTRA_FAMILY`; it used to grow +10 per contributing player), at most 1,000 (was 300), reached from 37
  families. A family takes part once a current member contributed; how many members it has does not change the prize.
  Second and third stay 60% and 40% of first (at the maximum 1,000 / 600 / 400). The per-player cap is the same 1,000.
- The screens read these numbers from the server (`perExtraFamily`, `familiesForMax`, `placePrizes`), so only the rules
  changed. Settlement happens at the first family action after a week ends, so the week running at deploy time already
  pays the new prizes.
- Live on 24 Sep: 7 families, 10 members, 2-4 families taking part a week (so 125-175 for first place). Making extra
  solo families with level-10 accounts would grow the prize; if that shows up, count a family only from
  `MIN_CONTRIB_POINTS` (500).

## Farm Family and farmer profile redesign (24 Sep 2026; client push AND farm-api deploy)
- Tabs: This week · Sharing · Tournament · Family · Members (Members last, as asked).
- This week: a summary card (lines complete, your points and place in the family, time left, one progress bar);
  order lines you can hand in come first, finished lines last; the tournament is one link row to its tab (no second
  prize card); Tournament goods uses the same + / − expander as the rules.
- Sharing: Daily sharing (public/social-ui.js) now draws inside the Farm Family dialog (`mount`) instead of its own
  dialog opened from Members.
- Tournament: the three prizes (1st/2nd/3rd from the server's `placePrizes`), how first prize grows (+25 per family,
  `familiesForMax`), and your family's place (points, gap to the family above, your share). The 1st-prize box left
  the banner (it repeated the ladder).
- Family (manage): the header shows the family's own emblem; "Look and name" holds the emblem picker and the name with
  one "Save changes" that only appears after a change (it runs family_emblem and/or family_rename; Undo resets); "Open
  to new farmers" is a switch; Leave sits quietly at the bottom.
- Members: sorted by points this week with a small bar; tap a farmer to open their profile ("Back to your family"); a
  leader's Make leader / Remove from family sit behind a ⋯ menu per row. The family view now carries each member's
  `playerId` (the same public id the leaderboard and search use).
- Profile: crop mastery is one card per crop with its best badge and a dot per badge (bronze, silver, gold, platinum),
  "N more crops to master" below; the family card shows the family's emblem tile; a family leader sees "Invite to
  <family>" on the profile of a farmer without a family (window.harvestFamilyInvite in family-ui.js,
  window.harvestProfiles in src/game-cloud.js; the same eligibility rule as the invite search, `inviteBlocker`).
- The Family button's notification is the same yellow "!" badge as Quests and More.

## Quests: no Claim all (24 Sep 2026; client only)
- Every ready quest is claimed on its own with its own Claim button (more satisfying, as asked). The Claim all bar,
  its code in public/quests-ui.js and its styles in retention.css are gone. Test: tests/mobile-ui.test.mjs.

## One weekly Family Order for everyone, anything possible; families of 10; tournament goods without a limit (24 Sep 2026)
- `familyOrder`: every family gets the same four lines each week, drawn at random from all 57 crops and goods
  (`family-order-v2:<week>`), whatever the family can make yet: a farmer who cannot make a line sees "unlocks at level N"
  (`itemUnlockLevel`) or "needs the <building>" (`itemBuilding`), so there is a reason to unlock more and to share.
  Amounts follow value: about 20,000 coins of goods per member, at most 150 of one thing per member, cheap lines first
  so the rest of the value goes to the dearer ones; four cheap draws swap the last for a dearer good; never two of the
  dearest goods (5,000+ each) in one week. Realistic in a week, also when one member makes a line alone: a whole line
  never needs more than 72 hours of production from one farm (`familyLineCap`: one slot for a good, 12 fields at 2 per
  harvest for a crop), so a bigger family gets a little less than size x the solo amount. Simulated over 50,000 weeks:
  solo 17,800-26,800 per member, no line above 72 hours, all 57 items turn up. Orders already made this week stay.
- Tournament goods: no weekly limit any more (EXTRA_POINTS_CAP removed); still unlocked by one full order line, still
  tournament points only (no coins, XP or diamonds).
- Families of up to 10 members (`MAX_MEMBERS`, was 6). The database also had a 6: supabase/family-max-10.sql patches
  the live harvest_family_commit (only "count(*)>6" becomes ">10", taken from the live definition) and the
  family_orders member_count check. Dry-run on live in a rolled-back transaction on 24 Sep: works, grants unchanged.
  Applied on 24 Sep 2026 as migration harvest_family_max_10 (checked afterwards: one ">10" check, no ">6", order
  check 1-10, EXECUTE still only postgres and service_role).

## Field taps, water window and care (24 Sep 2026; client push AND farm-api deploy)
- A tap on a field does what it can use now (`fieldTapAction`): plant an empty field, harvest a ripe one, give a growing
  crop extra care once it is ready (care first, it has its own moment), otherwise water. A tool picked on purpose (Water
  or Care) goes first when it fits that field; otherwise the tap still helps. Nothing to do: a toast with the time left.
- Water belongs to planting: a crop takes water until its extra care opens (30% of the growing time) and always in its
  first minute (`waterUntil`, `canWater`; new farmers' crops grow in seconds). The server refuses later water ("Water right
  after planting…"), and the tractor's water job only takes fields that can still be watered and says how long is left
  ("3 fields · 4m left to water"). Care is unchanged: from 30% of the growing time until harvest, once per cycle, +1 crop
  and 15% less waiting; water +1 crop and 20% less waiting; both = 3 crops and double XP.
- The field tooltip says what is next: "water now · 4m left", "extra care in 3m", "extra care ready", "fully cared for".
- Tests: tests/field-tap.test.mjs.

## Invite a friend (24 Sep 2026; migration + client push + farm-api AND player-counts deploy)
- Every farmer has a short personal code (name + 2 letters, e.g. TONYK7) and link https://www.harvesttycoon.com/?invite=CODE.
  A friend who starts a brand-new farm with it and reaches level 10 within 30 days gets 150 diamonds, and so does the
  inviter, for at most 10 friends per inviter in total (after that the friend still gets theirs). Rules and amounts:
  `INVITE_*` in game/farm-state.js.
- Where: "Invite" side tool under Events (desktop), "Invite a friend" in the More menu (phones), and "Invite a friend to
  Harvest Tycoon" in the Family tab (everyone, under Invite a farmer). Screen: public/invite-ui.js + invite.css (link,
  Share via the device's share sheet or Copy, friends rewarded x of 10, each friend's status, who invited you).
- Sign-in page (src/invite-link.js): ?invite=CODE is remembered 30 days on the device (not when this browser already
  played), shown as "Tony invited you to Harvest Tycoon" on the sign-up card (name from player-counts ?invite=CODE),
  sent in the sign-up metadata (a confirmation link opened on another device still counts) and with the first load
  (Google/Facebook). Cleared once the farm exists.
- farm-api (invite-service.js): a code is linked only when a brand-new farm is created (no earlier progress); your own
  code and unknown codes are ignored. The friend's 150 is paid in the save that reaches level 10 (or on load, e.g. after
  a family reward), then harvest_referral_qualify marks it and decides the inviter's reward under a per-inviter lock.
  The inviter is paid on their next load (each friend once: `state.inviteRewards`), with a popup; if the inviter leads a
  family with room, the friend gets a family invitation in the same go (the leader's own family_invite, all family
  rules apply). A problem with invites never stops a farm from loading.
- Database: supabase/invite-a-friend.sql (player_invite_codes, referrals, harvest_referral_qualify; RLS on, service
  only). Dry-run on live in a rolled-back transaction on 24 Sep: first friend 150, 11th 0, never twice, anon and players
  cannot read or call.
- Privacy policy: what the inviter and friend see of each other, and the harvest-tycoon:invite storage item.
- Also in this change: Seed shop button removed from the tool dock (the crop button opens the same shop); the desktop
  tool hint and the "Click to work" line are hidden (phones never showed them).
- Tests: tests/invite-friend.test.mjs.

## "Your farm menu" (More, phones) regrouped (24 Sep 2026; client only)
- Headings: Every day (Daily rewards, Farm events, Farm journal, Deliveries, Beginner guide) · On the farm (A helping hand, Chores, Farm
  stall, Tractor, Boosts, Silo research) · Estate & valley (Estate and the valley places) · Friends (Leaderboard, Invite a
  friend) · Help & settings (How to play, Settings, admin). Compact tiles three to a row (picture and
  name; descriptions only on locked tiles). Everything still locked is folded under one "Coming later · N" row at the
  bottom (progression-ui.js still greys and orders them); a heading hides when all its entries are locked. Daily rewards
  and Farm events show the yellow "!" when something waits. The page is about 30% shorter. Styles: public/more-menu.css.

Desktop layout (2026-09-24): on a computer (`public/desktop-hud.css`, desktop = min-width 901px and not a short touch
screen) the side tools stay see-through over the map; a building name or place marker that would sit behind them is
hidden until the map moves (`measureTools`/`behindTools` in `public/game.js`, measured on resize, not every frame); the camera buttons are one row in the bottom-right corner (lifted above the dock when the window is 1040px or
narrower) and the Beginner guide ends above them. The Leaderboard left the tool dock and is a side tool after Invite
(`src/ui.js`; hidden on phones, which open it from the More menu). The Starter Pack is a small button with a €2.99 tag
next to the diamonds (`#starter-pack-chip`, `src/starter-pack-ui.js`); phones keep the corner tile. Invite a friend is a
wide dialog like the other screens. Tests: `tests/desktop-hud.test.mjs`.

Starter Pack server checks (2026-09-24): `src/starter-pack-ui.js` asked `diamond-checkout` for the catalog every minute
for every open game (about 9,400 of 32,500 Edge Function calls a day, the Free plan allows 500,000 a month). It now asks
when the game starts, when the offer is opened, after a purchase (`harvest-purchase-confirmed`) and 1.5 s after the
farm reaches `STARTER_LEVEL` (watching `#level`); while the offer runs also every 15 minutes and on returning to the
tab (at most every 15 minutes). A farm without a running offer is not asked again; the countdown runs locally.
Tests: `tests/starter-pack-checks.test.mjs`.

Stall "!" (2026-09-24): the old "G" on the Estate button (shown from 100 coins, which is 1-2% of a high-level stall, and
only on desktop from level 19) is gone. One rule: a yellow "!" once the stall is a quarter full (`stallNotice`,
`STALL_NOTICE_SHARE` in `game/farm-state.js`: 6 hours at stall level 1, 12 at the top), from level 11. It shows on the
Farm stall tile in the phone menu and so the More button (not on the stall's pin on the map, on purpose), and the Estate button (which then opens on the stall tab; a finished chapter still
lights it too). `public/growth-ui.js` `notices()`. Tests: `tests/stall-notice.test.mjs`.

Map colours and seed memory (2026-09-24): on the map yellow means ready, as on a building whose batch is done; there is no
"!" on the map. `pinLight` in `public/game.js`: the Farm stall pin is yellow from a quarter full and red once full (it
stops earning); valley places (Valley Market, Ranch, Estate Workshop, Trade Depot, Grand Fair) are yellow when their
status is "ready" (`economy.placeReady`, the same status the Buildings list sorts by). Styles `.utility-label.ready/.full`
in `public/icons.css`. The last chosen seed is remembered per device (`harvest-tycoon:seed`, listed in privacy.html) and
restored on load when that crop is unlocked. Tests: `tests/stall-notice.test.mjs`.

Desktop start view (2026-09-24): the home and fields views centre the farm in the free part of the screen between the
side tools and, while it is open, the Beginner guide (`hudShift` in `measureTools`, applied as a horizontal frustum
shift in `resize()`, `public/game.js`; phones and the overview are unchanged). Re-measured when the side tools or the
guide change size (ResizeObserver). Tests: `tests/desktop-hud.test.mjs`.

New players on phones (2026-09-24): while the Beginner guide is not done, phones start in the fields view (bigger fields,
where the first steps happen) and "My farm" returns there; after the guide the whole-farm home view as before
(`startView` in `public/game.js`). Desktop unchanged. Tests: `tests/new-player-view.test.mjs`.

8 starting fields (2026-09-24, NOT live until `farm-api` is redeployed; only new farms): live data showed 63% of guided
farms stop before their 10th harvest and those farms use about 4 of their 12 fields. New farms now start with 8 fields
(`STARTER_FIELDS`, `createBaseFarm`): 3 ripe corn, 3 wheat ripening 30/60/90 s after the start, 2 empty (the "plant"
step). Fields 9-12 (`EARLY_FIELDS`) open one per level (2/3/4/5) for 100/150/200/250 coins, no supplies, +20 XP each,
and are not counted as expansions (stats.expansions, Farmhouse level), so every quest and price from field 13 on is
unchanged. They show in the level-up/journal list (`unlockEntries`, only when `progression.fields===8`). The Farmhouse
panel says "While you start out, every new level opens one more field, up to 12. No supplies needed." Existing farms keep
their fields. `tests/legacy-farm.mjs` now builds the original 12-field start. Tests: `tests/starter-fields.test.mjs`.

First minutes (2026-09-24, rules NOT live until `farm-api` is redeployed; the client works with either server). Data: of
289 guided farms 204 never finished guide step 1, and 154 of those had done it but never tapped "Complete step".
(1) Guide steps 1-9 finish themselves (`advanceBeginner` in `applyFarmAction`, after the boosts so an action's own XP stays
its own; `result.guide` lists them); farms stuck on ready steps catch up on their next action. The last step (50 diamonds)
is still claimed by hand: the guide opens once when it is ready (`beginner-ui.js afterAction`), and the claim shows the
gift popup "Well done, farmer!" with a come-back line (`comeBackNote` in game.js: when everything on the farm is ready,
plus tomorrow's double harvest). The Complete-step button only shows when a step waits. Toast: "✓ step · +15 XP. Next: …".
(2) The next unlock is on the level card (desktop, `#level-next`) and on the level-up screen (`nextUnlock`,
progression-ui.js). (3) The first harvest on a guided farm is golden: 3x the crop (`FIRST_HARVEST_BONUS`, toast + burst).
(5/7) The daily gift on a farm's second check-in day adds 30 minutes of double harvest (`RETURN_BOOST_MS`, `checkIn`,
guided farms, once); promised in guide step 6, the rookie "boost ended" screen and the guide's end popup.
(8) In the Facebook/Instagram/TikTok in-app browser, two minutes after the farm opens, one tip (once per device,
`harvest-tycoon:browser-tip`) offers Chrome (Android intent link) or copies the link for Safari (`src/browser-tip.js`,
styles in welcome.css). Toasts no longer treat "first" as a warning unless it is "… first." Tests:
`tests/first-minutes.test.mjs` (and the guide tests now expect steps to finish themselves).

Confirmations (2026-09-24): every confirmation uses the game's own dialog in one look (styles at the end of
`public/vip.css`): a picture, the question, one line, Cancel/Keep (focused) and the confirm button; red (`tone:'danger'`)
for what is hard to undo. `public/diamond-confirm.js` adds a price block with the diamond and "You keep N diamonds"
(`balance`), used by Finish crops/batches, the boosts and VIP (`public/boosts-ui.js`). `public/confirm-dialog.js`
(`confirmAction`, optional `picture`/`tone`) serves Sell all (market), the family's leave/remove/make leader (was the
browser's plain confirm()), Remove planting at the Farmhouse (was an inline details block) and the admin gift. Both close
on a tap outside. Tests: `tests/confirmations.test.mjs` (also: no plain confirm() anywhere in public/ or src/).

Graphics (2026-09-24): (1) Fresher daylight and greener grass (`game.js`: cool sky hemisphere, green ground bounce, softer
warm sun, exposure 1.06, light green haze #e4ecd3; ground #8aa64e and greener yard patches; mountain haze in
scene-polish.js). (2+3) `public/scenery.js`, built after the farm is on screen (`addScenery` in game.js, models loaded
then, ~1 MB; a failure only logs a warning): green hills and a second row of taller mountains at the sides and back (put
down first, and counted as terrain with the mountain ring of scene-polish.js), a belt of firs (only on flat ground or gentle
hills, never against a slope), sunflower strips beside the roads, grass tufts out to the haze, low things only at the front (bushes, young trees, hay, sunflower clumps), and
on the farm a pigsty with three pigs west of the farmhouse, chicks and a rooster at the coop, a spotted cow, an outhouse,
log pile, wheelbarrows, lawn mower, pickup, wagon, plough and water tower. Everything stands still. Spots are seeded and a
piece only goes where nothing stands (mesh boxes in a grid; rays for the wide landscape pieces), searching outwards from
where it belongs. Repeated pieces are InstancedMesh (one per model). New models were copied from the pack into
public/assets/models. Tests: `tests/scenery.test.mjs`.
The camera's far plane is 300 so the edge mountains are not cut off when zoomed out; the big tree between the camera and
the Family Hall was removed.
Crop timers (2026-09-24): a growing crop's label is a pill with a ring that fills as it grows (blue once watered) around the
crop's picture, the time left (phones: 36m, 1h20) and a drop (watered) or leaf (cared for) icon; when Care is ready the pill
glows gold and the leaf gently pulses. Built once per planting (`dataset.crop`), each tick only the fill (`--grow`) and the
time change. Styles at the end of `public/retention.css`. Tests in `tests/scenery.test.mjs`.

Pig Farm (2026-09-24, NOT live until pushed, `supabase/pig-farm.sql` applied, and `farm-api` + `notify-hourly` deployed):
a level-29 production building (`pigfarm`, model house_019, 14,000 coins, upgrade 900, levels 1-20 like the others) west of
the farmhouse across the west road (ANCHORS.pigfarm, YARD_EXTENT, yardDecor): the barn (8.2 long, turned side-on) with a
white-fenced pen (fence_008, closed all round) in front of its west end, towards the camera (so the barn never hides the
fence and the pen stays off the hills; the yard extent keeps trees clear of it), three pigs, a trough and hay; greyed until level 29. Pigs dig up truffles: "Let the pigs hunt truffles" 2 feed -> 2 truffles in 80 min (~173/h) and
"A vegetable feast for the pigs" 6 corn + 8 lettuce -> 3 truffles in 100 min (~174/h, level 31); truffles sell for 230. The
Farm Kitchen cooks "truffle omelettes" (level 30): 4 eggs, 2 cheese, 2 truffles -> 2 omelettes (880 each) in 3 h (~213/h).
The Factory gets its bulk versions automatically. Family Order: new goods only from week 2960 (Mon 28 Sep 2026,
`FAMILY_ORDER_FROM_WEEK`), because the draw picks from the list of goods and a longer list would change this week's order
for families that open it late (stored orders never change). The Grand Fair only picks goods of 1,000+ coins, so it is
unaffected; the market highlight may pick truffles. Family sharing: `supabase/pig-farm.sql` adds both goods to the
harvest_social items list and to "goods produced" (harvest_public_metrics); live bodies matched estate-wave3.sql on
24 Sep. Icons: truffles/truffleomelette (painted, WebP 256) and pigfarm (render, PNG 512). The scenery pigsty is gone.
Tests: `tests/scenery.test.mjs` (Pig Farm and start-up models), counts in factory/farm tests.
Desktop building labels (2026-09-24): compact, and an idle building shows only its name (`.building-status.idle` hidden in
`public/desktop-hud.css`); ready, working, to-build and the farmhouse's fields keep their second line.
Layout by level (2026-09-24): the east is a street that climbs in level as you pan right (HOMES in `public/farm-layout.js`,
each yard moves as one piece): along the trunk road Pig Farm (29), Bee Yard (34), Glasshouse (40), Weaving Shed (43); behind
them Craft Workshop (58), Ranch (70), Estate Workshop (75); furthest out the Grand Valley Fair (90). The Family Hall (10) moved
to the open ground west of the farmhouse, where the Pig Farm first stood. Sheep Barn, Goat Shed and Trade Depot, the core
(levels 1-24), the Factory and the Valley Market keep their places. Everything stays within the camera's pan reach (x <= 63).
The Family Hall's map label no longer shows "Your weekly order & family".
The Grand Valley Fair's hall is bigger (house_023 at 20 x 7 x 4.4, was 13 x 4.6 x 3.2, about its own proportions), with a
wider fairground in front; its yard moved a little further back (HOMES grandfair [40,24.3], extent [-10.6,10.6,-4.6,9]).
