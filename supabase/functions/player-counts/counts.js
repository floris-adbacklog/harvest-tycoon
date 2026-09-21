// "Online" means an action in the last 30 minutes, the same rule as the leaderboard and the farmer profiles.
export const ONLINE_WINDOW_MS=30*60*1000;
export const CACHE_MS=30*1000;
export const onlineSince=(now=Date.now())=>new Date(now-ONLINE_WINDOW_MS).toISOString();
const whole=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
// Two numbers and nothing else; the online count can never exceed the number of players.
export function normaliseCounts(players,online){const total=whole(players);return {players:total,online:Math.min(total,whole(online))};}
