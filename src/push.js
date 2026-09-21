// Push reminders for this device: permission, subscription and the link to the player's account.
// The browser calls come from the top-level page (window.harvestBridge.notifications.push), because the
// permission prompt and the service worker belong to it, not to the game iframe.
export function urlBase64ToUint8Array(value){
 const padded=(value+'='.repeat((4-value.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(padded);
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}

export function createPush({supabase,getKey,win=globalThis.window}){
 const nav=win?.navigator;
 const supported=Boolean(nav&&'serviceWorker' in nav&&win&&'PushManager' in win&&'Notification' in win);
 const standalone=()=>Boolean(win?.matchMedia?.('(display-mode: standalone)')?.matches||nav?.standalone);
 const ios=()=>/iphone|ipad|ipod/i.test(nav?.userAgent??'')||(nav?.platform==='MacIntel'&&nav?.maxTouchPoints>1);
 const registration=async()=>{try{return await nav.serviceWorker.ready;}catch{return null;}};
 const subscription=async()=>(await registration())?.pushManager?.getSubscription()??null;
 async function link(sub){
  const json=sub.toJSON();
  const {error}=await supabase.rpc('notification_subscribe',{p_endpoint:json.endpoint,p_p256dh:json.keys?.p256dh,p_auth:json.keys?.auth,p_user_agent:(nav.userAgent??'').slice(0,300)});
  if(error)throw error;
 }
 // unsupported | install-first (iPhone: only works from the home screen) | blocked | off | on
 async function status(){
  if(!supported)return {kind:'unsupported'};
  if(ios()&&!standalone())return {kind:'install-first'};
  if(win.Notification.permission==='denied')return {kind:'blocked'};
  const sub=win.Notification.permission==='granted'?await subscription():null;
  return {kind:sub?'on':'off'};
 }
 return {
  status,
  async enable(){
   const now=await status();if(now.kind==='unsupported'||now.kind==='install-first'||now.kind==='blocked')return now;
   const key=await getKey();if(!key)throw new Error('Reminders are not switched on yet.');
   if(await win.Notification.requestPermission()!=='granted')return status();
   const reg=await registration();if(!reg)throw new Error('The app is not ready yet. Reload the page and try again.');
   const sub=(await reg.pushManager.getSubscription())??await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(key)});
   await link(sub);return status();
  },
  async disable(){
   const sub=await subscription();
   if(sub){try{await supabase.rpc('notification_unsubscribe',{p_endpoint:sub.endpoint});}catch{}await sub.unsubscribe().catch(()=>{});}
   return status();
  },
  // Keeps the server's copy of this device current: the browser can change an endpoint, and a shared device follows the player who is signed in.
  async sync(){
   try{if((await status()).kind==='on'){const sub=await subscription();if(sub)await link(sub);}}catch{}
  },
  // Signing out: this device stops receiving the signed-out player's reminders.
  async detach(){
   try{const sub=win.Notification?.permission==='granted'?await subscription():null;if(sub)await supabase.rpc('notification_unsubscribe',{p_endpoint:sub.endpoint});}catch{}
  },
  async test(){
   const reg=await registration();if(!reg)throw new Error('The app is not ready yet.');
   await reg.showNotification('Harvest Tycoon',{body:'Notifications work in this browser or app. We will only nudge you when your farm needs you.',icon:'/assets/pwa/icon-192.png',tag:'harvest-tycoon-test'});
  }
 };
}
