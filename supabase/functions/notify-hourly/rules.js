// Decides, for one player and one moment, which reminder (if any) goes out. Pure: no network, no database,
// so every rule can be tested. The hourly job (job.js) applies the result.
export const DAY_MS=86400000,HOUR_MS=3600000;
export const CONFIG=Object.freeze({
 QUIET_START:22,QUIET_END:8,          // no crop or production reminders from 22:00 until 08:00 local time
 MAX_PUSH_PER_DAY:4,                  // per player, per local day
 MIN_PUSH_GAP_MS:50*60000,            // at most one push per hour
 ACTIVE_SKIP_MS:10*60000,             // the game is open right now: they can see it themselves
 INACTIVE_STOP_MS:7*DAY_MS,           // nothing for players who have not played for a week
 DAILY_MORNING_HOUR:9,DAILY_EVENING_HOUR:19,STREAK_MIN:3,MAX_KINDS:3
});
export const utcDay=ms=>new Date(ms).toISOString().slice(0,10);
const knownZone=zone=>{try{new Intl.DateTimeFormat('en',{timeZone:zone});return zone;}catch{return 'UTC';}};

// Calendar date and hour (0-23) on the player's own clock, daylight saving included.
export function localParts(now,timeZone){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:knownZone(timeZone),hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
 return {date:`${parts.year}-${parts.month}-${parts.day}`,hour:Number(parts.hour)%24};
}
const number=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
export const readyCrops=(farm,now)=>(farm?.plots??[]).filter(p=>p&&p.crop&&number(p.readyAt)!==null&&number(p.readyAt)<=now).map(p=>({crop:p.crop,readyAt:number(p.readyAt)}));
export function readyJobs(farm,now){
 const out=[];
 for(const [building,data] of Object.entries(farm?.buildings??{}))for(const job of [data?.job,...(data?.extraJobs??[])].filter(Boolean)){
  const at=number(job.readyAt);if(at!==null&&at<=now)out.push({building,readyAt:at});
 }
 return out;
}
const plural=(n,one,many=`${one}s`)=>n===1?one:many;
const tally=(items,key)=>{const counts=new Map();for(const item of items)counts.set(item[key],(counts.get(item[key])??0)+1);return [...counts];};

export function cropsText(crops,names,max=CONFIG.MAX_KINDS){
 const kinds=tally(crops,'crop'),shown=kinds.slice(0,max).map(([key,n])=>`${n} ${(names[key]??key).toLowerCase()}`);
 return `${crops.length} ${plural(crops.length,'crop')} ready to harvest${kinds.length>0?`: ${shown.join(', ')}${kinds.length>max?'…':''}`:''}`;
}
export function jobsText(jobs,names){
 const kinds=tally(jobs,'building'),label=key=>names[key]??key;
 if(kinds.length===1)return `${label(kinds[0][0])}: ${jobs.length} ${plural(jobs.length,'batch','batches')} ready`;
 return `${jobs.length} batches ready (${kinds.map(([key,n])=>`${label(key)} ${n}`).join(', ')})`;
}

// One player at one moment. `player` is a row from notification_candidates(); `names` maps crop and building keys to names.
// Returns {push, patchAlways, patchOnSend, digest, digestPatch}. patchAlways is saved regardless; patchOnSend only
// once the push was really delivered, so a failed delivery is tried again next hour.
export function planPlayer(player,now,names={crops:{},buildings:{}}){
 const zone=knownZone(player.timezone),local=localParts(now,zone),today=local.date;
 const lastActive=player.last_active_at?Date.parse(player.last_active_at):null;
 const inactive=lastActive!==null&&now-lastActive>CONFIG.INACTIVE_STOP_MS;
 const active=lastActive!==null&&now-lastActive<CONFIG.ACTIVE_SKIP_MS;
 const farm=player.farm??{},login=farm.login??{},ready=readyCrops(farm,now),jobsReady=readyJobs(farm,now);
 const subscriptions=player.subscriptions??[];
 const result={push:null,patchAlways:{},patchOnSend:{},digest:null,digestPatch:null};

 // "Seen" markers only move forward. The first time, and whenever a category is off or cannot be delivered,
 // they follow the clock, so switching something on never announces what was already waiting.
 const seenCrops=number(player.crops_seen_at)??now,seenJobs=number(player.production_seen_at)??now;
 const canPush=!inactive&&subscriptions.length>0;
 const follow=[];
 if(player.crops_seen_at==null||!player.push_crops||!canPush||active)follow.push('crops_seen_at');
 if(player.production_seen_at==null||!player.push_production||!canPush||active)follow.push('production_seen_at');
 for(const key of follow)result.patchAlways[key]=now;

 if(canPush&&!active){
  const parts=[],onSend={},quiet=local.hour>=CONFIG.QUIET_START||local.hour<CONFIG.QUIET_END;
  if(player.push_daily&&login.lastDay!==utcDay(now)){
   if(local.hour===CONFIG.DAILY_MORNING_HOUR&&player.daily_morning_on!==today){parts.push('Your daily gift is waiting');onSend.daily_morning_on=today;}
   const streak=number(login.streak)??0;
   if(local.hour===CONFIG.DAILY_EVENING_HOUR&&login.lastDay===utcDay(now-DAY_MS)&&streak>=CONFIG.STREAK_MIN&&player.daily_evening_on!==today){parts.push(`Collect your gift to keep your ${streak}-day streak`);onSend.daily_evening_on=today;}
  }
  const giftParts=parts.length;
  if(!quiet){
   if(player.push_crops){const fresh=ready.filter(c=>c.readyAt>seenCrops);if(fresh.length)parts.push(cropsText(ready,names.crops));}
   if(player.push_production){const fresh=jobsReady.filter(j=>j.readyAt>seenJobs);if(fresh.length)parts.push(jobsText(jobsReady,names.buildings));}
  }
  const gapOk=!player.last_push_at||now-Date.parse(player.last_push_at)>=CONFIG.MIN_PUSH_GAP_MS;
  const sentToday=player.push_day===today?Number(player.push_count)||0:0;
  if(parts.length&&gapOk&&sentToday<CONFIG.MAX_PUSH_PER_DAY){
   // Only about the daily gift: tapping it opens Daily rewards. Anything about the fields or buildings opens the farm.
   result.push={title:'Harvest Tycoon',body:parts.join(' · '),tag:'harvest-tycoon',url:giftParts===parts.length?'/?source=push&open=today':'/?source=push'};
   result.patchOnSend={...onSend,crops_seen_at:now,production_seen_at:now,last_push_at:new Date(now).toISOString(),push_day:today,push_count:sentToday+1};
  }
 }

 // Daily email summary: once a day at the hour the player chose, and only when something is waiting.
 if(player.email_digest&&player.email&&!inactive&&local.hour===number(player.digest_hour)&&player.digest_on!==today){
  const giftWaiting=login.lastDay!==utcDay(now);
  if(ready.length||jobsReady.length||giftWaiting){
   result.digest={username:player.username??'farmer',crops:ready,jobs:jobsReady,giftWaiting,streak:number(login.streak)??0};
   result.digestPatch={digest_on:today};
  }
 }
 return result;
}
