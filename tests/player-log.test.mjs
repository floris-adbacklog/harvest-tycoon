import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm} from './legacy-farm.mjs';
import {applyFarmAction,xpForLevel} from '../game/farm-state.js';
import {LOG_CATEGORIES,LOG_PAGE,snapshot,changes,farmLog,familyLog,loadLog,accountLog,adminGrantLog,writeLog,handlePlayerLog} from '../supabase/functions/farm-api/player-log.js';
import {renderLogEntries,LOG_LABELS} from '../src/player-profiles.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,26,12);
function farm(level=30){const s=createLegacyFarm(now);s.xp=xpForLevel(level);s.coins=100000;for(const b of Object.values(s.buildings))b.built=true;return s;}
const ME='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222';

test('a farm action becomes one readable line with what it gave or cost; field taps are not logged',()=>{
 const s=farm();s.inventory.corn=10;const before=snapshot(s);
 const result=applyFarmAction(s,{type:'sell',item:'corn',quantity:10},now);
 const [row]=farmLog({type:'sell',item:'corn'},before,s,result);
 assert.equal(row.category,'market');assert.equal(row.action,'sell');assert.match(row.text,/^Sold Corn · \+[\d,]+ coins · −10 Corn$/);
 const up=snapshot(s);applyFarmAction(s,{type:'upgrade',building:'mill'},now);
 assert.match(farmLog({type:'upgrade',building:'mill'},up,s,{})[0].text,/^Upgraded the Feed Mill to level \d+ · −[\d,]+ coins · \+15 XP$/);
 assert.deepEqual(farmLog({type:'field',id:0,action:'water'},snapshot(s),s,{}),[],'watering is not logged');
 for(const type of ['field','fields','tractor','fertilize','activity_start'])assert.deepEqual(farmLog({type},snapshot(s),s,{}),[],type);
 const low=snapshot(s);s.xp=xpForLevel(31);assert.deepEqual(farmLog({type:'quest',id:'x'},low,s,{}).map(r=>r.text),['Claimed a quest · +'+(xpForLevel(31)-low.xp).toLocaleString('en-US')+' XP','Reached level 31']);
 assert.ok(farmLog({type:'sell'},before,s,{}).every(r=>LOG_CATEGORIES.includes(r.category)&&r.text.length<=240));
});

test('the changes line: coins and diamonds both ways, XP gained, the three biggest item changes and how many more',()=>{
 const before={coins:100,diamonds:10,xp:0,inventory:{corn:10,wheat:10,milk:0,eggs:0,feed:5}};
 const after={coins:40,diamonds:12,xp:30,inventory:{corn:0,wheat:4,milk:8,eggs:1,feed:3}};
 assert.equal(changes(before,after),'−60 coins · +2 diamonds · +30 XP · −10 Corn · +8 Milk · −6 Wheat · 2 more');
 assert.equal(changes(before,before),'');
});

test('opening the game, gifts, names, faces and family actions have their own lines',()=>{
 assert.deepEqual(loadLog({away:10*60000}),[]);
 assert.deepEqual(loadLog({away:5*3600000+60000}).map(r=>[r.category,r.text]),[['account','Opened the game after 5 hours']]);
 assert.deepEqual(loadLog({away:3*86400000}).map(r=>r.text),['Opened the game after 3 days']);
 assert.deepEqual(loadLog({away:0,gift:{coins:500,diamonds:20}}).map(r=>[r.category,r.text]),[['staff','Received a gift from the staff · +500 coins · +20 diamonds']]);
 assert.equal(loadLog({away:0,emailBonus:true})[0].category,'rewards');assert.equal(loadLog({away:0,inviteReward:{diamonds:150}})[0].category,'social');
 assert.deepEqual(accountLog('rename','Changed the farmer name to Sunny'),[{category:'account',action:'rename',text:'Changed the farmer name to Sunny'}]);
 assert.equal(adminGrantLog({coins:1000,xp:0,diamonds:5,item:'corn',itemCount:3})[0].text,'Received a gift from the admin · +1,000 coins · +5 diamonds · +3 Corn');
 const s=farm();assert.deepEqual(familyLog({type:'family_join'},snapshot(s),null).map(r=>[r.category,r.text]),[['social','Joined a family']]);
 assert.deepEqual(familyLog({type:'family_read'},snapshot(s),s),[],'reading the family chat is not logged');
});

// A small stand-in for the Supabase client: records each query and answers with the rows given.
function fakeAdmin({staff=[],logs=[],names=[],failInsert=false}={}){
 const queries=[];
 const from=table=>{const q={table,calls:[]};queries.push(q);const chain={};
  for(const m of ['select','eq','neq','lt','order','limit','in'])chain[m]=(...args)=>{q.calls.push([m,...args]);return chain;};
  chain.insert=rows=>{q.calls.push(['insert',rows]);if(failInsert)throw new TypeError('offline');return Promise.resolve({error:null});};
  chain.then=(resolve,reject)=>Promise.resolve({data:table==='staff_roles'?staff:table==='player_stats'?names:logs,error:null}).then(resolve,reject);
  return chain;};
 return {from,queries};
}

test('your own log for you, anyone\'s for the staff; purchases only for yourself and the admin',async()=>{
 const logs=Array.from({length:LOG_PAGE+1},(_,i)=>({id:500-i,created_at:new Date(now-i*60000).toISOString(),category:'farm',text:`line ${i}`,by_player:i===0?OTHER:null}));
 let admin=fakeAdmin({logs,names:[{player_id:OTHER,username:'Floris'}]});
 const own=await handlePlayerLog({admin,user:{id:ME},body:{}});
 assert.equal(own.status,200);assert.equal(own.data.entries.length,LOG_PAGE);assert.equal(own.data.more,true);assert.equal(own.data.entries[0].by,'Floris');
 assert.ok(own.data.categories.includes('purchase'),'your own purchases');
 assert.ok(!admin.queries[0].calls.some(([m])=>m==='neq'),'nothing is left out of your own log');
 admin=fakeAdmin();assert.equal((await handlePlayerLog({admin,user:{id:ME},body:{playerId:OTHER}})).status,403,'not someone else\'s');
 admin=fakeAdmin({staff:[{player_id:ME}],logs:[]});
 const mod=await handlePlayerLog({admin,user:{id:ME,email:'mod@example.com'},body:{playerId:OTHER,before:400}});
 assert.equal(mod.status,200);assert.ok(!mod.data.categories.includes('purchase'));
 const q=admin.queries.find(x=>x.table==='player_logs').calls;
 assert.deepEqual(q.find(([m])=>m==='neq'),['neq','category','purchase'],'a moderator never gets someone\'s purchases');assert.deepEqual(q.find(([m])=>m==='lt'),['lt','id',400]);
 admin=fakeAdmin({staff:[{player_id:ME}]});
 assert.deepEqual((await handlePlayerLog({admin,user:{id:ME},body:{playerId:OTHER,category:'purchase'}})).data.entries,[]);
 admin=fakeAdmin();
 const boss=await handlePlayerLog({admin,user:{id:ME,email:'floris@millstone.nl',email_confirmed_at:'2026-01-01'},body:{playerId:OTHER,category:'purchase'}});
 assert.equal(boss.status,200);assert.deepEqual(admin.queries.find(x=>x.table==='player_logs').calls.find(([m])=>m==='eq'&&true),['eq','player_id',OTHER]);
 assert.equal((await handlePlayerLog({admin,user:{id:ME},body:{playerId:'not-an-id'}})).status,400);
});

test('writing the log never stands in the way: no lines, no call; a failing insert is swallowed',async()=>{
 let admin=fakeAdmin();await writeLog(admin,ME,[]);assert.equal(admin.queries.length,0);
 admin=fakeAdmin();await writeLog(admin,ME,accountLog('avatar','Picked a new face'),OTHER);
 assert.deepEqual(admin.queries[0].calls[0],['insert',[{player_id:ME,category:'account',action:'avatar',text:'Picked a new face',by_player:OTHER}]]);
 admin=fakeAdmin({failInsert:true});await assert.doesNotReject(writeLog(admin,ME,accountLog('avatar','x')));
});

test('farm-api writes the lines after the reply, for actions, opening the game, names, faces, family and admin gifts',()=>{
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/const later=\(work:Promise<unknown>\)=>\(globalThis as unknown as \{EdgeRuntime\?:\{waitUntil\?:\(p:Promise<unknown>\)=>void\}\}\)\.EdgeRuntime\?\.waitUntil\?\.\(work\);/);
 assert.match(api,/const before=snapshot\(state\);\n   let result;try\{result=applyFarmAction/);
 assert.match(api,/later\(writeLog\(admin,user\.id,farmLog\(body\.action,before,state,result\)\)\);\n    return reply\(\{state,profile:\{\.\.\.profile,currency:state\.coins,level:levelOf\(state\)\},result/,'only once the save went through');
 assert.match(api,/const logged=loadLog\(\{away:now-\(Date\.parse\(row\.updated_at\)\|\|now\),gift:donations\.length\?fromStaff:null,inviteReward,emailBonus:emailBonusPaid\}\);/);
 assert.equal((api.match(/later\(writeLog\(admin,user\.id,logged\)\);/g)??[]).length,2,'both ways a load can answer');
 assert.match(api,/later\(writeLog\(admin,user\.id,accountLog\('rename',/);assert.match(api,/later\(writeLog\(admin,user\.id,accountLog\('avatar','Picked a new face'\)\)\)/);
 assert.match(api,/later\(writeLog\(admin,user\.id,familyLog\(body\.action,familyBefore,after\?\?null\)\)\)/);
 assert.match(api,/if\(body\.operation==='player_log'\)\{\n   const log=await handlePlayerLog\(\{admin,user,body\}\);return reply\(log\.data,log\.status\);/);
});

test('the profile shows the log for yourself and for the staff, per day, filtered by category',()=>{
 const html=renderLogEntries([{id:3,at:new Date(now-60000).toISOString(),category:'market',text:'Sold <b>Corn</b>',by:null},{id:2,at:new Date(now-2*3600000).toISOString(),category:'staff',text:'Received a gift from the admin',by:'Floris'},{id:1,at:new Date(now-30*3600000).toISOString(),category:'farm',text:'Reached level 3',by:null}],now);
 assert.equal((html.match(/<h4 class="farmer-log-day">/g)??[]).length,2,'today and yesterday');assert.match(html,/>Today</);assert.match(html,/>Yesterday</);
 assert.match(html,/Sold &lt;b&gt;Corn&lt;\/b&gt;/,'the text is escaped');assert.match(html,/ · Staff · by Floris</);assert.match(html,/data-log-category="market"/);
 assert.equal(renderLogEntries([],now),'');assert.equal(LOG_LABELS.purchase,'Purchases');
 const ui=read('src/player-profiles.js');
 assert.match(ui,/const allowed=playerId===bridge\.playerId\|\|Boolean\(window\.harvestStaff\?\.role\?\.\(\)\);/);
 assert.match(ui,/bridge\.request\(\{operation:'player_log',playerId:player,category:log\.category==='all'\?null:log\.category,before:older\?log\.entries\.at\(-1\)\?\.id:null\}\)/);
 assert.match(read('public/player-profiles.css'),/\.farmer-log-filters button\[aria-pressed="true"\]\{/);
});

test('the table: only farm-api can read it, purchases log themselves, and lines older than 90 days go every night',()=>{
 const sql=read('supabase/player-logs.sql');
 assert.match(sql,/create table if not exists public\.player_logs\(/);assert.match(sql,/on delete cascade/,'a deleted account takes its log along');
 assert.match(sql,/alter table public\.player_logs enable row level security;\nrevoke all on table public\.player_logs from anon, authenticated;/);
 assert.match(sql,/category in \('account','farm','production','market','rewards','diamonds','social','staff','purchase'\)/);
 assert.deepEqual(LOG_CATEGORIES,['account','farm','production','market','rewards','diamonds','social','staff','purchase']);
 assert.match(sql,/create trigger harvest_purchase_log after update of status on public\.harvest_purchases/);assert.match(sql,/exception when others then return new;/);
 assert.match(sql,/cron\.schedule\('harvest-player-log-cleanup','23 3 \* \* \*',\$c\$delete from public\.player_logs where created_at<now\(\)-interval '90 days'\$c\$\)/);
});

test('the Farm log has its own icon, a small WebP like the others',()=>{
 const icons=read('public/visual-icons.js');assert.match(icons,/pictures\.log='log';/);assert.match(icons,/,'log'\]\);/);
 assert.ok(readFileSync(new URL('../public/assets/icons/log.webp',import.meta.url)).length<40000);
 assert.equal(readFileSync(new URL('../public/assets/icons/log.png',import.meta.url)).subarray(1,4).toString(),'PNG');
 assert.match(read('src/player-profiles.js'),/logBox\.querySelector\('\.farmer-log-icon'\)\.innerHTML=art\('log'\);/);
});

test('a collected farm event reward is in the log with the event\'s name, one coin and one diamond read naturally',async()=>{
 const {eventRewardLog}=await import('../supabase/functions/farm-api/player-log.js');
 assert.deepEqual(eventRewardLog('Harvest rush',{coins:200,diamonds:1}).map(r=>[r.category,r.action,r.text]),[['rewards','event_reward','Collected the reward of the farm event “Harvest rush” · +200 coins · +1 diamond']]);
 assert.equal(eventRewardLog(null,{coins:1,diamonds:0})[0].text,'Collected the reward of the farm event · +1 coin');
 const events=read('supabase/functions/farm-api/event-service.js');
 assert.match(events,/if\(r\.data\?\.coins\|\|r\.data\?\.diamonds\)globalThis\.EdgeRuntime\?\.waitUntil\?\.\(logEventReward\(admin,user\.id,body\.eventId,r\.data\)\);\n   return respond\(\{reward:r\.data\}\);/,'only a reward that paid, after the reply');
});
