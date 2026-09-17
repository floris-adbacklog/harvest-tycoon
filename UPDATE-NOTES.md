# Harvest Tycoon — September 17 update

## Quiet farm audio, stationary vehicles and centred activity icons

- Soft breeze and occasional birdsong start gently after the first interaction with the farm. Background ambience defaults to 22%; game sounds default to 48%, with a conservative overall output level.
- Planting, watering, harvesting, care, selling, production, collection, upgrades, quests, daily diamonds and farm activities each have matching short sounds. Level-ups have their own cheerful rising melody and take priority over other effects.
- Successful actions trigger one sound after the server confirms them. Failed actions and loading old progress do not play reward sounds. Production completion has a quiet, one-time cue during active play.
- Open the speaker on desktop or More > Sound settings on mobile. Background ambience and game sounds have independent volume sliders, a master mute and a level-up preview. Preferences persist on this device. No farm data is stored with audio preferences.
- Sound suspends while the tab is hidden and cleans up when leaving the game. Ambient transitions fade in, rapid effects are limited, and completed audio nodes disconnect. If sound is unsupported or blocked, farming remains available.
- The roaming delivery truck and combine have been removed, including their model downloads. The original parked tractor and delivery cart remain functional.
- Greenhouse and other activity markers have a fixed 44px round button and a centred 26px icon. Their illustrations can no longer stretch beyond the button. Dragging from a marker still moves the view; a tap opens the activity.
- All sounds are original procedural Web Audio sounds. No recordings, extra audio files or audio service are required. Browser gesture handling follows [MDN Web Audio guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

This is a frontend update; the existing Supabase function version 5 is unchanged. Audio has not been auditioned on a physical phone.

## Living farm and hands-on activities

The farm now loads 70 selected GLB models (previously 55), with 15 additional models from the supplied pack. The surroundings use rolling hills, a distant mountain ridge, golden and green neighbouring fields, a pond with a bridge, additional trees, a workshop shed, stone fencing and a parked trailer. The playable farm stays in the middle; scenery does not force the camera to zoom out.

- Livestock move gently, bees circle the apiary, water ripples and working production buildings emit small wisps. Reduced-motion preferences stop ambient animation.
- Four activities are available from the Farm activities button, Buildings, More, or the corresponding 3D object: Greenhouse, Apiary, Animal paddock and Tool workshop.
- Each job asks the player to find three items that need attention. Tile arrangements change on repeat visits. Partial progress is saved. Jobs return after 3–4 minutes and reward coins and XP; greenhouse work also gives lettuce, animal care gives fertilizer.
- Completing a job at all four different stops gives an additional 22 coins and 10 XP. Repeating one stop does not substitute for the others. There is no deadline or penalty for leaving a job unfinished.
- The server validates job identity, targets, completed steps, minimum action intervals, cooldowns and rewards. Existing farm progress and diamond rewards are preserved.
- A rejected game action no longer incorrectly displays a lost-connection warning.

## Mobile crop spacing and camera cleanup

Crop centres are now 3.15 by 3.2 units apart, while each soil tile stays 2.38 units wide. Mobile crop timers use short labels (for example, 12h or 25m, rounded up). When zoomed far out, overlapping timers are hidden with harvest markers given priority. Zooming in reveals more labels; crops remain directly tappable, and accessible labels retain the full time.

Mobile camera and pan buttons are hidden because drag and pinch gestures already perform those actions. My farm still recentres the view. The bottom control area reserves 54 fewer pixels in portrait orientation. Desktop camera controls remain available. Farm activities use a compact floating button instead of another full-width bar.

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

Supabase project `jnmdirvidffzxukbdmij` already runs the updated `farm-api` version 5. Its deployed source was compared with this package. The leaderboard migration is also already applied. No further database setup or authentication change is needed. Do not rerun the old setup SQL.

## Verified scope

- 75 automated tests pass, including a complete beginner journey, one-time reward, rejected skipped steps, saved progress, and preservation of regular quest progress.
- The static Vercel production build passes. Audio tests cover saved mute preferences, independent volume, hidden-tab suspension, resource cleanup, action/level-up routing, throttling, history navigation and mute/resume races.
- The deployed Supabase function is ACTIVE with JWT verification enabled and matches the included function sources.
- The GitHub integration rejected writes with HTTP 403, “Resource not accessible by integration”. No frontend commit was pushed by ChatGPT.
- All 70 GLBs were parsed with the game’s GLTFLoader. Scene construction, station registration, camera-label positioning and animation updates ran without invalid transforms; the model layout was inspected with a software render.
- A full browser preview is unavailable in this workspace. The new UI has not been tested on a physical phone or in an authenticated live browser. Upload through GitHub Desktop, then check the new controls and activities on Vercel.
