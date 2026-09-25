// Harvest Tycoon service worker: it makes the site installable as an app, shows push reminders, keeps the number on the app icon and
// has one small page for when there is no connection. It caches nothing of the game: the farm is server-authoritative and needs a
// connection anyway, and a cache would only risk serving stale game files after an update. Only when a page cannot load at all does it
// answer with /offline.html.
const OFFLINE_CACHE='harvest-offline-v1',OFFLINE_PAGE='/offline.html',BADGE_CACHE='harvest-badge',BADGE_KEY='/__badge';
self.addEventListener('install',event=>{
 self.skipWaiting();
 event.waitUntil(caches.open(OFFLINE_CACHE).then(cache=>cache.addAll([OFFLINE_PAGE,'/assets/pwa/icon-192.png'])).catch(()=>{}));
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('harvest-offline-')&&key!==OFFLINE_CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
// Pages (the game and the farm frame) come from the network as always; only when that fails, the offline page. Everything else is
// left to the network, exactly as if there were no worker.
self.addEventListener('fetch',event=>{
 if(event.request.mode!=='navigate')return;
 event.respondWith(fetch(event.request).catch(async()=>(await caches.match(OFFLINE_PAGE))??Response.error()));
});

// The number on the app icon (public/app-badge.js sets the real count while the game is open): a chat message arriving while the
// game is closed adds one.
async function bumpBadge(){
 try{
  if(!self.navigator?.setAppBadge)return;
  const cache=await caches.open(BADGE_CACHE),count=(Number(await (await cache.match(BADGE_KEY))?.text())||0)+1;
  await cache.put(BADGE_KEY,new Response(String(count)));await self.navigator.setAppBadge(count);
 }catch{}
}

// A reminder from the hourly job or a chat message: {title, body, tag, url}. Every push must show a notification (iPhones drop the
// subscription otherwise), and a newer one replaces an older one with the same tag that was not opened yet.
self.addEventListener('push',event=>{
 let data={};
 try{data=event.data?event.data.json():{};}catch{data={body:event.data?event.data.text():''};}
 const tag=data.tag||'harvest-tycoon';
 event.waitUntil(Promise.all([self.registration.showNotification(data.title||'Harvest Tycoon',{
  body:data.body||'Your farm is waiting.',icon:'/assets/pwa/icon-192.png',badge:'/assets/pwa/icon-192.png',
  tag,renotify:true,data:{url:typeof data.url==='string'&&data.url.startsWith('/')?data.url:'/'}
 }),tag.startsWith('chat-')?bumpBadge():null]));
});
// Tapping a notification opens its screen (public/app-links.js: ?open=chat&channel=…, ?open=today): a game that is already open is
// brought forward and told where to go; otherwise the app opens on that screen.
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'/',self.location.origin).href;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const page=windows.find(client=>new URL(client.url).origin===self.location.origin&&client.frameType!=='nested'&&'focus' in client);
  if(page){await page.focus();page.postMessage({type:'open',url:target});return;}
  await self.clients.openWindow(target);
 })());
});
