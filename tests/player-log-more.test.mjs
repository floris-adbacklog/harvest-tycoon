import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');

// 30 Oct 2026, the owner: more in the log, each day's totals, Settings › My log, and 60 days.
test('the day totals add every action, and a new day writes the last day once, at its noon (UTC)', async ()=>{
 const {tallyDay,dayTotalLine}=await import('../supabase/functions/farm-api/player-log.js');
 const state={},at=h=>Date.parse('2026-10-29T00:00:00Z')+h*3600000;
 assert.deepEqual(tallyDay(state,{coins:100,diamonds:5,xp:0},{coins:60,diamonds:9,xp:30},at(10)),[]);
 assert.deepEqual(tallyDay(state,{coins:60,diamonds:9,xp:30},{coins:200,diamonds:7,xp:40},at(12)),[]);
 assert.deepEqual(state.dayTally,{day:'2026-10-29',coinsIn:140,coinsOut:40,diamondsIn:4,diamondsOut:2,xp:40});
 const rows=tallyDay(state,{coins:200,diamonds:7,xp:40},{coins:190,diamonds:7,xp:40},at(25));
 assert.deepEqual(rows,[{category:'account',action:'day_total',text:'Day total · +140 coins · −40 coins · +4 diamonds · −2 diamonds · +40 XP',at:'2026-10-29T12:00:00.000Z'}]);
 assert.deepEqual(state.dayTally,{day:'2026-10-30',coinsIn:0,coinsOut:10,diamondsIn:0,diamondsOut:0,xp:0});
 assert.equal(dayTotalLine({coinsIn:0,coinsOut:0,diamondsIn:0,diamondsOut:0,xp:0}),null,'a day with nothing has no line');
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/const dayRows=tallyDay\(state,before,snapshot\(state\),now\);/);
 assert.match(api,/later\(writeLog\(admin,user\.id,\[\.\.\.dayRows,\.\.\.farmLog\(body\.action,before,state,result\)\]\)\);/);
});

test('the actions that give or cost something have their line, planting, watering, care and harvesting still do not', async ()=>{
 const {farmLog}=await import('../supabase/functions/farm-api/player-log.js');
 const snap={coins:100,diamonds:0,xp:0,level:5,inventory:{}},state={coins:64,diamonds:0,xp:0,inventory:{},plots:[],buildings:{}};
 assert.equal(farmLog({type:'tractor',mode:'water'},snap,state,{count:8})[0].text,'The tractor watered 8 fields · −36 coins');
 assert.equal(farmLog({type:'tractor',mode:'plant',crop:'wheat'},snap,state,{count:1})[0].text,'The tractor planted wheat on 1 field · −36 coins');
 for(const type of ['layout_buy','layout_purchase','layout_draw','season_claim','season_chest','season_skip','bin_add','bin_take','donkey_cart_buy','neighbour_gift','village_quest','activity_start','fertilize'])
  assert.equal(farmLog({type,item:'bread',count:2,kind:'flowers',neighbour:'rosie',id:0,station:'greenhouse',tier:0},snap,state,{})[0]?.action,type,type);
 for(const type of ['field','fields'])assert.deepEqual(farmLog({type},snap,state,{}),[],type);
});

test('Settings › My log opens your own log at once, under Graphics; the log keeps 60 days', ()=>{
 const html=read('public/farm.html'),nav=read('public/settings-nav.js'),game=read('public/game.js');
 const order=[...html.matchAll(/<section id="([a-z-]+-settings)"/g)].map(m=>m[1]);
 assert.equal(order[order.indexOf('graphics-settings')+1],'log-settings');assert.ok(order.indexOf('log-settings')<order.indexOf('language-settings'));
 assert.match(html,/<section id="log-settings" class="settings-section" aria-labelledby="log-settings-title" data-settings-press="log-settings-open">/);
 assert.match(nav,/press=part\?\.dataset\.settingsPress;if\(press\)\{dialog\.querySelector\(`#\$\{press\}`\)\?\.click\(\);return;\}/);
 assert.match(game,/window\.harvestProfiles\.open\(me,\{back:'Back to Settings',log:true\}\)/);
 assert.match(read('src/player-profiles.js'),/Last 60 days/);
 assert.match(read('supabase/player-logs-60-days.sql'),/interval '60 days'/);
});

// 9 Nov 2026, a farmer's request, the owner: "alle 3".
test('a day total and an action line are saved together: every row names its time', async ()=>{
 const {writeLog}=await import('../supabase/functions/farm-api/player-log.js');
 let inserted;const admin={from:()=>({insert:async rows=>{inserted=rows;return {error:null};}})};
 await writeLog(admin,'p1',[{category:'account',action:'day_total',text:'Day total',at:'2026-11-08T12:00:00.000Z'},{category:'market',action:'sell',text:'Sold'}]);
 assert.equal(inserted[0].created_at,'2026-11-08T12:00:00.000Z');
 assert.match(inserted[1].created_at,/^\d{4}-\d{2}-\d{2}T/);
 assert.deepEqual(Object.keys(inserted[0]).sort(),Object.keys(inserted[1]).sort(),'mixed columns make the database refuse the whole insert');
});

test('the shipping bin gets its line once, on the save that pays it, and counts in that day', async ()=>{
 const {binPaidRows}=await import('../supabase/functions/farm-api/player-log.js');
 const now=Date.parse('2026-11-09T08:00:00Z');
 const state={coins:5000,shipPaid:{day:'2026-11-09',coins:5000,count:120},dayTally:{day:'2026-11-08',coinsIn:7,coinsOut:0,diamondsIn:0,diamondsOut:0,xp:0}};
 const rows=binPaidRows('2026-11-08',state,now);
 assert.deepEqual(rows.map(r=>r.action),['day_total','bin_paid']);
 assert.equal(rows[1].text,'Shipping bin paid for 120 items · +5,000 coins');assert.equal(rows[1].category,'market');
 assert.equal(state.dayTally.day,'2026-11-09');assert.equal(state.dayTally.coinsIn,5000);
 assert.deepEqual(binPaidRows(undefined,state,now),[],'no unpaid bin in the save: already paid');
 assert.deepEqual(binPaidRows('2026-11-09',state,now),[],'today’s bin is not paid yet');
 const api=read('supabase/functions/farm-api/index.ts');
 assert.ok(api.indexOf('const binDay=row.state?.shipBin?.day;')>0&&api.indexOf('const binDay=row.state?.shipBin?.day;')<api.indexOf('normalizeFarm(row.state,now)'),'read before normalizeFarm pays it');
 assert.match(api,/dayRows\.push\(\.\.\.binPaidRows\(binDay,state,now\)\);/);
 assert.match(api,/logged\.push\(\.\.\.binPaidRows\(binDay,state,now\)\);\n\s*const saved=await admin\.rpc\('harvest_commit_farm'/);
});

test('the log has one heading per day with its total first, and a Days tab with only the totals', async ()=>{
 const ui=read('src/player-profiles.js');
 assert.match(ui,/\['all','days',\.\.\.\(data\.categories\?\?\[\]\)\]/);assert.match(ui,/days:'Days'/);
 const {handlePlayerLog}=await import('../supabase/functions/farm-api/player-log.js');
 const calls=[],chain={select:()=>chain,eq:(k,v)=>{calls.push([k,v]);return chain;},neq:()=>chain,order:()=>chain,limit:()=>chain,lt:()=>chain,maybeSingle:async()=>({data:null}),then:r=>r({data:[],error:null})};
 const id='00000000-0000-0000-0000-000000000001';
 await handlePlayerLog({admin:{from:()=>chain},user:{id},body:{category:'days'}});
 assert.ok(calls.some(([k,v])=>k==='action'&&v==='day_total'));assert.ok(!calls.some(([k])=>k==='category'));
});
