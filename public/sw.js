// Harvest Tycoon service worker: it makes the site installable as an app and, later, receives push messages.
// It deliberately caches nothing. The farm is server-authoritative and needs a connection anyway, and a cache
// would only risk serving stale game files after an update.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Some browsers only treat a site as installable when a fetch handler exists. Not answering the request
// leaves it to the network, exactly as if there were no worker.
self.addEventListener('fetch',()=>{});
