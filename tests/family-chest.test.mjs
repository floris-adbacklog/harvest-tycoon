import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_MIN_LEVEL,FAMILY_CHEST_TIERS,FAMILY_CHEST_MIN,FAMILY_CHEST_POINTS,FAMILY_LEVEL_STEPS,FAMILY_LEVEL_BONUS,FAMILY_EVENT_BONUS,familyChestTiers,familyLevelFrom,familyStanding,familyWeek,emptyFamilyContext,familyMutate,familyPublicView,createFarm,normalizeFarm,xpForLevel} from '../public/farm-state.js';

// 27 Sep 2026: families of one were the rule (12 of 14). New families are open, the list leads with busy families you can join, a
// farmer alone can leave without waiting, and a weekly Family Chest and a family level give a reason to play together.
const now=Date.parse('2026-09-30T12:00:00Z'),week=familyWeek(now);
const farm=(level=FAMILY_MIN_LEVEL)=>{const s=createFarm(now);s.xp=xpForLevel(level);return normalizeFarm(s,now);};
let ids=0;const uuid=()=>`id-${++ids}`;
const run=(c,p,a,t=now,state=farm())=>familyMutate(c,state,p,a,t,{uuid});
const players=(c,...list)=>{for(const [p,level=20,active=now] of list)c.players.push({player_id:p,username:p,level,last_active_at:new Date(active).toISOString()});return c;};
function family(...members){
 let c=players(emptyFamilyContext(),['lea',30],...members.map(m=>[m,20]));
 c=run(c,'lea',{type:'family_create',name:'Meadow Friends',emblem:'0'}).context;
 for(const m of members)c=run(c,m,{type:'family_join',familyId:c.families[0].id}).context;
 return c;
}
const fid=c=>c.families[0].id;

test('a new family is open, so anyone can join straight away',()=>{
 const c=family('bo');
 assert.equal(c.families[0].join_mode,'open');assert.equal(c.members.filter(m=>m.family_id===fid(c)&&!m.left_at).length,2);
});

test('the chest has four tiers that a busier family fills further; points per action match the database trigger',async()=>{
 assert.deepEqual(FAMILY_CHEST_TIERS.map(t=>[t.id,t.points,t.diamonds,t.coinsPerLevel]),[['wood',1500,3,20],['iron',5000,6,50],['silver',12000,12,100],['gold',25000,25,200]]);
 assert.deepEqual(FAMILY_CHEST_POINTS,{harvested:1,produced:2,deliveries:10,chores:3,activities:2});
 assert.deepEqual([0,1499,1500,4999,5000,12000,25000,99999].map(familyChestTiers),[0,0,1,1,2,3,4,4]);
 const sql=(await import('node:fs')).readFileSync(new URL('../supabase/family-chest.sql',import.meta.url),'utf8');
 for(const [stat,points] of Object.entries(FAMILY_CHEST_POINTS))assert.match(sql,new RegExp(`'${stat}'\\)::bigint,0\\)\\)\\*${points}\\b`),stat);
 assert.match(sql,new RegExp(`floor\\(\\(extract\\(epoch from now\\(\\)\\)\\*1000-4\\*86400000\\)/\\(7\\*86400000\\)\\)`),'the same week as familyWeek');
});

test('every member with enough points gets each tier reached, coins by their own level; below the minimum nothing',()=>{
 let c=family('bo','cas');
 c.chests=[{family_id:fid(c),week,points:5200}];
 c.chestPlayers=[{family_id:fid(c),week,player_id:'lea',points:3000},{family_id:fid(c),week,player_id:'bo',points:FAMILY_CHEST_MIN},{family_id:fid(c),week,player_id:'cas',points:FAMILY_CHEST_MIN-1}];
 c=run(c,'bo',{type:'family_read'}).context;
 const mine=p=>c.rewards.filter(r=>r.player_id===p&&r.kind.startsWith('chest-')).sort((a,b)=>a.diamonds-b.diamonds);
 assert.deepEqual(mine('lea').map(r=>[r.kind,r.coins,r.diamonds]),[['chest-wood',20*30,3],['chest-iron',50*30,6]]);
 assert.deepEqual(mine('bo').map(r=>[r.kind,r.coins,r.diamonds]),[['chest-wood',20*20,3],['chest-iron',50*20,6]]);
 assert.equal(mine('cas').length,0,'below the minimum');
 // Again: nothing twice; the silver tier comes when the chest reaches it.
 c=run(c,'lea',{type:'family_read'}).context;assert.equal(mine('lea').length,2);
 c.chests[0].points=12000;c=run(c,'cas',{type:'family_read'}).context;assert.equal(mine('lea').length,3);
 // Last week's chest still pays a farmer who opens the family on Monday.
 c.chests.push({family_id:fid(c),week:week-1,points:1600});c.chestPlayers.push({family_id:fid(c),week:week-1,player_id:'cas',points:900});
 c=run(c,'cas',{type:'family_read'}).context;assert.deepEqual(mine('cas').map(r=>[r.kind,r.week]),[['chest-wood',week-1]]);
 // Collecting pays out through the family rewards.
 const s=farm(),before=s.diamonds,id=mine('bo')[0].id;const out=run(c,'bo',{type:'family_claim',rewardId:id},now,s);
 assert.equal(s.diamonds,before+3+(out.result.levelReward?.diamonds??0),'the chest diamonds (plus any level rewards the claim also paid)');assert.ok(out.result.message.includes('diamonds'));
});

test('the family level rises with every tier opened and adds 10% per level to the chest and the order',()=>{
 assert.deepEqual(FAMILY_LEVEL_STEPS,[0,3,8,15,24,35,48,63,80,100]);assert.equal(FAMILY_LEVEL_BONUS,.1);
 assert.deepEqual([0,2,3,7,8,99,100,500].map(familyLevelFrom),[1,1,2,2,3,9,10,10]);
 let c=family('bo');
 // Two gold weeks and a silver one before: 4+4+3 = 11 tiers, level 3, +20%.
 c.chests=[{family_id:fid(c),week:week-3,points:30000},{family_id:fid(c),week:week-2,points:25000},{family_id:fid(c),week:week-4,points:12000}];
 assert.deepEqual(familyStanding(c,fid(c)),{tiers:11,level:3,next:15,bonus:.2});
 c.chests.push({family_id:fid(c),week,points:1500});c.chestPlayers=[{family_id:fid(c),week,player_id:'bo',points:500}];
 c=run(c,'bo',{type:'family_read'}).context;
 // This week's wooden chest makes 12 tiers: still level 3, so +20%.
 const wood=c.rewards.find(r=>r.player_id==='bo'&&r.kind==='chest-wood');assert.equal(wood.diamonds,Math.floor(3*1.2));assert.equal(wood.coins,Math.floor(20*20*1.2));
});

test('what the Family screen and the farm get: chest, level, flag data, and a nudge for a family of one',()=>{
 let c=family();c.chests=[{family_id:fid(c),week,points:5100}];c.chestPlayers=[{family_id:fid(c),week,player_id:'lea',points:5100}];
 const s=farm(30),out=run(c,'lea',{type:'family_read'},now,s);const view=familyPublicView(out.context,'lea',s,now);
 assert.equal(view.chest.points,5100);assert.equal(view.chest.mine,5100);assert.deepEqual(view.chest.tiers.map(t=>t.reached),[true,true,false,false]);
 assert.equal(view.chest.tiers[0].coins,20*30);assert.equal(view.standing.level,1);
 assert.deepEqual(s.family,{familyId:fid(c),unclaimedCount:2,name:'Meadow Friends',emblem:'0',level:1});
 assert.equal(view.alone,false,'just created');
 const later=now+4*86400000;assert.equal(familyPublicView(out.context,'lea',s,later).alone,true,'alone for three days');
});

test('a farmer who leaves a family can join another one straight away, alone or not (2 Oct 2026: there was a 48-hour wait)',()=>{
 let c=family();
 const left=run(c,'lea',{type:'family_leave'});assert.equal(left.context.members.find(m=>m.player_id==='lea').cooldown_until,null);assert.match(left.result.message,/right away/);
 c=family('bo');const bo=run(c,'bo',{type:'family_leave'});assert.equal(bo.context.members.find(m=>m.player_id==='bo').cooldown_until,null,'leaving a family with others waits no more');assert.match(bo.result.message,/right away/);
});

test('the family list puts families you can join first, the busiest on top',()=>{
 let c=players(emptyFamilyContext(),['a'],['b'],['c'],['d',20,now-5*86400000],['e'],['new']);
 const make=(leader,name,mode)=>{c=run(c,leader,{type:'family_create',name,emblem:'0'}).context;if(mode)c=run(c,leader,{type:'family_join_mode',mode}).context;return c.families.at(-1).id;};
 make('a','Quiet Invite','invite');const busy=make('b','Busy Open');c=run(c,'c',{type:'family_join',familyId:busy}).context;
 make('d','Sleepy Open');make('e','Asking Farm','request');
 const view=familyPublicView(c,'new',farm(),now);
 assert.deepEqual(view.families.map(f=>f.name),['Busy Open','Asking Farm','Sleepy Open','Quiet Invite']);
 assert.equal(view.families[0].active,2);assert.equal(view.families[2].active,0);assert.equal(view.families[0].level,1);
});

test('three or more finishers from one family share a family bonus at the end of a farm event',async()=>{
 assert.deepEqual(FAMILY_EVENT_BONUS,{finishers:3,coins:200,diamonds:5});
 const sql=(await import('node:fs')).readFileSync(new URL('../supabase/family-chest.sql',import.meta.url),'utf8');
 assert.match(sql,/having count\(\*\)>=3/);assert.match(sql,/coins=p\.coins\+200,diamonds=p\.diamonds\+5/);
});

// 27 Sep 2026: the database refused the chest rewards (family_rewards_kind_check allowed only 'order' and 'tournament'), so a family
// that opened its first tier had every family request fail. Every reward kind the game writes must be allowed there.
test('the database allows every family reward kind the game writes',()=>{
 const sql=readFileSync(new URL('../supabase/family-chest.sql',import.meta.url),'utf8');
 const allowed=/family_rewards_kind_check check \(kind in \(([^)]*)\)\)/.exec(sql)[1].split(',').map(s=>s.trim().replace(/'/g,''));
 for(const kind of ['order','tournament',...FAMILY_CHEST_TIERS.map(t=>`chest-${t.id}`)])assert.ok(allowed.includes(kind),kind);
});
