# Latest complete release: v7

See `PROGRESSION-v7-RELEASE.md` for the level 1–25 progression, painted lock icon, Family Hall model thumbnail, migration and current deployment details. Older sections below are historical.

# Collect all & clearer production controls — 19 September 2026

- Each production building shows a new illustrated **Collect all** button when two or more batches are ready. One authenticated action collects only ready batches in that building, adds all goods and XP, and advances existing production/quest counters. Running batches and other buildings stay untouched.
- The existing receipt and atomic commit path is retained. XP boosts apply once to the combined reward. Repeating collection cannot pay out already collected jobs.
- **Finish one crop** uses an illustrated field picker with crop names, field numbers, remaining time, selected state and keyboard navigation. Selecting a field is free; the separate confirmation still costs 10 diamonds.
- Fertilizer selection uses compact illustrated rows, visible checkmarks, a bounded scrolling list, select-up-to-stock, Clear and Done controls. The footer shows total fertilizer required and blocks an unaffordable selection. A separate confirmation applies the fertilizer.
- Batch counts use large minus/plus buttons. Available stock and production slots set the maximum; ingredient totals, output, value and XP update with the selected count. Selections persist through relevant building refreshes.
- New transparent **Collect all** and **Instant harvest** illustrations. Instant harvest is visually distinct from Finish one crop. Earlier painted chore/activity icons and the improved diamond shop/purchase dialog are included.
- All player-facing copy remains English. No purchase prices, balances or progression costs changed.

## Deployment and verification

The `farm-api` action is already deployed to project `jnmdirvidffzxukbdmij`, version 16, ACTIVE with JWT verification enabled. Deployed source was read back and matches the tested source. No database migration is required for this update.

Replace your GitHub project files with this ZIP's `Harvest-Tycoon` folder contents and let Vercel rebuild. Keep the existing hosting environment variables. The ZIP includes source, assets and the fresh `dist-static` build. The new frontend is not published automatically by this export.

Validation: 141 tests pass, including mixed ready/running jobs, ten simultaneous collections, repeated claims, original batch rewards, boosted XP, quest counters and field-picker interaction/keyboard behavior. The production static build succeeds. No real paid checkout was performed. A visual mobile browser check was unavailable because the local browser executable is not installed.

---

# Latest update — diamond shop, purchase feedback and farm artwork

- Available diamond packs now show full-colour diamonds and green purchase buttons. Unavailable buttons still respect server availability; only the selected pack shows the checkout loading state.
- Redesigned the purchase return dialog with a painted diamond, clear status badge, rounded controls, readable spacing and a compact mobile layout. Confirmed, pending, closed, expired and interrupted states have distinct English messages.
- A confirmed payment stays confirmed if refreshing the farm fails. Closing the dialog stops polling and ignores late replies.
- Four new transparent farm illustrations for Greenhouse, Apiary, Animal paddock and Tool workshop, used on farm markers, job headings and the farm-round tracker. Includes all six painted chore icons from the preceding update.
- The user confirmed checkout now opens after correcting Stripe key permissions. No payment backend or credentials were changed in this update; a complete real payment has not been independently tested.
- Browser visual checking was unavailable because the browser blocked the local preview. Asset sizes, alpha, source syntax, build output and payment-state behaviour are checked separately.

# Previous update — illustrated chores

- Six new painted, transparent icons for Clear the paths, Fill the water troughs, Sort the seed boxes, Mend the orchard fence, Restore the irrigation and Prepare the harvest fair.
- The chore list and result dialog use the matching illustration, with square mobile tiles and contained images to prevent stretching or clipping.
- Optimised 256 × 256 artwork; all player-facing text remains English. Gameplay rewards and progression are unchanged.
- Checkout investigation: the purchase table columns and server permissions are present, and the session-check RPC succeeds under the server role. No purchase records existed when checked. The exact runtime exception behind “Checkout is unavailable” remains unverified because access to the Supabase dashboard logs was denied. Payment code has not been changed on speculation, and this update does not claim checkout is fixed.
- Next checkout diagnostic: Supabase → Edge Functions → diamond-checkout → Logs. Reproduce the failed purchase, then inspect the matching “Checkout failed” entry. Share only the error code/message, never API keys, tokens or secrets.
- Icon generation prompts and file locations are documented in CHORE-ARTWORK.md.

# Previous bulk actions and presence update

DEPLOYMENT STATUS: The matching farm-api server rules are deployed to Supabase as version 9 (ACTIVE, JWT verification enabled), with deployed sources checked against this package. Publish this frontend via GitHub/Vercel to expose the new controls. The static build and all 104 automated tests pass. Leaderboard presence remains unverified live, as described below.

- Production quantity selector: start multiple batches in one atomic request, bounded by building level, free slots and available ingredients. Totals update before starting.
- Fertilizer multi-select dropdown: select several growing fields, review the total cost and fertilize in one atomic request. One fertilizer per field; invalid selections consume nothing.
- Delivery orders award 1–4 diamonds based on goods value, product types and ingredient variety. Coin/XP boosts do not multiply diamonds; completed orders cannot be claimed again.
- Hands-on stations have larger 3D hit areas and padded icon targets.
- Crop-specific cloned materials are disposed when crops change. Model loading is limited to four concurrent loads. Mobile shadows and antialiasing use less GPU memory. These address identified resource issues, but the reported intermittent crash has not been reproduced or definitively diagnosed.
- Leaderboard presence implementation is included. LIVE VERIFICATION INCOMPLETE: a two-client Supabase Realtime test returned TIMED_OUT. No online-status success is claimed. Grey indicators can mean presence is unavailable. Presence must be verified before treating this feature as production-ready.
- All player-facing text remains English.

# Previous quests and deliveries update

- 31 new regular quests (72 total), separate from the existing ten-step beginner guide. Includes all nine individual crops, successful chores, parallel production, each hands-on station, farm rounds, crafted goods, Honey deliveries, silo research and the farm stall.
- 28 daily challenge templates, with three selected per day. Goals include Greenhouse care, Apiary Honey, workshop repairs, animal care, successful chores and parallel production. Locked chores and parallel production are excluded until available. Existing 2 / 2 / 4 diamond rewards and the completion bonus are preserved.
- 24 delivery templates with three orders per day. Higher-level farms gain mixed hampers of bread, cheese, pickles, pie, oil, vegetables and Honey. Every order pays 40% above its ingredients' market sale value, plus XP.
- Daily goals and orders are saved for the entire UTC day. Level-ups, reloads and upgrades cannot change the current selection. New selections arrive at midnight UTC.
- Existing farms retain today's old challenges, order identities, claim markers and progress until tomorrow. Existing regular quest IDs and claims are preserved.
- Historical station completions, farm rounds and silo research count toward new lifetime quests. Newly tracked parallel starts, individual chore wins and delivery categories count from this update onward. Failed chores do not advance success quests or challenges.
- All player-facing text remains English. Deploy the included frontend through GitHub/Vercel after the server update.

# Previous chores and Honey update

- Chores unlock sequentially after 20 attempts at the preceding chore. Practice adds 2 percentage points per attempt, including failures.
- Clear the paths: 60–100% success, 1-minute cooldown, 18 coins / 4 XP on success.
- Fill the water troughs: 40–80% success, 3-minute cooldown, 40 coins / 8 XP on success.
- Sort the seed boxes: 20–60% success, 8-minute cooldown, 90 coins / 16 XP on success.
- Failed attempts award nothing, do not advance quests, and start the cooldown. Server-owned rolls are reused across concurrency retries. Client outcome fields are ignored.
- Existing balances, successful chore totals and cooldowns are preserved. Per-chore practice starts at zero because older saves did not record attempts per chore.
- Hands-on rewards: Greenhouse 20 coins / 7 XP / 1 Lettuce; Apiary 26 coins / 8 XP / 1 Honey; Animal paddock 24 coins / 7 XP / 1 Natural fertilizer; Tool workshop 30 coins / 8 XP / 1 Animal feed. Existing interactions and cooldowns are unchanged.
- Honey sells for 35 coins and uses original transparent jar artwork at public/assets/icons/honey.png, matching the existing goods style. All UI remains English.
- Honey artwork generated with the built-in image tool. Prompt: one transparent inventory icon matching goods-v2.png's warm painterly 3D style; a squat glass jar of amber honey, cream cloth cap and twine, honeycomb emblem, elevated three-quarter view, centered with padding, no text or other goods.

# Previous production update

## Parallel production, economy balance and beginner-guide cleanup

- Every production building has one simultaneous batch slot per building level: level 1 = 1 slot, level 2 = 2 slots, up to 10 slots at level 10. The Farmhouse continues to expand fields instead.
- Batches run independently, including different recipes in one building. Each has its own timer, progress and Collect this batch button. Ready goods occupy their slot until collected. Upgrade descriptions show the next level's capacity. All current batches must be collected before upgrading.
- Level 1 → 2 and level 2 → 3 upgrades cost 50% more. Higher upgrade prices are unchanged. The 50% upgrade voucher still applies once. Current building levels are preserved.
- Long-wait crops now sell for: Cabbage 110, Cauliflower 175, Pumpkin 250, Red cabbage 340 and Sunflower 480 coins per crop. Seed costs, growing times and the active-care yield are unchanged. Short crops keep their existing prices.
- Processed prices are also moderated: Fresh salad 450, Pickled cabbage 1,100, Sunflower oil 1,600, Pumpkin pie 1,250 and Vegetable box 1,700 coins. All recipes add sale value; the four longer-crop recipes add about 49–74% over selling all ingredients separately. Recipe cards show the exact added value, before temporary coin boosts.
- Existing coin/diamond balances, inventory quantities, quests, building levels and paid-for production outputs/timers are preserved. Market prices also apply to existing inventory when sold. Old single-batch saves gain stable batch IDs and empty extra slots without restarting production. Collection IDs reject stale or repeated claims; request receipts and atomic server commits are unchanged.
- Instant production affects all running batches. Scene status, active-production smoke, completion sounds and farm summaries account for every batch.
- Once all 10 beginner steps are complete and the 20-diamond reward is claimed, the desktop card, mobile banner and menu shortcut disappear; an open guide closes. Returning players see the same cleanup without claiming again.
- Everything remains in English. Existing scenery, music, activities, daily diamonds and leaderboards are retained.

Verification: 87 automated tests pass and the static production build succeeds. Supabase farm-api version 6 is ACTIVE, JWT verification remains enabled, and its three deployed source files exactly match this package. Authentication and database schemas are unchanged. A signed-in live-browser/physical-phone playthrough was not performed.

Upload this full project through GitHub Desktop to Vercel to get the matching interface and displayed prices. The server rules are already updated; no SQL setup is needed.

## Earlier September 17 changes (included)

## Continuous music and activities on the farm

- The breeze and birdsong have been replaced by Harvest Meadow: an original 2-minute-24-second instrumental with soft piano, warm chords, gentle bass and six melodic variations. No existing game music or third-party recording is used.
- The uncompressed WAV wraps note releases and room reflections across the loop boundary. One decoded Web Audio source loops at exact sample boundaries, without a stop, silent pause or fade at each repeat. Music resumes at its previous position after hiding the tab or muting it.
- Background music and game effects retain independent volume sliders and master mute. Music defaults to 22%, effects to 48%. Existing preferences are preserved. Loading the track is asynchronous and cannot block gameplay or game sounds; repeated gestures do not redownload or restart it.
- Farm activities no longer take up space in the HUD, Buildings or More. Tap the Greenhouse, Apiary, animals or Tool workshop in the farm to open that job directly. The old activity selection grid and Find on farm button are removed. A compact, non-clickable farm-round progress strip remains inside the job panel.
- All activity markers and task icons now use consistent outlined icons. Greenhouse uses a centred sprout rather than the seed-bag illustration. Other game artwork is unchanged.
- Planting, harvesting, rewards, production and level-up effects remain. The roaming truck and combine remain removed; the parked tractor and delivery cart retain their functions.

This is a frontend update; the existing Supabase function version 5 is unchanged. The static build and 78 automated tests pass, including music looping, mute/loading races, resume position, and checks for silence and boundary discontinuities in the actual audio file. Playback and layout have not been checked on a physical phone.

The shipped audio file needs no extra service or build dependency. To change the composition, run `scripts/generate-farm-music.py` with Python and NumPy, then rebuild the static site.

## Living farm and hands-on activities

The farm now loads 75 selected GLB models (previously 55). The four plain `box_004` blocks have been removed from the scene and replaced with detailed wooden crates, a grain sack and a barrel from the supplied pack. A compact wood stack and hay prop add detail to existing work areas without widening the playable farm or blocking paths.

The surroundings continue to use rolling hills, a distant mountain ridge, golden and green neighbouring fields, a pond with a bridge, additional trees, a workshop shed, stone fencing and a parked trailer. The playable farm stays in the middle; scenery does not force the camera to zoom out.

- Livestock move gently, bees circle the apiary, water ripples and working production buildings emit small wisps. Reduced-motion preferences stop ambient animation.
- Four activities are available by tapping the corresponding 3D object or its round marker: Greenhouse, Apiary, Animal paddock and Tool workshop.
- Each job asks the player to find three items that need attention. Tile arrangements change on repeat visits. Partial progress is saved. Jobs return after 3–4 minutes and reward coins and XP; greenhouse work also gives lettuce, animal care gives fertilizer.
- Completing a job at all four different stops gives an additional 22 coins and 10 XP. Repeating one stop does not substitute for the others. There is no deadline or penalty for leaving a job unfinished.
- The server validates job identity, targets, completed steps, minimum action intervals, cooldowns and rewards. Existing farm progress and diamond rewards are preserved.
- A rejected game action no longer incorrectly displays a lost-connection warning.

## Mobile crop spacing and camera cleanup

Crop centres are now 3.15 by 3.2 units apart, while each soil tile stays 2.38 units wide. Mobile crop timers use short labels (for example, 12h or 25m, rounded up). When zoomed far out, overlapping timers are hidden with harvest markers given priority. Zooming in reveals more labels; crops remain directly tappable, and accessible labels retain the full time.

Mobile camera and pan buttons are hidden because drag and pinch gestures already perform those actions. My farm still recentres the view. The bottom control area reserves 54 fewer pixels in portrait orientation. Desktop camera controls remain available. Activity markers stay on their objects; there is no floating activities button.

## Mobile Sign in button fix

The decorative logo image could overlap the header because its transparent image box extended outside its visual container. The logo no longer intercepts pointer events, and the header is now above the decorative layer. The Sign in button retains its existing behavior: select the sign-in form, scroll to it and focus Email address. Its touch target is at least 44px tall. Authentication logic is unchanged. This CSS fix has not been tested on a physical phone.

## Opaque mobile controls and doubled free diamonds

The mobile controls now sit on an opaque cream panel; the farm background and vignette no longer show through the gaps. The selected tool keeps its green highlight. This visual change still needs a check on a real mobile device after uploading.

Login gifts now give 4, 6, 8, 10, 12, 16 and 24 diamonds across a seven-day streak (80 total). The three daily challenges give 2, 2 and 4 diamonds (8 per day, up to 56 per week). Together that is 136 free diamonds per complete week, twice the previous recurring rate. Boost prices and the one-time 20-diamond beginner reward are unchanged. Existing balances are preserved and already-claimed rewards cannot be claimed again.

Supabase farm-api version 4 is active and its source was verified against this package. Upload the full project so the displayed reward amounts match the new server rewards.

## Expanded leaderboards

The Rank by dropdown has 14 categories, grouped into Farm progress and Individual crops:

- Coins, level, total crops harvested, claimed mastery badges and completed deliveries.
- Separate lifetime harvests for Wheat, Corn, Barley, Lettuce, Cabbage, Cauliflower, Pumpkin, Red cabbage and Sunflower.

Water and care bonuses count toward harvested quantities. Equal scores share a rank. Each board highlights your row and shows your rank even outside the top 20. Switching categories quickly cannot show a late response from the previous category.

Diamonds are never copied into public stats, selected by the leaderboard query or offered as a category. Public scores can be read by registered players; only the authoritative server can update them. Other players' farm state remains private.

The migration in `supabase/leaderboard-categories.sql` is already applied to project `jnmdirvidffzxukbdmij`. Existing progress was backfilled. Do not run this migration again on that project. For a new project, apply it after the existing online farm schema.

Database verification passed: a known input produces independent crop totals; backfilled rows match server farm stats; a rolled-back commit test updated the wheat score and rejected a stale revision; a separate registered-role test could read shared scores but not other farms or write scores. Test changes were rolled back. No diamond column exists in the public stats table.

The security advisor reported no new database issues. An existing Auth setting has leaked-password protection disabled; see [Supabase's password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Authentication settings were not changed by this update.

## Diamond economy update

| Boost | Diamonds |
| --- | ---: |
| Double XP (30 minutes) | 20 |
| Double earnings (30 minutes) | 60 |
| Finish production | 75 |
| Instant harvest | 90 |
| Builder’s discount | 150 |

The three daily challenges award 2, 2 and 4 diamonds respectively, once per challenge. Existing login gifts are now: 80 diamonds over a seven-day streak. Completing every daily challenge adds 56 for a maximum of 136 free diamonds per week. The separate beginner completion reward remains 20 diamonds, enough for Double XP.

The server checks the displayed purchase price before spending diamonds. An outdated game client is asked to reload instead of being charged a higher price. Upload this entire frontend update before buying boosts. Existing balances, active boosts and claimed challenges are preserved; previously claimed challenges are not paid again. Paid packs remain in their existing beta state; no checkout was added.

## Mobile interface refinement

- The farm starts centered at a medium zoom. Center the farm returns to this view; Show the whole farm remains available separately.
- The permanent save-status label is removed. Only connection errors show a retry control. Saving itself is unchanged.
- The welcome logo is no longer a link to play.html.
- The beginner banner uses fixed square artwork and a separate flexible text column.
- Camera buttons share a compact toolbar with consistent line icons and 44px mobile touch targets.
- Mobile menus, spacing and landscape safe areas are refined. All interface text remains English.

## Beginner guide alignment fix

Reward text now uses dedicated text elements, so icon replacement cannot duplicate it inside the diamond sprite. The guide has consistent padding, a flexible progress bar, an always-visible count, contained action buttons and a correctly sized reward icon. All other features from the full September 17 update are included. This package also includes the updated diamond rules described above.

## Included

- A new English welcome page with a large original logo, sharp farm illustration, feature icons and a responsive account card.
- An independent Beginner guide with 10 simple steps, separate from all 41 regular quests and daily challenges.
- One reward of 20 diamonds when the tenth beginner step is completed. Progress and reward eligibility are validated by the server.
- A mobile beginner banner and Show me buttons that open the relevant tools or building.
- More space between useful buildings, small work yards and extra props beside paths. All building functions remain available.
- An overview that fits the main buildings and fields, plus a Fields button to focus on crops. My farm returns to the centered view; Show the whole farm opens the overview.
- A centered mobile daily-gift icon and corrected singular-day wording.

## Install using GitHub Desktop

1. Unzip this project.
2. In GitHub Desktop, open `floris-adbacklog/harvest-tycoon` and choose Repository > Show in Finder (or Show in Explorer).
3. Copy the contents of this extracted project into that repository folder and replace the matching project files. Keep your repository's `.git` folder and your environment settings.
4. Review the changes in GitHub Desktop. Commit them, then select Push origin.
5. Open Vercel and wait for the new deployment to become Ready. Keep the existing Supabase environment variables.
6. Reload the live game. On desktop, check the welcome page; on mobile, check Today and the Beginner guide banner. Check pinch/drag navigation and the four Farm activities on mobile. Desktop keeps Fields and Show the whole farm controls.

Supabase project `jnmdirvidffzxukbdmij` already runs the updated `farm-api` version 6. Its deployed source was compared with this package. The leaderboard migration is also already applied. No further database setup or authentication change is needed. Do not rerun the old setup SQL.

## Verified scope

- 87 automated tests pass, including production at every building level, independent collection, stale-claim rejection, old-save migration, boosts across parallel batches, prices, upgrade vouchers, beginner-guide hiding and the earlier regression tests.
- The static Vercel production build passes. Audio tests cover saved mute preferences, independent volume, hidden-tab suspension, resource cleanup, action/level-up routing, throttling, history navigation and mute/resume races.
- The deployed Supabase function is ACTIVE with JWT verification enabled and matches the included function sources.
- The GitHub integration rejected writes with HTTP 403, “Resource not accessible by integration”. No frontend commit was pushed by ChatGPT.
- All 75 selected GLBs were parsed with the game’s GLTFLoader. Scene construction, station registration, camera-label positioning and animation updates ran without invalid transforms; the model layout was inspected with a software render.
- A full browser preview is unavailable in this workspace. The new UI has not been tested on a physical phone or in an authenticated live browser. Upload through GitHub Desktop, then check the new controls and activities on Vercel.

## September 18 — chores, mobile entry and payments foundation

- Six sequential chores with distinct line icons, success bars and reward result dialogs. Practice and existing progress are preserved. New chores: Mending the orchard fence (15 minutes, 180 coins, 35 XP), Restoring irrigation (25 minutes, 330 coins, 65 XP), Preparing the harvest fair (45 minutes, 600 coins, 120 XP). Rewards require success; every attempt gives practice.
- Mobile account access is positioned before marketing copy, with compact branding and immediately visible Sign in / Create account tabs.
- Hands-on activity icons are directly tappable. Solid station hit volumes get priority over scenery; touch movement tolerance is increased slightly while dragging and pinch remain supported. Actual Android hardware verification is still needed.
- Finish one crop costs 5 diamonds: select one growing field and finish its timer. The crop remains in the field to harvest. Empty/ready fields and insufficient balances are rejected without charging.
- Stripe Checkout and signed webhook processing are implemented, with authoritative pack prices and atomic, idempotent diamond credits. Database/schema/functions have been deployed; see PAYMENT-SETUP.md for the remaining manual webhook and secret steps. Stripe connector permissions blocked webhook creation. Checkout has not been verified end to end and must not be represented as live yet.
- 120 automated tests pass, including payment validation, existing farming/input regressions, all six chore progression stages, and single-crop spending rules. The production static build passes.


## Starter Pack and activity update

- Starter Pack is €2.99, linked to prod_VHfWRMcedF9ShZ and its verified EUR price. Awards 10,000 coins, 300 diamonds and one of each of the nine crops directly in normal inventory. Available in the first 72 account hours, once per account, with a compact bottom-left icon.
- Sort the seed boxes now starts at 35% success and reaches its existing 60% maximum after 13 practice attempts. Existing practice is preserved.
- Finish one crop now costs 10 diamonds. Double XP now costs 25 diamonds for 30 minutes. Old price quotes are rejected without charging.
- A successful server-recorded farm action marks a player online for 30 minutes. Loads, idle tabs and rejected/replayed actions do not refresh activity. Status persists across tabs/devices; closing a tab does not erase the 30-minute window. The open leaderboard refreshes every 30 seconds and expires loaded statuses automatically.
- Starter grants and replay protection were tested inside a rolled-back database transaction under the actual server role. No real account received test rewards. Activity timestamps and stale-action rejection were also tested in Supabase.
- The user's live Stripe webhook is verified enabled with both required events. Full payment processing still needs an end-to-end test after all Supabase payment secrets and the enable flag are configured. See PAYMENT-SETUP.md.


## Desktop Starter Pack placement and live checkout

- Desktop Starter Pack button moved to the bottom-left corner below the side menu so it no longer covers Quests. Mobile placement is preserved.
- The production checkout now runs in live mode and enables purchases when both required Stripe secrets are configured. An explicit PAYMENTS_ENABLED=false remains an emergency off switch. Test API keys cannot activate the live shop.
- No real payment has been made or verified in this update. See PAYMENT-SETUP.md for the required server secrets and verification status.
