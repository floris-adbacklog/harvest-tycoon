import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchLeaderboard} from '../src/leaderboard.js';
test('leaderboard asks for ten ranked stats and computes own rank outside the list',async()=>{
 const calls=[];let i=0;const responses=[{data:[{player_id:'other',username:'Other',currency:500,level:3}],error:null},{data:{player_id:'self',username:'Farmer',currency:100,level:2},error:null},{count:21,error:null},{count:2,error:null}];
 const client={from(table){const n=i++,query={};calls.push({table,steps:[]});for(const name of ['select','order','limit','eq','maybeSingle','gt','lt'])query[name]=(...args)=>{calls[n].steps.push([name,...args]);return query;};query.then=resolve=>Promise.resolve(responses[n]).then(resolve);return query;}};
 const result=await fetchLeaderboard(client,'self');assert.equal(result.rank,24);assert.equal(result.own.player_id,'self');assert(calls[0].steps.some(x=>x[0]==='limit'&&x[1]===100));assert(calls[0].steps.some(x=>x[0]==='order'&&x[1]==='level'&&x[2].ascending===false));assert(calls.every(x=>x.table==='player_stats'));
});

import {LEADERBOARD_CATEGORIES,rankedRows,scoreOf} from '../src/leaderboard.js';
import {CROPS,ITEMS} from '../public/farm-state.js';
test('every crop has its own board; only public metrics can be selected',async()=>{
 for(const crop of Object.keys(CROPS))assert(LEADERBOARD_CATEGORIES['harvested_'+crop],crop);
 const goods=Object.keys(ITEMS).filter(k=>!CROPS[k]&&!ITEMS[k].heirloom);   // heirlooms (Seed Lab) have no boards
 assert.equal(Object.keys(LEADERBOARD_CATEGORIES).length,15+Object.keys(CROPS).length+goods.length,'fifteen boards plus one per crop and one per good');
 // World II's goods are under Village, the farm's under By good (30 Sep 2026).
 for(const good of goods)assert.equal(LEADERBOARD_CATEGORIES['made_'+good]?.group,ITEMS[good].world===2?'village':'goods',good);
 for(const key of ['events_finished','best_streak','farm_fields','chores_done','helping_rounds','estate_projects','building_upgrades','quests_done'])assert(LEADERBOARD_CATEGORIES[key],`${key} board`);
 for(const category of ['diamonds','harvested_grain','state','__proto__'])await assert.rejects(fetchLeaderboard({from(){throw new Error('Should not query');}},'self',category),/valid leaderboard/);
 for(const category of Object.keys(LEADERBOARD_CATEGORIES)){
  const calls=[];let i=0,good=LEADERBOARD_CATEGORIES[category].good,column=good?`goods_made->${good}`:category;
  const row={player_id:'self',username:'Farmer',level:3,...(good?{goods_made:{[good]:7}}:{[category]:7})};
  const responses=[{data:[row],error:null},{count:2,error:null}];
  const client={from(){const n=i++,q={};for(const name of ['select','order','limit','eq','maybeSingle','gt','lt'])q[name]=(...args)=>{calls.push([name,...args]);return q;};q.then=resolve=>Promise.resolve(responses[n]).then(resolve);return q;}};
  const result=await fetchLeaderboard(client,'self',category);assert.equal(result.category,category);assert.equal(result.rank,1);
  assert(calls.some(c=>c[0]==='order'&&c[1]===column&&c[2].nullsFirst===false),'a good\'s board orders by its key in goods_made, farmers without any last');assert(calls.some(c=>c[0]==='limit'&&c[1]===100));
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
 assert.match(readFileSync(new URL('../src/leaderboard.js',import.meta.url),'utf8'),/fields=\[\.\.\.BOARD_FIELDS,\.\.\.\(config\.good\?\['goods_made'\]:BOARD_FIELDS\.includes\(category\)\?\[\]:\[category\]\)\]/,'the board reads its own column');
});

test('Most quests done: the distinct quests in the farm\'s claimed list, read on every save; the profile tile opens it',async()=>{
 const {readFileSync}=await import('node:fs');const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
 assert.deepEqual(LEADERBOARD_CATEGORIES.quests_done,{label:'Most quests done',heading:'Quests',unit:'quests done',description:'Quests finished and claimed, out of 300.'});
 const sql=read('supabase/leaderboard-quests.sql');
 assert.match(sql,/add column if not exists quests_done integer not null default 0;\ngrant select \(quests_done\) on public\.player_stats to authenticated;/);
 assert.match(sql,/select count\(distinct q\.value\) into new\.quests_done from jsonb_array_elements\(farm->'claimed'\) q where q\.value#>>'\{\}' ~ whole;/);
 assert.match(readFileSync(new URL('../src/leaderboard.js',import.meta.url),'utf8'),/fields=\[\.\.\.BOARD_FIELDS,\.\.\.\(config\.good\?\['goods_made'\]:BOARD_FIELDS\.includes\(category\)\?\[\]:\[category\]\)\]/,'the board reads its own column');
 assert.match(read('supabase/functions/farm-api/player-profile-service.js'),/'estate_projects','quests_done','currency'\]/,'the profile reads the same column');
});

// 3 Oct 2026: the admins are on no board, the moderators are; an admin looking at a board has no "Your rank".
test('the admins are left off every board, from the database\'s staff list, asked once',async()=>{
 const ADMIN='e8e4c7c3-c06f-408c-9fe6-1cfa7d2b3ae8',MOD='0b9d6a7e-1111-4222-8333-944455556666';
 const make=responses=>{const calls=[],rpcs=[];let i=0;
  const client={rpc(name){rpcs.push(name);return Promise.resolve({data:[{player_id:ADMIN,role:'admin'},{player_id:MOD,role:'moderator'}],error:null});},
   from(table){const n=i++,query={};calls.push({table,steps:[]});for(const name of ['select','order','limit','eq','maybeSingle','gt','lt','not'])query[name]=(...args)=>{calls[n].steps.push([name,...args]);return query;};query.then=resolve=>Promise.resolve(responses[n]).then(resolve);return query;}};
  return {client,calls,rpcs};};
 const farmer=make([{data:[{player_id:'other',username:'Other',level:3}],error:null},{data:{player_id:'self',username:'Farmer',level:2},error:null},{count:21,error:null},{count:2,error:null}]);
 const result=await fetchLeaderboard(farmer.client,'self');assert.equal(result.rank,24);
 const hidden=['not','player_id','in',`(${ADMIN})`];
 assert.deepEqual(farmer.calls[0].steps.find(x=>x[0]==='not'),hidden,'the top 100 without the admins, moderators stay');
 assert.deepEqual(farmer.calls[2].steps.find(x=>x[0]==='not'),hidden,'nor do they count above you');assert.deepEqual(farmer.calls[3].steps.find(x=>x[0]==='not'),hidden);
 await fetchLeaderboard(farmer.client,'self','currency').catch(()=>{});assert.deepEqual(farmer.rpcs,['chat_staff_list'],'asked once per session');
 const admin=make([{data:[{player_id:'other',username:'Other',level:3}],error:null}]);
 const seen=await fetchLeaderboard(admin.client,ADMIN);assert.equal(seen.own,null);assert.equal(seen.rank,null);assert.equal(admin.calls.length,1,'no own row or rank is looked up for an admin');
 const broken={rpc:()=>Promise.resolve({data:null,error:new Error('down')}),from(){const q={};for(const name of ['select','order','limit','eq','maybeSingle','gt','lt'])q[name]=()=>q;q.then=resolve=>Promise.resolve({data:[],error:null}).then(resolve);return q;}};
 assert.deepEqual((await fetchLeaderboard(broken,null)).rows,[],'without the list the board still opens');
});

// 6 Oct 2026: how many farmers the valley has and how many are online, one line above the top 100.
test('the board shows how many farmers there are and how many of them are online',async()=>{
 const {renderLeaderboard}=await import('../src/leaderboard.js');
 const ADMIN='e8e4c7c3-c06f-408c-9fe6-1cfa7d2b3ae8',calls=[];let failing=false;
 const client={rpc:()=>Promise.resolve({data:[{player_id:ADMIN,role:'admin'}],error:null}),
  from(){const steps=[],q={};calls.push(steps);for(const name of ['select','order','limit','eq','maybeSingle','gt','lt','not'])q[name]=(...args)=>{steps.push([name,...args]);return q;};
   q.then=resolve=>{const head=steps.some(s=>s[0]==='select'&&s[2]?.head),online=steps.some(s=>s[0]==='gt'&&s[1]==='last_active_at');
    return Promise.resolve(head?(failing?{count:null,error:new Error('down')}:{count:online?44:4253,error:null}):{data:[{player_id:'other',username:'Other',level:3}],error:null}).then(resolve);};return q;}};
 const now=Date.UTC(2026,9,6,12),heads=()=>calls.filter(s=>s.some(x=>x[0]==='select'&&x[2]?.head));
 const result=await fetchLeaderboard(client,null,'level',{counts:true,now});
 assert.deepEqual(result.players,{total:4253,online:44});
 assert.equal(heads().length,2,'two counts');
 assert.equal(heads().flat().find(x=>x[0]==='gt')[2],new Date(now-30*60000).toISOString(),'online: a farm action in the last 30 minutes, by the server clock');
 assert(heads().every(s=>s.some(x=>x[0]==='not'&&x[3]===`(${ADMIN})`)),'the admins are not counted');
 await fetchLeaderboard(client,null,'currency',{counts:true,now:now+5000});assert.equal(heads().length,2,'another board within 25 seconds asks nothing new');
 failing=true;assert.equal((await fetchLeaderboard(client,null,'level',{counts:true,now:now+30000})).players,null,'a failed count: no line');
 assert.equal((await fetchLeaderboard(client,null,'level')).players,null,'only the game\'s board asks for the counts');
 // The line comes first: under the filters, above the top 100 (and above an empty board).
 const element=tag=>{const el={tag,children:[],className:'',innerHTML:'',dataset:{},classList:{add(){},toggle(){}},setAttribute(){},querySelectorAll:()=>[],
  append(...items){el.children.push(...items);},replaceChildren(...items){el.children=[...items];},get text(){return el.children.map(c=>typeof c==='string'?c:c.text??'').join('');}};return el;};
 const previous=globalThis.document;globalThis.document={createElement:element};
 try{
  const box=element('div');renderLeaderboard(box,{rows:[],players:{total:4253,online:44}},null);
  const [players,online]=box.children[0].children;
  assert.equal(box.children[0].className,'leaderboard-players');assert.equal(players.text,'4\u202f253 players');assert.equal(online.text,'44 online','the sign-in page\'s words, translated already');
  assert.equal(players.children[0].className,'online-dot','a grey dot before the players');assert.equal(online.children[0].className,'online-dot is-online','the green dot before the online');
  assert.equal(box.children[1].className,'quest-empty leaderboard-empty');
  renderLeaderboard(box,{rows:[],players:null},null);assert.equal(box.children[0].className,'quest-empty leaderboard-empty','no counts, no line');
 }finally{globalThis.document=previous;}
});
