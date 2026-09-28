// The hourly reminder job, with everything it touches passed in (database, push, email) so it can be tested.
import {planPlayer} from './rules.js';
export const EMAIL_DAILY_CAP=60;   // keeps the free Resend allowance (100 a day) free for sign-up and password mails
export const MAX_FAILURES=5;       // a device that keeps failing is forgotten

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
 const stats={ran:true,players:0,pushes:0,emails:0,errors:0};
 let emailBudget=Math.max(0,(deps.emailCap??EMAIL_DAILY_CAP)-(run.emails_sent??0));
 // Most recently active first (28 Sep 2026): when the day's email allowance runs short, it goes to the farmers most likely to come
 // back (a new farmer the morning after their first day), not to someone who stopped days ago. Pushes have no allowance.
 const rows=[...(await deps.db.candidates())].sort((a,b)=>(Date.parse(b.last_active_at)||0)-(Date.parse(a.last_active_at)||0));
 for(const row of rows){
  stats.players++;
  try{
   const plan=planPlayer(row,now,deps.names),patch={...plan.patchAlways};
   if(plan.push&&deps.sendPush){
    if(await deliver(deps,row,plan.push)>0){Object.assign(patch,plan.patchOnSend);stats.pushes++;}
   }
   // Only to a confirmed address (28 Sep 2026): an email sign-up is not checked when the account is made, so until the farmer
   // confirms it with the 6-digit code it may hold a typo or someone else's address. Google and Facebook addresses count as confirmed.
   if(plan.digest&&emailBudget>0&&deps.sendEmail&&(!deps.emailConfirmed||await deps.emailConfirmed(row))){
    let sent=false;try{sent=await deps.sendEmail(row,plan.digest);}catch{sent=false;}
    if(sent){Object.assign(patch,plan.digestPatch);emailBudget--;stats.emails++;}
   }
   if(Object.keys(patch).length)await deps.db.saveState(row.player_id,patch);
  }catch(error){stats.errors++;deps.log?.(`player ${row.player_id}: ${error?.message??error}`);}
 }
 if(stats.emails)await deps.db.addEmails(stats.emails);
 return stats;
}
