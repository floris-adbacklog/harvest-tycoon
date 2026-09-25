// The number on the app icon (installed app on a phone or computer): unread private and family messages. sw.js adds one when such a
// message arrives while the game is closed; the chat sets the real count whenever it knows it. A browser without app badges ignores it.
export async function setAppBadge(count,win=globalThis.window){
 let top=win;try{top=win?.top??win;}catch{}
 const n=Math.max(0,Math.floor(Number(count)||0)),nav=top?.navigator;
 try{if(n>0)await nav?.setAppBadge?.(n);else await nav?.clearAppBadge?.();}catch{}
 try{const cache=await top?.caches?.open?.('harvest-badge');await cache?.put?.('/__badge',new Response(String(n)));}catch{}
}
