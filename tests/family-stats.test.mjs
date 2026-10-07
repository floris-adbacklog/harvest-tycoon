import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_MIN_LEVEL,emptyFamilyContext,familyMutate,familyWeek,familyWeekStart,familyPublicView,settleFamilyWeeks,createFarm,normalizeFarm,xpForLevel,ITEMS} from '../game/farm-state.js';

// The Farm Family Stats tab (Oct 2026): what the server view adds for it. Each member's chest, order and goods points; how far your
// family is ahead of the next one (also below tenth) and of how many; your family's last eight weeks; your own last week; and the
// order reward preview with the family-level bonus, as the payout gives it. The helpers are the ones in farm-family.test.mjs (a test
// file cannot be imported without running its tests again).
const now=Date.parse('2026-09-15T12:00:00Z'),week=familyWeek(now);
const farm=(level=FAMILY_MIN_LEVEL)=>{const s=createFarm(now);s.xp=xpForLevel(level);s.stats.bread=1;s.stats.made_bread=1;s.stats.sold_eggs=1;return normalizeFarm(s,now);};
const run=(c,s,p,a,t=now,opts={})=>familyMutate(c,s,p,a,t,opts);
const create=(c=emptyFamilyContext(),p='alice',name='Meadow Friends',s=farm())=>run(c,s,p,{type:'family_create',name,emblem:'0'}).context;
const join=(c,p='bob',t=now)=>{c=structuredClone(c);if(!c.players.some(x=>x.player_id===p))c.players.push({player_id:p,username:p,level:FAMILY_MIN_LEVEL});const leader=c.members.find(m=>m.family_id===c.families[0].id&&m.role==='leader'&&!m.left_at);const sent=run(c,farm(),leader.player_id,{type:'family_invite',playerId:p},t);if(sent.failed)return sent.context;const i=sent.context.invitations.find(i=>i.recipient_id===p&&i.status==='pending');return run(sent.context,farm(),p,{type:'family_accept_invite',invitationId:i.id},t).context;};
const contribution=(c,p,item,count,s=farm(),t=now)=>{s.inventory[item]=Math.max(s.inventory[item]??0,count);return run(c,s,p,{type:'family_contribute',week:familyWeek(t),item,count},t);};
function tournamentContext(sizes=[2,2,2],points=[10000,5000,2000]){
 const c=emptyFamilyContext();sizes.forEach((size,i)=>{const id='f'+i;c.families.push({id,name:'Family '+i,emblem:'0',deleted_at:null});for(let j=0;j<size;j++){const player='p'+i+'-'+j;c.members.push({id:player,player_id:player,family_id:id,role:j?'member':'leader',joined_at:now,left_at:null});c.contributions.push({family_id:id,player_id:player,week,points:points[i],order_points:points[i],extra_points:0,lines:{},last_at:now+i});}});return c;
}
const view=(c,p,t=now)=>familyPublicView(c,p,farm(),t);
const byName=v=>Object.fromEntries(v.members.map(m=>[m.playerId,m]));

test('every member shows this week\'s chest, order and goods points; points stay order + goods; the crown is for chest points',()=>{
 let c=join(join(create(),'bob'),'carol');const home=c.families[0].id,order=c.orders[0].lines,[line]=Object.keys(order);
 const alice=farm();alice.inventory.wheat=500;
 c=contribution(c,'alice',line,order[line],alice).context;   // a whole line: order points, and Tournament goods unlock
 c=run(c,alice,'alice',{type:'family_tournament_goods',week,item:'wheat',count:100}).context;
 const small=Object.keys(order).find(k=>k!==line),count=Math.ceil(500/ITEMS[small].sell);c=contribution(c,'bob',small,count).context;
 // What the database trigger writes as members play (family-chest.sql): this week, last week, and carol's few points in the family
 // she was in before this one. Last week's delivery by alice does not count either.
 c.chestPlayers=[{family_id:home,week,player_id:'alice',points:2400},{family_id:home,week,player_id:'bob',points:3100},{family_id:home,week:week-1,player_id:'carol',points:900},{family_id:'old-family',week,player_id:'carol',points:50}];
 c.contributions.push({family_id:home,week:week-1,player_id:'alice',points:9999,order_points:9999,extra_points:0,lines:{},last_at:now-7*86400000});
 const v=view(c,'alice'),m=byName(v),deliveredLine=order[line]*ITEMS[line].sell;
 assert.deepEqual([m.alice.orderPoints,m.alice.extraPoints,m.alice.points,m.alice.chestPoints],[deliveredLine,100*ITEMS.wheat.sell,deliveredLine+100*ITEMS.wheat.sell,2400]);
 assert.deepEqual([m.bob.orderPoints,m.bob.extraPoints,m.bob.points,m.bob.chestPoints],[count*ITEMS[small].sell,0,count*ITEMS[small].sell,3100]);
 assert.deepEqual([m.carol.orderPoints,m.carol.extraPoints,m.carol.points,m.carol.chestPoints],[0,0,0,0],'nothing yet this week in this family');
 for(const x of v.members)assert.equal(x.points,x.orderPoints+x.extraPoints);
 assert.equal(m.bob.top,true,'the crown goes to the most chest points, not the most tournament points');assert.equal(m.alice.top,false);
 assert.equal(v.chest.mine,2400);assert.equal(v.yourOrderPoints,m.alice.orderPoints);assert.equal(v.extraUsed,m.alice.extraPoints);
 assert.ok(!JSON.stringify(v).includes('player_id'),'still no database ids');
});

test('pointsAhead is the lead over the next family, also below tenth; null when last or without a place',()=>{
 const points=Array.from({length:12},(_,i)=>5000-i*i*10);   // 5,000 4,990 4,960 … 4,190 (10th) 4,000 (11th) 3,790 (12th)
 const c=tournamentContext(Array(12).fill(1),points);
 const first=view(c,'p0-0').tournament,tenth=view(c,'p9-0').tournament,eleventh=view(c,'p10-0').tournament,last=view(c,'p11-0').tournament;
 assert.deepEqual([first.yourRank,first.pointsAhead,first.pointsBehind],[1,10,0]);
 assert.deepEqual([tenth.yourRank,tenth.pointsAhead,tenth.pointsBehind],[10,190,170],'tenth leads the family just outside the prizes');
 assert.deepEqual([eleventh.yourRank,eleventh.pointsAhead,eleventh.pointsBehind,eleventh.familyPoints],[11,210,190,4000]);
 assert.ok(!eleventh.top.some(f=>f.familyId==='f10'),'not in the top-ten list, yet it knows its neighbours');
 assert.deepEqual([last.yourRank,last.pointsAhead,last.pointsBehind],[12,null,210],'nobody below the last family');
 const tie=tournamentContext([1,1],[2000,2000]);assert.equal(view(tie,'p0-0').tournament.pointsAhead,0,'level on points: first by the earlier delivery');
 assert.equal(view(tournamentContext([1],[800]),'p0-0').tournament.pointsAhead,null,'the only family taking part');
 const waiting=create();assert.equal(view(waiting,'alice').tournament.pointsAhead,null,'a family that has not delivered has no place');
});

test('rankOf counts the families that take part this week: points from a member who is still in the family',()=>{
 const c=tournamentContext([2,2,1,1,1],[3000,2000,1000,500,0]);
 // f3's only contributor left the family: its points stay, but it no longer takes part. f4 delivered nothing.
 Object.assign(c.members.find(m=>m.player_id==='p3-0'),{family_id:null,left_at:now});
 for(const p of ['p0-0','p1-1','p2-0','p4-0'])assert.equal(view(c,p).tournament.rankOf,3,p);
 assert.equal(view(c,'p2-0').tournament.yourRank,3);assert.equal(view(c,'p2-0').tournament.rankOf,view(c,'p2-0').tournament.activeFamilies);
 const outside=view(c,'p4-0').tournament;assert.deepEqual([outside.yourRank,outside.pointsAhead],[null,null]);
 const left=view(c,'p3-0').tournament;assert.deepEqual([left.yourRank,left.pointsAhead,left.rankOf],[null,null,3],'a farmer without a family still sees how many take part');
 assert.equal(view(emptyFamilyContext(),'nobody').tournament.rankOf,0);
});

// Ten settled weeks for three families: Family 1 delivers 1,500 every week, Family 0 (two farmers) more each week back, Family 2
// only in even weeks back. Settled the way farm-api settles them, on the first family call of the new week.
function seasons(){
 const c=tournamentContext([2,1,1],[0,0,0]);c.contributions=[];
 const add=(family,player,w,points)=>c.contributions.push({family_id:family,player_id:player,week:w,points,order_points:points,extra_points:0,lines:{},last_at:familyWeekStart(w)+points});
 for(let k=1;k<=10;k++){const w=week-k;add('f0','p0-0',w,300*k);add('f0','p0-1',w,200*k+50);add('f1','p1-0',w,1500);if(k%2===0)add('f2','p2-0',w,1200);}
 settleFamilyWeeks(c,now);return c;
}

test('history is your own family\'s settled weeks, newest first, at most eight, with how many families were ranked',()=>{
 const c=seasons();assert.equal(c.weeks.length,10,'ten weeks settled');
 const h=view(c,'p1-0').tournament.history;
 assert.deepEqual(h.map(r=>r.week),Array.from({length:8},(_,i)=>week-1-i),'the last eight, newest first');
 assert.ok(h.every(r=>r.points===1500&&r.activeMembers===1),'only Family 1');
 for(const r of h){const row=c.results.find(x=>x.week===r.week&&x.family_id==='f1');assert.deepEqual(r,{week:r.week,rank:row.rank,points:1500,diamonds:row.diamonds_pool,activeMembers:1,families:(week-r.week)%2===0?3:2});}
 // One week back: Family 1 is first of two (Family 0 has 550). Two weeks back first of three; three weeks back Family 0 has 1,550
 // and passes it.
 assert.deepEqual([h[0].rank,h[0].families],[1,2]);assert.deepEqual([h[1].rank,h[1].families],[1,3]);assert.deepEqual([h[2].rank,h[2].families],[2,2]);
 assert.ok(h[0].diamonds>0&&Number.isInteger(h[0].diamonds));
 const mine=view(c,'p0-1').tournament.history;assert.ok(mine.every(r=>r.activeMembers===2&&c.results.some(x=>x.week===r.week&&x.family_id==='f0'&&x.points===r.points)),'Family 0 sees its own');
 const even=view(c,'p2-0').tournament.history;assert.deepEqual(even.map(r=>r.week),[2,4,6,8,10].map(k=>week-k),'only the weeks it took part');
 // The past list for every family stays as it was: four weeks, all families.
 assert.equal(view(c,'p1-0').tournament.past.length,c.results.filter(r=>r.week>=week-4).length);
 // A week whose list is incomplete (a missing place) gives no count rather than a wrong one.
 c.results=c.results.filter(r=>!(r.week===week-2&&r.rank===2));assert.equal(view(c,'p1-0').tournament.history[1].families,null);
});

test('lastWeek is the farmer\'s own last week: points, the family\'s place and chest points; null when they did neither',()=>{
 const c=seasons();
 c.chestPlayers=[{family_id:'f1',week:week-1,player_id:'p1-0',points:640},{family_id:'f2',week:week-1,player_id:'p2-0',points:300},{family_id:'f1',week,player_id:'p1-0',points:80}];
 assert.deepEqual(view(c,'p1-0').lastWeek,{week:week-1,points:1500,rank:1,chestPoints:640});
 assert.deepEqual(view(c,'p0-1').lastWeek,{week:week-1,points:250,rank:2,chestPoints:0},'delivered, no chest points');
 assert.deepEqual(view(c,'p2-0').lastWeek,{week:week-1,points:0,rank:null,chestPoints:300},'Family 2 did not deliver one week back');
 assert.equal(view(c,'nobody').lastWeek,null);
});

test('the order reward preview has the family-level bonus and matches the payout, also for a farmer who moved on',()=>{
 // A level-6 family (+50%): nine golden chests in earlier weeks, 36 tiers. Bob, Carol, Dave and Erin each deliver 13 corn (520
 // order points, enough to qualify); Erin then moves to another family. Alice fills the rest and completes the order.
 let c=create();for(const p of ['bob','carol','dave','erin'])c=join(c,p);const home=c.families[0].id;
 c.chests=Array.from({length:9},(_,i)=>({family_id:home,week:week-2-i,points:25000}));
 assert.equal(view(c,'alice').standing.level,6);
 const order=c.orders[0].lines;assert.ok(order.corn>=4*13,'this week\'s order has corn enough for four small deliveries');
 for(const p of ['bob','carol','dave','erin'])c=contribution(c,p,'corn',13).context;
 c=run(c,farm(),'erin',{type:'family_leave'}).context;c=create(c,'zoe','Second Field');
 c=run(c,farm(),'erin',{type:'family_join',familyId:c.families.find(f=>f.name==='Second Field').id}).context;
 const alice=farm();for(const [k,n] of Object.entries(order)){const left=n-(c.orders[0].filled[k]??0);if(left>0)c=contribution(c,'alice',k,left,alice).context;}
 assert.ok(c.orders[0].completed_at,'the order is complete');
 for(const p of ['alice','bob','carol','dave','erin']){
  const v=view(c,p),preview=v.rewardPreview,reward=c.rewards.find(r=>r.player_id===p&&r.kind==='order');
  assert.ok(reward,p);assert.equal(preview.coins,reward.coins,`${p} coins`);assert.equal(preview.xp,reward.xp,`${p} XP`);
  assert.ok(preview.coins>v.yourOrderPoints,'more than the goods\' value: the +50% is in');
  // The completion diamonds all went to Alice (by order points); for everyone else the diamonds are exactly the preview's.
  assert.equal(reward.diamonds,p==='alice'?preview.diamonds+preview.completionBonus:preview.diamonds,`${p} diamonds`);
  // The order is whole: what the week's end would pay now is everything (5 Oct 2026).
  assert.deepEqual([preview.fullLines,preview.lines,preview.now],[4,4,{coins:preview.coins,xp:preview.xp,diamonds:preview.diamonds}],`${p} now`);
 }
 const erin=view(c,'erin');assert.equal(erin.contributionLocked,true);assert.equal(erin.standing.level,1,'her new family is level 1, her order bonus is still the old family\'s');
 assert.deepEqual(view(c,'alice').rewardPreview,{coins:26880,xp:268,diamonds:3,completionBonus:3,fullLines:4,lines:4,now:{coins:26880,xp:268,diamonds:3}},'17,920 order points × 1.5: 26,880 coins, 268 XP, 2 diamonds × 1.5 and 2 × 1.5 shared');
 // At level 1 nothing changes: the goods' value, 1 XP per 100, and the plain 2 shared diamonds (4 until 7 Oct 2026).
 // Without an order there is no full line, so nothing would be paid now.
 const plain=tournamentContext([1],[4080]);assert.deepEqual(view(plain,'p0-0').rewardPreview,{coins:4080,xp:40,diamonds:1,completionBonus:2,fullLines:0,lines:0,now:{coins:0,xp:0,diamonds:0}});
});

test('empty and no-family views: zeros, empty lists and nulls, never an error',()=>{
 const none=view(emptyFamilyContext(),'nobody');
 assert.deepEqual(none.members,[]);assert.deepEqual(none.tournament.history,[]);assert.equal(none.lastWeek,null);
 assert.deepEqual([none.tournament.rankOf,none.tournament.pointsAhead,none.tournament.yourRank],[0,null,null]);
 assert.deepEqual(none.rewardPreview,{coins:0,xp:0,diamonds:1,completionBonus:2,fullLines:0,lines:0,now:{coins:0,xp:0,diamonds:0}});
 // A new family on its first day: everyone at zero, no place, no past weeks, while other families already compete.
 let c=join(create(),'bob');c.families.push({id:'busy',name:'Busy Barn',emblem:'2',deleted_at:null});c.members.push({id:'x',player_id:'x',family_id:'busy',role:'leader',joined_at:now,left_at:null});
 c.contributions.push({family_id:'busy',player_id:'x',week,points:900,order_points:900,extra_points:0,lines:{},last_at:now});
 c.results.push({week:week-1,family_id:'busy',rank:1,points:700,active_members:1,diamonds_pool:100,name:'Busy Barn',emblem:'2',settled_at:now});
 const fresh=view(c,'bob');
 assert.deepEqual(fresh.members.map(m=>[m.orderPoints,m.extraPoints,m.chestPoints,m.points]),[[0,0,0,0],[0,0,0,0]]);
 assert.deepEqual([fresh.tournament.rankOf,fresh.tournament.yourRank,fresh.tournament.pointsAhead],[1,null,null]);
 assert.deepEqual(fresh.tournament.history,[],'another family\'s results are not yours');assert.equal(fresh.lastWeek,null);
 // Without a family the other family's members stay out of view too.
 const outsider=view(c,'stranger');assert.deepEqual(outsider.members,[]);assert.deepEqual(outsider.tournament.history,[]);assert.equal(outsider.tournament.rankOf,1);
});
