// Links that open one screen of the game: a notification (sw.js), a shortcut on the app icon (manifest.webmanifest) or ?open= in the
// address. Only these screens, and a chat only by a channel the chat itself knows (global, a family, a private chat, or the
// Notifications tab: an in-game purchase for the admin; the staff's Crew, supabase/chat-crew-push.sql). Settings (4 Oct 2026) at one
// part only by a slug of public/game-links.js (/settings/<part> on the website comes here as ?open=settings&part=<part>, vercel.json).
import {settingsPart} from './game-links.js';
// The Feedback window (6 Oct 2026, /feedback on the website: vercel.json).
export const OPEN_SCREENS=Object.freeze(['chat','today','leaderboard','farm','settings','feedback']);
const CHANNEL=/^(global|notices|crew|family:[0-9a-f-]{36}|dm:[0-9a-f-]{36}:[0-9a-f-]{36})$/;
export function openIntent(search){
 let params;try{params=new URLSearchParams(search??'');}catch{return null;}
 const open=params.get('open');if(!OPEN_SCREENS.includes(open))return null;
 const channel=params.get('channel');
 if(open==='settings'){const part=params.get('part');return settingsPart(part)?{open,part}:{open};}
 return open==='chat'&&channel&&CHANNEL.test(channel)?{open,channel}:{open};
}
// The address without the link's own part, so a reload does not open the screen again.
export function withoutOpen(href){const url=new URL(href);url.searchParams.delete('open');url.searchParams.delete('channel');url.searchParams.delete('part');return url.pathname+url.search+url.hash;}
