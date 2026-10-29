import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction as act,normalizeFarm,xpForLevel,boostOffer,boostStatus,dailyGift,comebackChest,setXpWeekend,xpWeekend,xpDoubled,xpBoostWaiting,utcDay,XP_WEEKEND_NAME} from '../game/farm-state.js';
import {pickXpWeekend,readXpWeekend,forgetXpWeekendCache,XP_WEEKEND_CACHE_MS} from '../supabase/functions/farm-api/xp-weekend-service.js';

// The Double XP weekend (27 Oct 2026, the owner): double XP for every farm from level 1, never four times with a Double XP of its own,
// Double XP not for sale while it runs, and the farm's own Double XP (bought, the daily gift, the comeback chest, a pass) waits until
// after it (1A). Started by the admin (supabase/xp-weekend.sql), read by farm-api (xp-weekend-service.js) and never from the game.
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const MIN=60000,HOUR=60*MIN,DAY=24*HOUR,START=Date.UTC(2026,9,30,18),END=START+48*HOUR,ID='0e0e0000-0000-4000-8000-000000000001';
const weekend={id:ID,startsAt:START,endsAt:END};
function farm(at=START-HOUR,level=20){const s=createFarm(at);s.xp=xpForLevel(level);s.coins=100000;s.diamonds=5000;s.onboarding.completed=10;s.onboarding.rewardClaimed=true;s.stats.harvested=1;return s;}
function ripe(s,id,at){s.plots[id]={...s.plots[id],id,crop:'wheat',plantedAt:at-HOUR,readyAt:at-MIN,careAt:at-HOUR,watered:true,tended:false,fertilized:false,harvestCycles:0};}
const harvestXp=(s,at)=>{ripe(s,0,at);const before=s.xp;act(s,{type:'field',id:0,action:'harvest'},at);return s.xp-before;};
const buy=(s,length,at)=>act(s,{type:'buy_boost',boost:'xp',length,expectedCost:boostOffer('xp',length).cost},at);
test.afterEach(()=>setXpWeekend(null));

test('only a running weekend counts; a bad one is none',()=>{
 setXpWeekend(weekend);
 assert.equal(xpWeekend(START-1),null,'not yet');assert.deepEqual(xpWeekend(START),weekend);assert.deepEqual(xpWeekend(END-1),weekend);assert.equal(xpWeekend(END),null,'over');
 for(const bad of [null,undefined,'x',{},{id:'',startsAt:START,endsAt:END},{id:ID,startsAt:END,endsAt:START},{id:ID,startsAt:'soon',endsAt:END},{id:7,startsAt:START,endsAt:END}]){
  assert.equal(setXpWeekend(bad),null,JSON.stringify(bad));assert.equal(xpWeekend(START+HOUR),null);
 }
 assert.equal(XP_WEEKEND_NAME,'Double XP weekend');
});

test('during the weekend every farm earns double XP, from level 1; its own Double XP never makes it four times',()=>{
 const at=START+HOUR,plain=harvestXp(farm(at),at);
 setXpWeekend(weekend);
 assert.equal(harvestXp(farm(at),at),plain*2,'doubled');
 const newcomer=farm(at,1);assert.ok(xpDoubled(newcomer,at),'level 1 too');
 // A Double XP bought before the weekend, still running: twice, not four times.
 const own=farm(START-HOUR);buy(own,'1d',START-HOUR);
 assert.equal(harvestXp(own,at),plain*2,'never 4×');
 setXpWeekend(null);assert.equal(harvestXp(farm(at),at),plain,'no weekend: as before');
});

test('Double XP is not for sale while the weekend runs: the shop says it is included, the server refuses it',()=>{
 setXpWeekend(weekend);
 const s=farm(START+HOUR),status=boostStatus(s,'xp',START+HOUR,'1h');
 assert.equal(status.reason,'Included in the Double XP weekend');assert.equal(status.canBuy,false);assert.equal(status.remaining,0);assert.equal(status.weekendLeft,END-START-HOUR);
 const diamonds=s.diamonds;
 assert.throws(()=>buy(s,'1h',START+HOUR),/Included in the Double XP weekend/);assert.equal(s.diamonds,diamonds,'nothing spent');
 // The other boosts sell as ever, and Double XP before and after the weekend.
 assert.equal(boostStatus(s,'harvest',START+HOUR,'30m').canBuy,true);
 assert.equal(boostStatus(farm(START-MIN),'xp',START-MIN).canBuy,true);assert.equal(boostStatus(farm(END),'xp',END).canBuy,true);
});

test('a Double XP of its own pauses: the time it had left when the weekend began comes after its end, once',()=>{
 const s=farm(START-HOUR);buy(s,'30m',START-10*MIN);const had=s.boosts.xpUntil;assert.equal(had,START+20*MIN);
 setXpWeekend(weekend);
 // First seen an hour into the weekend (after it would have run out): its 20 minutes still come after the end.
 normalizeFarm(s,START+HOUR);assert.equal(s.boosts.xpUntil,END+20*MIN);assert.equal(s.boosts.xpWeekend,ID);
 normalizeFarm(s,START+2*HOUR);normalizeFarm(s,END-1);assert.equal(s.boosts.xpUntil,END+20*MIN,'once a weekend');
 assert.equal(xpBoostWaiting(s,START+2*HOUR),20*MIN);assert.equal(boostStatus(s,'xp',START+2*HOUR).waiting,20*MIN);
 // After the weekend it runs, and doubles once more.
 assert.ok(xpDoubled(s,END+10*MIN));assert.ok(!xpDoubled(s,END+21*MIN));
 // One that ran out before the weekend began is left alone; so is a farm with none (it only gets the mark).
 const old=farm(START-HOUR);buy(old,'30m',START-HOUR);setXpWeekend(weekend);normalizeFarm(old,START+MIN);assert.equal(old.boosts.xpUntil,START-30*MIN);
 // A new weekend (another id) pauses it again.
 setXpWeekend({id:'0e0e0000-0000-4000-8000-000000000002',startsAt:END+DAY,endsAt:END+2*DAY});normalizeFarm(s,END+DAY+MIN);
 assert.equal(s.boosts.xpUntil,END+20*MIN,'ran out before the second one');
});

test('the daily gift, the comeback chest and a bought day: Double XP that comes during the weekend starts at its end',()=>{
 setXpWeekend(weekend);const at=START+HOUR;
 const s=farm(at);s.login.lastDay=utcDay(at-DAY);s.login.streak=2;   // day 3: Double XP
 assert.equal(dailyGift(s,3,at).boost,'xp');assert.equal(dailyGift(s,3,at).afterWeekend,true);
 const gift=act(s,{type:'checkin'},at);
 assert.equal(gift.boost,'xp');assert.equal(gift.afterWeekend,true);assert.equal(s.boosts.xpUntil,END+30*MIN);
 // Day 5 (Double harvest) is not touched.
 assert.equal(dailyGift(s,5,at).afterWeekend,undefined);
 const c=farm(at);c.comeback={...c.comeback,pending:{days:4,at},lastAt:at};
 assert.equal(comebackChest(c,at).afterWeekend,true);
 const chest=act(c,{type:'comeback'},at);assert.equal(chest.afterWeekend,true);assert.equal(c.boosts.xpUntil,END+30*MIN);
 // Outside a weekend: from now, as before, and no word about it.
 setXpWeekend(null);const plain=farm(at);plain.login.lastDay=utcDay(at-DAY);plain.login.streak=2;
 const r=act(plain,{type:'checkin'},at);assert.equal(r.afterWeekend,undefined);assert.equal(plain.boosts.xpUntil,at+30*MIN);
});

test('farm-api: the running weekend, else the next one; a stopped one ends when it was stopped; read at most every 30 seconds',async()=>{
 const iso=t=>new Date(t).toISOString(),now=START+HOUR;
 const row=(id,s,e,stopped=null)=>({id,starts_at:iso(s),ends_at:iso(e),stopped_at:stopped==null?null:iso(stopped)});
 assert.deepEqual(pickXpWeekend([row(ID,START,END)],now),weekend);
 assert.deepEqual(pickXpWeekend([row(ID,START,END,START+2*HOUR)],now),{id:ID,startsAt:START,endsAt:START+2*HOUR},'stopped: ends then');
 assert.equal(pickXpWeekend([row(ID,START,END,START+30*MIN)],now),null,'stopped already');
 assert.equal(pickXpWeekend([row(ID,START,END,START-HOUR)],START-2*HOUR),null,'cancelled before it began');
 assert.deepEqual(pickXpWeekend([row('b',END+DAY,END+2*DAY),row(ID,START,END)],now),weekend,'the running one first');
 assert.deepEqual(pickXpWeekend([row('b',END+DAY,END+2*DAY)],now),{id:'b',startsAt:END+DAY,endsAt:END+2*DAY},'else the next');
 for(const bad of [null,[],[{}],[{id:ID,starts_at:'x',ends_at:iso(END)}]])assert.equal(pickXpWeekend(bad,now),null);
 forgetXpWeekendCache();
 const calls=[];const db={from(table){calls.push(table);const q={select:()=>q,gt:()=>q,order:()=>q,limit:async()=>({data:[row(ID,START,END)],error:null})};return q;}};
 const realNow=Date.now;Date.now=()=>now;
 try{
  assert.deepEqual(await readXpWeekend(db,now),weekend);await readXpWeekend(db,now+XP_WEEKEND_CACHE_MS-1);assert.deepEqual(calls,['harvest_xp_weekends'],'cached');
  await readXpWeekend(db,now+XP_WEEKEND_CACHE_MS);assert.equal(calls.length,2);
  forgetXpWeekendCache();assert.equal(await readXpWeekend({from(){throw new Error('down');}},now),null,'never fails a load');
  forgetXpWeekendCache();const noTable={from(){const q={select:()=>q,gt:()=>q,order:()=>q,limit:async()=>({data:null,error:{code:'42P01'}})};return q;}};
  assert.equal(await readXpWeekend(noTable,now),null,'before the SQL: none');
 }finally{Date.now=realNow;forgetXpWeekendCache();}
 const api=read('supabase/functions/farm-api/index.ts');
 assert.ok(api.indexOf('const weekendAt=readXpWeekend(admin);')<api.indexOf('const xpWeekend=setXpWeekend(await weekendAt);'));
 assert.ok(api.indexOf('const xpWeekend=setXpWeekend(await weekendAt);')<api.indexOf('for(let attempt=0;attempt<5;attempt++)'),'set before any farm is worked out');
 assert.match(api,/result,revision:row\.revision\+1,serverNow:now,xpWeekend\}/,'an action answer carries it');
 assert.equal(api.match(/serverNow:now,xpWeekend,reloadAfter:await reloadAt\}\)/g)?.length,3,'every load answer of a farmer');
 assert.match(read('public/farm-client.js'),/if\(data&&'xpWeekend' in data\)setXpWeekend\(data\.xpWeekend\);\n  rebase\(\);/,'the game takes it before it works out its taps');
 assert.match(read('public/game.js'),/setXpWeekend\(window\.harvestInitialFarm\.xpWeekend\?\?null\);\nconst state = /);
 for(const copy of ['public/farm-state.js','supabase/functions/farm-api/farm-state.js'])assert.equal(read(copy),read('game/farm-state.js'),copy);
});

test('SQL: the admin only (a Google session), 1 to 72 hours, now or within 14 days, one at a time; farm-api reads with the service role',()=>{
 const sql=read('supabase/xp-weekend.sql');
 assert.doesNotMatch(sql,/[^\x00-\x7f]/,'plain ASCII: a plain copy is safe');
 assert.match(sql,/check \(ends_at>starts_at and ends_at<=starts_at\+interval '72 hours'\)/);
 for(const fn of ['xp_weekend_start','xp_weekend_stop','xp_weekend_list'])assert.match(sql,new RegExp(`function public\\.${fn}\\([^]*?if public\\.chat_staff_role\\(\\(?(select auth\\.uid\\(\\))?\\)?(me)?\\)? is distinct from 'admin' then raise exception 'Not authorized\\.'`),fn);
 assert.match(sql,/hours not between 1 and 72/);assert.match(sql,/now\(\)\+interval '14 days'/);
 assert.match(sql,/update public\.harvest_xp_weekends set stopped_at=now\(\) where stopped_at is null and ends_at>now\(\);\n insert into/,'a new one ends or cancels the one there is');
 assert.match(sql,/revoke all on public\.harvest_xp_weekends from public, anon, authenticated;\ngrant select, insert, update on public\.harvest_xp_weekends to service_role;/);
 assert.match(sql,/revoke all on function public\.%s from public, anon/);
 const chat=read('src/chat-client.js');
 assert.match(chat,/startXpWeekend:\(\{hours=48,startsAt=null\}=\{\}\)=>rpc\('xp_weekend_start',\{p_hours:hours,p_starts_at:startsAt\}\)/);
 assert.match(chat,/xpWeekendList:\(\)=>rpc\('xp_weekend_list'\)/);assert.match(chat,/stopXpWeekend:id=>rpc\('xp_weekend_stop',\{p_id:id\}\)/);
 const admin=read('src/admin-dashboard.js');
 assert.ok(admin.indexOf('id="admin-xp-weekend"')>admin.indexOf('data-admin-panel="money"')&&admin.indexOf('id="admin-xp-weekend"')<admin.indexOf('data-admin-panel="chat"'),'on Money, beside the Sale');
 assert.match(admin,/if\(role==='admin'\)void showXpWeekends\(\);/);
});

test('on screen: the pill names the weekend with its time left, the shop says Included, the gift says after the weekend; no middle dots',()=>{
 const ui=read('public/boosts-ui.js');
 assert.match(ui,/const weekend=xpWeekend\(now\);if\(weekend\)chips\.push\(\{id:'xpweekend',picture:'double-xp',label:XP_WEEKEND_NAME,time:formatDuration\(weekend\.endsAt-now\),left:weekend\.endsAt-now,named:true\}\);/);
 assert.match(ui,/chip\('included',`Included in the \$\{XP_WEEKEND_NAME\}`\)/);assert.match(ui,/Yours: \$\{formatDuration\(status\.waiting\)\} after the weekend/);
 const retention=read('public/retention-ui.js');
 assert.match(retention,/\$\{after\?' after the weekend':''\}/);assert.doesNotMatch(retention,/xpUntil/,'XP shown doubled by xpDoubled: the weekend too');
 assert.doesNotMatch(read('public/next-goal.js'),/xpUntil/);
 assert.match(read('public/wiki-content.js'),/Now and then there is a Double XP weekend: every farmer earns double XP, from level 1\./);
 for(const text of [ui.slice(ui.indexOf('A Double XP weekend (27 Oct 2026)'),ui.indexOf('return card({cls:active')),read('public/wiki-content.js').match(/Now and then there is a Double XP weekend[^<]*/)[0]])assert.doesNotMatch(text,/ · /);
 // Every language has the new texts.
 for(const code of ['cs','de','es','fr','id','hu','nl','pt','tr','ru','uk','hi','ja','ar','zh']){
  const t=JSON.parse(read(`public/i18n/${code}.json`));
  for(const key of ['Double XP weekend','Included in the {0}','Yours: {0} after the weekend','after the weekend'])assert.ok(t[key],`${code}: ${key}`);
 }
});
