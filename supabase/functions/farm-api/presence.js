// Successful server-recorded farm actions determine status, not open tabs.
export const ONLINE_WINDOW=30*60*1000;
export function isRecentlyActive(lastActiveAt,now=Date.now()){
 const last=Date.parse(lastActiveAt),age=now-last;
 return Number.isFinite(last)&&age>=0&&age<ONLINE_WINDOW;
}
export function createFarmPresence(client,playerId,doc=globalThis.document,win=globalThis.window,now=Date.now){
 let rows=[],ready=false,offset=0;const listeners=new Set();
 const snapshot=()=>({onlinePlayers:rows.filter(r=>isRecentlyActive(r.last_active_at,now()+offset)).map(r=>r.player_id),presenceReady:ready});
 const emit=()=>{for(const fn of listeners)try{fn(snapshot());}catch{}};
 const timer=win.setInterval(()=>emit(),1000);
 return {snapshot,setClock(serverNow){if(Number.isFinite(serverNow))offset=serverNow-now();},setRows(next){rows=next;ready=true;emit();},subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn);},dispose(){win.clearInterval(timer);listeners.clear();rows=[];ready=false;}};
}
