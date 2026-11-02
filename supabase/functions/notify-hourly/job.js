// The hourly reminder job, with everything it touches passed in (database, push, email) so it can be tested.
// Our Android app (Oct 2026): a farmer with the app's notifications on (db.appPushPlayers, supabase/app-push.sql) gets the same reminder
// there too, through OneSignal (sendAppPush, onesignal.js), sent after the other farmers in shared calls. The reminder goes to every
// device at once, the browsers and the app: we cannot know which one the farmer has at hand, and it is one reminder all the same. It
// counts once (notification_state), when it reached at least one of them, so having both never means more reminders than the rules allow.
// One known double: a farmer who allowed push in Chrome on a phone and later turned the app's on, on that same phone, sees each one twice
// there. On purpose: the server cannot tell that Chrome is on the same phone (Chrome's user agent no longer names the phone), nor
// whether the app is still on it, so leaving the browser's copy out could leave the phone silent. In Chrome, Settings' "Turn off in
// this browser or app" stops the browser's copy (NOTIFICATIONS-SETUP.md).
import {planPlayer} from './rules.js';
// The daily email's cap (13 Oct 2026): 1,000 a day, a safety net against a runaway run, no longer a budget. Resend is paid since
// 29 Sep 2026 (50,000 a month, no daily limit); the 60 kept for its free plan's 100 a day ran out at 12:05 UTC with about 75 farmers
// asking, so the Americas got their morning mail after midnight UTC. 30,000 a month at most still leaves Resend room for the sign-up mails.
export const EMAIL_DAILY_CAP=1000;
export const MAX_FAILURES=5;       // a device that keeps failing is forgotten
// A CrazyGames account (Oct 2026) has a made-up address on players.harvesttycoon.com: it gets no reminder at all, push or email.
// notification_candidates already leaves these out (supabase/crazygames.sql); this holds even before that is run.
export const PORTAL_MAIL=/@players\.harvesttycoon\.com$/i;

// A run in seconds (1 Nov 2026, a farmer: "the crops-ready reminder does not match when my crops are really ready"). It went one farmer
// at a time: every farmer's state was saved with its own request (about 1,600 a run), so a run took 100 to 145 seconds and 7 runs in a
// day hit the function's time limit; the app's reminders, sent after all the others, were then never sent at all. Now every farmer is
// planned first (rules.js, no network), the browsers' pushes and the emails go SEND_AT_ONCE at a time, the app's in shared calls, and
// the states are saved together (db.saveStates, one request per SAVE_BATCH farmers whose changes have the same fields). That lets the
// job run every 10 minutes (supabase/notifications-cron.sql), so a reminder comes within minutes of the crops being ready; the rules
// (rules.js: one an hour at most, 14 a day, quiet at night) are the same whatever the pace.
export const SEND_AT_ONCE=8,SAVE_BATCH=500;
// fn for every item, at most `limit` at a time, in their order.
async function eachAtOnce(items,limit,fn){
 let next=0;
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length)await fn(items[next++]);}));
}

async function deliver(deps,player,push){
 let delivered=0;
 // The browser's push as before: the app's notification category (channel) is only for OneSignal.
 const {channel,...shown}=push;
 const payload=JSON.stringify(shown);
 for(const sub of player.subscriptions){
  let outcome;try{outcome=await deps.sendPush(sub,payload);}catch(error){outcome={ok:false,status:0};}
  if(outcome.ok){delivered++;await deps.db.markSuccess(sub.endpoint);}
  else if(outcome.status===404||outcome.status===410)await deps.db.removeSubscription(sub.endpoint);
  else await deps.db.markFailure(sub.endpoint);
 }
 return delivered;
}

export async function runJob(deps,now=Date.now()){
 const run=await deps.db.beginRun();
 if(!run?.run)return {ran:false};
 const stats={ran:true,players:0,pushes:0,appPushes:0,appPushUnreachable:0,emails:0,errors:0};
 let emailBudget=Math.max(0,(deps.emailCap??EMAIL_DAILY_CAP)-(run.emails_sent??0));
 const failed=(item,error)=>{item.failed=true;stats.errors++;deps.log?.(`player ${item.row.player_id}: ${error?.message??error}`);};
 // The farmers with the app's notifications on; when that cannot be read, the reminders still go to their browsers.
 let appPlayers=new Set();
 if(deps.sendAppPush&&deps.db.appPushPlayers){try{appPlayers=new Set(await deps.db.appPushPlayers());}catch(error){deps.log?.(`app push players: ${error?.message??error}`);}}
 // Most recently active first (28 Sep 2026): when the day's email allowance runs short, it goes to the farmers most likely to come
 // back (a new farmer the morning after their first day), not to someone who stopped days ago. Pushes have no allowance.
 const rows=[...(await deps.db.candidates())].sort((a,b)=>(Date.parse(b.last_active_at)||0)-(Date.parse(a.last_active_at)||0));
 const items=[];
 for(const candidate of rows){
  if(PORTAL_MAIL.test(String(candidate.email??'').trim()))continue;
  stats.players++;
  const row=appPlayers.has(candidate.player_id)?{...candidate,app_push:true}:candidate;
  const item={row,browser:false};
  try{item.plan=planPlayer(row,now,deps.names);item.patch={...item.plan.patchAlways};items.push(item);}catch(error){failed(item,error);}
 }
 await eachAtOnce(items.filter(({plan})=>plan.push&&deps.sendPush),SEND_AT_ONCE,async item=>{
  try{item.browser=await deliver(deps,item.row,item.plan.push)>0;}catch(error){failed(item,error);}
 });
 // Only to a confirmed address (28 Sep 2026): an email sign-up is not checked when the account is made, so until the farmer
 // confirms it with the 6-digit code it may hold a typo or someone else's address. Google and Facebook addresses count as confirmed.
 // The allowance is taken before a mail goes and given back when it did not go out, so the most recently active still come first.
 await eachAtOnce(items.filter(({plan,failed})=>!failed&&plan.digest&&deps.sendEmail),SEND_AT_ONCE,async item=>{
  try{
   if(emailBudget<=0||(deps.emailConfirmed&&!await deps.emailConfirmed(item.row))||emailBudget<=0)return;
   emailBudget--;
   let sent=false;try{sent=await deps.sendEmail(item.row,item.plan.digest);}catch{sent=false;}
   if(sent){Object.assign(item.patch,item.plan.digestPatch);stats.emails++;}else emailBudget++;
  }catch(error){failed(item,error);}
 });
 // The app's copy, for everyone at once; what these farmers' states remember waits for it.
 const toApp=items.filter(({row,plan,failed})=>!failed&&plan.appPush&&row.app_push&&deps.sendAppPush);
 let reached=new Set();
 if(toApp.length){
  const unreachable=new Set();
  try{reached=new Set(await deps.sendAppPush(toApp.map(({row,plan})=>({player:row.player_id,push:plan.appPush})),now,unreachable));}
  catch(error){deps.log?.(`app push: ${error?.message??error}`);}
  // Reachable or not (13 Oct 2026): one line per run, and the farmers OneSignal named as not reachable are marked (db.markAppPushReach,
  // supabase/app-push-reach.sql), the ones it took unmarked; the game then asks the app to link a marked farmer's phone afresh.
  stats.appPushUnreachable=unreachable.size;
  deps.log?.(`app push this run: ${toApp.length} farmers, ${toApp.filter(({row})=>reached.has(row.player_id)).length} reached, ${unreachable.size} not reachable`);
  if(deps.db.markAppPushReach){try{await deps.db.markAppPushReach({reached:toApp.map(({row})=>row.player_id).filter(id=>reached.has(id)),unreachable:[...unreachable]});}catch(error){deps.log?.(`app push reach: ${error?.message??error}`);}}
 }
 const saves=[];
 for(const item of items){
  if(item.failed)continue;
  const app=Boolean(item.plan.appPush&&item.row.app_push&&deps.sendAppPush&&reached.has(item.row.player_id));if(app)stats.appPushes++;
  if(item.plan.push&&(item.browser||app)){Object.assign(item.patch,item.plan.patchOnSend);stats.pushes++;}
  if(Object.keys(item.patch).length)saves.push(item);
 }
 await saveAll(deps,saves,failed);
 if(stats.emails)await deps.db.addEmails(stats.emails);
 return stats;
}

// The states together (db.saveStates): farmers whose changes have the same fields share a request, so no field is ever written that this
// run did not mean to change. A request that fails, or a database without saveStates, saves those farmers one by one, so one farmer's
// problem never loses the others' state.
async function saveAll(deps,saves,failed){
 const one=async item=>{try{await deps.db.saveState(item.row.player_id,item.patch);}catch(error){failed(item,error);}};
 if(!deps.db.saveStates){await eachAtOnce(saves,SEND_AT_ONCE,one);return;}
 const shapes=new Map();
 for(const item of saves){const shape=Object.keys(item.patch).sort().join();if(!shapes.has(shape))shapes.set(shape,[]);shapes.get(shape).push(item);}
 for(const group of shapes.values())for(let i=0;i<group.length;i+=SAVE_BATCH){
  const part=group.slice(i,i+SAVE_BATCH);
  try{await deps.db.saveStates(part.map(({row,patch})=>({player:row.player_id,patch})));}
  catch(error){deps.log?.(`save states: ${error?.message??error}`);await eachAtOnce(part,SEND_AT_ONCE,one);}
 }
}
