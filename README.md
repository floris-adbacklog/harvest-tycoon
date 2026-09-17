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

The managed browser preview is unavailable in this environment, so mobile/desktop visual checks have not been completed. The Vercel-targeted static production build passes; an actual Vercel deployment still requires the user's configured hosting project.

The shared rules are in `game/farm-state.js`. The build copies them to `public/farm-state.js` and the Edge Function source. If game rules change, redeploy `farm-api` as well as the frontend. The old Sites D1 recovery endpoint is retired; historical D1 data remains untouched and is not used by the static Vercel build.

## September 17 economy and interface update

Additional land unlocks one field per purchase, from 12 up to 24. Coin prices start at 600 and grow by 1.75x per field (rounded up to 25), with a changing mixture of crops and products. Previously unlocked fields remain intact. Mixed-ingredient recipes now require larger batches; their output prices still exceed the market value of their ingredients.

Each tractor job costs 12 coins plus 2 coins per worked field; planting also consumes seed coins. The UI quotes the same cost used by the game rules. Manual work remains free. Insufficient funds or supplies do not consume resources.

The Packing Shed is behind the crop area. Barley, lettuce and red cabbage have distinct vector icons. Account details have additional spacing and mobile controls/dialogs adapt to narrow and short screens. All gameplay text remains English.
