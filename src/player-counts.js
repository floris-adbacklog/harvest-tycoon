// The sign-in page shows how many farmers there are and how many are online right now.
// Two numbers from the public player-counts function; if anything goes wrong the panel simply stays hidden.
export const groupDigits=value=>String(value).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
export const countLines=({players,online})=>({players:`${groupDigits(players)} ${players===1?'player':'players'}`,online:`${groupDigits(online)} online`});

export async function loadPlayerCounts(functionsUrl,fetchImpl=globalThis.fetch){
 if(!functionsUrl||typeof fetchImpl!=='function')return null;
 const response=await fetchImpl(`${functionsUrl}/player-counts`);
 if(!response.ok)return null;
 const data=await response.json();
 return Number.isSafeInteger(data?.players)&&Number.isSafeInteger(data?.online)&&data.players>=0&&data.online>=0&&data.online<=data.players?{players:data.players,online:data.online}:null;
}

// Refreshes every minute while the sign-in page is showing and stops for good once a farmer is signed in.
// The last numbers are remembered on this device and shown at once on the next visit, so the line never waits for
// the app bundle and the function; a failed request is retried after 3 and 10 seconds instead of a whole minute, and a
// tab that opened in the background asks as soon as it is shown.
export const COUNTS_KEY='harvest-tycoon:player-counts',RETRY_DELAYS=[3000,10000];
const readCached=storage=>{try{const saved=JSON.parse(storage?.getItem(COUNTS_KEY)??'null');return Number.isSafeInteger(saved?.players)&&Number.isSafeInteger(saved?.online)&&saved.online<=saved.players&&Date.now()-saved.at<86400000?saved:null;}catch{return null;}};
export function startPlayerCounts({functionsUrl,doc=globalThis.document,fetchImpl=globalThis.fetch,interval=60000,timers=globalThis,storage=(()=>{try{return globalThis.localStorage;}catch{return null;}})()}={}){
 const panel=doc?.getElementById?.('player-counts');
 if(!panel||!functionsUrl)return ()=>{};
 let stopped=false,timer=null,failures=0;
 const paint=data=>{
  const lines=countLines(data);
  panel.querySelector('[data-count="players"]').textContent=lines.players;
  panel.querySelector('[data-count="online"]').textContent=lines.online;
  panel.hidden=false;
 };
 const cached=readCached(storage);if(cached)paint(cached);
 const schedule=delay=>{if(!stopped){timers.clearTimeout?.(timer);timer=timers.setTimeout(tick,delay);}};
 const tick=async()=>{
  if(stopped||doc.body?.dataset?.phase==='authenticated')return;
  if(doc.hidden){schedule(interval);return;}
  let data=null;try{data=await loadPlayerCounts(functionsUrl,fetchImpl);}catch{}
  if(stopped)return;
  if(data){failures=0;paint(data);try{storage?.setItem(COUNTS_KEY,JSON.stringify({...data,at:Date.now()}));}catch{}schedule(interval);}
  else schedule(RETRY_DELAYS[failures++]??interval);
 };
 const onVisible=()=>{if(!doc.hidden&&!stopped)tick();};
 doc.addEventListener?.('visibilitychange',onVisible);
 tick();
 return ()=>{stopped=true;timers.clearTimeout?.(timer);doc.removeEventListener?.('visibilitychange',onVisible);};
}
