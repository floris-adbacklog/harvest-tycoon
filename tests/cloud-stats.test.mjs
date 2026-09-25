import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchLeaderboard} from '../src/leaderboard.js';
test('leaderboard asks for ten ranked stats and computes own rank outside the list',async()=>{
 const calls=[];let i=0;const responses=[{data:[{player_id:'other',username:'Other',currency:500,level:3}],error:null},{data:{player_id:'self',username:'Farmer',currency:100,level:2},error:null},{count:21,error:null},{count:2,error:null}];
 const client={from(table){const n=i++,query={};calls.push({table,steps:[]});for(const name of ['select','order','limit','eq','maybeSingle','gt','lt'])query[name]=(...args)=>{calls[n].steps.push([name,...args]);return query;};query.then=resolve=>Promise.resolve(responses[n]).then(resolve);return query;}};
 const result=await fetchLeaderboard(client,'self');assert.equal(result.rank,24);assert.equal(result.own.player_id,'self');assert(calls[0].steps.some(x=>x[0]==='limit'&&x[1]===10));assert(calls[0].steps.some(x=>x[0]==='order'&&x[1]==='level'&&x[2].ascending===false));assert(calls.every(x=>x.table==='player_stats'));
});

import {LEADERBOARD_CATEGORIES,rankedRows,scoreOf} from '../src/leaderboard.js';
import {CROPS,ITEMS} from '../public/farm-state.js';
test('every crop has its own board; only public metrics can be selected',async()=>{
 for(const crop of Object.keys(CROPS))assert(LEADERBOARD_CATEGORIES['harvested_'+crop],crop);
 const goods=Object.keys(ITEMS).filter(k=>!CROPS[k]);
 assert.equal(Object.keys(LEADERBOARD_CATEGORIES).length,15+Object.keys(CROPS).length+goods.length,'fifteen boards plus one per crop and one per good');
 for(const good of goods)assert.equal(LEADERBOARD_CATEGORIES['made_'+good]?.group,'goods',good);
 for(const key of ['events_finished','best_streak','farm_fields','chores_done','helping_rounds','estate_projects','building_upgrades','quests_done'])assert(LEADERBOARD_CATEGORIES[key],`${key} board`);
 for(const category of ['diamonds','harvested_grain','state','__proto__'])await assert.rejects(fetchLeaderboard({from(){throw new Error('Should not query');}},'self',category),/valid leaderboard/);
 for(const category of Object.keys(LEADERBOARD_CATEGORIES)){
  const calls=[];let i=0,good=LEADERBOARD_CATEGORIES[category].good,column=good?`goods_made->${good}`:category;
  const row={player_id:'self',username:'Farmer',level:3,...(good?{goods_made:{[good]:7}}:{[category]:7})};
  const responses=[{data:[row],error:null},{count:2,error:null}];
  const client={from(){const n=i++,q={};for(const name of ['select','order','limit','eq','maybeSingle','gt','lt'])q[name]=(...args)=>{calls.push([name,...args]);return q;};q.then=resolve=>Promise.resolve(responses[n]).then(resolve);return q;}};
  const result=await fetchLeaderboard(client,'self',category);assert.equal(result.category,category);assert.equal(result.rank,1);
  assert(calls.some(c=>c[0]==='order'&&c[1]===column&&c[2].nullsFirst===false),'a good\'s board orders by its key in goods_made, farmers without any last');assert(calls.some(c=>c[0]==='limit'&&c[1]===10));
  assert.equal(scoreOf(row,category),7);if(good)assert(calls.some(c=>c[0]==='select'&&c[1].endsWith(',goods_made')));else assert(!calls.some(c=>c[0]==='select'&&c[1].includes('goods_made')),'other boards never ask for goods_made');
  assert(calls.filter(c=>c[0]==='select').every(c=>!c[1].includes('diamonds')&&!c[1].includes('*')));
 }
});
test('tied scores receive distinct ordinal places in the stable server order',()=>{
 const rows=[{badges:4,harvested_wheat:50},{badges:4,harvested_wheat:20},{badges:1,harvested_wheat:20}];
 assert.deepEqual(rankedRows(rows,'badges').map(r=>r.rank),[1,2,3]);
 assert.deepEqual(rankedRows(rows,'harvested_wheat').map(r=>r.rank),[1,2,3]);
});

test('Most building upgrades: every upgrade counts the same, read from the farm on every save (the Farmhouse and Family Hall not)',async()=>{
 const {readFileSync}=await import('node:fs');
 assert.deepEqual(LEADERBOARD_CATEGORIES.building_upgrades,{label:'Most building upgrades',heading:'Upgrades',unit:'upgrades',description:'Every building upgrade counts the same: level 1 to 2 as much as level 9 to 10.'});
 const sql=readFileSync(new URL('../supabase/leaderboard-building-upgrades.sql',import.meta.url),'utf8');
 assert.match(sql,/add column if not exists building_upgrades integer not null default 0;\ngrant select \(building_upgrades\) on public\.player_stats to authenticated;/);
 assert.match(sql,/select coalesce\(sum\(greatest\(0,\(b\.value->>'level'\)::integer-1\)\),0\) into new\.building_upgrades\n  from jsonb_each\(farm->'buildings'\) b where b\.key not in \('farmhouse','familyhall'\)/);
 assert.match(readFileSync(new URL('../src/leaderboard.js',import.meta.url),'utf8'),/'estate_projects','building_upgrades','quests_done','last_active_at'/,'the board can read its column');
});

test('Most quests done: the distinct quests in the farm\'s claimed list, read on every save; the profile tile opens it',async()=>{
 const {readFileSync}=await import('node:fs');const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
 assert.deepEqual(LEADERBOARD_CATEGORIES.quests_done,{label:'Most quests done',heading:'Quests',unit:'quests done',description:'Quests finished and claimed, out of 300.'});
 const sql=read('supabase/leaderboard-quests.sql');
 assert.match(sql,/add column if not exists quests_done integer not null default 0;\ngrant select \(quests_done\) on public\.player_stats to authenticated;/);
 assert.match(sql,/select count\(distinct q\.value\) into new\.quests_done from jsonb_array_elements\(farm->'claimed'\) q where q\.value#>>'\{\}' ~ whole;/);
 assert.match(read('src/leaderboard.js'),/'building_upgrades','quests_done','last_active_at'/,'the board can read its column');
 assert.match(read('supabase/functions/farm-api/player-profile-service.js'),/'estate_projects','quests_done','currency'\]/,'the profile reads the same column');
});
