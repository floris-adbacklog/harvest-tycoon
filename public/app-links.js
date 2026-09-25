// Links that open one screen of the game: a notification (sw.js), a shortcut on the app icon (manifest.webmanifest) or ?open= in the
// address. Only these screens, and a chat only by a channel the chat itself knows (global, a family, a private chat, or the
// Notifications tab: an in-game purchase for the admin).
export const OPEN_SCREENS=Object.freeze(['chat','today','leaderboard','farm']);
const CHANNEL=/^(global|notices|family:[0-9a-f-]{36}|dm:[0-9a-f-]{36}:[0-9a-f-]{36})$/;
export function openIntent(search){
 let params;try{params=new URLSearchParams(search??'');}catch{return null;}
 const open=params.get('open');if(!OPEN_SCREENS.includes(open))return null;
 const channel=params.get('channel');
 return open==='chat'&&channel&&CHANNEL.test(channel)?{open,channel}:{open};
}
// The address without the link's own part, so a reload does not open the screen again.
export function withoutOpen(href){const url=new URL(href);url.searchParams.delete('open');url.searchParams.delete('channel');return url.pathname+url.search+url.hash;}
