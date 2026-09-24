// Keeps a farm open through short connection problems: a failed request is repeated a few times, a failed check in the
// background shows a small "Reconnecting…" badge instead of closing the game, and only a problem that lasts a minute becomes
// the pause screen, which then tries again by itself. Nothing here touches the farm: main.js says what a probe is (ask the
// server for the farm) and what to show.

export const RETRY_DELAYS=[400,1200,2800];            // pauses before the 2nd, 3rd and 4th try of one request
export const RETRY_BUDGET=30000;                       // one request never keeps the player waiting longer than this in total
export const PAUSE_AFTER=60000;                        // a problem that lasts this long becomes the pause screen
export const RECONNECT_DELAYS=[2000,3000,5000,8000];   // between probes while reconnecting; the last one repeats
export const WAKE_GRACE=1800;                          // after waking up or coming back online the network needs a moment
export const OFFLINE_GRACE=6000;                       // "offline" flickers on wifi hand-overs; give the browser time to return

// Only these reasons are ever sent to analytics, next to a stage. Nothing from an error message goes along.
export const REASONS=Object.freeze(['offline','timeout','network','server','other']);
export const STAGES=Object.freeze(['reconnecting','paused']);

const TRANSIENT_STATUS=new Set([408,425,502,503,504,546]);

// What a failed call was, from the error supabase-js hands back and the body of the answer, if there was one.
// FunctionsFetchError: the request never got an answer (offline, dropped, timed out). FunctionsRelayError: the platform in
// front of the function could not reach it. FunctionsHttpError: the function answered with a status.
export function describeFailure(error,detail){
 const status=Number(error?.context?.status)||undefined,name=String(error?.name??'');
 let kind='other',transient=false;
 if(name==='AuthRetryableFetchError'){kind='network';transient=true;}   // the sign-in service could not be reached
 else if(name==='FunctionsFetchError'){
  const cause=String(error?.context?.name??'');
  kind=cause==='AbortError'||cause==='TimeoutError'?'timeout':'network';transient=true;
 }else if(name==='FunctionsRelayError'){kind='server';transient=true;}
 else if(status===408||status===504){kind='timeout';transient=true;}
 else if(status&&TRANSIENT_STATUS.has(status)){kind='server';transient=true;}
 else if(status&&status>=500){kind='server';}
 // The server says itself when it is not ready ("SERVER_UNAVAILABLE"); that passes.
 if(detail?.code==='SERVER_UNAVAILABLE'){kind='server';transient=true;}
 return {kind,transient,status,code:detail?.code};
}

// What the player reads, per reason. The farm is always safe: every rule runs on the server.
export function connectionMessage(kind,online=true){
 if(online===false||kind==='offline')return 'You seem to be offline. Your farm is safe and opens again as soon as you are back.';
 if(kind==='timeout')return 'The connection is slow right now. Your farm is safe; we keep trying.';
 if(kind==='server')return 'The farm servers are busy for a moment. Your farm is safe; we keep trying.';
 if(kind==='network')return 'We could not reach your farm. Your farm is safe; we keep trying.';
 return 'Your farm is safe. Reconnect to continue.';
}
export const reasonOf=(error,online=true)=>online===false?'offline':REASONS.includes(error?.kind)?error.kind:'other';

// A repeated request must change nothing twice: farm actions carry a request ID the server answers only once, reading is
// harmless, and choosing the same name or avatar again ends in the same place. Family changes are not repeated.
export function safeToRepeat(body){
 const operation=body?.operation;
 if(operation==='action')return typeof body.requestId==='string'&&body.requestId.length>0;
 if(operation==='family')return Object.keys(body).length===1;
 return ['load','player_search','player_profile','rename','avatar','admin_online','admin_recent_players','admin_retention','admin_invites'].includes(operation);
}

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function withRetry(run,{repeatable=true,delays=RETRY_DELAYS,budget=RETRY_BUDGET,sleep=wait,now=Date.now,onRetry}={}){
 const started=now();
 for(let attempt=0;;attempt++){
  try{return await run(attempt);}
  catch(error){
   const delay=delays[attempt];
   if(!repeatable||!error?.transient||delay===undefined||now()-started+delay>budget)throw error;
   onRetry?.(error,attempt+1);await sleep(delay);
  }
 }
}

// The state of the connection of an open farm: 'ok', 'reconnecting' (badge) or 'paused' (pause screen).
//   probe():        resolves when the farm can be reached again, throws when it cannot (a probe that throws {fatal:true} ends it)
//   onStatus(next, {reason}): show or hide the badge, or the pause screen
//   onRecovered(from): called when a probe succeeds; from is the status it recovered from
export function createConnection({probe,onStatus,onRecovered=()=>{},track=()=>{},timers=globalThis,now=Date.now,isOnline=()=>true,isHidden=()=>false}){
 let status='ok',since=0,attempt=0,timer=null,grace=null,running=false,epoch=0,reason='other';
 const clearTimer=()=>{if(timer!==null){timers.clearTimeout(timer);timer=null;}};
 const clearGrace=()=>{if(grace!==null){timers.clearTimeout(grace);grace=null;}};
 const set=next=>{status=next;onStatus(next,{reason});};
 const schedule=delay=>{clearTimer();timer=timers.setTimeout(()=>{timer=null;void run();},delay);};
 const nextDelay=()=>RECONNECT_DELAYS[Math.min(attempt,RECONNECT_DELAYS.length-1)];
 function escalate(){
  if(status==='reconnecting'&&now()-since>=PAUSE_AFTER){set('paused');track('connection_problem',{reason,stage:'paused'});}
 }
 async function run(){
  if(running||status==='ok')return;
  // No point asking while the tab is hidden or the browser knows it is offline: the next visit or "online" event asks.
  if(isHidden()||!isOnline()){attempt++;schedule(nextDelay());escalate();return;}
  running=true;const mine=epoch;
  try{await probe();if(mine!==epoch)return;recovered();}
  catch(error){
   if(mine!==epoch)return;
   if(error?.fatal){stop();return;}
   attempt++;escalate();schedule(nextDelay());
  }
  finally{running=false;}
 }
 function recovered(){
  const from=status;clearTimer();epoch++;status='ok';attempt=0;
  track('connection_recovered',{reason,stage:from});onStatus('ok',{reason});onRecovered(from);
 }
 // A request or a check failed for a reason that may pass (see describeFailure).
 function problem(why='other'){
  reason=REASONS.includes(why)?why:'other';
  if(status!=='ok')return;
  since=now();attempt=0;set('reconnecting');track('connection_problem',{reason,stage:'reconnecting'});schedule(nextDelay());
 }
 // The farm could not even be opened: straight to the pause screen, which keeps trying by itself.
 function pause(why='other'){
  reason=REASONS.includes(why)?why:'other';
  if(status==='paused')return;
  if(status==='ok'){since=now();attempt=0;}
  set('paused');track('connection_problem',{reason,stage:'paused'});schedule(nextDelay());
 }
 function ok(){if(status!=='ok'&&!running)recovered();}
 // Something happened that suggests the network is (about to be) back: ask again after a moment.
 // A problem is measured from the moment the network had a fair chance again, not from before the laptop went to sleep.
 function wake(delay=WAKE_GRACE){if(status==='ok')return;if(status==='reconnecting')since=now();clearTimer();schedule(delay);}
 // The browser says it went offline. Only a browser that is still offline after the grace period has a problem.
 function offline(){
  clearGrace();
  grace=timers.setTimeout(()=>{grace=null;if(!isOnline())problem('offline');},OFFLINE_GRACE);
 }
 function online(){clearGrace();wake();}
 function stop(){epoch++;clearTimer();clearGrace();running=false;status='ok';attempt=0;}
 return {problem,pause,ok,wake,offline,online,stop,get status(){return status;}};
}
