// The only upload payload is a whitelist of public statistics.
export function statsPayload(playerId,username,stats){
 const clamp=(value,min)=>Math.min(2147483647,Math.max(min,Math.floor(Number.isFinite(value)?value:min)));
 return {player_id:playerId,username,currency:clamp(stats.currency,0),level:clamp(stats.level,1)};
}
export function createStatsSync({getIdentity,write,onStatus,interval=4000,now=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout}){
 let latest=null,dirty=false,inFlight=false,lastAttempt=-Infinity,timer;
 function queue(stats){latest={currency:stats.currency,level:stats.level};dirty=true;onStatus('pending');arm();}
 function arm(){if(timer||inFlight||!dirty)return;timer=schedule(()=>{timer=null;flush();},Math.max(250,interval-(now()-lastAttempt)));}
 async function flush(){
  if(inFlight||!dirty||!latest)return false;
  const {player,profile}=getIdentity();if(!player||!profile)return false;
  if(now()-lastAttempt<interval){arm();return false;}
  const sending=latest,payload=statsPayload(player.id,profile.username,sending);inFlight=true;dirty=false;lastAttempt=now();onStatus('syncing');
  let success=false;
  try{await write(payload);success=true;onStatus(dirty?'pending':'synced');}
  catch{dirty=true;onStatus('offline');}
  finally{inFlight=false;if(success&&dirty)arm();}
  return success;
 }
 function retry(){if(dirty)arm();}
 return {queue,flush,retry,stop:()=>{if(timer)cancel(timer);timer=null;},get pending(){return dirty||inFlight;}};
}
