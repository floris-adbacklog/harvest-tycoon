import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleAdminOnline,handleAdminRecentPlayers,handleAdminRetention} from '../supabase/functions/farm-api/admin-analytics-service.js';
import {ONLINE_WINDOW} from '../supabase/functions/farm-api/presence.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const admin={id:'22222222-2222-4222-8222-222222222222',email:'floris@millstone.nl'};
const notAdmin={id:'x',email:'someone.else@millstone.nl'};
const now=Date.UTC(2026,8,22,12);
const iso=ms=>new Date(ms).toISOString();

function database({stats=[],signups=[]}={}){
 const calls=[];
 return {calls,
  from(table){
   const call={table,eq:[],in:null};calls.push(call);
   let rows=table==='player_stats'?stats:[];
   return {
    select(v){call.select=v;return this;},
    eq(k,v){call.eq.push([k,v]);rows=rows.filter(r=>r[k]===v);return this;},
    in(k,values){call.in=[k,values];rows=rows.filter(r=>values.includes(r[k]));return this;},
    order(){return this;},limit(){return this;},
    then(resolve){return Promise.resolve({data:rows,error:null}).then(resolve);}
   };
  },
  async rpc(name,args){calls.push({rpc:name,args});
   if(name!=='admin_auth_signups')throw new Error(`unexpected rpc ${name}`);
   const since=Date.parse(args.p_since),rows=signups.filter(s=>Date.parse(s.created_at)>=since).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).slice(0,args.p_limit);
   return {data:rows,error:null};
  }
 };
}

test('every admin analytics operation is rejected for anyone but floris@millstone.nl, before touching the database',async()=>{
 for(const handler of [handleAdminOnline,handleAdminRecentPlayers,handleAdminRetention]){
  const db=database();
  const result=await handler({admin:db,user:notAdmin});
  assert.equal(result.status,403);assert.equal(db.calls.length,0);
 }
});

test('admin_online: online means active within the shared ONLINE_WINDOW, offline players and the window itself are reported',async()=>{
 const stats=[
  {player_id:'a',username:'Tony',level:12,last_active_at:iso(now-1000)},
  {player_id:'b',username:'Edge',level:5,last_active_at:iso(now-ONLINE_WINDOW+1000)},
  {player_id:'c',username:'JustMissed',level:5,last_active_at:iso(now-ONLINE_WINDOW-1000)},
  {player_id:'d',username:'LongGone',level:9,last_active_at:iso(now-10*ONLINE_WINDOW)}
 ];
 const db=database({stats});
 const result=await handleAdminOnline({admin:db,user:admin,now});
 assert.equal(result.status,200);
 assert.equal(result.data.count,2);assert.deepEqual(result.data.players.map(p=>p.playerId).sort(),['a','b']);
 assert.equal(result.data.windowMinutes,ONLINE_WINDOW/60000);
});

test('admin_recent_players: newest real signups, merged with their stats, including one who never opened a farm',async()=>{
 const signups=[
  {player_id:'p1',created_at:iso(now-1000)},
  {player_id:'p2',created_at:iso(now-2000)},
  {player_id:'p3',created_at:iso(now-3000)}
 ];
 const stats=[
  {player_id:'p1',username:'Newest',level:1,currency:600,last_active_at:iso(now-500)},
  {player_id:'p2',username:'Idle',level:3,currency:900,last_active_at:iso(now-10*ONLINE_WINDOW)}
  // p3 signed up but never loaded a farm: no player_stats row at all.
 ];
 const db=database({signups,stats});
 const result=await handleAdminRecentPlayers({admin:db,user:admin,limit:14,now});
 assert.equal(result.status,200);assert.equal(result.data.players.length,3);
 const [p1,p2,p3]=result.data.players;
 assert.equal(p1.playerId,'p1');assert.equal(p1.username,'Newest');assert.equal(p1.online,true);assert.equal(p1.everPlayed,true);
 assert.equal(p2.online,false);assert.equal(p2.coins,900);
 assert.equal(p3.playerId,'p3');assert.equal(p3.username,null);assert.equal(p3.level,null);assert.equal(p3.everPlayed,false,'never opened a farm, but still listed');
 const rpc=db.calls.find(c=>c.rpc==='admin_auth_signups');
 assert.equal(rpc.args.p_since,'1970-01-01T00:00:00Z');assert.equal(rpc.args.p_limit,14);
});
test('admin_recent_players: the limit is clamped to a sane range',async()=>{
 for(const [given,expected] of [[0,1],[-5,1],[9999,100],['not a number',14]]){
  const db=database({signups:[]});
  await handleAdminRecentPlayers({admin:db,user:admin,limit:given});
  assert.equal(db.calls.find(c=>c.rpc==='admin_auth_signups').args.p_limit,expected,String(given));
 }
});

test('admin_retention: grouped by UTC signup day, retained means last_active_at at or after signup-day + N days',async()=>{
 const day='2026-09-15',dayStart=Date.parse(`${day}T00:00:00Z`);
 const signups=[
  {player_id:'a',created_at:iso(dayStart+3600000)},   // 01:00 that day
  {player_id:'b',created_at:iso(dayStart+20*3600000)} // 20:00 that day — same UTC-day cohort
 ];
 const stats=[
  {player_id:'a',last_active_at:iso(dayStart+3*86400000)},  // still active on day 3
  {player_id:'b',last_active_at:iso(dayStart+1000)}          // never came back after signing up
 ];
 const db=database({signups,stats});
 const result=await handleAdminRetention({admin:db,user:admin,now:dayStart+4*86400000});
 assert.equal(result.status,200);assert.equal(result.data.rows.length,1);
 const row=result.data.rows[0];assert.equal(row.day,day);assert.equal(row.size,2);
 assert.deepEqual(row.days[0],{retained:2,total:2,pct:100},'day 0: both had at least signed up');
 assert.deepEqual(row.days[3],{retained:1,total:2,pct:50},'day 3: only a is still active by then');
});
test('admin_retention: a day-offset that has not elapsed yet is null, never a false 0%',async()=>{
 const today=new Date(now).toISOString().slice(0,10);
 const signups=[{player_id:'z',created_at:iso(now)}];
 const db=database({signups,stats:[]});
 const result=await handleAdminRetention({admin:db,user:admin,now});
 const row=result.data.rows.find(r=>r.day===today);
 assert.deepEqual(row.days[0],{retained:0,total:1,pct:0},'day 0 has elapsed (signup already happened)');
 assert.equal(row.days[1],null,'day 1 has not elapsed yet for a signup that just happened');
});

test('the admin_online/admin_recent_players/admin_retention operations are wired in, gated, and reachable before a username is required',()=>{
 const code=read('supabase/functions/farm-api/index.ts');
 assert.match(code,/import \{handleAdminOnline,handleAdminRecentPlayers,handleAdminRetention\} from '\.\/admin-analytics-service\.js';/);
 for(const op of ['admin_online','admin_recent_players','admin_retention'])assert.match(code,new RegExp(`'${op}'`));
 const before=code.indexOf('if(!username)return reply');
 for(const marker of ["body.operation==='admin_online'","body.operation==='admin_recent_players'","body.operation==='admin_retention'"])assert.ok(code.indexOf(marker)<before,marker);
});
test('handleAdminOnline/RecentPlayers/Retention each check isSuperadmin, imported from the same place admin_grant uses',()=>{
 const code=read('supabase/functions/farm-api/admin-analytics-service.js');
 assert.match(code,/import \{isSuperadmin\} from '\.\/admin-service\.js';/);
 assert.equal((code.match(/if\(!isSuperadmin\(user\)\)return respond\(\{error:'Not authorized\.'\},403\);/g)??[]).length,3);
});
test('the read-only admin operations are safe to auto-retry, like every other read',()=>{
 const code=read('src/connection.js');
 assert.match(code,/'admin_online','admin_recent_players','admin_retention'/);
});
// Lives inside the game (an icon in the topbar, hidden for everyone else), not a separate page: one session,
// one sign-in, nothing extra to visit — and it reuses checkAdmin() from player-profiles.js rather than a second
// admin check.
test('build-cloud.mjs has no separate admin page: only the original two entries',()=>{
 assert.match(read('scripts/build-cloud.mjs'),/entry:\{cloud:'src\/main\.js','game-cloud':'src\/game-cloud\.js'\}/);
});
test('the admin dashboard button exists in the topbar, hidden until checkAdmin() says otherwise',()=>{
 const html=read('public/farm.html');
 assert.match(html,/<button class="icon-button" id="admin-button" aria-label="Open the admin dashboard" aria-haspopup="dialog" title="Admin dashboard" hidden>/);
 const js=read('src/admin-dashboard.js');
 assert.match(js,/import \{checkAdmin\} from '\.\/player-profiles\.js';/);
 assert.match(js,/checkAdmin\(\)\.then\(admin=>\{if\(admin\)button\.hidden=false;\}\);/);
});
test('the dashboard fetches all three admin operations through the same bridge every other request uses',()=>{
 const js=read('src/admin-dashboard.js');
 assert.match(js,/bridge\.request\(\{operation:'admin_online'\}\),bridge\.request\(\{operation:'admin_recent_players'\}\),bridge\.request\(\{operation:'admin_retention'\}\)/);
 assert.match(js,/document\.querySelectorAll\('dialog\[open\]'\)\.forEach\(d=>d\.close\(\)\);dialog\.showModal\(\);load\(\);/,'closes whatever else is open first, like every other dialog');
 assert.match(js,/refreshTimer=setInterval\(load,60000\);/);
 assert.match(js,/dialog\.addEventListener\('close',\(\)=>clearInterval\(refreshTimer\)\);/,'stops polling once closed');
});
test('game-cloud.js creates the dashboard once, alongside the player-profile/gift panel it shares checkAdmin with',()=>{
 const js=read('src/game-cloud.js');
 assert.match(js,/import \{createAdminDashboard\} from '\.\/admin-dashboard\.js';/);
 assert.match(js,/const profiles=createPlayerProfiles\(bridge\),serverOffset=bridge\.serverNow-Date\.now\(\);\n\s*createAdminDashboard\(bridge\);/);
});
test('checkAdmin is exported from player-profiles.js so admin-dashboard.js does not duplicate the account check',()=>{
 assert.match(read('src/player-profiles.js'),/export function checkAdmin\(\)\{/);
});
