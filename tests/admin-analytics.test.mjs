import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleAdminOnline,handleAdminRecentPlayers,handleAdminRetention,zoneDay,dayStart} from '../supabase/functions/farm-api/admin-analytics-service.js';
import {ONLINE_WINDOW} from '../supabase/functions/farm-api/presence.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const admin={id:'22222222-2222-4222-8222-222222222222',email:'floris@millstone.nl',email_confirmed_at:'2026-09-16T21:12:00Z',signInMethods:['oauth']};
const notAdmin={id:'x',email:'someone.else@millstone.nl'};
const now=Date.UTC(2026,8,22,12);
const iso=ms=>new Date(ms).toISOString();

function database({stats=[],signups=[],staff=[]}={}){
 const calls=[];
 return {calls,
  from(table){
   const call={table,eq:[],in:null};calls.push(call);
   let rows=table==='player_stats'?stats:table==='staff_roles'?staff:[];
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

test('every admin analytics operation is rejected for anyone but the admin and the moderators; a farmer only costs one staff lookup',async()=>{
 for(const handler of [handleAdminOnline,handleAdminRecentPlayers,handleAdminRetention]){
  const db=database();
  const result=await handler({admin:db,user:notAdmin});
  assert.equal(result.status,403);assert.deepEqual(db.calls.map(c=>c.table),['staff_roles']);
  const asModerator=await handler({admin:database({staff:[{player_id:notAdmin.id}]}),user:notAdmin});
  assert.equal(asModerator.status,200,'a moderator (staff_roles) may read the dashboard');
  const asAdmin=database();await handler({admin:asAdmin,user:admin});assert.ok(!asAdmin.calls.some(c=>c.table==='staff_roles'),'the admin needs no lookup');
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

test('admin_retention: grouped by signup day in Amsterdam time, retained means last_active_at at or after signup-day + N days',async()=>{
 const day='2026-09-15',utcStart=Date.parse(`${day}T00:00:00Z`);
 const signups=[
  {player_id:'a',created_at:iso(utcStart+3600000)},    // 03:00 in Amsterdam that day
  {player_id:'b',created_at:iso(utcStart+20*3600000)}, // 22:00 in Amsterdam: same day
  {player_id:'c',created_at:iso(utcStart+22.5*3600000)} // 22:30 UTC is 00:30 the next day in Amsterdam: the next cohort
 ];
 const stats=[
  {player_id:'a',last_active_at:iso(utcStart+3*86400000)},  // still active on day 3
  {player_id:'b',last_active_at:iso(utcStart+1000)}          // never came back after signing up
 ];
 const db=database({signups,stats});
 const result=await handleAdminRetention({admin:db,user:admin,now:utcStart+4*86400000});
 assert.equal(result.status,200);assert.deepEqual(result.data.rows.map(r=>[r.day,r.size]),[[day,2],['2026-09-16',1]]);
 const row=result.data.rows[0];
 assert.deepEqual(row.days[0],{retained:2,total:2,pct:100},'day 0: both had at least signed up');
 assert.deepEqual(row.days[3],{retained:1,total:2,pct:50},'day 3: only a is still active by then');
});
test('the dashboard\'s days run midnight to midnight in Amsterdam, summer and winter time',()=>{
 assert.equal(zoneDay(Date.UTC(2026,8,24,21,59)),'2026-09-24');assert.equal(zoneDay(Date.UTC(2026,8,24,22,0)),'2026-09-25','midnight in Amsterdam is 22:00 UTC in summer');
 assert.equal(dayStart('2026-09-25'),Date.UTC(2026,8,24,22));assert.equal(dayStart('2026-01-06'),Date.UTC(2026,0,5,23),'and 23:00 UTC in winter');
 assert.equal(dayStart('2026-10-25'),Date.UTC(2026,9,24,22),'the day the clocks go back still starts in summer time');
});
test('admin_retention: a day-offset that has not elapsed yet is null, never a false 0%',async()=>{
 const today=zoneDay(now);
 const signups=[{player_id:'z',created_at:iso(now)}];
 const db=database({signups,stats:[]});
 const result=await handleAdminRetention({admin:db,user:admin,now});
 const row=result.data.rows.find(r=>r.day===today);
 assert.deepEqual(row.days[0],{retained:0,total:1,pct:0},'day 0 has elapsed (signup already happened)');
 assert.equal(row.days[1],null,'day 1 has not elapsed yet for a signup that just happened');
});

test('the admin_online/admin_recent_players/admin_retention operations are wired in, gated, and reachable before a username is required',()=>{
 const code=read('supabase/functions/farm-api/index.ts');
 assert.match(code,/import \{handleAdminOnline,handleAdminRecentPlayers,handleAdminRetention,handleAdminInvites,handleAdminPlayers,handleAdminPlayer,handleAdminPurchases,handleAdminSources,recordSeen\} from '\.\/admin-analytics-service\.js';/);
 for(const op of ['admin_online','admin_recent_players','admin_retention','admin_players','admin_player'])assert.match(code,new RegExp(`'${op}'`));
 const before=code.indexOf('const username=profile?.username');
 for(const marker of ["body.operation==='admin_online'","body.operation==='admin_recent_players'","body.operation==='admin_retention'","body.operation==='admin_players'","body.operation==='admin_player'"])assert.ok(code.indexOf(marker)<before,marker);
});
test('handleAdminOnline/RecentPlayers/Retention/Invites each check isStaff (the admin or a moderator), from the same place admin_grant uses; giving stays admin-only',()=>{
 const code=read('supabase/functions/farm-api/admin-analytics-service.js');
 assert.match(code,/import \{isStaff,isSuperadmin\} from '\.\/admin-service\.js';/);
 assert.equal((code.match(/if\(!\(await isStaff\(admin,user\)\)\)return respond\(user,\{error:'Not authorized\.'\},403\);/g)??[]).length,6);
 const grant=read('supabase/functions/farm-api/admin-service.js');
 assert.match(grant,/export async function isStaff\(admin,user\)\{\n if\(isSuperadmin\(user\)\)return true;/);
 assert.match(grant,/if\(!isSuperadmin\(user\)\)return respond\(\{error:'Not authorized\.'\},403\);/,'admin_grant: still only the admin');
});
// Regression: bridge.request() in src/main.js throws "Your session has ended" for any farm-api response whose
// profile.player_id does not match the signed-in caller — a response with no profile field at all fails that
// check too (undefined !== a real uuid), so every admin response, success or error, needs one. This first
// shipped without it: every admin dashboard call silently looked like a dead session.
test('every response — success and 403 alike, from all three operations and admin_grant — carries the caller\'s own profile.player_id',async()=>{
 const analytics=read('supabase/functions/farm-api/admin-analytics-service.js');
 assert.match(analytics,/const respond=\(user,data,status=200\)=>\(\{status,data:\{\.\.\.data,profile:\{player_id:user\?\.id\}\}\}\);/);
 const grant=read('supabase/functions/farm-api/admin-service.js');
 assert.match(grant,/const respond=\(data,status=200\)=>\(\{status,data:\{\.\.\.data,profile:\{player_id:user\?\.id\}\}\}\);/);
 const okOnline=await handleAdminOnline({admin:database(),user:admin});assert.equal(okOnline.data.profile.player_id,admin.id);
 const okRecent=await handleAdminRecentPlayers({admin:database(),user:admin});assert.equal(okRecent.data.profile.player_id,admin.id);
 const okRetention=await handleAdminRetention({admin:database(),user:admin});assert.equal(okRetention.data.profile.player_id,admin.id);
 const denied=await handleAdminOnline({admin:database(),user:notAdmin});assert.equal(denied.data.profile.player_id,notAdmin.id);
});
test('the read-only admin operations are safe to auto-retry, like every other read',()=>{
 const code=read('src/connection.js');
 assert.match(code,/'admin_online','admin_recent_players','admin_retention'/);
});
// Lives inside the game (an icon in the topbar, hidden for everyone else), not a separate page: one session,
// one sign-in, nothing extra to visit — and it reuses checkAdmin() from player-profiles.js rather than a second
// admin check.
test('build-cloud.mjs has no separate admin page: the game\'s two entries and the partner programme\'s page',()=>{
 assert.match(read('scripts/build-cloud.mjs'),/entry:\{cloud:'src\/main\.js','game-cloud':'src\/game-cloud\.js',partners:'src\/partners\.js'\}/);
});
test('the admin dashboard button exists in the topbar, hidden until checkAdmin() says otherwise',()=>{
 const html=read('public/farm.html');
 assert.match(html,/<button class="icon-button" id="admin-button" aria-label="Open the admin dashboard" aria-haspopup="dialog" title="Admin dashboard" hidden>/);
 const js=read('src/admin-dashboard.js');
 assert.match(js,/import \{checkAdmin\} from '\.\/player-profiles\.js';/);
 assert.match(js,/Promise\.all\(\[checkAdmin\(\),chat\?\.whenReady\?\.\(\)\.then\(overview=>overview\?\.role\?\?null\)\.catch\(\(\)=>null\)\]\)\.then\(\(\[admin,chatRole\]\)=>\{\n  role=admin\|\|chatRole==='admin'\?'admin':chatRole==='moderator'\?'moderator':null;if\(!role\)return;/);
 assert.match(js,/button\.hidden=false;const entry=document\.getElementById\('admin-menu-entry'\);if\(entry\)entry\.hidden=false;/,'the topbar button and the More-menu card appear together, only for the admin');
});
test('every card, number and tab has a painted icon, like the rest of the game (no thin line icons any more)',()=>{
 const js=read('src/admin-dashboard.js');
 assert.match(js,/import \{refreshArt\} from '\.\.\/public\/visual-icons\.js';/);
 assert.ok(!js.includes('data-line-icon'),'no line icons left');
 for(const key of ['family-members','invite-friends','xp','alert','quests','gift','bell','chat'])assert.ok(js.includes(`art('${key}')`),key);
});
test('players show their own picture (initials only when there is none), with the game\'s green online dot',()=>{
 const js=read('src/admin-dashboard.js');
 assert.match(js,/const avatar=\(name,online,id\)=>\{const face=id&&faces\.get\(id\);return `<span class="admin-avatar\$\{face\?' has-face':''\}">\$\{face\?avatarImage\(face\):esc\(initials\(name\)\)\}\$\{online\?'<span class="online-dot is-online" aria-hidden="true"><\/span>':''\}<\/span>`;\};/);
 assert.match(js,/avatar\(p\.username,true,p\.playerId\)/,'everyone in the online list is, by definition, online');
 assert.match(read('src/admin-players.js'),/const face=p=>`<span class="admin-avatar\$\{p\.avatarId\?' has-face':''\}">\$\{p\.avatarId\?avatarImage\(p\.avatarId\)/,'the player list shows whichever is true for that farmer');
 assert.match(js,/await loadFaces\(online\.players\.map\(p=>p\.playerId\)\);/);
});
test('retention percentages are colour-coded so a pattern is visible at a glance, not just readable as numbers',()=>{
 const js=read('src/admin-dashboard.js');
 assert.match(js,/const heat=pct=>pct>=50\?'admin-heat-good':pct>=25\?'admin-heat-ok':'admin-heat-low';/);
 assert.match(js,/<td class="\$\{heat\(d\.pct\)\}" title="\$\{d\.retained\} \/ \$\{d\.total\} still active">\$\{d\.pct\}%<\/td>/);
 const css=read('public/player-profiles.css');
 assert.match(css,/\.admin-heat-good\{/);assert.match(css,/\.admin-heat-ok\{/);assert.match(css,/\.admin-heat-low\{/);
 assert.match(css,/\.admin-avatar\{/);
});
test('the dashboard fetches all three admin operations through the same bridge every other request uses',()=>{
 const js=read('src/admin-dashboard.js');
 assert.match(js,/\[\['admin_online','Online now'\],\['admin_players','All players'\],\['admin_retention','Retention'\],\['admin_invites','Invites'\]\]/);assert.match(js,/bridge\.request\(operation==='admin_retention'\?\{operation,days:Number\(view\.retention\)\}:\{operation\}\)/);
 assert.match(js,/document\.querySelectorAll\('dialog\[open\]'\)\.forEach\(d=>d\.close\(\)\);refreshArt\(\);dialog\.showModal\(\);load\(\);/,'closes whatever else is open first, like every other dialog');
 assert.match(js,/refreshTimer=setInterval\(load,60000\);/);
 assert.match(js,/dialog\.addEventListener\('close',\(\)=>clearInterval\(refreshTimer\)\);/,'stops polling once closed');
});
test('game-cloud.js creates the dashboard once, alongside the player-profile/gift panel it shares checkAdmin with',()=>{
 const js=read('src/game-cloud.js');
 assert.match(js,/import \{createAdminDashboard\} from '\.\/admin-dashboard\.js';/);
 assert.match(js,/const profiles=createPlayerProfiles\(bridge,\{showBoard:key=>ui\.showBoard\(key\)\}\),serverOffset=bridge\.serverNow-Date\.now\(\);[\s\S]*const chat=createChatUI\(\{bridge,profiles\}\);[\s\S]*?createAdminDashboard\(bridge,\{chat\}\);/);
});
test('checkAdmin is exported from player-profiles.js so admin-dashboard.js does not duplicate the account check',()=>{
 assert.match(read('src/player-profiles.js'),/export function checkAdmin\(\)\{/);
});
test('the dashboard opens with three headline numbers, lists every player, and has no event controls any more',()=>{
 const js=read('src/admin-dashboard.js'),html=read('public/farm.html'),icons=read('public/visual-icons.js');
 assert.match(js,/<div class="admin-kpis"><div>'\+art\('family-members'\)\+'<strong id="admin-kpi-online">/);assert.match(js,/renderKpis\(online,retention\)/);
 assert.match(js,/<ul id="admin-player-list" class="admin-recent-list admin-player-list"><\/ul>/);
 assert.ok(!/admin-events|mountAdminEvents|liveEvents/.test(js),'farm events run on their own schedule');
 assert.match(html,/id="admin-menu-entry" hidden><i data-game-art="admin"><\/i><span><strong>Admin dashboard<\/strong><small>Players and retention<\/small>/);
 assert.match(icons,/for\(const id of \[[^\]]*'admin'[^\]]*\]\)pictures\[id\]=id;/,'the painted shield with the key (WebP)');assert.ok(!/svgArt=new Set\(\[[^\]]*'admin'/.test(icons));
});

test('the Invite a friend log: who invited whom, how far the friend is, and whether each side really got its diamonds',async()=>{
 const {handleAdminInvites}=await import('../supabase/functions/farm-api/admin-analytics-service.js');
 const day=86400000,A='a0000000-0000-4000-8000-000000000001',B='b0000000-0000-4000-8000-000000000002',C='c0000000-0000-4000-8000-000000000003',D='d0000000-0000-4000-8000-000000000004';
 const tables={
  referrals:[{invitee_id:B,referrer_id:A,created_at:now-2*day,qualified_at:now-day,referrer_diamonds:150},{invitee_id:C,referrer_id:A,created_at:now-3*day,qualified_at:null,referrer_diamonds:0},{invitee_id:D,referrer_id:A,created_at:now-40*day,qualified_at:null,referrer_diamonds:0}],
  player_stats:[{player_id:A,username:'Tony',level:30},{player_id:B,username:'Bram',level:12},{player_id:C,username:'Chris',level:6},{player_id:D,username:'Dewi',level:4}],
  player_farms:[{player_id:A,invite:null,paid:[B]},{player_id:B,invite:{by:A,at:now-2*day,rewardedAt:now-day},paid:null},{player_id:C,invite:{by:A},paid:null},{player_id:D,invite:{by:A},paid:null}]
 };
 const db={from(table){let rows=tables[table]??[];const q={select(v,opts){if(opts?.head)return Promise.resolve({count:8,data:null,error:null});return this;},order(){return this;},limit(){return this;},in(k,v){rows=rows.filter(r=>v.includes(r[k]));return this;},then(r){return Promise.resolve({data:rows,error:null}).then(r);}};return q;}};
 assert.equal((await handleAdminInvites({admin:db,user:notAdmin,now})).status,403);
 const {status,data}=await handleAdminInvites({admin:db,user:admin,now});
 assert.equal(status,200);assert.equal(data.profile.player_id,admin.id);
 assert.deepEqual(data.totals,{links:8,friends:3,qualified:1,diamondsPaid:300});
 assert.deepEqual(data.invites.map(i=>[i.friend,i.inviter,i.status,i.friendPaid,i.inviterPaid]),[['Bram','Tony','qualified',true,true],['Chris','Tony','playing',false,false],['Dewi','Tony','expired',false,false]]);
 const dash=read('src/admin-dashboard.js');
 assert.match(dash,/\['admin_invites','Invites'\]/,'the rest of the dashboard still loads before farm-api knows it');
 assert.match(read('supabase/functions/farm-api/index.ts'),/if\(body\.operation==='admin_invites'\)\{/);
});

// 25 Sep 2026: the retention request asked for the 383 farmers of the last week in one address (15 KB); PostgREST echoes the address
// in a response header, the Edge runtime's fetch failed on it, and the whole dashboard stayed empty. Lists go in batches of 100 now.
test('long lists of farmers are asked for 100 at a time, and retention still counts every one of them',async()=>{
 const signups=Array.from({length:383},(_,i)=>({player_id:`p${String(i).padStart(3,'0')}`,created_at:iso(now-2*86400000+i*1000)}));
 const stats=signups.map(s=>({player_id:s.player_id,last_active_at:iso(now-60000)}));
 const db=database({stats,signups});
 const r=await handleAdminRetention({admin:db,user:admin,now});
 assert.equal(r.status,200);
 const lookups=db.calls.filter(c=>c.table==='player_stats'&&c.in);
 assert.deepEqual(lookups.map(c=>c.in[1].length),[100,100,100,83]);
 assert.equal(new Set(lookups.flatMap(c=>c.in[1])).size,383,'nobody is asked for twice or left out');
 assert.equal(r.data.rows.reduce((sum,row)=>sum+row.size,0),383);
 assert.ok(r.data.rows.every(row=>row.days[0].retained===row.size),'everyone active today counts as kept');
 const source=read('supabase/functions/farm-api/admin-analytics-service.js');
 assert.doesNotMatch(source,/\.in\('player_id',ids\)/,'no admin list asks for every id in one request');
});
test('the dashboard shows what did load when one part fails, and says which part is missing',()=>{
 const dash=read('src/admin-dashboard.js');
 assert.match(dash,/PARTS\.map\(\(\[operation\]\)=>bridge\.request\(operation==='admin_retention'\?\{operation,days:Number\(view\.retention\)\}:\{operation\}\)\.catch\(\(\)=>null\)\)/);
 assert.match(dash,/could not be loaded\. Please try again\./);
 assert.doesNotMatch(dash,/bridge\.request\(\{operation:'admin_(online|retention)'\}\)\)?,/,'no part can take the others down');
});

// 27 Sep 2026: every checkout in the Admin dashboard, paid or not; the admin only (money), not the moderators.
test('the Purchases tab: every checkout newest first, with who, what, the price and the status; the admin only',async()=>{
 const {handleAdminPurchases}=await import('../supabase/functions/farm-api/admin-analytics-service.js');
 const A='a0000000-0000-4000-8000-000000000001',B='b0000000-0000-4000-8000-000000000002';
 const tables={
  harvest_purchases:[
   {id:'p1',player_id:A,pack:'starter',diamonds:300,coins:10000,amount_cents:299,livemode:true,status:'credited',created_at:'2026-09-27T10:00:00Z',credited_at:'2026-09-27T10:01:00Z'},
   {id:'p2',player_id:B,pack:'100',diamonds:100,coins:0,amount_cents:199,livemode:true,status:'pending',created_at:'2026-09-26T09:00:00Z',credited_at:null},
   {id:'p3',player_id:B,pack:'50',diamonds:50,coins:0,amount_cents:99,livemode:false,status:'credited',created_at:'2026-09-25T09:00:00Z',credited_at:'2026-09-25T09:00:30Z'}],
  player_stats:[{player_id:A,username:'Anna',level:14},{player_id:B,username:'Bram',level:9}]
 };
 const db={from(table){let rows=tables[table]??[];const q={select(){return this;},order(){return this;},limit(){return this;},in(k,v){rows=rows.filter(r=>v.includes(r[k]));return this;},then(r){return Promise.resolve({data:rows,error:null}).then(r);}};return q;}};
 assert.equal((await handleAdminPurchases({admin:db,user:notAdmin})).status,403,'a moderator or anyone else: no');
 const {status,data}=await handleAdminPurchases({admin:db,user:admin});
 assert.equal(status,200);assert.equal(data.profile.player_id,admin.id);
 assert.deepEqual(data.totals,{started:3,paid:1,notFinished:1,revenueCents:299,players:2},'a test payment is not revenue');
 assert.deepEqual(data.purchases.map(p=>[p.username,p.pack,p.amountCents,p.status,p.live]),[['Anna','starter',299,'credited',true],['Bram','100',199,'pending',true],['Bram','50',99,'credited',false]]);
 const code=read('supabase/functions/farm-api/admin-analytics-service.js'),index=read('supabase/functions/farm-api/index.ts'),dash=read('src/admin-dashboard.js');
 assert.match(code,/export async function handleAdminPurchases\(\{admin,user,limit=500\}\)\{\n if\(!isSuperadmin\(user\)\)return respond/);
 assert.match(index,/body\.operation==='admin_purchases'/);assert.match(index,/if\(!\[[^\]]*'admin_purchases'[^\]]*\]\.includes\(body\?\.operation\)\)/,'on the list of operations farm-api accepts');assert.ok(index.indexOf("body.operation==='admin_purchases'")<index.indexOf('const username=profile?.username'),'reachable for the admin account without a farmer name');
 assert.match(dash,/dialog\.querySelector\('\[data-admin-tab="purchases"\]'\)\.hidden=role!=='admin';/,'the tab only for the admin');
 assert.match(dash,/if\(role==='admin'\)void bridge\.request\(\{operation:'admin_purchases'\}\)/,'loaded only for the admin');
});

// 27 Sep 2026: Adaptive Pricing on; the webhook keeps checking the exact euro amount, which Stripe keeps on the session.
test('checkout shows local currencies (Adaptive Pricing) while the webhook still insists on the exact euro price',()=>{
 const checkout=read('supabase/functions/diamond-checkout/index.ts'),webhook=read('supabase/functions/stripe-webhook/payments.js');
 assert.match(checkout,/adaptive_pricing:\{enabled:true\}/);
 assert.match(checkout,/price\.currency!=='eur'/,'the prices stay in euro');
 assert.match(webhook,/if\(session\.currency!=='eur'\|\|session\.amount_total!==purchase\.amount_cents/,'the paid session is still checked in euro');
});

// 27 Sep 2026: the game's own name, icon and button colour on its payment page only (the Stripe account also sells other things).
test('the payment page shows Harvest Tycoon for this game only',()=>{
 const checkout=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(checkout,/branding_settings:\{display_name:'Harvest Tycoon',icon:\{type:'url',url:`\$\{origin\}\/assets\/pwa\/icon-512\.png`\}/);
 assert.ok(read('public/assets/pwa/icon-512.png').length>0,'the icon ships with the site');
});

// 1 Oct 2026: the staff switch the retention table between 7, 30 and 90 days.
test('admin_retention over 30 days: a row per signup day with day 0, 1, 2, 3, 7, 14 and 30; the headline numbers stay the last week\'s',async()=>{
 const D=86400000,signups=[{player_id:'old',created_at:iso(now-20*D)},{player_id:'new',created_at:iso(now-2*D)},{player_id:'today',created_at:iso(now-60000)}];
 const stats=[{player_id:'old',last_active_at:iso(now-5*D)},{player_id:'new',last_active_at:iso(now-1000)},{player_id:'today',last_active_at:iso(now)}];
 const r=await handleAdminRetention({admin:database({signups,stats}),user:admin,now,days:30});
 assert.deepEqual([r.data.period,r.data.columns,r.data.weekly],[30,[0,1,2,3,7,14,30],false]);
 const old=r.data.rows.find(x=>x.day===zoneDay(now-20*D));
 assert.deepEqual(old.days.map(d=>d?.pct??null),[100,100,100,100,100,100,null],'still around until day 15, day 30 not reached yet');
 assert.deepEqual(r.data.kpi,{today:1,day1:{retained:1,total:1}},'only the last week counts for the headline numbers');
 const week=await handleAdminRetention({admin:database({signups,stats}),user:admin,now,days:7});
 assert.ok(!week.data.rows.some(x=>x.day===zoneDay(now-20*D)),'7 days: the week only');assert.deepEqual(week.data.columns,[0,1,2,3,4,5,6,7]);
 const odd=await handleAdminRetention({admin:database({signups,stats}),user:admin,now,days:12});assert.equal(odd.data.period,7,'anything else is the week');
});
test('admin_retention over 90 days: a row per signup week from Monday, and a farmer counts for day N once N days passed since their own signup',async()=>{
 const D=86400000,monday=dayStart('2026-09-14'),signups=[{player_id:'a',created_at:iso(monday+3600000)},{player_id:'b',created_at:iso(monday+4*D)}];
 const stats=[{player_id:'a',last_active_at:iso(monday+8*D)},{player_id:'b',last_active_at:iso(monday+5*D)}];
 const at=dayStart('2026-09-22')+12*3600000;
 const r=await handleAdminRetention({admin:database({signups,stats}),user:admin,now:at,days:90});
 assert.deepEqual([r.data.columns,r.data.weekly],[[0,1,7,14,30,60,90],true]);
 const row=r.data.rows.find(x=>x.day==='2026-09-14');assert.equal(row.size,2,'Monday and Friday, the same week');
 assert.deepEqual(row.days[1],{retained:2,total:2,pct:100});
 assert.deepEqual(row.days[2],{retained:1,total:1,pct:100},'day 7: only a has had 7 days, and a was still around');
 assert.equal(row.days[3],null,'day 14: nobody has had 14 days yet');
 const ui=read('src/admin-dashboard.js');
 assert.match(ui,/data-retention-period="\$\{id\}"/);assert.match(ui,/data\.weekly\?`Week of \$\{fmtDay\(row\.day\)\}`:fmtDay\(row\.day\)/);
 assert.match(read('src/admin-players.js'),/export const RETENTION_PERIODS=Object\.freeze\(\[\['7','7d'\],\['30','30d'\],\['90','90d'\]\]\);/);
 assert.match(read('supabase/functions/farm-api/index.ts'),/handleAdminRetention\(\{admin,user,days:body\.days\}\)/);
});

// 2 Oct 2026: where new farmers come from (supabase/player-attribution.sql), per first-touch source; the admin only (money).
test('admin_sources: the admin in a Google session only; 7, 30 or 90 Amsterdam days in one database call',async()=>{
 const {handleAdminSources,SOURCE_PERIODS}=await import('../supabase/functions/farm-api/admin-analytics-service.js');
 const asked=[],db={rpc:async(name,args)=>{asked.push([name,args]);return {data:[{source:'src:reddit-cozygames',signups:12,played:11,d1_due:10,d1_kept:4,l5:6,l10:3,l14:1,checkout_players:2,paid_players:1,revenue_cents:'499'}],error:null};},from(){throw new Error('no table reads');}};
 assert.deepEqual([...SOURCE_PERIODS],[7,30,90]);
 for(const user of [notAdmin,{...admin,signInMethods:['password']}]){const denied=await handleAdminSources({admin:db,user});assert.equal(denied.status,403);assert.equal(denied.data.profile.player_id,user.id);}
 assert.equal(asked.length,0,'a moderator or a password session asks nothing');
 const moderator=database({staff:[{player_id:notAdmin.id}]});assert.equal((await handleAdminSources({admin:moderator,user:notAdmin})).status,403,'not for the moderators either');
 const {status,data}=await handleAdminSources({admin:db,user:admin,days:'7',now});
 assert.equal(status,200);assert.equal(data.period,7);assert.equal(data.profile.player_id,admin.id);
 assert.deepEqual(asked[0],['admin_source_stats',{p_since:new Date(dayStart(zoneDay(now-6*86400000))).toISOString()}],'today and the 6 days before, from Amsterdam midnight');
 assert.deepEqual(data.rows,[{source:'src:reddit-cozygames',farmers:12,played:11,day1:{kept:4,due:10},level5:6,level10:3,level14:1,checkouts:2,paid:1,revenueCents:499}]);
 for(const [days,period] of [[90,90],['30',30],[365,30],[undefined,30],['x',30]]){await handleAdminSources({admin:db,user:admin,days,now});assert.equal(asked.at(-1)[1].p_since,new Date(dayStart(zoneDay(now-(period-1)*86400000))).toISOString(),String(days));}
 const failing={rpc:async()=>({data:null,error:{message:'function admin_source_stats does not exist'}})};
 await assert.rejects(handleAdminSources({admin:failing,user:admin}),e=>/does not exist/.test(e.message),'a database problem is not an empty table');
});
test('admin_sources is wired in: accepted by farm-api, safe to repeat, loaded for the admin only, under the funnel',async()=>{
 const index=read('supabase/functions/farm-api/index.ts'),dash=read('src/admin-dashboard.js');
 assert.match(index,/if\(!\[[^\]]*'admin_sources'[^\]]*\]\.includes\(body\?\.operation\)\)/);
 assert.match(index,/handleAdminSources\(\{admin,user,days:body\.days\}\)/);
 assert.ok(index.indexOf("body.operation==='admin_sources'")<index.indexOf('const username=profile?.username'),'reachable for the admin account without a farmer name');
 const {safeToRepeat}=await import('../src/connection.js');assert.equal(safeToRepeat({operation:'admin_sources',days:30}),true);
 assert.match(dash,/if\(role==='admin'\)void loadSources\(\);/,'loaded only for the admin');
 assert.match(dash,/<section class="admin-card" id="admin-sources" hidden>/,'hidden until the admin\'s load shows it: never for the moderators');
 assert.ok(dash.indexOf('id="admin-funnel"')<dash.indexOf('id="admin-sources"')&&dash.indexOf('id="admin-sources"')<dash.indexOf('id="admin-countries"'),'right under the funnel');
 assert.match(dash,/bridge\.request\(\{operation:'admin_sources',days:Number\(view\.sources\)\}\);if\(ask===sourceAsk\)/,'only the latest period asked for is drawn');
});
test('the sources table: plain names, shares of each source\'s farmers, day 1 only once it is due, Not recorded last and the totals',async()=>{
 const {sourceLabel,sourcesHtml,SOURCE_PERIODS}=await import('../src/admin-players.js');
 assert.deepEqual([...SOURCE_PERIODS],[['7','7d'],['30','30d'],['90','90d']]);
 assert.deepEqual(sourceLabel('src:reddit-cozygames'),{label:'reddit-cozygames',note:'Our link'});
 assert.deepEqual(sourceLabel('ad:meta'),{label:'Meta ad click',note:''});assert.deepEqual(sourceLabel('ad:tiktok').label,'TikTok ad click');assert.deepEqual(sourceLabel('ad:google').label,'Google ad click');
 assert.deepEqual(sourceLabel('site:reddit.com'),{label:'reddit.com',note:'Website'});assert.deepEqual(sourceLabel('utm:facebook / eu'),{label:'facebook / eu',note:'Ad (utm)'});
 assert.deepEqual(sourceLabel('partner:GREENA123'),{label:'GREENA123',note:'Partner link'});assert.equal(sourceLabel('invite').label,'Friend’s invite');assert.equal(sourceLabel('direct').label,'Direct');
 assert.deepEqual(sourceLabel('unknown'),{label:'Not recorded',note:'joined before tracking, or never opened the farm'});
 const row=(source,farmers,extra={})=>({source,farmers,played:farmers,day1:{kept:0,due:0},level5:0,level10:0,level14:0,checkouts:0,paid:0,revenueCents:0,...extra});
 const html=sourcesHtml({rows:[row('unknown',40),row('site:<b>x.com',2),row('src:reddit-cozygames',10,{day1:{kept:6,due:10},level5:5,level10:2,level14:1,checkouts:2,paid:1,revenueCents:499})]});
 const rows=html.split('</tr>').filter(Boolean);
 assert.match(rows[0],/^<tr><td>reddit-cozygames<small>Our link<\/small><\/td><td title="10 opened their farm">10<\/td><td class="admin-heat-good" title="6 \/ 10 came back on day 1">60%<\/td><td title="5 \/ 10">50%<\/td><td title="2 \/ 10">20%<\/td><td title="1 \/ 10">10%<\/td><td title="20% of 10">2<\/td><td title="10% of 10">1<\/td><td>€4\.99<\/td>$/);
 assert.match(rows[1],/&lt;b&gt;x\.com/,'escaped');assert.match(rows[1],/<td class="admin-pending" title="Joined today: day 1 is still to come">—<\/td>/);
 assert.match(rows[2],/^<tr><td>Not recorded<small>/,'Not recorded last');
 assert.match(rows[3],/^<tr class="admin-source-total"><td>All new farmers<\/td><td title="52 opened their farm">52<\/td><td class="admin-heat-good" title="6 \/ 10 came back on day 1">60%<\/td>/);
 assert.match(sourcesHtml({rows:[]}),/No new farmers in this period\./);assert.match(sourcesHtml(),/admin-empty/);
});
