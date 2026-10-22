import {t} from '../public/i18n.js';
// A new version of the game. An installed app often stays open for days, so after a deploy it would keep running the old files. When the
// game comes back on screen after a minute or more away, this checks /version.json (written by scripts/build-static.mjs on every deploy)
// and reloads when the version differs. It never reloads while someone is playing, only on the way back in; the farm is on the server,
// so nothing is lost. canReload lets a page hold the reload back while a reload would undo what it shows (the Discord page's Authorize
// card); the new version then waits for the next return.
export const UPDATE_AFTER_HIDDEN=60*1000,UPDATE_POLL=30*60*1000;
export function startUpdateCheck({doc=globalThis.document,win=globalThis.window,fetchImpl=globalThis.fetch,now=()=>Date.now(),canReload=()=>true}={}){
 const current=doc?.querySelector?.('meta[name="harvest-version"]')?.content;
 if(!current||current==='dev')return null;
 let hiddenAt=0,newer=false;
 async function check(){
  try{const response=await fetchImpl('/version.json',{cache:'no-store'});if(!response.ok)return false;const {version}=await response.json();newer=typeof version==='string'&&version!==current;}
  catch{}
  return newer;
 }
 // While playing, only note that a newer version exists; the reload waits for the next return.
 const timer=win.setInterval(()=>{if(!doc.hidden)void check();},UPDATE_POLL);
 doc.addEventListener('visibilitychange',async()=>{
  if(doc.hidden){hiddenAt=now();return;}
  const away=hiddenAt?now()-hiddenAt:0;hiddenAt=0;
  if(away<UPDATE_AFTER_HIDDEN)return;
  if((newer||await check())&&canReload())win.location.reload();
 });
 // Reload everyone now (below): the same page, the same hold-back.
 forced=startForcedReload({doc,win,fetchImpl,now,canReload});
 return {check,stop:()=>win.clearInterval(timer),forced};
}

// Reload everyone now (22 Oct 2026, the owner: a hard refresh for everyone after a release). The admin presses it in the Admin dashboard
// (src/admin-reload.js); farm-api keeps the time and every farm load's answer carries it (reloadAfter, farm-api reload-service.js), and
// src/supabase.js farmRequest hands each answer here (noteReloadAfter). A page that opened before that press, whose /version.json is newer
// than its own harvest-version, shows "A new version is ready, reloading…" for 3 seconds and reloads, right away, also while playing.
// But never during a purchase (a checkout or a store's purchase sheet, guardPurchases), while taps are being saved (farm-saving on the
// farm page), while the farmer types (a focused text field with text in it, or the chat's own message with text), or while the page holds
// it back (canReload); it then waits until that is over. Once per press (FORCED_KEY): a reload that still finds the same version, or an
// answer that comes again, never reloads twice. A press while the new version is not out yet: checked again once a minute, for
// FORCED_WINDOW_MS. Only pages whose code has this reach it; older ones update the usual way, when the farmer comes back.
export const FORCED_TOAST_MS=3000,FORCED_WAIT_MS=3000,FORCED_CHECK_MS=60000,FORCED_WINDOW_MS=30*60000,PURCHASE_TAIL_MS=30000;
export const FORCED_KEY='harvest-tycoon:forced-reload',FORCED_TEXT='A new version is ready, reloading…';
const pageStartedAt=()=>{try{const origin=globalThis.performance?.timeOrigin;if(Number.isFinite(origin)&&origin>0)return origin;}catch{}return Date.now();};
const localStore=()=>{try{return globalThis.localStorage??null;}catch{return null;}};

// A purchase running (the website's checkout until the page has gone to Stripe, a store's purchase sheet in the apps, Kreds on
// Kongregate): bridge.checkout and bridge.payments, counted while they run, the checkout for PURCHASE_TAIL_MS more (the page leaving).
let purchases=0,purchaseUntil=0;
export const purchaseRunning=(at=Date.now())=>purchases>0||at<purchaseUntil;
export function holdForPurchase(work,{tail=0,now=()=>Date.now()}={}){
 purchases++;
 const done=()=>{purchases--;if(tail)purchaseUntil=Math.max(purchaseUntil,now()+tail);};
 let running;try{running=Promise.resolve(work());}catch(error){done();throw error;}
 return running.finally(done);
}
export function guardPurchases(bridge,{now=()=>Date.now()}={}){
 const checkout=bridge?.checkout,payments=bridge?.payments;
 if(typeof checkout==='function')bridge.checkout=(...args)=>holdForPurchase(()=>checkout.apply(bridge,args),{tail:PURCHASE_TAIL_MS,now});
 if(typeof payments==='function')bridge.payments=(...args)=>holdForPurchase(()=>payments.apply(bridge,args),{now});
 return bridge;
}
export const resetPurchases=()=>{purchases=0;purchaseUntil=0;};

// The page and the farm inside it (same site): a focused text field with text, or the chat's message with text while the chat shows it.
const TEXT_INPUTS=new Set(['','text','search','email','url','tel','password','number']);
const textField=el=>Boolean(el)&&(el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&TEXT_INPUTS.has(String(el.type??'').toLowerCase()))||el.isContentEditable===true);
const hasText=el=>Boolean(String((el.isContentEditable?el.textContent:el.value)??'').trim());
const shown=el=>{try{return typeof el.getClientRects!=='function'||el.getClientRects().length>0;}catch{return true;}};
const pageDocs=doc=>{const docs=[doc];try{for(const frame of doc?.querySelectorAll?.('iframe')??[]){try{if(frame.contentDocument)docs.push(frame.contentDocument);}catch{}}}catch{}return docs.filter(Boolean);};
export function typingNow(doc=globalThis.document){
 for(const d of pageDocs(doc)){
  const active=d.activeElement;if(textField(active)&&hasText(active))return true;
  for(const field of d.querySelectorAll?.('.chat-compose input,.chat-compose textarea')??[])if(hasText(field)&&shown(field))return true;
 }
 return false;
}
export const savingNow=(doc=globalThis.document)=>pageDocs(doc).some(d=>d.body?.classList?.contains?.('farm-saving'));

function showToast(doc,text){
 const el=doc.createElement('div');el.className='forced-reload-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.textContent=text;
 el.style.cssText='position:fixed;left:50%;top:max(16px,env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483647;max-width:calc(100% - 32px);box-sizing:border-box;padding:12px 18px;border:1.5px solid #e3d8c6;border-radius:18px;background:#fffdf5;box-shadow:0 4px 0 #e2d4ba,0 12px 30px #3a301c2e;color:#453e28;font:600 15px/1.4 "DM Sans",system-ui,sans-serif;text-align:center;pointer-events:none';
 (doc.body??doc.documentElement).append(el);
 return()=>el.remove();
}

export function startForcedReload({doc=globalThis.document,win=globalThis.window,fetchImpl=globalThis.fetch,now=()=>Date.now(),canReload=()=>true,
 pageStarted=pageStartedAt(),storage=localStore(),busy=()=>purchaseRunning(now())||savingNow(doc),typing=()=>typingNow(doc),
 text=()=>t(FORCED_TEXT),sleep=ms=>new Promise(resolve=>win.setTimeout(resolve,ms))}={}){
 const current=doc?.querySelector?.('meta[name="harvest-version"]')?.content;
 if(!current||current==='dev')return null;
 let checkedFor=null,checkedAt=-Infinity,running=false;
 const done=()=>{try{return storage?.getItem(FORCED_KEY)??null;}catch{return null;}};
 const remember=at=>{try{storage?.setItem(FORCED_KEY,String(at));}catch{}};
 const quiet=()=>!busy()&&!typing()&&canReload();
 async function newer(){
  try{const response=await fetchImpl('/version.json',{cache:'no-store'});if(!response.ok)return false;const {version}=await response.json();return typeof version==='string'&&version!==current;}
  catch{return false;}
 }
 async function go(at){
  if(!await newer())return 'same';
  for(;;){
   while(!quiet())await sleep(FORCED_WAIT_MS);
   const hide=showToast(doc,text());await sleep(FORCED_TOAST_MS);
   // Something started during the 3 seconds (a purchase, a message): wait for it, then say it again.
   if(quiet()){remember(at);win.location.reload();return 'reloaded';}
   hide();
  }
 }
 // reloadAfter and serverNow from a farm-api answer: the server's clock, so a device whose clock is off still compares rightly.
 function offer(reloadAfter,serverNow){
  const at=Number(reloadAfter);if(reloadAfter==null||!Number.isFinite(at)||at<=0)return 'none';
  const skew=Number.isFinite(serverNow)?serverNow-now():0;
  if(at<=pageStarted+skew)return 'openedAfter';
  if(now()+skew-at>FORCED_WINDOW_MS)return 'tooLate';
  if(done()===String(at))return 'done';
  if(running)return 'running';
  if(checkedFor===at&&now()-checkedAt<FORCED_CHECK_MS)return 'checked';
  checkedFor=at;checkedAt=now();running=true;
  return go(at).finally(()=>{running=false;});
 }
 return {offer};
}
let forced=null;
export function noteReloadAfter(data){
 try{if(forced&&data&&typeof data==='object'&&'reloadAfter' in data)void Promise.resolve(forced.offer(data.reloadAfter,data.serverNow)).catch(()=>{});}catch{}
 return data;
}
export const useForcedReload=watcher=>{forced=watcher;};
