// The number on the app icon (installed app on a phone or computer): unread private and family messages. sw.js adds one when such a
// message arrives while the game is closed; the chat sets the real count whenever it knows it. A browser without app badges ignores it.
import {portal} from './portal.js';
export async function setAppBadge(count,win=globalThis.window){
 // Not on Kongregate or Discord (Oct 2026): there is no app of ours to put a number on. CrazyGames' farm frame keeps its own number.
 if(['kongregate','discord'].includes(portal(win)?.name))return;
 // The top window only when it is ours: inside CrazyGames' page (Oct 2026) reading its navigator throws, so this frame's own is used.
 let top=win;try{top=win?.top??win;void top?.navigator;}catch{top=win;}
 const n=Math.max(0,Math.floor(Number(count)||0)),nav=top?.navigator;
 try{if(n>0)await nav?.setAppBadge?.(n);else await nav?.clearAppBadge?.();}catch{}
 try{const cache=await top?.caches?.open?.('harvest-badge');await cache?.put?.('/__badge',new Response(String(n)));}catch{}
}
