import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_MIN_LEVEL,FAMILY_CONFIG as C,FAMILY_EMBLEMS,emptyFamilyContext,familyMutate,familyOrder,familyWeek,familyWeekStart,familyUnlocked,familyUnlockHint,familyPublicView,familyTournament,settleFamilyWeeks,familyShares,createFarm,normalizeFarm,xpForLevel,levelOf,featureUnlocked,featureUnlockHint,unlockEntries,buildingEligible,ITEMS,CROPS,RECIPES,recipeAvailability,cropUnlocked,DAY_MS} from '../game/farm-state.js';
import {handleFamily,familyChanges} from '../supabase/functions/farm-api/family-service.js';
const now=Date.parse('2026-09-15T12:00:00Z'),week=familyWeek(now);
const farm=(level=FAMILY_MIN_LEVEL)=>{const s=createFarm(now);s.xp=xpForLevel(level);s.stats.bread=1;s.stats.made_bread=1;s.stats.sold_eggs=1;return normalizeFarm(s,now);};
const run=(c,s,p,a,t=now,opts={})=>familyMutate(c,s,p,a,t,opts);
const create=(c=emptyFamilyContext(),p='alice',name='Meadow Friends',s=farm())=>run(c,s,p,{type:'family_create',name,emblem:'0'}).context;
const join=(c,p='bob',t=now)=>{c=structuredClone(c);if(!c.players.some(x=>x.player_id===p))c.players.push({player_id:p,username:p,level:FAMILY_MIN_LEVEL});const leader=c.members.find(m=>m.family_id===c.families[0].id&&m.role==='leader'&&!m.left_at);const sent=run(c,farm(),leader.player_id,{type:'family_invite',playerId:p},t);if(sent.failed)return sent.context;const i=sent.context.invitations.find(i=>i.recipient_id===p&&i.status==='pending');return run(sent.context,farm(),p,{type:'family_accept_invite',invitationId:i.id},t).context;};
const contribution=(c,p,item,count,s=farm(),t=now)=>{s.inventory[item]=Math.max(s.inventory[item]??0,count);return run(c,s,p,{type:'family_contribute',week:familyWeek(t),item,count},t);};
function tournamentContext(sizes=[2,2,2],points=[10000,5000,2000]){
 const c=emptyFamilyContext();sizes.forEach((size,i)=>{const id='f'+i;c.families.push({id,name:'Family '+i,emblem:'0',deleted_at:null});for(let j=0;j<size;j++){const player='p'+i+'-'+j;c.members.push({id:player,player_id:player,family_id:id,role:j?'member':'leader',joined_at:now,left_at:null});c.contributions.push({family_id:id,player_id:player,week,points:points[i],order_points:points[i],extra_points:0,lines:{},last_at:now+i});}});return c;
}
test('Family gate uses shared level, supports an override, and also gates legacy saves',()=>{
 const s=farm(FAMILY_MIN_LEVEL-1);assert.equal(familyUnlocked(s),false);assert.equal(familyUnlocked(s,FAMILY_MIN_LEVEL-1),true);delete s.progression;
 assert.equal(featureUnlocked(s,'family'),false);assert.equal(buildingEligible(s,'familyhall'),false);
 assert.equal(featureUnlockHint('family'),familyUnlockHint());assert.match(familyUnlockHint(17),/17/);
 assert.throws(()=>run(emptyFamilyContext(),s,'p',{type:'family_create'}),new RegExp(String(FAMILY_MIN_LEVEL)));
 assert.equal(run(emptyFamilyContext(),s,'p',{type:'family_read'},now,{minLevel:FAMILY_MIN_LEVEL-1}).failed,false);
 const s2=farm();assert.equal(featureUnlocked(s2,'family'),true);assert.ok(unlockEntries(s2).some(e=>e.id==='feature:family'&&e.unlocked));
});
test('UTC family week changes exactly at Monday midnight',()=>{const monday=Date.parse('2026-09-21T00:00:00Z');assert.equal(familyWeek(monday-1)+1,familyWeek(monday));assert.equal(familyWeekStart(familyWeek(monday)),monday);});
test('Orders are reproducible, scale to snapshots, and fit a level-10 value and production band',()=>{
 const s=farm();for(const b of Object.values(s.buildings))b.built=true;
 for(let day=0;day<150;day++)for(const size of [1,2,6]){
  const order=familyOrder('family-'+day,week+day,size),solo=familyOrder('family-'+day,week+day,1);
  assert.deepEqual(order,familyOrder('family-'+day,week+day,size));assert.equal(order.value,solo.value*size);
  assert.ok(order.value/size>=C.ORDER_MIN_VALUE_PER_MEMBER&&order.value/size<=C.ORDER_MAX_VALUE_PER_MEMBER);
  assert.equal(Object.keys(order.lines).length,4);assert.ok(order.lines.honey);
  for(const [key,count]of Object.entries(order.lines)){assert.equal(count,solo.lines[key]*size);if(CROPS[key])assert.ok(cropUnlocked(s,key),key);else if(key!=='honey')assert.ok(Object.entries(RECIPES).some(([id,r])=>r.output[key]&&!recipeAvailability(s,id).locked),key);}
 }
});
test('Create and join enforce names, emblems, member limit and code privacy',()=>{
 let c=create();assert.equal(c.families[0].is_open,false);assert.match(c.families[0].invite_code,/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
 assert.ok(run(c,farm(),'other',{type:'family_create',name:'meadow friends',emblem:'0'}).failed);
 assert.ok(run(c,farm(),'other',{type:'family_create',name:'Bad<script>',emblem:'0'}).failed);
 assert.ok(run(c,farm(),'other',{type:'family_create',name:'Valid farm',emblem:'unknown'}).failed);
 for(let i=1;i<C.MAX_MEMBERS;i++)c=join(c,'p'+i);
 const full=run(c,farm(),'extra',{type:'family_join',code:c.families[0].invite_code}),invalid=run(c,farm(),'extra',{type:'family_join',code:'XXXXXX'});
 assert.equal(full.result.error,invalid.result.error);assert.equal(c.members.length,C.MAX_MEMBERS);
});
test('Order member snapshot is fixed after members join',()=>{const c=create(),o=structuredClone(c.orders[0]),next=join(c);assert.deepEqual(next.orders[0],o);});
test('A valid contribution deducts precisely once, tracks base value, and cannot overfill',()=>{
 let c=create();const s=farm(),item=Object.keys(c.orders[0].lines)[0],target=c.orders[0].lines[item];s.inventory[item]=target+20;
 const r=run(c,s,'alice',{type:'family_contribute',week,item,count:target});c=r.context;
 assert.equal(s.inventory[item],20);assert.equal(c.orders[0].filled[item],target);assert.equal(c.contributions[0].points,target*ITEMS[item].sell);
 assert.throws(()=>run(c,s,'alice',{type:'family_contribute',week,item,count:1}),/exceeds/);assert.equal(s.inventory[item],20);
 for(const a of [{item:'fake',count:1},{item,count:0},{item,count:1.5},{item,count:Infinity}])assert.throws(()=>run(c,s,'alice',{type:'family_contribute',week,...a}),/valid/);
 assert.throws(()=>run(c,s,'alice',{type:'family_contribute',week:week-1,item,count:1}),/new week/);
 const another=Object.keys(c.orders[0].lines)[1];assert.throws(()=>run(c,s,'alice',{type:'family_contribute',week,item:another,count:1}),/enough/);
});
test('Completion rewards exclude below-threshold contributions; claim is once and expires',()=>{
 let c=join(create());const alice=farm(),bob=farm(),item=Object.keys(c.orders[0].lines)[0];c=contribution(c,'bob',item,1,bob).context;
 for(const [k,n] of Object.entries(c.orders[0].lines))c=contribution(c,'alice',k,n-(c.orders[0].filled[k]??0),alice).context;
 assert.ok(c.orders[0].completed_at);assert.equal(c.rewards.filter(r=>r.player_id==='bob').length,0);assert.equal(c.rewards.length,1);
 const r=c.rewards[0],before={coins:alice.coins,xp:alice.xp,diamonds:alice.diamonds};
 const claimed=run(c,alice,'alice',{type:'family_claim',rewardId:r.id});assert.ok(alice.coins>=before.coins+r.coins);assert.equal(alice.xp,before.xp+r.xp);assert.ok(alice.diamonds>=before.diamonds+r.diamonds);
 const once=structuredClone(alice);assert.throws(()=>run(claimed.context,alice,'alice',{type:'family_claim',rewardId:r.id}),/already/);assert.deepEqual(alice,once);
 assert.throws(()=>run(c,bob,'bob',{type:'family_claim',rewardId:r.id}),/unavailable/);
 assert.throws(()=>run(c,alice,'alice',{type:'family_claim',rewardId:r.id},r.expires_at),/expired/);
});
test('Tournament extras unlock on one full line, consume goods for points only and respect cap',()=>{
 let c=create(),s=farm();s.inventory.wheat=100000;assert.throws(()=>run(c,s,'alice',{type:'family_tournament_goods',week,item:'wheat',count:1}),/Fill one/);
 const [item,count]=Object.entries(c.orders[0].lines)[0];c=contribution(c,'alice',item,count,s).context;const prev=structuredClone(s);
 const r=run(c,s,'alice',{type:'family_tournament_goods',week,item:'wheat',count:10});assert.equal(s.inventory.wheat,prev.inventory.wheat-10);for(const k of ['coins','xp','diamonds'])assert.equal(s[k],prev[k]);assert.equal(r.context.contributions[0].extra_points,ITEMS.wheat.sell*10);
 assert.throws(()=>run(r.context,s,'alice',{type:'family_tournament_goods',week,item:'wheat',count:10000}),/weekly/);
});
test('Tournament settles once, pays the top three and gives a solo winner the whole first prize',()=>{
 const c=tournamentContext();assert.equal(familyTournament(c,week).pool,200);settleFamilyWeeks(c,familyWeekStart(week+1));
 assert.deepEqual(c.results.map(r=>r.diamonds_pool),[100,60,40]);assert.equal(c.rewards.reduce((n,r)=>n+r.diamonds,0),200);assert.ok(c.rewards.every(r=>r.diamonds>=1));
 const saved=structuredClone(c);assert.deepEqual(settleFamilyWeeks(c,familyWeekStart(week+1)+1),[]);assert.deepEqual(c,saved);
 const solo=tournamentContext([1],[20000]);settleFamilyWeeks(solo,familyWeekStart(week+1));assert.equal(solo.rewards.length,1);assert.equal(solo.rewards[0].diamonds,50);
 const only=tournamentContext([2],[20000]);settleFamilyWeeks(only,familyWeekStart(week+1));assert.equal(only.rewards.reduce((n,r)=>n+r.diamonds,0),60);
});
test('First prize caps at 300; order diamonds are extra; low scores and tiebreak still work',()=>{
 const c=tournamentContext(Array(40).fill(2),Array(40).fill(2000));assert.equal(familyTournament(c,week).firstPrize,300);assert.equal(familyTournament(c,week).pool,600);
 c.rewards.push({id:'old',player_id:'p0-0',week,kind:'order',coins:0,xp:0,diamonds:7});settleFamilyWeeks(c,familyWeekStart(week+1));
 assert.deepEqual(c.results.slice(0,3).map(r=>r.diamonds_pool),[300,180,120]);
 assert.equal(c.rewards.filter(r=>r.player_id==='p0-0').reduce((n,r)=>n+r.diamonds,0),157);
 const tie=tournamentContext([2,2],[2000,2000]);assert.equal(familyTournament(tie,week).qualifying[0].family_id,'f0');
 const low=tournamentContext([2],[1]);assert.equal(familyTournament(low,week).qualifying.length,1);
 const empty=tournamentContext([2],[0]);assert.equal(familyTournament(empty,week).qualifying.length,0);
 assert.deepEqual(familyShares(5,[{player_id:'a',points:900},{player_id:'b',points:100}],25,1),{a:4,b:1});
});
test('Guaranteed 50 diamonds exist before entry; a first positive delivery qualifies even for solo play',()=>{
 const empty=familyTournament(emptyFamilyContext(),week);assert.equal(empty.pool,50);assert.equal(empty.qualifying.length,0);assert.deepEqual(empty.prizes,[]);
 const c=tournamentContext([1],[1]),before=structuredClone(c),v=familyPublicView(c,'p0-0',farm(),now);
 assert.equal(v.tournament.minimumPool,50);assert.equal(v.tournament.entered,true);assert.equal(v.tournament.yourRank,1);assert.equal(v.tournament.yourDiamonds,50);assert.deepEqual(c,before);
 settleFamilyWeeks(c,familyWeekStart(week+1));assert.equal(c.rewards[0].diamonds,50);assert.equal(c.results[0].diamonds_pool,50);
});
test('Missing podium places do not dilute first prize; only occupied top-three places win',()=>{
 const c=tournamentContext([1,1],[100,50]);settleFamilyWeeks(c,familyWeekStart(week+1));
 assert.deepEqual(c.results.map(r=>r.diamonds_pool),[60,36]);assert.equal(c.rewards.reduce((n,r)=>n+r.diamonds,0),96);
 const four=tournamentContext([1,1,1,1],[400,300,200,100]);settleFamilyWeeks(four,familyWeekStart(week+1));
 assert.deepEqual(four.results.map(r=>r.diamonds_pool),[80,48,32,0]);assert.equal(four.rewards.length,3);
});
test('Personal and family prize previews exactly match settlement without the old 25-diamond cap',()=>{
 const c=tournamentContext(Array(40).fill(2),Array(40).fill(2000));
 c.rewards.push({id:'existing-order',player_id:'p0-0',week,kind:'order',coins:0,xp:0,diamonds:7,expires_at:now+DAY_MS});
 const expected=c.members.map(m=>({player:m.player_id,...familyPublicView(c,m.player_id,farm(),now).tournament}));
 assert.equal(expected[0].yourDiamonds,150);
 settleFamilyWeeks(c,familyWeekStart(week+1));
 for(const p of expected){
  assert.equal(p.yourDiamonds,c.rewards.find(r=>r.player_id===p.player&&r.kind==='tournament')?.diamonds??0);
  const family=c.members.find(m=>m.player_id===p.player).family_id;
  assert.equal(p.familyDiamonds,c.results.find(r=>r.family_id===family).diamonds_pool);
 }
});
test('Existing partial order contributions qualify without a reset or completed order',()=>{
 const c=tournamentContext([1],[4080]),s=farm();s.levelRewards=Array.from({length:levelOf(s)},(_,i)=>i+1);const before=structuredClone(s);
 const view=familyPublicView(c,'p0-0',s,now);assert.equal(view.yourPoints,4080);assert.equal(view.tournament.yourDiamonds,50);
 assert.deepEqual(s,before);assert.equal(c.contributions[0].points,4080);assert.equal(c.rewards.length,0);
 settleFamilyWeeks(c,familyWeekStart(week+1));const reward=c.rewards.find(r=>r.kind==='tournament');
 const result=run(c,s,'p0-0',{type:'family_claim',rewardId:reward.id},familyWeekStart(week+1));
 assert.equal(s.diamonds,before.diamonds+50);assert.equal(s.coins,before.coins);assert.equal(s.xp,before.xp);assert.ok(result.context.rewards[0].claimed_at);
 assert.throws(()=>run(result.context,s,'p0-0',{type:'family_claim',rewardId:reward.id},familyWeekStart(week+1)),/already/);
});
test('First prize grows with real weekly contributors, never with idle members or past contributions',()=>{
 for(let count=1;count<=60;count++){
  const c=tournamentContext(Array(count).fill(1),Array(count).fill(100));
  const board=familyTournament(c,week);
  assert.equal(board.activePlayers,count);assert.equal(board.firstPrize,Math.min(300,50+(count-1)*10));
  assert.equal(board.prizes[0].diamonds,board.firstPrize);
 }
 const c=tournamentContext([3],[100]);c.contributions[1].week=week-1;c.contributions[2].points=0;
 c.members.push({player_id:'idle',family_id:'f0',left_at:null});
 assert.equal(familyTournament(c,week).activePlayers,1);assert.equal(familyTournament(c,week).firstPrize,50);
 c.members[0].left_at=now;assert.equal(familyTournament(c,week).activePlayers,0);
});
test('A 300-diamond solo winning share is credited once in addition to existing order rewards',()=>{
 const c=tournamentContext(Array(26).fill(1),Array(26).fill(100));
 c.rewards.push({id:'old-order',player_id:'p0-0',week,kind:'order',coins:0,xp:0,diamonds:7,created_at:now,expires_at:now+20*DAY_MS,claimed_at:now});
 settleFamilyWeeks(c,familyWeekStart(week+1));
 const reward=c.rewards.find(r=>r.player_id==='p0-0'&&r.kind==='tournament');assert.equal(reward.diamonds,300);
 const s=farm();s.levelRewards=Array.from({length:levelOf(s)},(_,i)=>i+1);const before=s.diamonds;
 const claimed=run(c,s,'p0-0',{type:'family_claim',rewardId:reward.id},familyWeekStart(week+1));assert.equal(s.diamonds,before+300);
 assert.throws(()=>run(claimed.context,s,'p0-0',{type:'family_claim',rewardId:reward.id},familyWeekStart(week+1)),/already/);
});
test('Settlement excludes departed members; inactive members remain without rewards',()=>{
 const c=tournamentContext([3],[5000]);c.members[0].family_id=null;c.members[0].left_at=now;c.members.push({id:'inactive',player_id:'inactive',family_id:'f0',role:'member',joined_at:now,left_at:null});settleFamilyWeeks(c,familyWeekStart(week+1));
 assert.equal(c.results[0].active_members,2);assert.equal(c.members.length,4);assert.ok(!c.rewards.some(r=>['p0-0','inactive'].includes(r.player_id)));
});
test('Leave passes leadership to oldest member and enforces cooldown and weekly lock',()=>{
 let c=join(join(create(),'bob',now+1),'carol',now+2);const item=Object.keys(c.orders[0].lines)[0];c=contribution(c,'alice',item,10).context;
 c=run(c,farm(),'alice',{type:'family_leave'},now+10).context;assert.equal(c.members.find(m=>m.player_id==='bob').role,'leader');
 assert.ok(run(c,farm(),'alice',{type:'family_create',name:'New place',emblem:'0'},now+DAY_MS).failed);
 const later=now+C.JOIN_COOLDOWN_MS+11;c=run(c,farm(),'alice',{type:'family_create',name:'New place',emblem:'0'},later).context;
 const newOrder=c.orders.find(o=>o.family_id===c.members.find(m=>m.player_id==='alice').family_id),s=farm(),k=Object.keys(newOrder.lines)[0];s.inventory[k]=100;
 assert.throws(()=>run(c,s,'alice',{type:'family_contribute',week,item:k,count:1},later),/one family/);
 let alone=create();alone=run(alone,farm(),'alice',{type:'family_leave'}).context;assert.ok(alone.families[0].deleted_at);assert.equal(alone.orders.length,1);
});
test('Leader permissions, open joining, kick cooldown, code regeneration and rename cooldown',()=>{
 let c=join(create());assert.throws(()=>run(c,farm(),'bob',{type:'family_open',open:true}),/leader/);
 c=run(c,farm(),'alice',{type:'family_open',open:true}).context;c=run(c,farm(),'carol',{type:'family_join',familyId:c.families[0].id}).context;
 assert.throws(()=>run(c,farm(),'alice',{type:'family_code'}),/valid family action/);
 c=run(c,farm(),'alice',{type:'family_rename',name:'New meadow'}).context;assert.throws(()=>run(c,farm(),'alice',{type:'family_rename',name:'Again'},now+DAY_MS),/seven/);
 c=run(c,farm(),'alice',{type:'family_kick',memberId:c.members.find(m=>m.player_id==='bob').id}).context;assert.equal(c.members.find(m=>m.player_id==='bob').cooldown_until,now+C.JOIN_COOLDOWN_MS);
 c=run(c,farm(),'alice',{type:'family_promote',memberId:c.members.find(m=>m.player_id==='carol').id}).context;assert.equal(c.members.find(m=>m.player_id==='carol').role,'leader');
});
test('Failed invite attempts are persisted and limited, including alternating create requests',()=>{
 let c=emptyFamilyContext();for(let i=0;i<C.ATTEMPTS_PER_HOUR;i++){const r=run(c,farm(),'p',{type:i%2?'family_join':'family_create',code:'INVALID',name:'?',emblem:'0'});assert.ok(r.failed);c=r.context;}
 const blocked=run(c,farm(),'p',{type:'family_join',code:'INVALID'});assert.match(blocked.result.error,/Too many/);assert.equal(blocked.context.attempts[0].count,C.ATTEMPTS_PER_HOUR);
 const after=run(c,farm(),'p',{type:'family_join',code:'INVALID'},now+3600000);assert.equal(after.context.attempts[0].count,1);
});
test('Public view exposes no player IDs, activity timestamps, balances, emails, or other invite codes',()=>{
 let c=join(create());c.players=c.members.map(m=>({player_id:m.player_id,username:m.player_id,level:10,online:true,last_active_at:'secret-time',email:'secret-email',diamonds:900,currency:800}));c.families.push({id:'secret-family',name:'Private',emblem:'1',invite_code:'SECRET',is_open:false,deleted_at:null});
 const v=familyPublicView(c,'alice',farm(),now),json=JSON.stringify(v);for(const secret of ['player_id','last_active','secret-time','secret-email','currency','SECRET'])assert.ok(!json.includes(secret),secret);
 assert.deepEqual(Object.keys(v.members[0]).sort(),['avatarId','id','isSelf','level','online','points','role','username','vipExpiresAt'].sort());assert.equal(v.members[0].online,true);
});
test('Old saves normalize safely and shared copies and existing presence rule match',()=>{
 const s=farm();delete s.family;const b=structuredClone(s);normalizeFarm(s,now);assert.deepEqual(s.family,{familyId:null,unclaimedCount:0});assert.equal(s.coins,b.coins);assert.equal(s.diamonds,b.diamonds);
 for(const path of ['public/farm-state.js','supabase/functions/farm-api/farm-state.js'])assert.equal(readFileSync(path,'utf8'),readFileSync('game/farm-state.js','utf8'));
 assert.equal(readFileSync('src/presence.js','utf8'),readFileSync('supabase/functions/farm-api/presence.js','utf8'));
});
test('Service replay uses permanent receipt without deducting inventory or another commit',async()=>{
 const s=farm(),c=create();c.now=now;c.receipt={result:{points:100,message:'Saved'},failed:false};let calls=0;
 const admin={rpc:async name=>{calls++;assert.equal(name,'harvest_family_context');return {data:c};}};
 const r=await handleFamily({admin,body:{operation:'action',requestId:'old',action:{type:'family_contribute'}},row:{revision:4,receipts:[]},state:s,player:'alice',username:'Alice'});
 assert.equal(calls,1);assert.equal(r.status,200);assert.equal(r.data.revision,4);assert.equal(r.data.result.points,100);
});
test('Service CAS failure retries; failed joins commit rate limits without marking online',async()=>{
 const c=emptyFamilyContext();c.now=now;let saved;
 const admin={rpc:async(name,args)=>name==='harvest_family_context'?{data:c}:(saved=args,{data:false})};
 const args={admin,body:{operation:'action',requestId:'id',action:{type:'family_join',code:'INVALID'}},row:{revision:4,receipts:[]},state:farm(),player:'alice',username:'Alice'};
 assert.equal(await handleFamily(args),null);assert.equal(saved.p_failed,true);assert.equal(saved.p_write_farm,false);assert.equal(saved.p_changes.attempts[0].count,1);
 assert.deepEqual(familyChanges(c,structuredClone(c)),{});
});
test('Migration is additive, RLS/service-only, atomic, replay safe and locks settlement weeks',()=>{
 const sql=readFileSync('supabase/farm-family.sql','utf8');assert.ok(!/create\s+or\s+replace\s+function\s+(public\.)?harvest_commit_farm/i.test(sql));assert.match(sql,/if not public.harvest_commit_farm/);assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/primary key\(reward_id,player_id\)/);assert.match(sql,/primary key\(player_id,request_id\)/);assert.match(sql,/primary key\(player_id,week\)/);assert.match(sql,/security invoker set search_path=''/);assert.match(sql,/revoke all on function public.harvest_family_commit/);
 for(const table of ['families','family_members','family_orders','family_contributions','family_week_results','family_rewards','family_claims']){assert.ok(sql.includes(`create table if not exists public.${table}`));assert.ok(sql.includes(`alter table public.${table} enable row level security`));assert.ok(sql.includes(`revoke all on public.${table} from public, anon, authenticated`));}
});
test('Family read includes the authenticated player identity required by the existing bridge',async()=>{
 const c=create();c.now=now;const admin={rpc:async name=>{assert.equal(name,'harvest_family_context');return {data:c};}};
 const response=await handleFamily({admin,body:{operation:'family'},row:{revision:1,receipts:[]},state:farm(),player:'alice',username:'Alice'});
 assert.equal(response.data.profile.player_id,'alice');assert.ok(response.data.family);assert.equal(response.data.state,undefined);
});
test('The four Family pages each use their own generated PNG and a mobile-visible topbar button',()=>{
 const html=readFileSync('public/farm.html','utf8'),css=readFileSync('public/family.css','utf8');
 for(const key of ['family-weekly-order','family-members','family-tournament','family-management']){assert.ok(html.includes(`data-game-art="${key}"`));assert.ok(readFileSync(`public/assets/icons/${key}.png`).length>1000);}
 assert.match(css,/#family-button:not\(\[hidden\]\)\{display:flex/);assert.match(css,/#family-button\[hidden\]/);
});

test('new emblems preserve existing IDs and only leaders may change them',()=>{
 const old=['wheat','corn','sunflower','apples','berries','honey','bread','milk','eggs','tractor','farm','trophy'];
 assert.deepEqual(FAMILY_EMBLEMS.slice(0,12).map(e=>e.icon),old);assert.equal(FAMILY_EMBLEMS.length,25);
 assert.deepEqual(FAMILY_EMBLEMS.slice(21).map(e=>[e.id,e.icon]),[['21','family-fox'],['22','family-owl'],['23','family-windmill'],['24','family-horseshoe']],'four new emblems, appended after the old ones');
 let c=join(create());const oldInvite=c.families[0].invite_code;
 for(const e of FAMILY_EMBLEMS.slice(12)){
  const result=run(c,farm(),'alice',{type:'family_emblem',emblem:e.id});assert.equal(result.failed,false);c=result.context;assert.equal(c.families[0].emblem,e.id);assert.equal(c.families[0].invite_code,oldInvite);
 }
 assert.throws(()=>run(c,farm(),'bob',{type:'family_emblem',emblem:'0'}),/leader/);
 assert.throws(()=>run(c,farm(),'alice',{type:'family_emblem',emblem:'999'}),/emblem/);
 assert.throws(()=>run(c,farm(),'alice',{type:'family_emblem',emblem:'__proto__'}),/emblem/);
});
test('family standings expose at most ten ranked families while retaining all contributors for prize sizing',()=>{
 const c=tournamentContext(Array(12).fill(1),Array.from({length:12},(_,i)=>1000-i));
 const v=familyPublicView(c,'p0-0',farm(),now);assert.equal(v.tournament.top.length,10);assert.equal(v.tournament.activePlayers,12);assert.equal(v.tournament.top[0].diamonds,160);assert.equal(v.tournament.top[9].diamonds,0);
});
