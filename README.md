Latest UI update: see [LOADING-SCREEN-UPDATE.md](LOADING-SCREEN-UPDATE.md).

Latest release: see [PANTRY-UPDATE.md](PANTRY-UPDATE.md) for new recipes, artwork and deployment status. Earlier release notes follow.

# Harvest Tycoon

A farming game with the supplied GLB farm pack and Harvest Tycoon logo. All gameplay text is English.

See [BETA-RELEASE.md](BETA-RELEASE.md) for the Windmill, fresh baking, diamonds, boosts, new quests, save limitations and export instructions.

## Long-term progression

| Crop | Base growth | Seed cost | Coins per harvested item |
| --- | --- | --- | --- |
| Wheat | 2 minutes | 3 | 8 |
| Lettuce | 5 minutes | 7 | 20 |
| Corn | 15 minutes | 10 | 40 |
| Barley | 45 minutes | 20 | 85 |
| Cabbage | 2 hours | 40 | 170 |
| Cauliflower | 4 hours | 65 | 300 |
| Pumpkin | 8 hours | 95 | 480 |
| Red cabbage | 12 hours | 130 | 720 |
| Sunflower | 24 hours | 180 | 1,100 |

A field yields one crop unattended, two after watering, and three after watering plus extra care. Water removes 20% of remaining growth time. Care is available after 30% of the original growing time and removes another 15% of remaining time. Full care doubles harvest XP. Crops never wither. Silo research improves subsequent planting.

The farm stall earns 36 coins/hour initially, with 24 hours of storage. Eight upgrade levels increase income and capacity (up to 48 hours). Estate projects add 6 coins/hour each. Income before an upgrade settles at the previous rate. The stall uses no crop inventory. Active chores repeat every two or three minutes; short crops, care, production and deliveries provide a higher active earning rate.

Six sequential estate projects have construction times of 2 hours, 8 hours, 1 day, 2 days, 3 days and 7 days, plus increasingly large coin, produce and mastery requirements. Recurring three-day estate commissions continue afterwards. Nine crops each have four mastery medals at 25, 100, 300 and 1,000 harvested fields. Production buildings reach level 10, silo research reaches level 5, and 41 permanent quests supplement daily activities. Existing balances, inventory, levels and in-progress timers migrate without resetting.

## Online accounts and authoritative farm storage

Sign in or create an email/password account before the game loads. The full farm is stored in Supabase `player_farms`; `player_stats` contains the public leaderboard. Existing local browser saves are left untouched but are not read, imported or uploaded. Only the authentication session persists in browser storage.

The `farm-api` Edge Function validates the user and active session, calculates each action using the shared game rules, and atomically writes the farm and leaderboard. Clients cannot overwrite farm state or scores. Logout removes the game iframe and its in-memory state. Connection failure stops gameplay until a successful reload from Supabase.

## Deploy on Vercel

See [VERCEL-SETUP.md](VERCEL-SETUP.md). Commit the files at the repository root, including `vercel.json`, `package.json`, `pnpm-lock.yaml`, `public`, `src`, `game`, `scripts` and `supabase`.

`vercel.json` disables Next.js auto-detection, uses the pinned pnpm installation, runs `npm run build:static` and publishes `dist-static`. The production build requires the two public Supabase environment variables. Never provide a secret/service-role key to the browser build.

The existing project `jnmdirvidffzxukbdmij` has already received the online farm schema, Edge Function and permission fixes. Do not rerun SQL setup on it. For another project, use the setup instructions in VERCEL-SETUP.md.

## Validation

`pnpm test` covers game rules, pointer interactions, server-only client updates and auth lifecycle races. Real API tests against two temporary Supabase accounts verified sign-in, farm creation, actions, reload, duplicate requests, account isolation and leaderboard reads. See [ONLINE-RELEASE.md](ONLINE-RELEASE.md) for the exact verified scope and remaining deployment checks.

The Vercel-targeted static production build passes. This update has not yet been visually verified on Vercel: local browser preview was blocked, and the GitHub integration rejected writes with HTTP 403. Upload this package to the existing repository to trigger the configured deployment. The updated Supabase `farm-api` v4 is active; its deployed files were compared with these sources.

The shared rules are in `game/farm-state.js`. The build copies them to `public/farm-state.js` and the Edge Function source. If game rules change, redeploy `farm-api` as well as the frontend. The old Sites D1 recovery endpoint is retired; historical D1 data remains untouched and is not used by the static Vercel build.

## September 17 economy and interface update

Additional land unlocks one field per purchase, from 12 up to 24. Coin prices start at 600 and grow by 1.75x per field (rounded up to 25), with a changing mixture of crops and products. Previously unlocked fields remain intact. Mixed-ingredient recipes now require larger batches; their output prices still exceed the market value of their ingredients.

Each tractor job costs 12 coins plus 2 coins per worked field; planting also consumes seed coins. The UI quotes the same cost used by the game rules. Manual work remains free. Insufficient funds or supplies do not consume resources.

The Packing Shed is behind the crop area. Barley, lettuce and red cabbage have distinct vector icons. Account details have additional spacing and mobile controls/dialogs adapt to narrow and short screens. All gameplay text remains English.

## Beginner guide and farm overview

The Beginner guide has 10 independent steps: harvest, plant wheat, water, sell, start a batch, collect a daily gift, do a chore, care for a crop, harvest wheat, and collect a finished batch. Completing the tenth step grants 50 diamonds once. The authoritative server saves `onboarding` alongside the farm state. The 41 regular quest IDs and claims are unchanged. Existing farms start a separate guide; an earlier daily gift counts to avoid a one-day wait.

The guide is available in its desktop card, the mobile step banner, and More. “Show me” opens the appropriate tools or building. “Fields” focuses on crops; “Show the whole farm” opens the overview; My farm restores the centered, medium-zoom view. The camera frames the useful buildings and fields while reserving room for controls. Smaller building footprints, work yards and low props leave clear paths through the same farm.

The signed-out page uses the original logo and `public/assets/farm-welcome.webp`, an original generated farm illustration based on the supplied low-poly farm assets. Art direction: crisp sunny isometric farm with gray farmhouse, red barn, windmill, colorful crop rows, tractor, fences and a quiet meadow behind the account panel; no baked-in text or UI. The source image was converted to WebP for delivery.

## Diamond balance

Boosts cost 20 / 60 / 75 / 90 / 150 diamonds (Double XP / Double earnings / Finish production / Instant harvest / Builder’s discount). Daily challenges award 2 / 2 / 4 diamonds, once each. Daily gifts now total 80 per seven-day streak; daily challenges add up to 56 per week. The server rejects stale purchase quotes without charging. See UPDATE-NOTES.md for deployment instructions and verification scope.

## Leaderboard categories

The dropdown has 14 public leaderboards: coins, level, total crops, claimed mastery badges, deliveries, and each of the nine individual crops. All harvest scores are lifetime produce quantities. Diamonds remain private. `supabase/leaderboard-categories.sql` adds indexed counters, backfills existing progress and updates the existing atomic server commit function; it is already applied to the configured project.
