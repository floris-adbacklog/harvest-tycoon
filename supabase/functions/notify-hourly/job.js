// The hourly reminder job, with everything it touches passed in (database, push, email) so it can be tested.
// Our Android app (Oct 2026): a farmer with the app's notifications on (db.appPushPlayers, supabase/app-push.sql) gets the same reminder
// there too, through OneSignal (sendAppPush, onesignal.js), sent after the other farmers in shared calls. The reminder goes to every
// device at once, the browsers and the app: we cannot know which one the farmer has at hand, and it is one reminder all the same. It
// counts once (notification_state), when it reached at least one of them, so having both never means more reminders than the rules allow.
import {planPlayer} from './rules.js';
export const EMAIL_DAILY_CAP=60;   // keeps the free Resend allowance (100 a day) free for sign-up and password mails
export const MAX_FAILURES=5;       // a device that keeps failing is forgotten
// A CrazyGames account (Oct 2026) has a made-up address on players.harvesttycoon.com: it gets no reminder at all, push or email.
// notification_candidates already leaves these out (supabase/crazygames.sql); this holds even before that is run.
export const PORTAL_MAIL=/@players\.harvesttycoon\.com$/i;

async function deliver(deps,player,push){
 let delivered=0;
 const payload=JSON.stringify(push);
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
 const stats={ran:true,players:0,pushes:0,appPushes:0,emails:0,errors:0};
 let emailBudget=Math.max(0,(deps.emailCap??EMAIL_DAILY_CAP)-(run.emails_sent??0));
 // The farmers with the app's notifications on; when that cannot be read, the reminders still go to their browsers.
 let appPlayers=new Set();
 if(deps.sendAppPush&&deps.db.appPushPlayers){try{appPlayers=new Set(await deps.db.appPushPlayers());}catch(error){deps.log?.(`app push players: ${error?.message??error}`);}}
 // Most recently active first (28 Sep 2026): when the day's email allowance runs short, it goes to the farmers most likely to come
 // back (a new farmer the morning after their first day), not to someone who stopped days ago. Pushes have no allowance.
 const rows=[...(await deps.db.candidates())].sort((a,b)=>(Date.parse(b.last_active_at)||0)-(Date.parse(a.last_active_at)||0));
 const toApp=[];
 for(const candidate of rows){
  if(PORTAL_MAIL.test(String(candidate.email??'').trim()))continue;
  stats.players++;
  const row=appPlayers.has(candidate.player_id)?{...candidate,app_push:true}:candidate;
  try{
   const plan=planPlayer(row,now,deps.names),patch={...plan.patchAlways};
   let browser=false;
   if(plan.push&&deps.sendPush)browser=await deliver(deps,row,plan.push)>0;
   // Only to a confirmed address (28 Sep 2026): an email sign-up is not checked when the account is made, so until the farmer
   // confirms it with the 6-digit code it may hold a typo or someone else's address. Google and Facebook addresses count as confirmed.
   if(plan.digest&&emailBudget>0&&deps.sendEmail&&(!deps.emailConfirmed||await deps.emailConfirmed(row))){
    let sent=false;try{sent=await deps.sendEmail(row,plan.digest);}catch{sent=false;}
    if(sent){Object.assign(patch,plan.digestPatch);emailBudget--;stats.emails++;}
   }
   // The app's copy goes out below, with the others; what this farmer's state remembers waits for it.
   if(plan.push&&row.app_push&&deps.sendAppPush){toApp.push({row,plan,patch,browser});continue;}
   if(browser){Object.assign(patch,plan.patchOnSend);stats.pushes++;}
   if(Object.keys(patch).length)await deps.db.saveState(row.player_id,patch);
  }catch(error){stats.errors++;deps.log?.(`player ${row.player_id}: ${error?.message??error}`);}
 }
 if(toApp.length){
  let reached=new Set();
  try{reached=new Set(await deps.sendAppPush(toApp.map(({row,plan})=>({player:row.player_id,push:plan.push})),now));}
  catch(error){deps.log?.(`app push: ${error?.message??error}`);}
  for(const {row,plan,patch,browser} of toApp){
   try{
    const app=reached.has(row.player_id);if(app)stats.appPushes++;
    if(browser||app){Object.assign(patch,plan.patchOnSend);stats.pushes++;}
    if(Object.keys(patch).length)await deps.db.saveState(row.player_id,patch);
   }catch(error){stats.errors++;deps.log?.(`player ${row.player_id}: ${error?.message??error}`);}
  }
 }
 if(stats.emails)await deps.db.addEmails(stats.emails);
 return stats;
}
