import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONFIG,localParts,planPlayer,readyCrops,readyJobs,cropsText,jobsText,utcDay} from '../supabase/functions/notify-hourly/rules.js';
import {digestEmail,digestSubject,digestLines} from '../supabase/functions/notify-hourly/mail.js';
import {runJob,EMAIL_DAILY_CAP} from '../supabase/functions/notify-hourly/job.js';
import {CROP_NAMES,BUILDING_NAMES} from '../supabase/functions/notify-hourly/names.js';
const names={crops:CROP_NAMES,buildings:BUILDING_NAMES};
const MIN=60000,HOUR=3600000;
const at=iso=>Date.parse(iso);
const MORNING=at('2026-09-21T07:05:00Z');            // 09:05 in Amsterdam (summer time)
const player=(over={},farm={})=>({player_id:'p1',email:'a@b.nl',username:'Tony',push_crops:true,push_production:true,push_daily:true,email_digest:false,digest_hour:9,timezone:'Europe/Amsterdam',
 last_active_at:new Date(MORNING-3*HOUR).toISOString(),crops_seen_at:MORNING-2*HOUR,production_seen_at:MORNING-2*HOUR,last_push_at:null,push_day:null,push_count:0,daily_morning_on:null,daily_evening_on:null,digest_on:null,
 subscriptions:[{endpoint:'https://push.example/1',p256dh:'k',auth:'a'}],farm:{plots:[],buildings:{},login:{lastDay:'2026-09-21',streak:5},...farm},...over});
const plots=(...ready)=>ready.map((r,i)=>({id:i,crop:r[0],readyAt:r[1]}));

test('local time follows the player, including daylight saving and the date change',()=>{
 assert.deepEqual(localParts(MORNING,'Europe/Amsterdam'),{date:'2026-09-21',hour:9});
 assert.deepEqual(localParts(at('2026-01-15T08:05:00Z'),'Europe/Amsterdam'),{date:'2026-01-15',hour:9},'winter time');
 assert.deepEqual(localParts(at('2026-09-21T22:30:00Z'),'Europe/Amsterdam'),{date:'2026-09-22',hour:0});
 assert.deepEqual(localParts(at('2026-09-21T02:00:00Z'),'America/Los_Angeles'),{date:'2026-09-20',hour:19});
 assert.deepEqual(localParts(MORNING,'Mars/Base'),{date:'2026-09-21',hour:7},'an unknown zone falls back to UTC');
});
test('crops: one push with the total, naming what is ready',()=>{
 const p=player({},{plots:plots(['wheat',MORNING-30*MIN],['wheat',MORNING-20*MIN],['corn',MORNING-5*MIN],['lettuce',MORNING+HOUR]),login:{lastDay:'2026-09-21'}});
 const plan=planPlayer(p,MORNING,names);
 assert.equal(plan.push.body,'Your crops are ready to harvest','one plain line (26 Sep 2026)');assert.equal(plan.push.title,'Harvest Tycoon');assert.equal(plan.push.tag,'harvest-tycoon');
 assert.equal(plan.patchOnSend.crops_seen_at,MORNING);assert.equal(plan.patchOnSend.push_count,1);assert.equal(plan.patchOnSend.push_day,'2026-09-21');assert.equal(plan.patchOnSend.last_push_at,new Date(MORNING).toISOString());
 assert.equal(cropsText([{crop:'wheat'}],names.crops),'1 crop ready to harvest: 1 wheat');
});
test('crops: only NEW ones trigger, so an unharvested crop does not repeat every hour',()=>{
 const old=player({crops_seen_at:MORNING-10*MIN},{plots:plots(['wheat',MORNING-HOUR])});
 assert.equal(planPlayer(old,MORNING,names).push,null);
 assert.equal(planPlayer(player({crops_seen_at:MORNING-2*HOUR},{plots:plots(['wheat',MORNING-HOUR])}),MORNING,names).push.body,'Your crops are ready to harvest');
 assert.equal(planPlayer(player({push_crops:false,push_daily:false},{plots:plots(['wheat',MORNING-HOUR])}),MORNING,names).push,null,'switched off');
});
test('the first look only sets a baseline: switching reminders on never announces what was already waiting',()=>{
 const first=planPlayer(player({crops_seen_at:null,production_seen_at:null,push_daily:false},{plots:plots(['wheat',MORNING-5*HOUR])}),MORNING,names);
 assert.equal(first.push,null);assert.equal(first.patchAlways.crops_seen_at,MORNING);assert.equal(first.patchAlways.production_seen_at,MORNING);
});
test('quiet hours hold reminders back without forgetting them',()=>{
 const night=at('2026-09-21T21:05:00Z');                            // 23:05 local
 const p=player({crops_seen_at:night-2*HOUR,last_active_at:new Date(night-9*HOUR).toISOString(),push_daily:false},{plots:plots(['wheat',night-30*MIN])});
 const held=planPlayer(p,night,names);assert.equal(held.push,null);assert.equal('crops_seen_at' in held.patchAlways,false,'marker stays put');
 const morning=at('2026-09-22T06:05:00Z');                          // 08:05 local
 const later=planPlayer({...p,last_active_at:new Date(night-9*HOUR).toISOString()},morning,names);assert.equal(later.push.body,'Your crops are ready to harvest');
 assert.equal(CONFIG.QUIET_START,22);assert.equal(CONFIG.QUIET_END,8);
});
test('nothing while the game is open, for players away for a week, or without a device',()=>{
 const farm={plots:plots(['wheat',MORNING-HOUR])};
 const active=planPlayer(player({last_active_at:new Date(MORNING-5*MIN).toISOString()},farm),MORNING,names);assert.equal(active.push,null);assert.equal(active.patchAlways.crops_seen_at,MORNING,'they saw it themselves');
 const away=planPlayer(player({last_active_at:new Date(MORNING-8*24*HOUR).toISOString(),email_digest:true},farm),MORNING,names);assert.equal(away.push,null);assert.equal(away.digest,null);assert.equal(away.patchAlways.crops_seen_at,MORNING,'no burst when they return');
 const none=planPlayer(player({subscriptions:[]},farm),MORNING,names);assert.equal(none.push,null);assert.equal(none.patchAlways.crops_seen_at,MORNING);
});
test('at most one push an hour, fourteen a day (one an hour from 08:00 to 22:00)',()=>{
 assert.equal(CONFIG.MAX_PUSH_PER_DAY,14);
 const farm={plots:plots(['wheat',MORNING-10*MIN])},base={crops_seen_at:MORNING-HOUR,push_daily:false};
 assert.equal(planPlayer(player({...base,last_push_at:new Date(MORNING-20*MIN).toISOString()},farm),MORNING,names).push,null);
 assert(planPlayer(player({...base,last_push_at:new Date(MORNING-55*MIN).toISOString()},farm),MORNING,names).push);
 assert.equal(planPlayer(player({...base,push_day:'2026-09-21',push_count:14},farm),MORNING,names).push,null);
 assert.equal(planPlayer(player({...base,push_day:'2026-09-21',push_count:13},farm),MORNING,names).patchOnSend.push_count,14);
 assert.equal(planPlayer(player({...base,push_day:'2026-09-20',push_count:14},farm),MORNING,names).patchOnSend.push_count,1,'a new day starts again');
});
test('production follows the same rules as crops and joins them in ONE push',()=>{
 const farm={plots:plots(['corn',MORNING-10*MIN]),buildings:{bakery:{job:{readyAt:MORNING-8*MIN},extraJobs:[{readyAt:MORNING-2*MIN},{readyAt:MORNING+HOUR}]},dairy:{job:{readyAt:MORNING-3*MIN}}}};
 const both=planPlayer(player({push_daily:false},farm),MORNING,names);
 assert.equal(both.push.body,'Your crops and goods are ready');
 const only=planPlayer(player({push_crops:false,push_daily:false},{buildings:{bakery:{job:{readyAt:MORNING-8*MIN},extraJobs:[{readyAt:MORNING-2*MIN}]}}}),MORNING,names);assert.equal(only.push.body,'Your goods are ready to collect');
 assert.equal(jobsText([{building:'bakery'}],names.buildings),'Bakery: 1 batch ready');
 assert.equal(planPlayer(player({production_seen_at:MORNING-MIN,push_crops:false,push_daily:false},farm),MORNING,names).push,null,'older than the last look');
 assert.equal(planPlayer(player({push_production:false,push_crops:false,push_daily:false},farm),MORNING,names).push,null);
 assert.deepEqual(readyJobs(farm,MORNING).map(j=>j.building).sort(),['bakery','bakery','dairy']);assert.equal(readyCrops({plots:[{crop:null,readyAt:1},{crop:'wheat',readyAt:'x'}]},MORNING).length,0);
});
test('daily gift: a morning reminder once a day, and an evening one only when a real streak is at risk',()=>{
 const open={login:{lastDay:'2026-09-20',streak:6}};
 const morning=planPlayer(player({},open),MORNING,names);assert.equal(morning.push.body,'Your daily gift is waiting, with double earnings','day 7 of the streak brings double earnings');assert.equal(morning.patchOnSend.daily_morning_on,'2026-09-21');
 assert.equal(planPlayer(player({daily_morning_on:'2026-09-21'},open),MORNING,names).push,null,'once per local day');
 assert.equal(planPlayer(player({},{login:{lastDay:'2026-09-21',streak:6}}),MORNING,names).push,null,'already collected');
 assert.equal(planPlayer(player({},open),MORNING+HOUR,names).push,null,'only in the 09:00 hour');
 const evening=at('2026-09-21T17:05:00Z');                          // 19:05 local
 const risk=planPlayer(player({last_active_at:new Date(evening-9*HOUR).toISOString()},open),evening,names);assert.equal(risk.push.body,'Collect your gift to keep your 6-day streak');assert.equal(risk.patchOnSend.daily_evening_on,'2026-09-21');
 assert.equal(planPlayer(player({last_active_at:new Date(evening-9*HOUR).toISOString()},{login:{lastDay:'2026-09-20',streak:2}}),evening,names).push,null,'a streak of 2 is not worth a nudge');
 assert.equal(planPlayer(player({last_active_at:new Date(evening-9*HOUR).toISOString()},{login:{lastDay:'2026-09-18',streak:9}}),evening,names).push,null,'the streak is already broken');
 assert.equal(planPlayer(player({push_daily:false},open),MORNING,names).push,null);
 // 27 Sep 2026: the morning push names the day's boost (days 3, 5, 7 of a streak week); one missed day with the weekly save still counts.
 assert.equal(planPlayer(player({},{login:{lastDay:'2026-09-15',streak:4}}),MORNING,names).push.body,'Your daily gift is waiting','day 1 again: no boost');
 assert.equal(planPlayer(player({},{login:{lastDay:'2026-09-20',streak:2}}),MORNING,names).push.body,'Your daily gift is waiting, with double XP');
 assert.equal(planPlayer(player({},{login:{lastDay:'2026-09-20',streak:11}}),MORNING,names).push.body,'Your daily gift is waiting, with double harvest');
 assert.equal(planPlayer(player({last_active_at:new Date(evening-9*HOUR).toISOString()},{login:{lastDay:'2026-09-19',streak:5}}),evening,names).push.body,'Collect your gift to keep your 5-day streak','saved over one missed day');
 assert.equal(planPlayer(player({last_active_at:new Date(evening-9*HOUR).toISOString()},{login:{lastDay:'2026-09-19',streak:5,savedDay:'2026-09-17'}}),evening,names).push,null,'the save was used this week');
});
// Oct 2026: the comeback chest (game/farm-state.js COMEBACK_*). On away-day 3 and 6 the 09:00 gift reminder becomes the chest's, never
// an extra push, and it opens the farm, where Welcome back shows the chest.
const DAY=24*HOUR;
const awayFor=(days,comeback)=>[{last_active_at:new Date(MORNING-days*DAY-HOUR).toISOString()},{login:{lastDay:'2026-09-15',streak:4},seenAt:new Date(MORNING-days*DAY-HOUR).toISOString(),...(comeback?{comeback}:{})}];
const CHEST='A comeback chest is waiting on your farm';
test('comeback chest: the morning reminder on away-day 3 and 6 says the chest is waiting and opens the farm',()=>{
 for(const days of [3,6]){
  const [over,farm]=awayFor(days),plan=planPlayer(player(over,farm),MORNING,names);
  assert.equal(plan.push.body,CHEST,`day ${days}`);assert.equal(plan.push.url,'/?source=push','the farm, so Welcome back shows it');assert.equal(plan.patchOnSend.daily_morning_on,'2026-09-21');
  assert.equal(planPlayer(player({...over,daily_morning_on:'2026-09-21'},farm),MORNING,names).push,null,'still once a day');
  assert.equal(planPlayer(player(over,farm),MORNING+HOUR,names).push,null,'only in the 09:00 hour');
 }
 for(const days of [1,2,4,5]){const [over,farm]=awayFor(days),plan=planPlayer(player(over,farm),MORNING,names);assert.equal(plan.push.body,'Your daily gift is waiting',`day ${days}`);assert.equal(plan.push.url,'/?source=push&open=today');}
 const [over,farm]=awayFor(3);
 assert.equal(planPlayer(player({...over,push_daily:false},farm),MORNING,names).push,null,'under the Daily gift & streak switch');
 assert.equal(planPlayer(player(...awayFor(8)),MORNING,names).push,null,'a week away: nothing at all');
 assert.equal(planPlayer(player(over,{...farm,seenAt:undefined}),MORNING,names).push.body,CHEST,'without seenAt it counts from the last activity');
 assert.equal(planPlayer(player({},awayFor(3)[1]),MORNING,names).push.body,CHEST,'the farm\'s own last save (seenAt) decides, as in the game');
 assert.equal(planPlayer(player({...over,language:'nl'},farm),MORNING,names).push.body,'Er staat een comebackkist voor je klaar op je boerderij');
 const both=planPlayer(player(over,{...farm,plots:plots(['wheat',MORNING-HOUR])}),MORNING,names);
 assert.equal(both.push.body,`${CHEST} · Your crops are ready to harvest`,'one push');assert.equal(both.push.url,'/?source=push');
 const evening=at('2026-09-21T17:05:00Z');
 assert.equal(planPlayer(player({last_active_at:new Date(evening-3*DAY-HOUR).toISOString()},{...farm,seenAt:new Date(evening-3*DAY-HOUR).toISOString()}),evening,names).push,null,'no evening push: the streak is gone');
});
test('comeback chest: one every 14 days, and a chest still waiting is named again',()=>{
 const [over]=awayFor(3);
 assert.equal(planPlayer(player(...awayFor(3,{lastAt:MORNING-5*DAY,collected:1,pending:null})),MORNING,names).push.body,'Your daily gift is waiting','offered 5 days ago: not yet');
 assert.equal(planPlayer(player(...awayFor(3,{lastAt:MORNING-15*DAY,collected:1,pending:null})),MORNING,names).push.body,CHEST,'15 days ago: again');
 assert.equal(planPlayer(player(...awayFor(6,{lastAt:MORNING-10*DAY,collected:0,pending:{days:4,at:MORNING-10*DAY}})),MORNING,names).push.body,CHEST,'not collected yet: still waiting');
 assert.equal(planPlayer(player(over,{...awayFor(3)[1],comeback:{lastAt:0,collected:0,pending:null}}),MORNING,names).push.body,CHEST,'a farm that never had one');
});
test('daily email: the comeback line after 3 days away, and no "keep your streak" once the streak is gone',()=>{
 const on={email_digest:true,digest_hour:9,push_crops:false,push_production:false,push_daily:false,subscriptions:[]};
 const [over,farm]=awayFor(4),plan=planPlayer(player({...on,...over},farm),MORNING,names);
 assert.equal(plan.digest.comeback,true);assert.deepEqual(digestLines(plan.digest,names),[CHEST]);assert.equal(digestSubject(plan.digest),CHEST);
 assert.equal(planPlayer(player(on,{plots:[],login:{lastDay:'2026-09-20',streak:3}}),MORNING,names).digest.comeback,undefined,'only after 3 days away');
 const broken=planPlayer(player(on,{plots:[],login:{lastDay:'2026-09-18',streak:5}}),MORNING,names).digest;
 assert.equal(broken.streak,0);assert.deepEqual(digestLines(broken,names),['Your daily gift is waiting']);
 assert.deepEqual(digestLines(planPlayer(player(on,{plots:[],login:{lastDay:'2026-09-20',streak:5}}),MORNING,names).digest,names),['Your daily gift is waiting: keep your 5-day streak going']);
 assert.equal(planPlayer(player(on,{plots:[],login:{lastDay:'2026-09-19',streak:5}}),MORNING,names).digest.streak,5,'kept over one missed day by the weekly save');
});
test('daily email: at the chosen hour, once a day, and only when something is waiting',()=>{
 const farm={plots:plots(['wheat',MORNING-HOUR]),login:{lastDay:'2026-09-21',streak:4}};
 const on={email_digest:true,digest_hour:9,push_crops:false,push_production:false,push_daily:false,subscriptions:[]};
 const plan=planPlayer(player(on,farm),MORNING,names);assert.equal(plan.digest.crops.length,1);assert.equal(plan.digest.username,'Tony');assert.deepEqual(plan.digestPatch,{digest_on:'2026-09-21'});
 assert.equal(planPlayer(player({...on,digest_hour:18},farm),MORNING,names).digest,null,'the player picks the hour');
 assert.equal(planPlayer(player({...on,digest_on:'2026-09-21'},farm),MORNING,names).digest,null);
 assert.equal(planPlayer(player(on,{plots:[],login:{lastDay:'2026-09-21'}}),MORNING,names).digest,null,'nothing waiting, no email');
 assert.equal(planPlayer(player({...on,email:null},farm),MORNING,names).digest,null);
 assert.equal(planPlayer(player(on,{plots:[],login:{lastDay:'2026-09-20',streak:3}}),MORNING,names).digest.giftWaiting,true);
 // 26 Sep 2026: from the chosen hour on, not only at it: nothing waiting at 07:00 (or a refused mail) is tried again at 08:00, 09:00...
 assert.ok(planPlayer(player({...on,digest_hour:7},farm),MORNING,names).digest,'two hours after the chosen hour, not sent yet today');
 assert.equal(planPlayer(player({...on,digest_hour:7,digest_on:'2026-09-21'},farm),MORNING,names).digest,null,'still once a day');
 assert.equal(planPlayer(player({...on,digest_hour:7,last_active_at:new Date(MORNING+13*HOUR-2*HOUR).toISOString()},farm),MORNING+13*HOUR,names).digest,null,'not from 22:00');
});
test('the email is escaped, has an unsubscribe link and a plain-text version',()=>{
 const digest={username:'<b>Tony</b>',crops:[{crop:'wheat'},{crop:'wheat'}],jobs:[],giftWaiting:true,streak:4};
 const mail=digestEmail({digest,names,appUrl:'https://www.harvesttycoon.com',unsubscribeUrl:'https://x.example/fn?unsubscribe=abc'});
 assert.equal(mail.subject,'Your farm needs you: 2 crops ready');assert(!mail.html.includes('<b>Tony'));assert(mail.html.includes('&lt;b&gt;Tony'));
 assert(mail.html.includes('https://x.example/fn?unsubscribe=abc')&&mail.text.includes('Unsubscribe: https://x.example/fn?unsubscribe=abc'));
 assert(mail.html.includes('2 crops ready to harvest: 2 wheat')&&mail.html.includes('keep your 4-day streak going'));
 assert.equal(digestSubject({crops:[],jobs:[{building:'dairy'}],giftWaiting:false}),'Your farm needs you: 1 batch ready');assert.equal(digestSubject({crops:[],jobs:[],giftWaiting:true}),'Your daily gift is waiting');
 assert.equal(digestLines({crops:[],jobs:[],giftWaiting:true,streak:0},names).length,1);
});

function deps(rows,{run={run:true,emails_sent:0},sendPush=async()=>({ok:true,status:201}),sendEmail=async()=>true,emailCap}={}){
 const log={saved:[],removed:[],ok:[],fail:[],emails:0,pushes:[],mails:[]};
 return {log,deps:{names,emailCap,
  db:{beginRun:async()=>run,candidates:async()=>rows,saveState:async(id,patch)=>log.saved.push([id,patch]),removeSubscription:async e=>log.removed.push(e),markSuccess:async e=>log.ok.push(e),markFailure:async e=>log.fail.push(e),addEmails:async n=>{log.emails+=n;}},
  sendPush:sendPush&&(async(sub,payload)=>{log.pushes.push([sub.endpoint,JSON.parse(payload)]);return sendPush(sub,payload);}),
  sendEmail:sendEmail&&(async(row,digest)=>{log.mails.push(row.player_id);return sendEmail(row,digest);}),log:()=>{}}};
}
const waiting=(over={})=>player({push_daily:false,...over},{plots:plots(['wheat',MORNING-10*MIN])});
test('job: delivers, then remembers what it sent',async()=>{
 const {log,deps:d}=deps([waiting()]);const stats=await runJob(d,MORNING);
 assert.deepEqual([stats.ran,stats.players,stats.pushes,stats.errors],[true,1,1,0]);assert.equal(log.pushes[0][1].body,'Your crops are ready to harvest');assert.deepEqual(log.ok,['https://push.example/1']);
 assert.equal(log.saved[0][1].push_count,1);assert.equal(log.saved[0][1].crops_seen_at,MORNING);
});
test('job: a run is skipped when this hour already ran',async()=>{
 const {log,deps:d}=deps([waiting()],{run:{run:false}});assert.deepEqual(await runJob(d,MORNING),{ran:false});assert.equal(log.pushes.length,0);assert.equal(log.saved.length,0);
});
test('job: a failed delivery is retried next hour; a gone device is forgotten',async()=>{
 const failing=deps([waiting()],{sendPush:async()=>({ok:false,status:500})});const stats=await runJob(failing.deps,MORNING);
 assert.equal(stats.pushes,0);assert.deepEqual(failing.log.fail,['https://push.example/1']);assert.equal(failing.log.saved.length,0,'markers unchanged, so it is tried again');
 const gone=deps([waiting()],{sendPush:async()=>({ok:false,status:410})});await runJob(gone.deps,MORNING);assert.deepEqual(gone.log.removed,['https://push.example/1']);
 const twoDevices=deps([waiting({subscriptions:[{endpoint:'https://a',p256dh:'k',auth:'a'},{endpoint:'https://b',p256dh:'k',auth:'a'}]})],{sendPush:async sub=>sub.endpoint==='https://a'?{ok:false,status:404}:{ok:true,status:201}});
 assert.equal((await runJob(twoDevices.deps,MORNING)).pushes,1);assert.deepEqual(twoDevices.log.removed,['https://a']);
 const throwing=deps([waiting()],{sendPush:async()=>{throw new Error('network');}});assert.equal((await runJob(throwing.deps,MORNING)).errors,0);assert.equal(throwing.log.fail.length,1);
});
test('job: one player failing does not stop the rest',async()=>{
 const {log,deps:d}=deps([waiting({player_id:'bad'}),waiting({player_id:'ok'})]);
 const save=d.db.saveState;d.db.saveState=async(id,patch)=>{if(id==='bad')throw new Error('database hiccup');return save(id,patch);};
 const stats=await runJob(d,MORNING);assert.equal(stats.errors,1);assert.equal(stats.pushes,2,'both were delivered');assert.equal(log.saved.at(-1)[0],'ok');
});
test('job: players with nothing to send only get their markers moved',async()=>{
 const {log,deps:d}=deps([player({push_daily:false},{plots:[]})]);await runJob(d,MORNING);assert.equal(log.pushes.length,0);assert.equal(log.saved.length,0,'nothing new to remember');
});
test('job: the daily email is capped, counted, and only marked as sent when it really went out',async()=>{
 const farm={plots:plots(['wheat',MORNING-HOUR]),login:{lastDay:'2026-09-21',streak:1}},on={email_digest:true,push_crops:false,push_production:false,push_daily:false,subscriptions:[]};
 const rows=[player({...on,player_id:'a'},farm),player({...on,player_id:'b'},farm),player({...on,player_id:'c'},farm)];
 const capped=deps(rows,{emailCap:2,run:{run:true,emails_sent:0}});const stats=await runJob(capped.deps,MORNING);
 assert.equal(stats.emails,2);assert.equal(capped.log.emails,2);assert.deepEqual(capped.log.saved.filter(s=>s[1].digest_on).map(s=>s[0]),['a','b']);assert.equal(capped.log.saved[0][1].digest_on,'2026-09-21');
 const used=deps(rows,{run:{run:true,emails_sent:EMAIL_DAILY_CAP-1}});assert.equal((await runJob(used.deps,MORNING)).emails,1,'the allowance left today is respected');
 const failed=deps(rows.slice(0,1),{sendEmail:async()=>false});await runJob(failed.deps,MORNING);assert(!failed.log.saved.some(s=>s[1].digest_on),'not marked as sent');assert.equal(failed.log.emails,0);
 const off=deps(rows,{sendEmail:null});assert.equal((await runJob(off.deps,MORNING)).emails,0);
});
test('the names file is generated from the game, and sync copies it',async()=>{
 const game=await import('../game/farm-state.js');
 for(const [key,crop] of Object.entries(game.CROPS))assert.equal(CROP_NAMES[key],crop.name,key);
 for(const [key,building] of Object.entries(game.BUILDINGS))assert.equal(BUILDING_NAMES[key],building.name,key);
 assert.equal(utcDay(MORNING),'2026-09-21');
});
test('job: when the email allowance runs short, the most recently active farmers get it first',async()=>{
 const farm={plots:plots(['wheat',MORNING-HOUR]),login:{lastDay:'2026-09-20',streak:1}},on={email_digest:true,push_crops:false,push_production:false,push_daily:false,subscriptions:[]};
 const seen=hours=>new Date(MORNING-hours*HOUR).toISOString();
 const rows=[player({...on,player_id:'quiet 5 days',last_active_at:seen(120)},farm),player({...on,player_id:'yesterday',last_active_at:seen(14)},farm),player({...on,player_id:'never saved',last_active_at:null},farm),player({...on,player_id:'two days',last_active_at:seen(40)},farm)];
 const {log,deps:d}=deps(rows,{emailCap:2});await runJob(d,MORNING);
 assert.deepEqual(log.mails,['yesterday','two days']);
});
test('job: the daily email only goes to a confirmed address, and an unconfirmed one uses none of the allowance',async()=>{
 const farm={plots:plots(['wheat',MORNING-HOUR]),login:{lastDay:'2026-09-20',streak:1}},on={email_digest:true,push_crops:false,push_production:false,push_daily:false,subscriptions:[]};
 const rows=[player({...on,player_id:'typo'},farm),player({...on,player_id:'checked'},farm)];
 const {log,deps:d}=deps(rows,{emailCap:1});d.emailConfirmed=async row=>row.player_id==='checked';await runJob(d,MORNING);
 assert.deepEqual(log.mails,['checked']);assert.ok(!log.saved.some(s=>s[0]==='typo'&&s[1].digest_on),'tried again next hour, once confirmed');
 const source=readFileSync(new URL('../supabase/functions/notify-hourly/index.ts',import.meta.url),'utf8');
 assert.match(source,/admin\.rpc\('harvest_email_checked',\{p_player:row\.player_id\}\)/);assert.match(source,/sendEmail:emailOn\?sendEmail:null,emailConfirmed,/);
});
