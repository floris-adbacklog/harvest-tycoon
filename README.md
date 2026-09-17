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

## Local gameplay and cloud stats

`public/farm-client.js` saves the full farm in localStorage after each action. The leaderboard receives only player ID, display username, integer currency, integer level, and a server-generated update timestamp. Inventory, layouts, crop positions, animals and jobs never go to Supabase. Local play does not wait for leaderboard requests.

- `src/supabase.js`: email/password login, registration, persistent sessions, profiles and sign-out.
- `src/sync.js`: allowlisted stats payload, four-second write throttle, coalescing and retry after a new update or reconnection.
- `src/leaderboard.js`: top twenty by currency, stable ordering, tied ranks and the current player's own rank.
- `src/ui.js`: login/registration screen, username prompt, account controls, leaderboard and HTML overlays.
- `supabase/player_stats.sql`: table, grants, RLS, indexes and timestamp trigger.

The board contains self-reported client scores. RLS prevents changing another player's row; it cannot verify honest gameplay in a local-only game.

Players sign in with email and password. Supabase's browser session persists between visits. The same account restores its username, coins and level on another device. Inventory, diamonds, boosts, crop timers and the rest of the farm remain device-local in this beta. Clearing browser storage removes those local farm details.

## Supabase activation

The project includes the account integration and SQL migration. Configure a deployment with the existing Supabase project's public build-time values; the unconfigured panel never shows simulated leaderboard scores.

1. Run `supabase/player_stats.sql` in the intended Supabase project's SQL Editor.
2. Enable email/password authentication in the intended Supabase project.
3. Allow the production `/play.html` URL as an auth redirect for email confirmation.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the build environment (see `.env.example`). The build also accepts the older `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` names. Never use a service-role or secret key in the browser build.
5. Rebuild and publish. These values are compiled into the browser bundle; changing only a runtime environment variable is insufficient.
6. In a real browser, register or sign in, perform a coin-changing action, wait four seconds and verify the row in the Supabase table editor. Open the board to read it back. Verify a second authenticated player can read the first row but cannot insert/update using its ID.

This beta update preserves the existing integration; it does not run SQL or change the live Supabase project's auth configuration. Account networking and cross-device behavior need verification against the intended deployment.

## Builds and the earlier cloud save

`pnpm build:static` creates `dist-static/` using a Vite-built Supabase bundle plus the static game assets. This output works on a static host without a custom application server. Vercel/Netlify can use that build command and publish directory; `/play.html` remains available for email redirects. The static output makes no legacy farm API request.

The current Sites publication retains a **read-only migration bridge** for farms previously stored in Sites D1. On the first visit without a local save, the game reads that earlier farm once and stores it in the browser. All subsequent actions are local. The old full-farm POST endpoint responds with a reload notice and does not save changes. Existing D1 records remain as recovery copies; they are not uploaded to Supabase. This bridge is not required by the standalone static build. Keep it on the existing Site until players have opened the new version and moved their old save.

`pnpm build` builds the current Sites Worker with that migration bridge. `.openai/hosting.json` retains the same Site identity. No Supabase secrets belong in that manifest.

## Validation

`pnpm test` covers crop care, longer progression, saved-game migration, offline local saves, passive accrual and caps, duplicate rewards, project timing, stats-only payloads, write throttling, offline retries, and leaderboard queries. Tests of Supabase networking use mocks until a real project is available. Existing SQLite checks cover the prior save format and migration compatibility.

The shared game rules are in `game/farm-state.js`; the build copies them to `public/farm-state.js`. Supplied art belongs to the user-provided asset pack and is not distributed as a standalone pack.

## September 17 economy and interface update

Additional land unlocks one field per purchase, from 12 up to 24. Coin prices start at 600 and grow by 1.75x per field (rounded up to 25), with a changing mixture of crops and products. Previously unlocked fields remain intact. Mixed-ingredient recipes now require larger batches; their output prices still exceed the market value of their ingredients.

Each tractor job costs 12 coins plus 2 coins per worked field; planting also consumes seed coins. The UI quotes the same cost used by the game rules. Manual work remains free. Insufficient funds or supplies do not consume resources.

The Packing Shed is behind the crop area. Barley, lettuce and red cabbage have distinct vector icons. Account details have additional spacing and mobile controls/dialogs adapt to narrow and short screens. All gameplay text remains English.
