# Pacing update: a faster start, a calmer middle

## Why
Live data (66 accounts, 21 September): 65% of accounts older than 3 hours left within roughly the first ten minutes (10 to 40 actions, half of them never sold anything, guide steps 0-3 of 10). Only 3 players stood at level 9, all first-day accounts, so level 9 is not a wall. The levels around 8-10 do slow down for casual players: the best crops there take 2 to 8 hours and paid little XP per hour. Two players at levels 36 and 40 after 3-5 days show that the level curve itself must NOT be made faster (content ends around level 25).

## What changed (game rules, `game/farm-state.js`)
| Change | Before | After |
|---|---|---|
| Guide order | harvest, plant, water, sell, ... | harvest, **sell**, plant, water, ... (money loop first) |
| XP per finished guide step | 0 | **+15** (10 steps = 150 XP: level 2 after about four steps, level 3 after the guide) |
| XP per harvest, crops of 45 min or longer | barley 8, green beans 14, cabbage 12, cauliflower 18, pumpkin 24, red cabbage 32, sunflower 45, apples 22, berries 18 | **x1.5**: 12, 21, 18, 27, 36, 48, 68, 33, 27 |
| Farm chores unlock | level 7 | **level 4** |
| Crop mastery unlock | level 9 | **level 7** |
| Level curve (`xpForLevel`) | unchanged | unchanged (nobody gains or loses a level) |

Nothing unlocks later than before, so no existing player loses anything. After the change every level from 2 to 12 unlocks between 2 and 4 things (`tests/pacing.test.mjs`).

## What changed (interface)
- **Sell all crops / Sell all goods** asks first: "Are you sure you want to sell all your crops for X coins?" (`public/confirm-dialog.js`). Selling a single item is still one tap.
- **Reminder question**: once, at the first waiting moment (level 2, something growing or being made for 10+ minutes), only where push works: "Want a nudge when your crops are ready?" Turn on = permission + crop and production reminders. Not now = never again. Stored in `localStorage` (`harvest-tycoon:reminder-nudge`). `public/reminder-nudge.js`.
- The guide shows "+15 XP" per step and in the completion toast.
- The level card tooltip shows what the next level unlocks.

## Measurements (GTM dataLayer, numbers and fixed words only)
`game_session {level, returning}`, `level_up {level}`, `guide_step {step, index}`, `guide_complete`, `reminder_prompt {action: shown|accepted|dismissed|failed}`; every event has `device`. `src/analytics.js` (`trackGame`), bridge `trackGame` in `src/main.js`.

## Deploy order
The game rules changed, so `farm-api` must be redeployed from this repo (`supabase/functions/farm-api/farm-state.js` is synced). Push the frontend first, wait for Vercel, then deploy `farm-api`; the window in between only affects a player who is in the middle of the guide.

## What to watch next
Share of accounts with more than 40 actions after ten minutes (was 35%), median first-session length, guide completion, `reminder_prompt` accepted rate, and the level at which accounts go quiet for 48 hours.
