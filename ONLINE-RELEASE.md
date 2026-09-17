# Harvest Tycoon — online release repair

## Fixed

The deployed farm API returned HTTP 503 because its SECURITY INVOKER session checker could not read `auth.sessions`. The backend role now has SELECT privileges on exactly `id`, `user_id` and `not_after`. Browser roles received no access. The active-session check is retained: even a still-unexpired JWT fails after logout.

`player_stats` now permits browser reads only. The authenticated Edge Function computes actions and atomically commits the full farm and its leaderboard score. Direct browser writes to farms, scores and internal RPCs are blocked.

The Vercel configuration selects the standalone static build instead of the Sites/Next.js worker build. Missing Supabase environment variables produce an explicit build error. Both the landing and protected farm frame are included in the production output.

Additional fixes cover account switching during an in-flight load, rejected writes, expired sessions, double-clicks, asynchronous quest claims, sequential agent field actions and refreshing the farm after returning to a tab. Farm requests have a 20-second timeout. All game-facing text is English.

## Verification completed

- 48 automated Node tests passed, including auth guards, late responses after logout, account switching during loading, unavailable connections, game rules and pointer behavior.
- Static Vercel-targeted production build completed successfully with the existing project's public configuration.
- Two independent registered QA accounts signed in through the real Supabase Auth API and each created its own server farm.
- A real game action changed and persisted currency. Reload returned the exact saved state.
- Repeating the same request ID did not award coins twice. Forged client state and another player's ID were ignored.
- A second account could read the first account's leaderboard score, but could not read or overwrite that player's private farm.
- Neither account could directly overwrite scores or invoke the internal server commit RPC.
- Concurrent actions retained both rewards without a lost update.
- Server-side profile rename and token refresh worked.
- Missing, malformed and logged-out tokens could not open the farm.
- Temporary QA users, sessions, farms and leaderboard entries were removed after testing.

## Deployment and remaining checks

This export has NOT been pushed to GitHub or deployed to Vercel. Upload the contents to the GitHub repository and use VERCEL-SETUP.md. The backend permission repairs are already applied to project jnmdirvidffzxukbdmij; do not rerun the setup SQL there.

The browser-preview infrastructure remains unavailable. Desktop/mobile visual checks, a real Vercel deployment and end-to-end email confirmation have not been verified. Automated auth tests exercise these lifecycle behaviors with simulated DOM/auth responses; they are not browser screenshots or proof of email delivery.

Supabase's security advisor found no database/RLS findings. Its existing warning about disabled leaked-password protection remains: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Old browser saves and historical Sites D1 data remain untouched and unused. Older frontend versions can no longer push scores directly; this frontend uses the server API. Full farms now belong to authenticated accounts, so there is no guest progression or automatic import of device saves.
