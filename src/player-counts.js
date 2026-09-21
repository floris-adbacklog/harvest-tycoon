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
export function startPlayerCounts({functionsUrl,doc=globalThis.document,fetchImpl=globalThis.fetch,interval=60000,timers=globalThis}={}){
 const panel=doc?.getElementById?.('player-counts');
 if(!panel||!functionsUrl)return ()=>{};
 let stopped=false,timer=null;
 const paint=data=>{
  const lines=countLines(data);
  panel.querySelector('[data-count="players"]').textContent=lines.players;
  panel.querySelector('[data-count="online"]').textContent=lines.online;
  panel.hidden=false;
 };
 const tick=async()=>{
  if(stopped||doc.body?.dataset?.phase==='authenticated')return;
  if(!doc.hidden){try{const data=await loadPlayerCounts(functionsUrl,fetchImpl);if(data&&!stopped)paint(data);}catch{}}
  if(!stopped)timer=timers.setTimeout(tick,interval);
 };
 tick();
 return ()=>{stopped=true;timers.clearTimeout?.(timer);};
}
