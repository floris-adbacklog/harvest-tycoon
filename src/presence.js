// Best-effort presence never blocks farming or changes rewards.
export function createFarmPresence(client,playerId,doc=globalThis.document,win=globalThis.window){
 let channel,disposed=false,connected=false,ready=false,online=[];const listeners=new Set();
 const snapshot=()=>({onlinePlayers:[...online],presenceReady:ready});
 const emit=()=>{for(const fn of listeners)try{fn(snapshot());}catch{}};
 const sync=()=>{if(disposed||!connected)return;online=[...new Set(Object.values(channel.presenceState()).flat().map(p=>p.player_id).filter(id=>typeof id==='string'))];ready=true;emit();};
 const track=async()=>{if(disposed||!connected)return;try{if(doc.hidden)await channel.untrack();else await channel.track({player_id:playerId});}catch{ready=false;online=[];emit();}};
 const pause=()=>{if(channel)Promise.resolve(channel.untrack()).catch(()=>{});};
 try{
  channel=client.channel('harvest-online-v1');
  channel.on('presence',{event:'sync'},sync).subscribe(status=>{
   if(disposed)return;connected=status==='SUBSCRIBED';
   if(connected)void track();else{ready=false;online=[];emit();}
  });
  doc.addEventListener('visibilitychange',track);win.addEventListener('pagehide',pause);win.addEventListener('pageshow',track);
 }catch{ready=false;}
 return {snapshot,subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn);},dispose(){disposed=true;connected=false;online=[];ready=false;emit();listeners.clear();doc.removeEventListener('visibilitychange',track);win.removeEventListener('pagehide',pause);win.removeEventListener('pageshow',track);if(channel)Promise.resolve(client.removeChannel(channel)).catch(()=>{});}};
}
