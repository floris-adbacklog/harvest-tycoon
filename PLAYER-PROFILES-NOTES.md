# Player profiles — complete release v5

Built on the complete Farm Family v4 release. All previous gameplay, tournament rewards, scene changes, payment integration and 19 leaderboard categories are preserved.

## In the game

- Select any username in the leaderboard to open that farmer's profile.
- Search all farmers by name, including people outside the top 10. Search is case-insensitive, accepts 2–20 characters, and shows up to 20 matches with a refinement hint.
- Use **Your profile** to view your own public farmer card.
- Profiles show player name, level, online/offline status, current family and Leader/Member role, crops harvested, goods produced, items sold, completed deliveries and individually earned crop-mastery badges.
- Profiles use Harvest Tycoon's existing painted illustrations, warm backgrounds and mobile-friendly controls. Back, close and Escape return to the leaderboard.
- Online means a server-recorded gameplay action in the last 30 minutes. Viewing or searching profiles does not make someone online. Open profiles refresh every 30 seconds while the page is visible.

## Top 10 and clearer family rewards

- All 19 player ranking categories now show the top 10. Gold, silver and bronze painted trophies mark the first three places; places 4–10 use numbers. Tied scores follow the existing stable player-ID order, including your own rank outside the top 10.
- Family tournaments use the same three trophies and show at most ten families.
- There are 21 family emblems: nine extra choices, including newly generated Honeybee, Oak grove and Sunrise barn artwork. Existing emblem IDs are preserved. Leaders can change their emblem from Family management.
- Weekly-order rewards now appear above the goods list, with coin, XP and diamond icons. The personal base reward and the shared completion bonus are clearly separated.
- Removed the automatic-credit wording from the level-up popup and farm journal. Rewards still arrive automatically.

## Server

Supabase project `jnmdirvidffzxukbdmij`: `farm-api` version **36**, ACTIVE, JWT verification enabled. Deployed source was fetched back and all six files matched the release exactly.

Two authenticated, session-validated read-only operations were added: `player_search` and `player_profile`. They return only explicit public fields. Farm state, diamonds, email addresses, family invite codes and other account details are not returned. Mastery uses a JSON-path projection, not a complete farm read. Departed family memberships and deleted families are excluded.

No SQL migration is required. Family emblem selection is validated by the server, including the new leader-only `family_emblem` action. `harvest_commit_farm` was not changed (definition MD5 `3aee1c7fbd773babbe9017a3f543ba16`). The shared gameplay module adds nine emblem choices, leader-only emblem updates and ten visible family standings; reward calculations are unchanged. Family-service, presence and runtime configuration match the previous live deployment. Do not reapply the old leaderboard SQL files: they contain older commit-function definitions.

## Validation

- **245 automated tests passed**, including 17 new profile/search, family-emblem and reward-presentation tests.
- Coverage includes field privacy, literal wildcard searches, result limits, membership filtering, badge validation, the 30-minute online boundary, unknown players, authentication routing, stale responses, switching profiles, closing during loading, clearing searches and retrying errors.
- Production static build passed. Deployable files are in `dist-static/`; editable source and server code are included.
- Mobile layout uses constrained dialog width, scrolling, wrapping names, 44px+ controls and adaptive grids. A real-device/browser visual test and an authenticated live user walkthrough were not performed in this environment.

## Publish

The Supabase server is already updated. Publish this frontend release through the existing GitHub/Vercel workflow, or upload `dist-static/` to the existing static host, to make profiles and search visible to players.
