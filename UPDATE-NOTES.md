# Harvest Tycoon — September 18 production update

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
