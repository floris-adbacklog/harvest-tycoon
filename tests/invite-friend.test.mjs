import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,xpForLevel,normalizeFarm,inviteCodeFrom,inviteeReward,inviterRewards,INVITE_REWARD,INVITE_LEVEL,INVITE_LIMIT,INVITE_DAYS,DAY_MS} from '../game/farm-state.js';
import {linkInvite,inviteStatus,handleInvite,inviteLink,ensureInviteCode} from '../supabase/functions/farm-api/invite-service.js';
import {takeInviteFromUrl,pendingInvite,INVITE_KEY,inviteBannerText,inviterName} from '../src/invite-link.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,24,12);
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};

test('the rules: 150 diamonds each when the friend reaches level 10 within 30 days, for at most 10 friends',()=>{
 assert.deepEqual([INVITE_REWARD,INVITE_LEVEL,INVITE_LIMIT,INVITE_DAYS],[150,10,10,30]);
 assert.equal(inviteCodeFrom('Tony',()=>0),'TONYAA');assert.equal(inviteCodeFrom('Boer Slak!',()=>0),'BOERSLAA');assert.equal(inviteCodeFrom('é',()=>0),'FARMAA');
 assert.match(inviteCodeFrom('x',Math.random),/^[A-Z0-9]{4,12}$/);
});
test('the friend is paid once, at level 10, only within 30 days of starting',()=>{
 const farm=()=>{const s=createFarm(now);s.invite={code:'TONYAA',by:'Tony',at:now};normalizeFarm(s,now);return s;};
 const early=farm();early.xp=xpForLevel(9);assert.equal(inviteeReward(early,now),null);
 const s=farm(),before=s.diamonds;s.xp=xpForLevel(10);
 assert.deepEqual(inviteeReward(s,now),{diamonds:150,from:'Tony'});assert.equal(s.diamonds,before+150);assert.equal(inviteeReward(s,now),null,'once');
 const late=farm();late.xp=xpForLevel(12);assert.equal(inviteeReward(late,now+31*DAY_MS),null);
 const plain=createFarm(now);plain.xp=xpForLevel(10);assert.equal(inviteeReward(plain,now),null,'no invite, no reward');
});
test('the inviter is paid once per friend (kept in the farm), never for a friend past the limit',()=>{
 const s=createFarm(now),before=s.diamonds;
 const rows=[{invitee_id:'a',username:'Anna',referrer_diamonds:150},{invitee_id:'b',username:'Bram',referrer_diamonds:0}];
 assert.deepEqual(inviterRewards(s,rows),[{playerId:'a',name:'Anna',diamonds:150}]);assert.equal(s.diamonds,before+150);
 assert.deepEqual(inviterRewards(s,rows),[],'a second load pays nothing');assert.deepEqual(s.inviteRewards,['a']);
 const saved=normalizeFarm(JSON.parse(JSON.stringify(s)),now);assert.deepEqual(saved.inviteRewards,['a']);
});

// A small stand-in for the Supabase client: enough for the invite queries.
function fakeAdmin(tables){
 const calls=[];
 const query=(table)=>{const q={table,filters:[],op:'select',row:null,
  select(){return q;},eq(c,v){q.filters.push(r=>r[c]===v);return q;},in(c,v){q.filters.push(r=>v.includes(r[c]));return q;},not(c,_,v){q.filters.push(r=>r[c]!==v);return q;},gt(c,v){q.filters.push(r=>r[c]>v);return q;},order(){return q;},limit(){return q;},
  rows(){return (tables[table]??=[]).filter(r=>q.filters.every(f=>f(r)));},
  async maybeSingle(){return {data:q.rows()[0]??null,error:null};},
  insert(row){calls.push([table,'insert',row]);if(table==='player_invite_codes'&&(tables[table]??=[]).some(r=>r.code===row.code))return Promise.resolve({error:{code:'23505'}});tables[table].push(row);return Promise.resolve({error:null});},
  upsert(row){calls.push([table,'upsert',row]);(tables[table]??=[]);if(!tables[table].some(r=>r.invitee_id===row.invitee_id))tables[table].push(row);return Promise.resolve({error:null});},
  then(ok){return Promise.resolve({data:q.rows(),error:null}).then(ok);}};return q;};
 return {from:query,calls,tables};
}
test('a new farm with a friend\'s code is linked once; your own code or an unknown one is ignored',async()=>{
 const admin=fakeAdmin({player_invite_codes:[{player_id:'tony',code:'TONYAA'}],player_stats:[{player_id:'tony',username:'Tony'}]});
 assert.deepEqual(await linkInvite({admin,player:'anna',code:' tonyaa ',now}),{code:'TONYAA',by:'Tony',at:now});
 assert.equal(admin.tables.referrals.length,1);assert.deepEqual(admin.tables.referrals[0],{invitee_id:'anna',referrer_id:'tony',code:'TONYAA',created_at:now});
 assert.equal(await linkInvite({admin,player:'tony',code:'TONYAA',now}),null,'not your own code');
 for(const code of ['NOPE99','x',null,'<script>'])assert.equal(await linkInvite({admin,player:'bram',code,now}),null,String(code));
});
test('every farmer gets one code, with new letters on a clash',async()=>{
 const admin=fakeAdmin({player_invite_codes:[{player_id:'other',code:'TONYAA'}]});let n=0;const random=()=>[0,0,.5,.5][n++%4];
 const code=await ensureInviteCode(admin,'tony','Tony',now,random);assert.notEqual(code,'TONYAA');assert.equal(await ensureInviteCode(admin,'tony','Tony',now,random),code,'the same code next time');
 assert.equal(inviteLink('TONYAB'),'https://www.harvesttycoon.com/?invite=TONYAB');
});
test('the Invite a friend screen: link, rules, friends with their status, and who invited you',async()=>{
 const admin=fakeAdmin({player_invite_codes:[{player_id:'tony',code:'TONYAA'}],player_stats:[{player_id:'a',username:'Anna',level:12},{player_id:'b',username:'Bram',level:4},{player_id:'c',username:'Chris',level:3}],
  referrals:[{invitee_id:'a',referrer_id:'tony',created_at:now-5*DAY_MS,qualified_at:now-DAY_MS,referrer_diamonds:150},{invitee_id:'b',referrer_id:'tony',created_at:now-2*DAY_MS,qualified_at:null,referrer_diamonds:0},{invitee_id:'c',referrer_id:'tony',created_at:now-40*DAY_MS,qualified_at:null,referrer_diamonds:0}]});
 const state=createFarm(now);state.invite={code:'MIRAAA',by:'Mira',at:now-DAY_MS};
 const data=await handleInvite({admin,player:'tony',username:'Tony',state,now});
 assert.equal(data.code,'TONYAA');assert.equal(data.link,'https://www.harvesttycoon.com/?invite=TONYAA');assert.equal(data.earned,1);
 assert.deepEqual(data.rules,{reward:150,level:10,limit:10,days:30});
 assert.deepEqual(data.friends.map(f=>[f.name,f.status]),[['Anna','rewarded'],['Bram','playing'],['Chris','expired']]);
 assert.equal(data.invitedBy.name,'Mira');assert.equal(data.invitedBy.rewarded,false);
 assert.equal(inviteStatus({qualified_at:1,referrer_diamonds:0},now),'limit');
});

test('the sign-in page remembers ?invite=CODE for 30 days (not for a browser that already played) and cleans the address',()=>{
 const storage=memory(),replaced=[];const history={state:null,replaceState:(_s,_t,url)=>replaced.push(url)};
 assert.equal(takeInviteFromUrl({location:{href:'https://www.harvesttycoon.com/?invite=tonyaa&source=ad'},history,storage,known:false}),'TONYAA');
 assert.deepEqual(replaced,['/?source=ad']);assert.equal(pendingInvite(storage),'TONYAA');assert.equal(pendingInvite(storage,Date.now()+31*DAY_MS),null);
 const known=memory();assert.equal(takeInviteFromUrl({location:{href:'https://x.test/?invite=TONYAA'},history,storage:known,known:true}),null);assert.equal(known.getItem(INVITE_KEY),null);
 assert.equal(takeInviteFromUrl({location:{href:'https://x.test/?invite=<b>'},history,storage:memory(),known:false}),null);
 assert.equal(takeInviteFromUrl({location:{href:'https://x.test/'},history,storage:memory(),known:false}),null);
 assert.deepEqual(inviteBannerText('Tony'),{title:'Tony invited you to Harvest Tycoon',body:'Reach level 10 and you both get 150 diamonds. Tony will see your player name and level.'});
});
test('the code goes along with the sign-up and the first farm load, and the inviter\'s name comes from player-counts',async()=>{
 const main=read('src/main.js');
 assert.match(main,/options:\{data:\{username:name,\.\.\.\(invite\?\{invite\}:\{\}\)\}/);
 assert.match(main,/initial=await farmRequest\(\{operation:'load',\.\.\.\(inviteCode\?\{inviteCode\}:\{\}\)\}\);clearInvite\(localStore\);/);
 let asked;assert.equal(await inviterName('https://f.test/functions/v1','TONYAA',async url=>{asked=url;return {ok:true,json:async()=>({inviter:'Tony'})};}),'Tony');assert.equal(asked,'https://f.test/functions/v1/player-counts?invite=TONYAA');
 assert.equal(await inviterName('https://f.test','TONYAA',async()=>{throw new Error('offline');}),null);
 const play=read('public/play.html');assert.match(play,/<div id="account-invite" class="account-invite" role="note" hidden>/);
});
test('farm-api: links a brand-new farm only, pays the friend in the level-10 save, pays the inviter on load, and invites into the family',()=>{
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/'admin_retention','invite'\]\.includes\(body\?\.operation\)/);
 // The game only trusts an answer that names this player (src/main.js checks profile.player_id).
 assert.match(api,/if\(body\.operation==='invite'\)return reply\(\{\.\.\.await handleInvite\(\{admin,player:user\.id,username,state,now\}\),profile\}\);/);
 assert.match(read('src/main.js'),/data\.profile\?\.player_id!==user\.id\)throw new Error\('Your session has ended\.'\)/);
 assert.match(api,/else\{const invite=await linkInvite\(\{admin,player:user\.id,code:body\.inviteCode\?\?user\.user_metadata\?\.invite,now\}\)/,'only when no earlier progress exists (no profile)');
 assert.match(api,/const inviteReward=inviteeReward\(state,now\);if\(inviteReward\)result\.inviteReward=inviteReward;/);
 assert.match(api,/if\(inviteReward\)await qualifyInvite\(admin,user\.id,now\)/);
 assert.match(api,/friends=inviterRewards\(state,await qualifiedFriends\(admin,user\.id\)\.catch\(\(\)=>\[\]\)\)/,'a problem with invites never stops a farm from loading');
 assert.match(api,/action:\{type:'family_invite',playerId:friend\.playerId\}/,'the leader\'s own family action, so every family rule applies');
 const sql=read('supabase/invite-a-friend.sql');
 assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on public\.player_invite_codes,public\.referrals from anon,authenticated;/);
 assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/reward:=case when earned<p_limit then p_reward else 0 end;/);assert.match(sql,/check \(invitee_id<>referrer_id\)/);
});
test('where to find it: under Events on desktop, in the More menu on phones, and in the Family tab',()=>{
 const html=read('public/farm.html');
 assert.match(html,/id="events-button"[^\n]*<\/button><button class="side-tool" id="invite-button" aria-haspopup="dialog" aria-label="Invite a friend">/);
 assert.match(html,/<button data-menu-action="invite-button"><i data-game-art="invite-friends"><\/i><span><strong>Invite a friend<\/strong><small>150 diamonds for you both<\/small>/);
 assert.match(read('public/mobile.css'),/\.side-tools #invite-button\{display:none\}/);
 assert.match(read('public/family-ui.js'),/Invite a friend to Harvest Tycoon/);assert.match(read('public/family-ui.js'),/window\.harvestInvite\?\.open\(\)/);
 const ui=read('public/invite-ui.js');assert.match(ui,/host\.navigator\.share\(\{title:'Harvest Tycoon',text,url:data\.link\}\)/);assert.match(ui,/host\.navigator\.clipboard\.writeText\(data\.link\)/);
 assert.match(read('public/visual-icons.js'),/'invite-friends':'invite-friends'/);
});
