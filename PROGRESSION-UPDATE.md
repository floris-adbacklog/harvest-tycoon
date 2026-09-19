# A simpler start

All player-facing text is English. Existing saves are marked as legacy on normalization and retain their previous crop, building and activity access. Their coins, diamonds, jobs, daily snapshots and completed beginner guide are preserved. Only newly created farms use guided progression. No tutorial completion is required to unlock production.

| Farmer level | New possibilities |
| --- | --- |
| 1 | Wheat, Corn, Farmhouse, Chicken Coop; starter feed makes eggs |
| 2 | Lettuce and Feed Mill (corn feed first; later recipes stay folded) |
| 3 | Dairy Barn, chores, passive stall, crop mastery, deliveries, diamond boosts |
| 4 | Barley, Windmill, tractor and silo research |
| 5 | Bakery; collect your first bread to also unlock Cabbage and Packing Shed |
| 6 | Cauliflower, Green beans, Farm Kitchen available to build, estate projects |
| 7 | Pumpkin |
| 8 | Apples and Juice Press available to build |
| 9 | Red cabbage |
| 10 | Sunflower, Berries and Preserves Workshop available to build |

Sell at least one egg at the Market to unlock hands-on jobs. Free buildings open automatically; the three newer production buildings retain their construction costs. The server validates access, so hidden controls are not the only protection.

Locked crops and buildings are collapsed in their catalogs. Locked recipes are under Coming later. New players see a short list of relevant quests, and future goals are shown in Farm journal. Market rows without stock stay hidden until their production chain is available; purchased inventory always remains visible and sellable. Daily challenges and orders are selected from reachable production chains. Existing daily snapshots are preserved until reset.

The fresh beginner guide still has ten steps and a one-time 20-diamond reward. The chore step becomes selling an egg; the remaining beginner rewards and legacy guide are preserved. Level and milestone celebrations use a new farm-style icon and wait until other dialogs close. They never automatically grant or duplicate rewards.

## Mobile fixes

Chore action buttons now span the inner card width with no inherited left margin. Starter Pack keeps its contents and layout; its narrower mobile dialog is centered with equal left/right margins. The earlier loading gate, quantity slider and Sell all changes remain included.

## Validation and deployment

178 automated tests pass, including new-player gates, the full beginner route, the bread production chain, daily eligibility across levels, legacy migration and unlock notifications. Static build succeeds. Supabase farm-api version 24 is active with JWT verification; the retrieved deployed source matches the tested source. No schema migration is required.

Authenticated end-to-end testing on a live player account was not performed. Mobile rendering on hardware could not be verified here: Chromium installation failed because its download endpoint was inaccessible. The CSS cascade causing the reported margins was corrected directly.

Copy the ZIP contents into your existing GitHub project and push to deploy the frontend on Vercel. The backend has already been updated.
