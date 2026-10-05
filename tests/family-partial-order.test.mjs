import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_MIN_LEVEL,FAMILY_CONFIG as C,FAMILY_ORDER_LINES,MARKET_PAYOUT_MULTIPLIER,DAY_MS,emptyFamilyContext,familyMutate,familyWeek,familyWeekStart,familyPublicView,settleFamilyWeeks,familyShares,familyOrderPay,createFarm,normalizeFarm,xpForLevel} from '../game/farm-state.js';

// Family Order part payouts (5 Oct 2026, the owner's choice): an order that is not whole when its week ends pays every member with
// MIN_CONTRIB_POINTS order points the share of the whole order's coins, XP and own diamonds that its full lines make, a quarter a
// line; the completion diamonds only come with a whole order, and an order without a full line pays nothing. The helpers are the ones
// in farm-family.test.mjs (a test file cannot be imported without running its tests again).
const now=Date.parse('2026-09-15T12:00:00Z'),week=familyWeek(now),nextWeek=familyWeekStart(week+1);
const farm=(level=FAMILY_MIN_LEVEL)=>{const s=createFarm(now);s.xp=xpForLevel(level);s.stats.bread=1;s.stats.made_bread=1;s.stats.sold_eggs=1;return normalizeFarm(s,now);};
const run=(c,s,p,a,t=now,opts={})=>familyMutate(c,s,p,a,t,opts);
const create=(c=emptyFamilyContext(),p='alice',name='Meadow Friends',s=farm())=>run(c,s,p,{type:'family_create',name,emblem:'0'}).context;
const join=(c,p='bob',t=now)=>{c=structuredClone(c);if(!c.players.some(x=>x.player_id===p))c.players.push({player_id:p,username:p,level:FAMILY_MIN_LEVEL});const leader=c.members.find(m=>m.family_id===c.families[0].id&&m.role==='leader'&&!m.left_at);const sent=run(c,farm(),leader.player_id,{type:'family_invite',playerId:p},t);const i=sent.context.invitations.find(i=>i.recipient_id===p&&i.status==='pending');return run(sent.context,farm(),p,{type:'family_accept_invite',invitationId:i.id},t).context;};
const deliver=(c,p,item,count)=>{const s=farm();s.inventory[item]=count;return run(c,s,p,{type:'family_contribute',week,item,count});};
const orderRewards=c=>c.rewards.filter(r=>r.kind==='order');
// The order's rewards for one member as the rule is written: the whole order's coins, XP and own diamonds (with the family level's
// extra) times full / 4, rounded down. Written out here, apart from familyOrderPay, so the test checks the rule and not itself.
// Diamonds for a part payout: at least 1 per full line, never more than the farmer's own diamonds for the whole order (the owner, 5 Oct 2026).
const ownDiamonds=(points,extra=1)=>Math.floor(Math.min(C.ORDER_DIAMOND_MAX,C.ORDER_DIAMOND_BASE+Math.floor(points/10000))*extra);
const expected=(points,full,extra=1)=>({coins:Math.floor(points*MARKET_PAYOUT_MULTIPLIER*C.ORDER_COIN_MULTIPLIER*extra*full/4),xp:Math.floor(points*C.ORDER_XP_PER_VALUE*extra*full/4),diamonds:full>=4?ownDiamonds(points,extra):Math.min(ownDiamonds(points,extra),Math.max(full,Math.floor(ownDiamonds(points,extra)*full/4)))});

// A family of four this week. The order (made for one member, 20,000 coins of goods) asks for 130 corn, 100 eggs, 10 yarn and 10
// squash. Carol delivers 12 corn (480 points: below the 500 that qualify) and Dave 1 squash (560 points: enough). Then the first
// `full` lines are filled (corn and yarn by Alice, eggs and squash by Bob) and the rest half filled by the same farmer.
function family(full,{chests=0}={}){
 let c=create();for(const p of ['bob','carol','dave'])c=join(c,p);
 if(chests)c.chests=Array.from({length:chests},(_,i)=>({family_id:c.families[0].id,week:week-2-i,points:25000}));
 const lines=c.orders[0].lines;assert.deepEqual(lines,{corn:130,eggs:100,yarn:10,squash:10},'the week\'s order these numbers are worked out for');
 c=deliver(c,'carol','corn',12).context;c=deliver(c,'dave','squash',1).context;
 const by={corn:'alice',eggs:'bob',yarn:'alice',squash:'bob'};
 Object.keys(lines).forEach((item,i)=>{const left=lines[item]-(c.orders[0].filled[item]??0);c=deliver(c,by[item],item,i<full?left:Math.floor(left/2)).context;});
 return c;
}
const points=(c,p)=>c.contributions.find(x=>x.player_id===p&&x.week===week)?.order_points??0;

test('an order has four lines, so every full line is a quarter (the window, the wiki and the tips say so)',()=>{
 assert.equal(FAMILY_ORDER_LINES,4);
 assert.deepEqual([0,1,2,3,4].map(n=>familyOrderPay(20000,1,n,4)),[{coins:0,xp:0,diamonds:0},{coins:5000,xp:50,diamonds:1},{coins:10000,xp:100,diamonds:2},{coins:15000,xp:150,diamonds:3},{coins:20000,xp:200,diamonds:3}]);
});

test('1, 2 and 3 of 4 full lines pay a quarter, half and three quarters when the week settles, to everyone with 500 points',()=>{
 for(const full of [1,2,3]){
  let c=family(full);
  assert.equal(c.orders[0].completed_at,null);assert.equal(orderRewards(c).length,0,'nothing while the week runs');
  // The first family call of the new week settles it (farm-api does it the same way).
  c=run(c,farm(),'alice',{type:'family_read'},nextWeek+60000).context;
  const paid=Object.fromEntries(orderRewards(c).map(r=>[r.player_id,r]));
  assert.deepEqual(Object.keys(paid).sort(),['alice','bob','dave'],`${full} lines: Carol's 480 points do not qualify`);
  for(const p of ['alice','bob','dave']){
   const r=paid[p];assert.deepEqual({coins:r.coins,xp:r.xp,diamonds:r.diamonds},expected(points(c,p),full),`${full} lines, ${p}`);
   assert.equal(r.id,`${week}:order:${p}`);assert.equal(r.week,week);assert.equal(r.claimed_at,null);
   assert.equal(r.expires_at,familyWeekStart(week+1)+C.REWARD_WEEKS*7*DAY_MS,'the same 8 weeks as a whole order');
  }
 }
 // The numbers, written out for 2 of 4 lines: Alice 118 corn and 5 yarn (6,820 points), Bob 100 eggs and 4 squash (7,240), Dave 1
 // squash (560). Half of a coin a point, half of 1 XP per 100, and their 1 diamond (at least 1 a full line, at most the whole order's).
 const c=run(family(2),farm(),'alice',{type:'family_read'},nextWeek).context,paid=Object.fromEntries(orderRewards(c).map(r=>[r.player_id,[r.coins,r.xp,r.diamonds]]));
 assert.deepEqual(paid,{alice:[3410,34,1],bob:[3620,36,1],dave:[280,2,1]});
});

test('the family level adds its bonus to a part payout as to a whole one',()=>{
 // Nine golden chests in earlier weeks: level 6, +50%.
 const c=run(family(3,{chests:9}),farm(),'alice',{type:'family_read'},nextWeek).context;
 assert.equal(familyPublicView(c,'alice',farm(),nextWeek).standing.level,6);
 for(const r of orderRewards(c))assert.deepEqual({coins:r.coins,xp:r.xp,diamonds:r.diamonds},expected(points(c,r.player_id),3,1.5),r.player_id);
 // Alice: 118 corn and 10 yarn, 8,920 points: × 1.5 × 3/4 is 10,035 coins, 100 XP and 1 diamond (1 × 1.5 × 3/4, rounded down).
 assert.deepEqual((({coins,xp,diamonds})=>[coins,xp,diamonds])(orderRewards(c).find(r=>r.player_id==='alice')),[10035,100,1]);
});

test('an order without a full line pays nothing; the tournament still pays',()=>{
 const c=run(family(0),farm(),'alice',{type:'family_read'},nextWeek).context;
 assert.equal(orderRewards(c).length,0);assert.ok(c.rewards.some(r=>r.kind==='tournament'),'every delivery still counts for the tournament');
 assert.ok(c.weeks.some(w=>w.week===week),'the week is settled all the same');
});

test('a whole order is paid as before, at once, with the completion diamonds; settling the week adds nothing',()=>{
 const c=family(4),order=c.orders[0];
 assert.ok(order.completed_at,'the last delivery completes it');
 const eligible=c.contributions.filter(x=>x.week===week&&x.order_points>=C.MIN_CONTRIB_POINTS).map(x=>({...x,points:x.order_points}));
 const bonus=familyShares(C.ORDER_COMPLETION_DIAMONDS,eligible,Infinity,0);
 // The payout as completeFamilyOrder wrote it before 5 Oct 2026, number for number.
 for(const r of orderRewards(c)){const p=points(c,r.player_id);
  assert.deepEqual([r.coins,r.xp,r.diamonds],[Math.floor(p*MARKET_PAYOUT_MULTIPLIER*C.ORDER_COIN_MULTIPLIER),Math.floor(p*C.ORDER_XP_PER_VALUE),Math.floor(Math.min(C.ORDER_DIAMOND_MAX,C.ORDER_DIAMOND_BASE+Math.floor(p/10000))+(bonus[r.player_id]??0))],r.player_id);}
 assert.deepEqual(orderRewards(c).map(r=>r.player_id).sort(),['alice','bob','dave']);
 assert.equal(orderRewards(c).reduce((n,r)=>n+r.diamonds,0)-orderRewards(c).reduce((n,r)=>n+expected(points(c,r.player_id),4).diamonds,0),C.ORDER_COMPLETION_DIAMONDS,'the 4 completion diamonds, on top');
 const before=structuredClone(orderRewards(c)),settled=run(c,farm(),'alice',{type:'family_read'},nextWeek).context;
 assert.deepEqual(orderRewards(settled),before,'the week settles without a second order payout');
});

test('the completion diamonds come only with a whole order: three full lines share none of them',()=>{
 const c=run(family(3),farm(),'alice',{type:'family_read'},nextWeek).context;
 assert.equal(orderRewards(c).reduce((n,r)=>n+r.diamonds,0),orderRewards(c).reduce((n,r)=>n+expected(points(c,r.player_id),3).diamonds,0));
 for(const r of orderRewards(c))assert.ok(r.diamonds<=ownDiamonds(points(c,r.player_id)),'never more than the whole order would give the farmer');
});

test('500 order points qualify for a part payout; 499 do not',()=>{
 let c=family(2);
 // Erin joins and delivers 1 yarn; the goods come in 40, 50, 420 and 560 points, so the edge is set by hand: Erin 499, Dave 500.
 c=join(c,'erin');c=deliver(c,'erin','yarn',1).context;
 for(const [p,n] of [['erin',C.MIN_CONTRIB_POINTS-1],['dave',C.MIN_CONTRIB_POINTS]])Object.assign(c.contributions.find(x=>x.player_id===p),{points:n,order_points:n});
 c=run(c,farm(),'alice',{type:'family_read'},nextWeek).context;
 assert.ok(!orderRewards(c).some(r=>r.player_id==='erin'||r.player_id==='carol'));
 assert.deepEqual((({coins,xp,diamonds})=>({coins,xp,diamonds}))(orderRewards(c).find(r=>r.player_id==='dave')),expected(C.MIN_CONTRIB_POINTS,2));
});

test('settling twice pays once: a second settle, a later read and a claim never add an order reward',()=>{
 const c=family(3);
 const first=run(c,farm(),'alice',{type:'family_read'},nextWeek).context,once=structuredClone(first);
 assert.deepEqual(settleFamilyWeeks(first,nextWeek+DAY_MS),[]);assert.deepEqual(first,once,'nothing left to settle');
 const later=run(first,farm(),'bob',{type:'family_read'},nextWeek+2*DAY_MS).context;assert.deepEqual(orderRewards(later),orderRewards(once));
 // Bob collects his; the week stays settled and his reward stays one.
 const bob=farm(),reward=orderRewards(later).find(r=>r.player_id==='bob'),coins=bob.coins;
 const claimed=run(later,bob,'bob',{type:'family_claim',rewardId:reward.id},nextWeek+3*DAY_MS).context;assert.ok(bob.coins>=coins+reward.coins);
 const again=run(claimed,farm(),'alice',{type:'family_read'},nextWeek+4*DAY_MS).context;
 assert.equal(orderRewards(again).filter(r=>r.player_id==='bob').length,1);assert.throws(()=>run(again,bob,'bob',{type:'family_claim',rewardId:reward.id},nextWeek+4*DAY_MS),/already/);
 // A reward already written for the week (a whole order paid earlier) is never paid a second time by the settle.
 const paid=family(3);paid.rewards.push({id:`${week}:order:alice`,player_id:'alice',week,kind:'order',coins:1,xp:1,diamonds:1,created_at:now,expires_at:nextWeek+DAY_MS,claimed_at:now});
 const settled=run(paid,farm(),'bob',{type:'family_read'},nextWeek).context;assert.deepEqual(orderRewards(settled).filter(r=>r.player_id==='alice').map(r=>r.coins),[1]);
});

test('the preview says what the week\'s end would pay now, and the settle pays exactly that',()=>{
 for(const full of [0,1,2,3,4]){
  const c=family(full,{chests:4}),views=Object.fromEntries(['alice','bob','carol','dave'].map(p=>[p,familyPublicView(c,p,farm(),now).rewardPreview]));
  const settled=run(c,farm(),'alice',{type:'family_read'},nextWeek).context;
  for(const [p,preview] of Object.entries(views)){
   assert.equal(preview.fullLines,full);assert.equal(preview.lines,4);
   const r=orderRewards(settled).find(x=>x.player_id===p);
   if(p==='carol'||full===0){assert.deepEqual(preview.now,{coins:0,xp:0,diamonds:0},`${p}, ${full} lines`);assert.equal(r,undefined);continue;}
   if(full<4){assert.deepEqual({coins:r.coins,xp:r.xp,diamonds:r.diamonds},preview.now,`${p}, ${full} lines`);continue;}
   // A whole order adds the member's share of the completion diamonds, which the preview shows apart (completionBonus, shared).
   assert.deepEqual([r.coins,r.xp],[preview.now.coins,preview.now.xp],`${p}, whole order`);
   assert.ok(r.diamonds>=preview.now.diamonds&&r.diamonds<=preview.now.diamonds+preview.completionBonus,`${p}, whole order diamonds`);
   // What a whole order would give stays in the preview beside it.
   assert.deepEqual({coins:preview.coins,xp:preview.xp,diamonds:preview.diamonds},familyOrderPay(points(c,p),1+familyPublicView(c,p,farm(),now).standing.bonus,1,1));
  }
 }
});

test('a delivery that fills a line says what a full line is worth',()=>{
 let c=create();
 const part=deliver(c,'alice','corn',100);assert.match(part.result.message,/^100 Corn contributed\. Thank you!$/);
 const fill=deliver(part.context,'alice','corn',30);assert.equal(fill.result.message,'30 Corn contributed. That line is full: every full line pays a quarter of the rewards.');
});
