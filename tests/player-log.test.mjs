import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm} from './legacy-farm.mjs';
import {applyFarmAction,xpForLevel,ITEMS} from '../game/farm-state.js';
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
 for(const type of ['field','fields'])assert.deepEqual(farmLog({type},snapshot(s),s,{}),[],type);   // the tractor, fertilizing and a helping hand have their lines since 30 Oct 2026
 const low=snapshot(s);s.xp=xpForLevel(31);assert.deepEqual(farmLog({type:'quest',id:'x'},low,s,{}).map(r=>r.text),['Claimed a quest · +'+(xpForLevel(31)-low.xp).toLocaleString('en-US')+' XP','Reached level 31']);
 assert.ok(farmLog({type:'sell'},before,s,{}).every(r=>LOG_CATEGORIES.includes(r.category)&&r.text.length<=240));
});

// World II's market square (Oct 2026): helping a villager, "Not now" and a village place built from its golden brief.
test('the market square\'s actions have their own lines: a villager helped or turned away, a place built from a golden brief',()=>{
 const s=farm(110);s.coins=1000000;s.inventory.packedlunch=6;s.buildings.mine.built=false;s.buildings.lumbercamp.built=false;
 for(const k of ['stone','ironore','packedlunch','timber','plank','ironbar','pickaxe','silverore','cheese','goatcheese','wool','cloth','candles','cider'])s.inventory[k]=(s.inventory[k]??0)+500;
 let before=snapshot(s);applyFarmAction(s,{type:'village_build',place:'mine'},now);
 const [built]=farmLog({type:'village_build',place:'mine'},before,s,{});
 assert.equal(built.category,'farm');assert.match(built.text,/^Built the Mine from a golden brief · −75,000 coins · \+250 XP · −6 Packed lunch$/);
 const r=s.village.boards[0].request;before=snapshot(s);
 const got=applyFarmAction(s,{type:'village_deliver',board:0,request:r.id,input:r.input},now);
 const [help]=farmLog({type:'village_deliver',board:0,request:r.id},before,s,got);
 assert.equal(help.category,'market');assert.match(help.text,new RegExp(`^Helped a villager at the market square · \\+${r.coins.toLocaleString('en-US')} coins · \\+${r.xp} XP · `));
 const q=s.village.boards[1].request;before=snapshot(s);applyFarmAction(s,{type:'village_skip',board:1,request:q.id},now);
 assert.deepEqual(farmLog({type:'village_skip',board:1,request:q.id},before,s,{}).map(l=>[l.category,l.text]),[['market','Said “Not now” to a villager']]);
 assert.equal(farmLog({type:'sell',item:'all',category:'village'},before,s,{})[0].text,'Sold all village goods');
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
 // Oct 2026: a comeback chest offered on this load, and opening it.
 assert.deepEqual(loadLog({away:4*86400000,comeback:{days:4,at:1}}).map(r=>[r.category,r.text]),[['account','Opened the game after 4 days'],['rewards','A comeback chest was waiting after 4 days away']]);
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
 const boss=await handlePlayerLog({admin,user:{id:ME,email:'floris@millstone.nl',email_confirmed_at:'2026-01-01',signInMethods:['oauth']},body:{playerId:OTHER,category:'purchase'}});
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
 assert.match(api,/if\(saved\.data\)\{\n    mark\('commit'\);\n    if\(inviteReward\)[^\n]*\n    later\(writeLog\(admin,user\.id,\[\.\.\.dayRows,\.\.\.farmLog\(body\.action,before,state,result\)\]\)\);\n    const answer=reply\(\{state,profile:\{\.\.\.profile,currency:state\.coins,level:levelOf\(state\)\},result/,'only once the save went through');
 assert.match(api,/const logged=loadLog\(\{away:now-\(Date\.parse\(row\.updated_at\)\|\|now\),gift:donations\.length\?fromStaff:null,inviteReward,emailBonus:emailBonusPaid,comeback,from:body\.opened\}\);/,'13 Oct 2026: with the reminder that opened the game');
 assert.equal((api.match(/later\(writeLog\(admin,user\.id,logged\)\);/g)??[]).length,2,'both ways a load can answer');
 assert.match(api,/later\(writeLog\(admin,user\.id,accountLog\('rename',/);assert.match(api,/later\(writeLog\(admin,user\.id,accountLog\('avatar','Picked a new face'\)\)\)/);
 assert.match(api,/later\(writeLog\(admin,user\.id,familyLog\(body\.action,familyBefore,after\?\?null\)\)\)/);
 assert.match(api,/if\(body\.operation==='player_log'\)\{\n   const log=await handlePlayerLog\(\{admin,user,body\}\);return reply\(log\.data,log\.status\);/);
});

test('the profile shows the log for yourself and for the staff, per day, filtered by category',()=>{
 const html=renderLogEntries([{id:3,at:new Date(now-60000).toISOString(),category:'market',text:'Sold <b>Corn</b>',by:null},{id:2,at:new Date(now-2*3600000).toISOString(),category:'staff',text:'Received a gift from the admin',by:'Floris'},{id:1,at:new Date(now-30*3600000).toISOString(),category:'farm',text:'Reached level 3',by:null}],now);
 assert.equal((html.match(/<h4 class="farmer-log-day">/g)??[]).length,2,'today and yesterday');assert.match(html,/>Today</);assert.match(html,/>Yesterday</);
 assert.match(html,/Sold &lt;b&gt;Corn&lt;\/b&gt;/,'the text is escaped');assert.match(html,/ · Staff <span translate="no">\u2002by Floris<\/span></,'the staff member\'s name as typed (17 Oct 2026), the dot a wide space as the page makes it');assert.match(html,/data-log-category="market"/);
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
 assert.deepEqual(eventRewardLog('Harvest rush',{coins:200,diamonds:1}).map(r=>[r.category,r.action,r.text]),[['rewards','event_reward','Collected the reward of the event “Harvest rush” · +200 coins · +1 diamond']]);
 assert.equal(eventRewardLog(null,{coins:1,diamonds:0})[0].text,'Collected the reward of the event · +1 coin');
 const events=read('supabase/functions/farm-api/event-service.js');
 assert.match(events,/if\(r\.data\?\.coins\|\|r\.data\?\.diamonds\)globalThis\.EdgeRuntime\?\.waitUntil\?\.\(logEventReward\(admin,user\.id,body\.eventId,r\.data\)\);\n   return respond\(\{reward:r\.data\}\);/,'only a reward that paid, after the reply');
});

// World II, levels 110-200 (Oct 2026): the market crate, builder's crates, the town boat and the landmarks.
test('the market crate, builder’s crates, the town boat and the landmarks have their own lines',()=>{
 // The 15th villager of the week (from level 116) opens the market crate in the same Help.
 const s=farm(116);for(const k of Object.keys(s.inventory))s.inventory[k]=100000;
 let t=now,crate=null;
 for(let i=0;i<10&&!crate;i++){
  applyFarmAction(s,{type:'first_look'},t);
  for(const [board,b] of s.village.boards.entries()){
   if(!b.request||crate)continue;const before=snapshot(s),got=applyFarmAction(s,{type:'village_deliver',board,request:b.request.id,input:b.request.input},t);
   const [line]=farmLog({type:'village_deliver',board,request:b.request.id},before,s,got);
   if(got.crate){crate=line;break;}
   assert.match(line.text,/^Helped a villager at the market square · /);
  }
  t+=3*3600000;
 }
 assert.equal(crate.category,'market');assert.match(crate.text,/^Helped a villager at the market square and opened the market crate · \+[\d,]+ coins · \+10 diamonds · \+[\d,]+ XP · /);
 // An upgrade with builder's crates names them; the coins line is the coins paid.
 const u=farm(128);u.buildings.dairy.level=6;Object.assign(u.inventory,{milk:24,builderscrate:30});u.boosts.upgradeCredits=0;u.coins=10000000;
 let before=snapshot(u),got=applyFarmAction(u,{type:'upgrade',building:'dairy',crates:2},now);
 assert.equal(farmLog({type:'upgrade',building:'dairy',crates:2},before,u,got)[0].text,'Upgraded the Dairy Barn to level 7 with 2 builder’s crates · −22,973 coins · +15 XP · −24 Milk · −2 Builder’s crate');
 u.inventory.milk=60;u.boosts.upgradeCredits=1;before=snapshot(u);got=applyFarmAction(u,{type:'upgrade',building:'dairy',crates:1},now);
 assert.match(farmLog({type:'upgrade',building:'dairy',crates:1},before,u,got)[0].text,/^Upgraded the Dairy Barn to level 8 with 1 builder’s crate · −[\d,]+ coins · \+15 XP · /);
 before=snapshot(u);got=applyFarmAction(u,{type:'upgrade',building:'dairy'},now);
 assert.match(farmLog({type:'upgrade',building:'dairy'},before,u,got)[0].text,/^Upgraded the Dairy Barn to level 9 · −[\d,]+ coins · \+15 XP/,'without crates the live line');
 // The town boat and the landmarks (their rules come with the boat and the landmarks): the lines read the action and its result.
 const b=farm(150),after=structuredClone(b);after.inventory.linen-=10;
 assert.deepEqual(farmLog({type:'boat_load',cargo:1,item:'linen'},snapshot(b),after,{loaded:{linen:10},units:10,sailed:false}).map(l=>[l.category,l.text]),[['market','Loaded the town boat · −10 Linen']]);
 const sailed=structuredClone(b);sailed.coins+=87700;sailed.diamonds+=3;
 assert.equal(farmLog({type:'boat_load',cargo:1},snapshot(b),sailed,{sailed:true})[0].text,'Sent the town boat off · +87,700 coins · +3 diamonds');
 assert.equal(farmLog({type:'boat_skip',cargo:1},snapshot(b),b,{readyAt:now})[0].text,'Turned down a town boat cargo');
 const gave=structuredClone(b);gave.inventory.rooftile-=250;
 assert.deepEqual(farmLog({type:'landmark_give',landmark:'windpump',item:'rooftile'},snapshot(b),gave,{}).map(l=>[l.category,l.action,l.text]),[['farm','landmark_give','Handed in goods for the Wind pump · −250 Roof tile']]);
 assert.equal(farmLog({type:'landmark_finish',landmark:'greathall'},snapshot(b),b,{})[0].text,'Finished the Great Hall in the village');
 assert.equal(farmLog({type:'landmark_give',landmark:'__proto__'},snapshot(b),b,{})[0].text,'Handed in goods for the landmark');
});

// The same lines from real actions (Oct 2026): a part load, the boat sailing with what it paid, a cargo turned down, goods handed in to a
// landmark and the Great Hall finished with its diamonds.
test('the town boat and the landmarks log what the actions really gave or took',()=>{
 const s=farm(200);s.coins=50000000;for(const k of Object.keys(s.inventory))s.inventory[k]=0;applyFarmAction(s,{type:'first_look'},now);
 const c=s.village.boat.cargo,[first]=Object.keys(c.input),input=c.input;s.inventory[first]=1;
 let before=snapshot(s),got=applyFarmAction(s,{type:'boat_load',cargo:c.id,input,item:first},now);
 assert.deepEqual(farmLog({type:'boat_load',cargo:c.id,item:first},before,s,got).map(l=>[l.category,l.text]),[['market',`Loaded the town boat · −1 ${ITEMS[first].name}`]]);
 Object.assign(s.inventory,input);before=snapshot(s);got=applyFarmAction(s,{type:'boat_load',cargo:c.id,input},now);
 assert.ok(got.sailed);
 assert.match(farmLog({type:'boat_load',cargo:c.id},before,s,got)[0].text,new RegExp(`^Sent the town boat off · \\+${c.coins.toLocaleString('en-US')} coins · \\+3 diamonds · \\+${c.xp.toLocaleString('en-US')} XP · `));
 const t=now+12*3600000;applyFarmAction(s,{type:'first_look'},t);const next=s.village.boat.cargo;before=snapshot(s);got=applyFarmAction(s,{type:'boat_skip',cargo:next.id,input:next.input},t);
 assert.deepEqual(farmLog({type:'boat_skip',cargo:next.id},before,s,got).map(l=>[l.category,l.text]),[['market','Turned down a town boat cargo']]);
 // The landmarks: the first four finished in the save, the Great Hall's goods handed in, then finished.
 s.village.landmarks={done:['windpump','longhouse','stonequay','lookout'],given:{}};Object.assign(s.inventory,{rooftile:100,linen:100,lavendersoap:100,scentedsachet:100,saffronbun:100});
 applyFarmAction(s,{type:'first_look'},t);before=snapshot(s);got=applyFarmAction(s,{type:'landmark_give',landmark:'greathall',item:'rooftile'},t);
 assert.deepEqual(farmLog({type:'landmark_give',landmark:'greathall',item:'rooftile'},before,s,got).map(l=>[l.category,l.text]),[['farm','Handed in goods for the Great Hall · −100 Roof tile']]);
 applyFarmAction(s,{type:'landmark_give',landmark:'greathall'},t);before=snapshot(s);got=applyFarmAction(s,{type:'landmark_finish',landmark:'greathall'},t);
 assert.match(farmLog({type:'landmark_finish',landmark:'greathall'},before,s,got)[0].text,/^Finished the Great Hall in the village · −3,000,000 coins · \+500 diamonds · \+5,000 XP/);
});
