-- The leaderboard's read rule, fast (26 Oct 2026, run live by the owner that evening). The policy on player_stats called auth.jwt() for
-- every row, so every leaderboard request unpacked the player's sign-in token 9,319 times: 300 ms for one count with a normal token, about
-- a fifth of all database time after the 26 Oct restart. Inside (select ...) the token is read once per request: 7 ms. The rule itself is
-- the same: every signed-in farmer reads the leaderboard, an anonymous session reads nothing.
alter policy "Players can read leaderboard" on public.player_stats
 using (coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
