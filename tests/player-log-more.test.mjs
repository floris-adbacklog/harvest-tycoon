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
