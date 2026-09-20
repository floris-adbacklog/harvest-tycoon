// Harvest Tycoon service worker: it makes the site installable as an app and shows push reminders.
// It deliberately caches nothing. The farm is server-authoritative and needs a connection anyway, and a cache
// would only risk serving stale game files after an update.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Some browsers only treat a site as installable when a fetch handler exists. Not answering the request
// leaves it to the network, exactly as if there were no worker.
self.addEventListener('fetch',()=>{});

// A reminder from the hourly job: {title, body, tag, url}. Every push must show a notification (iPhones drop
// the subscription otherwise), and a newer reminder replaces an older one that was not opened yet.
self.addEventListener('push',event=>{
 let data={};
 try{data=event.data?event.data.json():{};}catch{data={body:event.data?event.data.text():''};}
 event.waitUntil(self.registration.showNotification(data.title||'Harvest Tycoon',{
  body:data.body||'Your farm is waiting.',icon:'/assets/pwa/icon-192.png',badge:'/assets/pwa/icon-192.png',
  tag:data.tag||'harvest-tycoon',renotify:true,data:{url:typeof data.url==='string'&&data.url.startsWith('/')?data.url:'/'}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'/',self.location.origin).href;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of windows){if(new URL(client.url).origin===self.location.origin&&'focus' in client){await client.focus();return;}}
  await self.clients.openWindow(target);
 })());
});
