import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RETRY_DELAYS,RETRY_BUDGET,PAUSE_AFTER,RECONNECT_DELAYS,WAKE_GRACE,OFFLINE_GRACE,REASONS,STAGES,describeFailure,connectionMessage,reasonOf,safeToRepeat,withRetry,createConnection} from '../src/connection.js';
import {trackGame} from '../src/analytics.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const fetchFailure=(cause)=>Object.assign(new Error('Failed to send a request to the Edge Function'),{name:'FunctionsFetchError',context:cause?{name:cause}:{}});
const httpFailure=status=>Object.assign(new Error('Edge Function returned a non-2xx status code'),{name:'FunctionsHttpError',context:{status}});

test('a dropped connection, a timeout and a busy platform are worth repeating; a rule or a bug is not',()=>{
 assert.deepEqual(describeFailure(fetchFailure()),{kind:'network',transient:true,status:undefined,code:undefined});
 assert.equal(describeFailure(fetchFailure('AbortError')).kind,'timeout');assert.equal(describeFailure(fetchFailure('TimeoutError')).kind,'timeout');
 assert.deepEqual(describeFailure({name:'FunctionsRelayError',message:'x'}),{kind:'server',transient:true,status:undefined,code:undefined});
 for(const status of [502,503,546])assert.deepEqual([describeFailure(httpFailure(status)).kind,describeFailure(httpFailure(status)).transient],['server',true],String(status));
 for(const status of [408,504])assert.deepEqual([describeFailure(httpFailure(status)).kind,describeFailure(httpFailure(status)).transient],['timeout',true],String(status));
 assert.deepEqual(describeFailure(httpFailure(500)).transient,false,'a server error is shown, not hammered');
 for(const status of [400,401,403,404,409,422,429])assert.equal(describeFailure(httpFailure(status)).transient,false,String(status));
 assert.equal(describeFailure(httpFailure(401)).status,401);
 assert.deepEqual(describeFailure(httpFailure(503),{code:'SERVER_UNAVAILABLE'}).transient,true);
 assert.equal(describeFailure(httpFailure(400),{code:'ACTION_REJECTED'}).code,'ACTION_REJECTED');
 assert.equal(describeFailure({name:'AuthRetryableFetchError'}).transient,true,'the sign-in service being unreachable passes too');
 assert.equal(describeFailure(new Error('boom')).transient,false);assert.equal(describeFailure(undefined).kind,'other');
});
test('every reason has its own message, the farm is always said to be safe, and an offline browser wins',()=>{
 for(const kind of REASONS)assert.match(connectionMessage(kind),/farm is safe|Your farm is safe/i,kind);
 assert.equal(new Set(REASONS.map(kind=>connectionMessage(kind))).size,REASONS.length,'no two reasons read the same');
 assert.match(connectionMessage('server'),/busy/);assert.match(connectionMessage('timeout'),/slow/);assert.match(connectionMessage('network'),/could not reach/);
 assert.match(connectionMessage('server',false),/offline/,'without a network that is the reason, whatever failed');
 assert.equal(reasonOf({kind:'server'}),'server');assert.equal(reasonOf({kind:'server'},false),'offline');assert.equal(reasonOf({kind:'made-up'}),'other');assert.equal(reasonOf(undefined),'other');
});
test('only requests that cannot go wrong twice are repeated',()=>{
 const id='11111111-1111-4111-8111-111111111111';
 assert.equal(safeToRepeat({operation:'load'}),true);
 assert.equal(safeToRepeat({operation:'action',action:{type:'harvest'},requestId:id}),true,'the server answers a request ID only once');
 assert.equal(safeToRepeat({operation:'action',action:{type:'harvest'}}),false,'without a request ID an action could happen twice');
 for(const body of [{operation:'player_search',query:'a'},{operation:'player_profile',playerId:'x'},{operation:'rename',username:'Sunny'},{operation:'avatar',avatarId:'default'}])assert.equal(safeToRepeat(body),true,body.operation);
 assert.equal(safeToRepeat({operation:'family'}),true,'reading the family');
 assert.equal(safeToRepeat({operation:'family',command:'create',name:'Oaks'}),false,'changing it is not repeated');
 assert.equal(safeToRepeat({operation:'something-new'}),false);assert.equal(safeToRepeat(undefined),false);
});
const transient=()=>Object.assign(new Error('down'),{transient:true});
test('a failing request is tried again after 0.4, 1.2 and 2.8 seconds, with the same body',async()=>{
 assert.deepEqual(RETRY_DELAYS,[400,1200,2800]);
 const sleeps=[],bodies=[],body={operation:'action',requestId:'r1'};let calls=0;
 const result=await withRetry(async()=>{bodies.push(body.requestId);if(++calls<4)throw transient();return 'saved';},{sleep:async ms=>{sleeps.push(ms);},repeatable:safeToRepeat(body)});
 assert.equal(result,'saved');assert.equal(calls,4);assert.deepEqual(sleeps,[400,1200,2800]);assert.deepEqual(bodies,['r1','r1','r1','r1']);
});
test('a request that keeps failing gives up after the last pause, and the error is the last one',async()=>{
 let calls=0;
 await assert.rejects(withRetry(async()=>{calls++;throw Object.assign(new Error(`down ${calls}`),{transient:true});},{sleep:async()=>{}}),/down 4/);assert.equal(calls,4);
});
test('nothing is repeated that must not be: rules, bad input, non-repeatable requests',async()=>{
 for(const [error,repeatable] of [[Object.assign(new Error('no'),{status:400}),true],[Object.assign(new Error('rejected'),{code:'ACTION_REJECTED'}),true],[transient(),false]]){
  let calls=0;await assert.rejects(withRetry(async()=>{calls++;throw error;},{repeatable,sleep:async()=>{}}));assert.equal(calls,1);
 }
});
test('one request never keeps the player waiting longer than its budget',async()=>{
 let clock=0,calls=0;
 await assert.rejects(withRetry(async()=>{calls++;clock+=RETRY_BUDGET;throw transient();},{now:()=>clock,sleep:async ms=>{clock+=ms;}}));
 assert.equal(calls,1,'one slow attempt used up the budget: no second wait');
 clock=0;calls=0;
 await assert.rejects(withRetry(async()=>{calls++;clock+=9000;throw transient();},{now:()=>clock,sleep:async ms=>{clock+=ms;}}));
 assert.equal(calls,3,'three slow attempts of 9 seconds: the fourth would not fit');
});

// A clock and a timer list the tests can move by hand.
function harness({probe,online=true,hidden=false}={}){
 let clock=0,next=1;const timers=[],log=[],track=[];
 const state={online,hidden};
 const connection=createConnection({
  probe:async()=>probe?.(),onStatus:(status,info)=>log.push([status,info.reason]),onRecovered:from=>log.push(['recovered',from]),track:(event,params)=>track.push([event,params.reason,params.stage]),
  timers:{setTimeout:(fn,ms)=>{const id=next++;timers.push({id,at:clock+ms,fn});return id;},clearTimeout:id=>{const i=timers.findIndex(t=>t.id===id);if(i>=0)timers.splice(i,1);}},
  now:()=>clock,isOnline:()=>state.online,isHidden:()=>state.hidden
 });
 const advance=async ms=>{const end=clock+ms;for(;;){timers.sort((a,b)=>a.at-b.at);const first=timers[0];if(!first||first.at>end)break;timers.shift();clock=Math.max(clock,first.at);first.fn();for(let i=0;i<20;i++)await Promise.resolve();}clock=end;};
 return {connection,log,track,timers,state,advance,get clock(){return clock;}};
}
test('a problem shows "Reconnecting…" once, and the first check comes after two seconds',async()=>{
 let probes=0;const h=harness({probe:()=>{probes++;throw new Error('still down');}});
 h.connection.problem('network');h.connection.problem('network');h.connection.problem('server');
 assert.deepEqual(h.log,[['reconnecting','network']]);assert.deepEqual(h.track,[['connection_problem','network','reconnecting']],'reported once, not per failed request');
 await h.advance(1999);assert.equal(probes,0);await h.advance(1);assert.equal(probes,1);
 await h.advance(2999);assert.equal(probes,1);await h.advance(1);assert.equal(probes,2,'then after 3, 5, 8 and every 8 seconds');
 await h.advance(5000);assert.equal(probes,3);await h.advance(8000);assert.equal(probes,4);await h.advance(8000);assert.equal(probes,5);
 assert.deepEqual(RECONNECT_DELAYS,[2000,3000,5000,8000]);
});
test('a check that works ends the problem and says where it recovered from',async()=>{
 let works=false;const h=harness({probe:()=>{if(!works)throw new Error('down');}});
 h.connection.problem('timeout');await h.advance(2000);assert.equal(h.connection.status,'reconnecting');
 works=true;await h.advance(3000);
 assert.equal(h.connection.status,'ok');assert.deepEqual(h.log.slice(1),[['ok','timeout'],['recovered','reconnecting']]);
 assert.deepEqual(h.track.at(-1),['connection_recovered','timeout','reconnecting']);assert.equal(h.timers.length,0,'nothing keeps running once it is back');
});
test('a request that works while reconnecting ends it without a check',async()=>{
 const h=harness({probe:()=>{throw new Error('down');}});h.connection.problem('network');h.connection.ok();
 assert.equal(h.connection.status,'ok');assert.deepEqual(h.log.map(entry=>entry[0]),['reconnecting','ok','recovered']);assert.equal(h.timers.length,0);
 h.connection.ok();assert.equal(h.log.length,3,'nothing to end');
});
test('after a minute of trouble the pause screen appears, and it keeps checking until the farm can open',async()=>{
 let works=false;const h=harness({probe:()=>{if(!works)throw new Error('down');}});
 h.connection.problem('server');await h.advance(PAUSE_AFTER-1000);assert.equal(h.connection.status,'reconnecting');
 await h.advance(9000);assert.equal(h.connection.status,'paused');
 assert.deepEqual(h.track.map(entry=>entry[2]),['reconnecting','paused']);
 await h.advance(30000);assert.equal(h.connection.status,'paused','it stays paused, quietly checking');
 works=true;await h.advance(8000);assert.equal(h.connection.status,'ok');assert.deepEqual(h.log.at(-1),['recovered','paused'],'the caller opens the farm again');
});
test('a farm that cannot be opened goes straight to the pause screen and keeps trying',async()=>{
 let works=false;const h=harness({probe:()=>{if(!works)throw new Error('down');}});
 h.connection.pause('offline');h.connection.pause('offline');
 assert.deepEqual(h.log,[['paused','offline']]);assert.deepEqual(h.track,[['connection_problem','offline','paused']]);
 works=true;await h.advance(2000);assert.deepEqual(h.log.slice(1),[['ok','offline'],['recovered','paused']]);
});
test('no one is asked while the tab is hidden or the browser knows it is offline',async()=>{
 let probes=0;const h=harness({probe:()=>{probes++;},hidden:true});
 h.connection.problem('network');await h.advance(20000);assert.equal(probes,0);
 h.state.hidden=false;h.state.online=false;await h.advance(20000);assert.equal(probes,0);
 h.state.online=true;await h.advance(8000);assert.equal(probes,1);assert.equal(h.connection.status,'ok');
});
test('waking up gives the network a moment, and the minute is counted from then',async()=>{
 let works=false;const h=harness({probe:()=>{if(!works)throw new Error('down');}});
 h.connection.problem('network');await h.advance(50000);
 h.connection.wake();assert.equal(WAKE_GRACE,1800);await h.advance(1799);
 await h.advance(1);await h.advance(30000);
 assert.equal(h.connection.status,'reconnecting','it was 50 seconds in, but the clock restarted when the network had a chance again');
 await h.advance(40000);assert.equal(h.connection.status,'paused');
});
test('"offline" only matters when the browser is still offline after the grace period',async()=>{
 const h=harness({probe:()=>{throw new Error('down');}});
 h.connection.offline();await h.advance(OFFLINE_GRACE-1);assert.equal(h.connection.status,'ok');
 h.state.online=true;await h.advance(2);assert.equal(h.connection.status,'ok','back in time: nothing happened');
 h.state.online=false;h.connection.offline();await h.advance(OFFLINE_GRACE);assert.deepEqual(h.log,[['reconnecting','offline']]);
 h.connection.stop();h.connection.offline();h.connection.online();await h.advance(20000);assert.equal(h.connection.status,'ok','coming back online cancels the wait');
});
test('stopping cancels every timer and check, even one that is in flight',async()=>{
 let release;const h=harness({probe:()=>new Promise(resolve=>{release=resolve;})});
 h.connection.problem('network');await h.advance(2000);h.connection.stop();release();await h.advance(20000);
 assert.equal(h.connection.status,'ok');assert.equal(h.timers.length,0);assert.deepEqual(h.log.map(entry=>entry[0]),['reconnecting'],'no late "recovered" for a farm that was closed');
});
test('a check that finds the player signed out ends the loop quietly',async()=>{
 let probes=0;const h=harness({probe:()=>{probes++;throw Object.assign(new Error('signed out'),{fatal:true});}});
 h.connection.problem('network');await h.advance(60000);assert.equal(probes,1);assert.equal(h.timers.length,0);
});

test('analytics get a fixed reason and stage, never an error message',()=>{
 const sent=[];const win={innerWidth:1400,dataLayer:sent};
 trackGame('connection_problem',{reason:'timeout',stage:'reconnecting',message:'secret@example.com'},win);
 trackGame('connection_problem',{reason:'Failed to fetch: https://x.supabase.co/functions/v1/farm-api',stage:'reconnecting'},win);
 trackGame('connection_recovered',{reason:'network',stage:'paused',email:'a@b.c'},win);
 assert.deepEqual(sent,[{event:'connection_problem',device:'desktop',reason:'timeout',stage:'reconnecting'},{event:'connection_problem',device:'desktop',stage:'reconnecting'},{event:'connection_recovered',device:'desktop',reason:'network',stage:'paused'}]);
 const source=read('src/analytics.js');
 for(const word of [...REASONS,...STAGES])assert.ok(source.includes(`'${word}'`),`analytics accepts ${word}`);
});
test('the request code repeats safe requests, marks each failure and never repeats the checks it is asked to repeat itself',()=>{
 const supabase=read('src/supabase.js');
 assert.match(supabase,/import \{describeFailure,connectionMessage,safeToRepeat,withRetry\} from '\.\/connection\.js';/);
 assert.match(supabase,/export function farmRequest\(body,\{retry=true\}=\{\}\)\{const sent=body\?\.operation==='load'\?\{\.\.\.body,timeZone:deviceTimeZone\(\)\}:body;return withRetry\(\(\)=>farmRequestOnce\(sent\),\{repeatable:retry&&safeToRepeat\(sent\)\}\);\}/);
 assert.match(supabase,/Object\.assign\(failure,\{status,code,kind,transient\}\)/);
 assert.match(supabase,/connectionMessage\(kind,globalThis\.navigator\?\.onLine\)/,'a specific message instead of the one for everything');
 assert(!/could not be reached\. Check your connection and try again/.test(supabase));
 const main=read('src/main.js');
 assert.match(main,/await farmRequest\(\{operation:'load'\},\{retry:false\}\)/,'probes are repeated by the connection, not by the request');
});
test('the game shows "Reconnecting…" where it already shows a lost connection, and hides it when the farm is back',()=>{
 const client=read('public/farm-client.js'),game=read('public/game.js');
 assert.match(client,/bridge\.watchConnection\?\.\(status=>\{if\(status==='reconnecting'\)onStatus\('reconnecting'\);else if\(status==='ok'\)onStatus\('saved'\);\}\)/);
 assert.match(game,/status==='reconnecting'\?'Reconnecting…'/);assert.match(game,/el\.hidden=!shown/);
});
test('the parent page no longer closes the farm for one failed check, one "offline" event or one wake-up',()=>{
 const main=read('src/main.js');
 assert(!/window\.addEventListener\('offline',\(\)=>unavailable\(\)\)/.test(main),'offline no longer closes the farm at once');
 assert.match(main,/window\.addEventListener\('offline',\(\)=>\{if\(frame\)connection\.offline\(\);\}\)/);
 const check=main.slice(main.indexOf('async function checkSession'),main.indexOf('async function probeFarm'));
 assert(!/verifiedUser|unavailable\(/.test(check),'the minute check has no account lookup and never closes the farm itself');
 assert.match(check,/document\.hidden/);assert.match(main,/setTimeout\(checkSession,WAKE_GRACE\)/);
 assert.match(main,/else if\(error\.transient\|\|navigator\.onLine===false\)connection\.pause\(reasonOf\(error,navigator\.onLine\)\)/,'a farm that cannot be opened pauses, and keeps trying');
});
