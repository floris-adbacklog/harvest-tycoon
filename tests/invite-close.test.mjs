import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {linkInvite,handleInvite,qualifiedFriends,setInviteClosed} from '../supabase/functions/farm-api/invite-service.js';
import {handleAdminInvite} from '../supabase/functions/farm-api/admin-service.js';
import {inviteClosedLog} from '../supabase/functions/farm-api/player-log.js';
import {playerDetail} from '../src/admin-players.js';
import {createFarm,DAY_MS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,18,12);
const TONY='11111111-1111-4111-8111-111111111111',ADMIN='22222222-2222-4222-8222-222222222222';
const owner={id:ADMIN,email:'floris@millstone.nl',email_confirmed_at:'2026-09-16T21:12:00Z',signInMethods:['oauth']};

// The owner, 18 Oct 2026, after the research into Invite a friend (every paid invite so far was the inviter's own second account):
// "Niks aanpassen, gewoon mij de mogelijkheid geven om te closen bij een speler ivm cheating en diamonds te crediteren" and then
// "Invite dicht": the rules stay, the admin closes Invite a friend for one farmer (supabase/invite-close.sql).
// A small stand-in for the Supabase client: tables are arrays of rows; select, filters, insert, update and upsert.
function database(tables={}){
 const calls=[];
 const from=table=>{
  const q={filters:[],patch:null,
   select(){return q;},eq(c,v){q.filters.push(r=>r[c]===v);return q;},in(c,v){q.filters.push(r=>v.includes(r[c]));return q;},
   not(c,op,v){q.filters.push(r=>op==='is'?r[c]!=null:r[c]!==v);return q;},gt(c,v){q.filters.push(r=>r[c]>v);return q;},order(){return q;},limit(){return q;},
   rows(){return (tables[table]??=[]).filter(r=>q.filters.every(f=>f(r)));},
   async maybeSingle(){return {data:q.rows()[0]??null,error:null};},
   insert(row){calls.push([table,'insert',row]);(tables[table]??=[]);if(table==='player_invite_codes'&&tables[table].some(r=>r.code===row.code||r.player_id===row.player_id))return Promise.resolve({error:{code:'23505'}});tables[table].push({...row});return Promise.resolve({error:null});},
   upsert(row){calls.push([table,'upsert',row]);(tables[table]??=[]);if(!tables[table].some(r=>r.invitee_id===row.invitee_id))tables[table].push({...row});return Promise.resolve({error:null});},
   update(patch){q.patch=patch;calls.push([table,'update',patch]);return q;},
   then(ok,fail){if(q.patch){for(const r of q.rows())Object.assign(r,q.patch);return Promise.resolve({error:null}).then(ok,fail);}return Promise.resolve({data:q.rows(),error:null}).then(ok,fail);}};
  return q;
 };
 return {from,calls,tables};
}
const closedTony=()=>database({player_invite_codes:[{player_id:'tony',code:'TONYAA',created_at:1,closed_at:now-DAY_MS}],player_stats:[{player_id:'tony',username:'Tony'},{player_id:'anna',username:'Anna'}],
 referrals:[{invitee_id:'anna',referrer_id:'tony',code:'TONYAA',created_at:now-3*DAY_MS,qualified_at:now-DAY_MS,referrer_diamonds:150}]});

test('a closed farmer\'s link starts nothing: no friendship, no reward for either side, and the sign-in page names nobody',async()=>{
 const db=closedTony();
 assert.equal(await linkInvite({admin:db,player:'bram',code:'TONYAA',now}),null);
 assert.equal(db.tables.referrals.length,1,'no new referral');
 const counts=read('supabase/functions/player-counts/index.ts');
 assert.match(counts,/select\('player_id,closed_at'\)\.eq\('code',code\)\.maybeSingle\(\);\n\s*if\(owner\.error\|\|!owner\.data\|\|owner\.data\.closed_at!=null\)return answer\(null\);/);
 db.tables.player_invite_codes[0].closed_at=null;
 assert.deepEqual(await linkInvite({admin:db,player:'bram',code:'TONYAA',now}),{code:'TONYAA',by:'Tony',at:now},'open again: it links as before');
});

test('while closed, no inviter reward reaches the farm; opened again, the held reward arrives',async()=>{
 const db=closedTony();
 assert.deepEqual(await qualifiedFriends(db,'tony'),[]);
 db.tables.player_invite_codes[0].closed_at=null;
 assert.deepEqual(await qualifiedFriends(db,'tony'),[{invitee_id:'anna',referrer_id:'tony',code:'TONYAA',created_at:now-3*DAY_MS,qualified_at:now-DAY_MS,referrer_diamonds:150,username:'Anna'}]);
 assert.deepEqual(await qualifiedFriends(database({referrals:[]}),'tony'),[],'nobody qualified: one query, as before');
});

test('the Invite a friend window of a closed farmer: closed, no link, no code made',async()=>{
 const db=closedTony(),state=createFarm(now);
 const data=await handleInvite({admin:db,player:'tony',username:'Tony',state,now});
 assert.equal(data.closed,true);assert.equal(data.link,null);assert.equal(data.code,null);assert.deepEqual(data.rules,{reward:150,level:10,limit:10,days:30});
 const open=await handleInvite({admin:database({player_invite_codes:[{player_id:'tony',code:'TONYAA',created_at:1,closed_at:null}]}),player:'tony',username:'Tony',state,now});
 assert.equal(open.closed,undefined);assert.equal(open.link,'https://www.harvesttycoon.com/?invite=TONYAA');
 const first=database({}),made=await handleInvite({admin:first,player:'tony',username:'Tony',state,now});
 assert.match(made.code,/^TONY/,'a farmer without a code still gets one the first time');
 const ui=read('public/invite-ui.js');
 assert.match(ui,/if\(data\.closed\)\{content\.innerHTML=`<section class="invite-hero">\$\{art\('invite-friends'\)\}<div><strong>Invite a friend is closed for your account\.<\/strong><span>You can play on as always\. Questions\? Email info@harvesttycoon\.com\.<\/span><\/div><\/section>`;refreshArt\(\);return;\}/);
 assert.match(read('public/farm-share.js'),/invited=Boolean\(info\?\.link\)/,'Share my farm then shares the plain site');
});

test('closing and opening: a code is made for a farmer who has none, a second close changes nothing',async()=>{
 const db=database({player_invite_codes:[]});
 assert.deepEqual(await setInviteClosed({admin:db,player:'tony',username:'Tony',closed:true,now}),{closed:true,closedAt:now,changed:true});
 assert.equal(db.tables.player_invite_codes.length,1);assert.equal(db.tables.player_invite_codes[0].closed_at,now);assert.match(db.tables.player_invite_codes[0].code,/^TONY/);
 assert.deepEqual(await setInviteClosed({admin:db,player:'tony',username:'Tony',closed:true,now:now+5}),{closed:true,closedAt:now,changed:false},'the first closing time stays');
 assert.deepEqual(await setInviteClosed({admin:db,player:'tony',username:'Tony',closed:false,now}),{closed:false,closedAt:null,changed:true});
 assert.equal(db.tables.player_invite_codes[0].closed_at,null);
 assert.deepEqual(await setInviteClosed({admin:db,player:'tony',username:'Tony',closed:false,now}),{closed:false,closedAt:null,changed:false});
 const none=database({player_invite_codes:[]});
 assert.deepEqual(await setInviteClosed({admin:none,player:'tony',username:'Tony',closed:false,now}),{closed:false,closedAt:null,changed:false},'opening a farmer who never had a code makes none');
 assert.equal(none.tables.player_invite_codes.length,0);
});

test('only the admin closes it, for a farmer who exists, and the farmer\'s own log says so',async()=>{
 const db=()=>database({player_invite_codes:[],player_stats:[{player_id:TONY,username:'Tony'}]});
 const ask=(body,user=owner,admin=db())=>handleAdminInvite({admin,body,user,now});
 assert.equal((await ask({playerId:TONY,closed:true},{id:'33333333-3333-4333-8333-333333333333',email:'mod@example.com'})).status,403,'a moderator cannot');
 assert.equal((await ask({playerId:TONY,closed:true},{...owner,signInMethods:['password']})).status,403,'only in a Google session');
 assert.equal((await ask({playerId:'nope',closed:true})).status,400);
 assert.equal((await ask({playerId:TONY,closed:'yes'})).status,400);
 assert.equal((await ask({playerId:'44444444-4444-4444-8444-444444444444',closed:true})).status,404);
 const done=await ask({playerId:TONY,closed:true});
 assert.equal(done.status,200);assert.equal(done.data.closed,true);assert.equal(done.data.changed,true);assert.equal(done.data.profile.player_id,ADMIN);
 assert.deepEqual(inviteClosedLog(true),[{category:'staff',action:'invite_close',text:'The admin closed Invite a friend'}]);
 assert.deepEqual(inviteClosedLog(false),[{category:'staff',action:'invite_open',text:'The admin opened Invite a friend again'}]);
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/'admin_grant','admin_invite','admin_online'/);
 assert.match(api,/if\(body\.operation==='admin_invite'\)\{\n\s*const done=await handleAdminInvite\(\{admin,body,user\}\);\n\s*if\(done\.status===200&&done\.data\?\.changed\)later\(writeLog\(admin,String\(body\.playerId\),inviteClosedLog\(done\.data\.closed\),user\.id\)\);/);
});

test('the dashboard: the farmer\'s page says it is closed, with Close or Open again for the admin only; the Invites list shows it',()=>{
 const p={playerId:TONY,username:'Tony',level:30,xp:1,coins:1,diamonds:1,avatarId:null,createdAt:'2026-10-01T10:00:00Z',lastActiveAt:'2026-10-18T10:00:00Z',lastSignInAt:null,provider:'google',online:false,everPlayed:true,
  vipUntil:null,daysPlayed:3,streak:1,bestStreak:2,guide:10,guideDone:true,guideTotal:10,fields:8,buildings:3,family:null,emailBonus:true,
  activity:[{key:'harvested',label:'Crops harvested',count:10}],earned:{coins:0,diamonds:0},events:{joined:0,finished:0,diamonds:0},chat:{messages:0,reported:0,muted:false,banned:false},invites:{invitedBy:null,friends:3,qualified:3,closed:false}};
 assert.match(playerDetail(p,{now,owner:true}),/3 friends invited \(3 reached level 10\) <button type="button" class="admin-link" data-invite-closed="close">Close<\/button>/);
 const closed=playerDetail({...p,invites:{...p.invites,closed:true}},{now,owner:true});
 assert.match(closed,/<b class="admin-log-open">Invite a friend closed<\/b> <button type="button" class="admin-link" data-invite-closed="open">Open again<\/button>/);
 const mod=playerDetail({...p,invites:{...p.invites,closed:true}},{now,owner:false});
 assert.match(mod,/Invite a friend closed/);assert.doesNotMatch(mod,/data-invite-closed/,'a moderator sees it, without the button');
 const dash=read('src/admin-dashboard.js');
 assert.match(dash,/const invite=event\.target\.closest\('\[data-invite-closed\]'\);if\(invite\)void inviteClosed\(invite\);/);
 assert.match(dash,/confirmLabel:close\?'Close':'Open again',cancelLabel:'Cancel',picture:'invite-friends',tone:close\?'danger':''\}\);/);
 assert.match(dash,/await bridge\.request\(\{operation:'admin_invite',playerId:id,closed:close\}\);if\(view\.detail===id\)await openPlayer\(id\);/);
 assert.match(dash,/\+\$\{i\.inviterReward\} held \(invite closed\)/);
 const analytics=read('supabase/functions/farm-api/admin-analytics-service.js');
 assert.match(analytics,/inviterClosed:closed\.has\(r\.referrer_id\)/);assert.match(analytics,/closed:inviteCode\?\.data\?\.closed_at!=null\}/);
});

test('supabase/invite-close.sql: one nullable column, re-runnable; deleting an account already removes the row',()=>{
 const sql=read('supabase/invite-close.sql');
 assert.match(sql,/^alter table public\.player_invite_codes add column if not exists closed_at bigint;$/m);
 assert.doesNotMatch(sql.replace(/^--.*$/gm,''),/drop|delete|update/i);
 assert.match(read('supabase/delete-account.sql'),/delete from public\.player_invite_codes where player_id=p_player;/);
});
