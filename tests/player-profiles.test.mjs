import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handlePlayerDirectory,escapePlayerSearch,PLAYER_PUBLIC_FIELDS} from '../supabase/functions/farm-api/player-profile-service.js';
import {renderPlayerProfile,renderPlayerSearch,formatDate} from '../src/player-profiles.js';
const id='11111111-1111-4111-8111-111111111111',self='22222222-2222-4222-8222-222222222222';
const now=Date.UTC(2026,8,20,12);
function database({stats=[{player_id:id,username:'Sunny <script>',level:21,last_active_at:new Date(now-1000).toISOString(),harvested_crops:500,goods_produced:21,items_sold:33,deliveries:9,harvested_wheat:42,diamonds:999,email:'private@example.com',currency:9999}],members=[],families=[],claimed=['wheat:0','wheat:0','berries:3','wheat:4','notcrop:0','wheat:0:extra','wheat:00',null]}={}){
 const calls=[];
 return {calls,from(table){
  const call={table};calls.push(call);let rows={player_stats:stats,family_members:members,families,player_farms:[{player_id:id,claimed}]}[table];
  return {select(value){call.select=value;return this;},eq(key,value){call.eq=[key,value];rows=rows.filter(row=>row[key]===value);return this;},in(key,values){call.in=[key,values];rows=rows.filter(row=>values.includes(row[key]));return this;},is(key,value){call.is=[key,value];rows=rows.filter(row=>row[key]===value);return this;},ilike(key,value){call.ilike=[key,value];return this;},order(){return this;},limit(n){call.limit=n;rows=rows.slice(0,n);return this;},async maybeSingle(){return {data:rows[0]??null};},then(resolve){return Promise.resolve({data:rows}).then(resolve);}};
 }};
}
const request=(admin,body)=>handlePlayerDirectory({admin,body,player:self,now});
test('player profile whitelists public data and mastery without reading the complete farm',async()=>{
 const admin=database();const response=await request(admin,{operation:'player_profile',playerId:id});
 assert.equal(response.status,200);const p=response.data.playerProfile;
 assert.equal(response.data.profile.player_id,self);assert.equal(p.playerId,id);assert.equal(p.online,true);assert.equal(p.family,null);
 assert.equal(p.stats.harvested_crops,500);assert.equal(p.harvests.wheat,42);assert.deepEqual(p.badges,[{crop:'wheat',tier:0},{crop:'berries',tier:3}]);
 const json=JSON.stringify(response);for(const privateValue of ['9999','999','private@example.com','last_active_at','receipts','invite_code'])assert.ok(!json.includes(privateValue));
 assert.equal(admin.calls.find(c=>c.table==='player_farms').select,'claimed:state->mastery->claimed');assert.ok(!PLAYER_PUBLIC_FIELDS.includes('currency'));assert.ok(admin.calls.every(c=>c.select!=='*'));
});
test('profile includes only current, non-deleted family membership',async()=>{
 const admin=database({members:[{player_id:id,family_id:'old',role:'leader',left_at:now-1},{player_id:id,family_id:'current',role:'leader',left_at:null}],families:[{id:'old',name:'Old family',deleted_at:null},{id:'current',name:'Sunny family',emblem:'2',deleted_at:null,invite_code:'secret-code'}]});
 const {data}=await request(admin,{operation:'player_profile',playerId:id});assert.deepEqual(data.playerProfile.family,{name:'Sunny family',emblem:'2',role:'Leader'});assert.ok(!JSON.stringify(data).includes('secret-code'));
 const deleted=database({members:[{player_id:id,family_id:'gone',role:'member',left_at:null}],families:[{id:'gone',name:'Gone',deleted_at:now}]});assert.equal((await request(deleted,{operation:'player_profile',playerId:id})).data.playerProfile.family,null);
});
test('directory online status expires at 30 minutes and rejects future timestamps',async()=>{
 for(const [age,online] of [[0,true],[1799999,true],[1800000,false],[1800001,false],[-1,false]]){
  const admin=database({stats:[{player_id:id,username:'Sunny',level:1,last_active_at:new Date(now-age).toISOString()}]});assert.equal((await request(admin,{operation:'player_profile',playerId:id})).data.playerProfile.online,online);
 }
});
test('search escapes literal wildcard characters, limits responses, and keeps caller identity',async()=>{
 assert.equal(escapePlayerSearch('A_%\\'), 'A\\_\\%\\\\');
 const stats=Array.from({length:30},(_,i)=>({player_id:`p${i}`,username:`Farmer ${i}`,level:1}));const admin=database({stats});const {data}=await request(admin,{operation:'player_search',query:' A_%\\ '});
 assert.equal(data.players.length,20);assert.equal(data.hasMore,true);assert.equal(data.profile.player_id,self);
 assert.equal(admin.calls[0].limit,21);assert.deepEqual(admin.calls[0].ilike,['username','%A\\_\\%\\\\%']);assert.ok(!admin.calls.some(c=>c.table==='player_farms'));assert.equal(admin.calls[1].in[1].length,20);
});
test('invalid queries and IDs never reach the database; missing players return 404',async()=>{
 for(const body of [{operation:'player_search',query:'x'},{operation:'player_search',query:'a'.repeat(21)},{operation:'player_search',query:{}},{operation:'player_profile',playerId:'malformed'},{operation:'other',playerId:id}]){const admin=database();assert.equal((await request(admin,body)).status,400);assert.equal(admin.calls.length,0);}
 const result=await request(database({stats:[]}),{operation:'player_profile',playerId:id});assert.equal(result.status,404);assert.equal(result.data.code,'PLAYER_NOT_FOUND');
});
test('database errors propagate instead of inventing an empty profile',async()=>{
 const admin={from(){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({error:new Error('DB unavailable')})};}};
 await assert.rejects(()=>request(admin,{operation:'player_profile',playerId:id}),/DB unavailable/);
});
test('profile and search render names as text with existing painted artwork',async()=>{
 const {data}=await request(database(),{operation:'player_profile',playerId:id});data.playerProfile.family={name:'<img onerror=alert(1)>',role:'Member',emblem:'2'};
 for(const html of [renderPlayerProfile(data.playerProfile),renderPlayerSearch([data.playerProfile])]){assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img onerror'));assert.ok(html.includes('&lt;'));assert.ok(html.includes('Online'));}
 const html=renderPlayerProfile(data.playerProfile);assert.ok(html.includes('data-art="sunflower"'));assert.ok(html.includes('Bronze'));assert.ok(html.includes('Platinum'));assert.ok(!html.includes('diamonds'));
});
test('profile directory routes after session validation and before any farm mutation',()=>{
 const code=readFileSync(new URL('../supabase/functions/farm-api/index.ts',import.meta.url),'utf8');
 const route=code.indexOf('const directory=await handlePlayerDirectory');assert.ok(route>code.indexOf("admin.rpc('harvest_session_active'"));assert.ok(route<code.indexOf("admin.from('player_farms')"));assert.match(code,/return reply\(directory.data,directory.status\)/);
 const bridge=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');assert.ok(bridge.includes("else if(!['player_search','player_profile'].includes(body.operation))unavailable(error.message)"));
});

const signedUp='2026-09-16T21:12:01.344473+00:00';
const withAccounts=(getUserById,options)=>{const admin=database(options);admin.auth={admin:{getUserById}};return admin;};
test('the profile shows the sign-up date and nothing else from the account',async()=>{
 const asked=[];const admin=withAccounts(async userId=>{asked.push(userId);return {data:{user:{id:userId,email:'secret@example.com',phone:'+31600000000',created_at:signedUp,last_sign_in_at:'2026-09-20T10:00:00Z'}},error:null};});
 const {data}=await request(admin,{operation:'player_profile',playerId:id});
 assert.deepEqual(asked,[id]);assert.equal(data.playerProfile.memberSince,Date.parse(signedUp));
 const json=JSON.stringify(data);for(const secret of ['secret@example.com','+31600000000','last_sign_in_at','2026-09-20T10'])assert.ok(!json.includes(secret),secret);
});
test('a profile still loads when the sign-up date cannot be read',async()=>{
 for(const getUserById of [async()=>{throw new Error('auth down');},async()=>({data:{user:null},error:new Error('nope')}),async()=>({data:{user:{created_at:'not a date'}}})]){
  const {status,data}=await request(withAccounts(getUserById),{operation:'player_profile',playerId:id});
  assert.equal(status,200);assert.equal(data.playerProfile.memberSince,null);assert.equal(data.playerProfile.playerId,id);
 }
 assert.equal((await request(database(),{operation:'player_profile',playerId:id})).data.playerProfile.memberSince,null,'no auth client at all');
});
test('search results carry no sign-up date and never call the auth API',async()=>{
 let calls=0;const admin=withAccounts(async()=>{calls++;return {data:{user:{created_at:signedUp}}};});
 const {data}=await request(admin,{operation:'player_search',query:'Sunny'});
 assert.equal(calls,0);assert.ok(data.players.every(player=>!('memberSince' in player)));
});
test('dates are shown as DD-MM-YYYY, in UTC, without a time',()=>{
 assert.deepEqual(formatDate(Date.parse(signedUp)),{text:'16-09-2026',iso:'2026-09-16'});
 assert.equal(formatDate(Date.UTC(2026,0,1,0,0,0)).text,'01-01-2026');assert.equal(formatDate(Date.UTC(2026,11,31,23,59,59)).text,'31-12-2026');
 for(const nothing of [null,undefined,0,-5,NaN,'soon'])assert.equal(formatDate(nothing),null);
});
test('the profile says "Member since" only when the date is known',()=>{
 const player={username:'Tony',level:12,online:false,stats:{},badges:[],family:null};
 const html=renderPlayerProfile({...player,memberSince:Date.parse(signedUp)});
 assert.match(html,/<p class="farmer-since">.*Member since <time datetime="2026-09-16">16-09-2026<\/time><\/p>/);
 assert.ok(!/\d{2}:\d{2}/.test(html.slice(html.indexOf('farmer-since'),html.indexOf('farmer-since')+400)),'no time of day');
 for(const missing of [{},{memberSince:null},{memberSince:0}])assert.ok(!renderPlayerProfile({...player,...missing}).includes('Member since'));
});
