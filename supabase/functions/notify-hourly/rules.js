// Decides, for one player and one moment, which reminder (if any) goes out. Pure: no network, no database,
// so every rule can be tested. The hourly job (job.js) applies the result.
import {textsFor} from './texts.js';
import {LOCAL_NAMES} from './names.js';
export const DAY_MS=86400000,HOUR_MS=3600000;
export const CONFIG=Object.freeze({
 QUIET_START:22,QUIET_END:8,          // no crop or production reminders from 22:00 until 08:00 local time
 MAX_PUSH_PER_DAY:14,                 // per player, per local day: one an hour from 08:00 to 22:00 (26 Sep 2026, was 4)
 MIN_PUSH_GAP_MS:50*60000,            // at most one push per hour
 ACTIVE_SKIP_MS:10*60000,             // the game is open right now: they can see it themselves
 INACTIVE_STOP_MS:7*DAY_MS,           // nothing for players who have not played for a week
 DAILY_MORNING_HOUR:9,DAILY_EVENING_HOUR:19,STREAK_MIN:3,MAX_KINDS:3
});
export const utcDay=ms=>new Date(ms).toISOString().slice(0,10);
// The daily gift's boost (game/farm-state.js DAILY_BOOSTS, 27 Sep 2026): days 3, 5 and 7 of every streak week. The push names the
// boost, not how long it lasts (VIP doubles it, and this job does not read VIP).
export const GIFT_BOOSTS=Object.freeze({3:'double XP',5:'double harvest',7:'double earnings'}),STREAK_SAVE_DAYS=7;
// The streak day today's gift would be, as game/farm-state.js streakToday counts it: on from yesterday, on over one missed day with
// the weekly save (login.savedDay), otherwise day 1.
export function giftStreak(login,now){
 const streak=Number(login?.streak)||0,saved=login?.savedDay;
 if(login?.lastDay===utcDay(now-DAY_MS))return streak+1;
 if(login?.lastDay===utcDay(now-2*DAY_MS)&&streak>0&&(!saved||Date.parse(utcDay(now))-Date.parse(saved)>=STREAK_SAVE_DAYS*DAY_MS))return streak+1;
 return 1;
}
// The comeback chest (game/farm-state.js COMEBACK_*, Oct 2026): offered when the farm opens after 3 days or more away (from the last
// save, player_farms.updated_at: farm.seenAt here), at most every 14 days, and kept until collected. On away-day 3 and 6 the 09:00 gift
// reminder says the chest is waiting instead (one push, never an extra); from day 7 the week rule below sends nothing at all.
export const COMEBACK_MIN_DAYS=3,COMEBACK_EVERY_DAYS=14,COMEBACK_PUSH_DAYS=Object.freeze([3,6]);
export function comebackWaiting(comeback,seen,now){
 if(comeback?.pending)return true;
 return seen!==null&&now-seen>=COMEBACK_MIN_DAYS*DAY_MS&&now-(Number(comeback?.lastAt)||0)>=COMEBACK_EVERY_DAYS*DAY_MS;
}
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
const tally=(items,key)=>{const counts=new Map();for(const item of items)counts.set(item[key],(counts.get(item[key])??0)+1);return [...counts];};
const EN=textsFor('en');
// The crop and building names in the farmer's language (the game's own translations), English where one is missing.
export function localNames(names,language){
 const local=LOCAL_NAMES[language];
 return local?{crops:{...names.crops,...local.crops},buildings:{...names.buildings,...local.buildings}}:names;
}

export function cropsText(crops,names,max=CONFIG.MAX_KINDS,t=EN){
 const kinds=tally(crops,'crop'),shown=kinds.slice(0,max).map(([key,n])=>t.item(n,names[key]??key));
 return t.cropsLine(crops.length,kinds.length>0?`${shown.join(t.listSep)}${kinds.length>max?'…':''}`:'');
}
// The push says it plainly (26 Sep 2026): one line for crops and goods together; the email summary keeps the details below.
export function readyText(crops,goods,t=EN){return crops&&goods?t.readyBoth:crops?t.readyCrops:t.readyGoods;}
export function jobsText(jobs,names,t=EN){
 const kinds=tally(jobs,'building'),label=key=>names[key]??key;
 if(kinds.length===1)return t.jobsOne(label(kinds[0][0]),jobs.length);
 return t.jobsMany(jobs.length,kinds.map(([key,n])=>`${label(key)} ${n}`).join(t.jobSep));
}

// One player at one moment. `player` is a row from notification_candidates(); `names` maps crop and building keys to names.
// Returns {push, patchAlways, patchOnSend, digest, digestPatch}. patchAlways is saved regardless; patchOnSend only
// once the push was really delivered, so a failed delivery is tried again next hour.
export function planPlayer(player,now,names={crops:{},buildings:{}}){
 // The texts in the farmer's own game language (texts.js); English when it is not known yet.
 const t=textsFor(player.language);names=localNames(names,t.language);
 const zone=knownZone(player.timezone),local=localParts(now,zone),today=local.date;
 const lastActive=player.last_active_at?Date.parse(player.last_active_at):null;
 const inactive=lastActive!==null&&now-lastActive>CONFIG.INACTIVE_STOP_MS;
 const active=lastActive!==null&&now-lastActive<CONFIG.ACTIVE_SKIP_MS;
 const farm=player.farm??{},login=farm.login??{},ready=readyCrops(farm,now),jobsReady=readyJobs(farm,now);
 // Devices: the browsers that allow push (subscriptions), and our Android app's notifications (app_push: the farmer turned them on there,
 // supabase/app-push.sql). One reminder is one reminder on all of them, so the limits below hold for the farmer, not per device.
 const subscriptions=player.subscriptions??[];
 // Days away as the game counts them for the comeback chest: from the farm's last save, or the last activity when that is missing.
 const seen=Number.isFinite(Date.parse(farm.seenAt))?Date.parse(farm.seenAt):lastActive,awayDays=seen===null?0:Math.floor((now-seen)/DAY_MS);
 const chestWaiting=awayDays>=COMEBACK_MIN_DAYS&&comebackWaiting(farm.comeback,seen,now);
 const result={push:null,patchAlways:{},patchOnSend:{},digest:null,digestPatch:null};

 // "Seen" markers only move forward. The first time, and whenever a category is off or cannot be delivered,
 // they follow the clock, so switching something on never announces what was already waiting.
 const seenCrops=number(player.crops_seen_at)??now,seenJobs=number(player.production_seen_at)??now;
 const canPush=!inactive&&(subscriptions.length>0||player.app_push===true);
 const follow=[];
 if(player.crops_seen_at==null||!player.push_crops||!canPush||active)follow.push('crops_seen_at');
 if(player.production_seen_at==null||!player.push_production||!canPush||active)follow.push('production_seen_at');
 for(const key of follow)result.patchAlways[key]=now;

 if(canPush&&!active){
  const parts=[],onSend={},quiet=local.hour>=CONFIG.QUIET_START||local.hour<CONFIG.QUIET_END;let chestPush=false;
  if(player.push_daily&&login.lastDay!==utcDay(now)){
   const day=giftStreak(login,now),boost=GIFT_BOOSTS[(day-1)%7+1];
   if(local.hour===CONFIG.DAILY_MORNING_HOUR&&player.daily_morning_on!==today){
    chestPush=chestWaiting&&COMEBACK_PUSH_DAYS.includes(awayDays);
    parts.push(chestPush?t.comeback:boost?t.pushGift(t.boosts[(day-1)%7+1]):t.gift);onSend.daily_morning_on=today;
   }
   const streak=day>1?day-1:0;
   if(local.hour===CONFIG.DAILY_EVENING_HOUR&&streak>=CONFIG.STREAK_MIN&&player.daily_evening_on!==today){parts.push(t.pushStreak(streak));onSend.daily_evening_on=today;}
  }
  const giftParts=parts.length;
  if(!quiet){
   // Crops and goods are one setting in the game and one line in the push: only when something new is ready since the last one.
   const crops=Boolean(player.push_crops)&&ready.some(c=>c.readyAt>seenCrops),goods=Boolean(player.push_production)&&jobsReady.some(j=>j.readyAt>seenJobs);
   if(crops||goods)parts.push(readyText(crops,goods,t));
  }
  const gapOk=!player.last_push_at||now-Date.parse(player.last_push_at)>=CONFIG.MIN_PUSH_GAP_MS;
  const sentToday=player.push_day===today?Number(player.push_count)||0:0;
  if(parts.length&&gapOk&&sentToday<CONFIG.MAX_PUSH_PER_DAY){
   // Only about the daily gift: tapping it opens Daily rewards. Anything about the fields or buildings opens the farm, and so does the
   // comeback chest: the Welcome back card shows it there, with the gift.
   // channel: the Android app's notification category (onesignal.js, existing_android_channel_id; the browser's push leaves it out):
   // 'daily' when every line comes from the daily gift switch (the gift, the streak, the comeback chest), else 'ready'.
   result.push={title:'Harvest Tycoon',body:parts.join(' · '),tag:'harvest-tycoon',url:giftParts===parts.length&&!chestPush?'/?source=push&open=today':'/?source=push',
    channel:giftParts===parts.length?'daily':'ready'};
   result.patchOnSend={...onSend,crops_seen_at:now,production_seen_at:now,last_push_at:new Date(now).toISOString(),push_day:today,push_count:sentToday+1};
  }
 }

 // Daily email summary: once a day, from the hour the player chose, and only when something is waiting. When nothing waits at that
 // hour (or the mail did not go out), the next hours try again until 22:00 (26 Sep 2026: at 12:00 on the dot it was skipped all day).
 const digestHour=number(player.digest_hour);
 if(player.email_digest&&player.email&&!inactive&&digestHour!==null&&local.hour>=digestHour&&local.hour<CONFIG.QUIET_START&&player.digest_on!==today){
  const giftWaiting=login.lastDay!==utcDay(now);
  if(ready.length||jobsReady.length||giftWaiting||chestWaiting){
   // The streak still alive today (Oct 2026: the stored login.streak promised to "keep" a streak that had already broken).
   result.digest={username:player.username??'farmer',language:t.language,crops:ready,jobs:jobsReady,giftWaiting,streak:Math.max(0,giftStreak(login,now)-1),...(chestWaiting?{comeback:true}:{})};
   result.digestPatch={digest_on:today};
  }
 }
 return result;
}
