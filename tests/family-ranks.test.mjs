import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {FAMILY_MIN_LEVEL,FAMILY_RANKS,FAMILY_MAX_COLEADERS,emptyFamilyContext,familyMutate,familyPublicView,familyTopFarmer,familyProfile,familyWeek,createFarm,normalizeFarm,xpForLevel} from '../game/farm-state.js';
import {rankChip} from '../public/family-profile.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 27 Sep 2026: family ranks. The leader appoints up to two co-leaders, who can do all a leader does except change ranks, hand over
// the leadership and remove the leader or a co-leader; honorary is a title only. And a crown for this week's top farmer.
const now=Date.parse('2026-09-27T12:00:00Z'),week=familyWeek(now);
const farm=()=>{const s=createFarm(now);s.xp=xpForLevel(FAMILY_MIN_LEVEL+5);return normalizeFarm(s,now);};
const run=(c,p,a)=>familyMutate(c,farm(),p,a,now);
function family(names=['alice','bob','carol','dave','erin']){
 let c=run(emptyFamilyContext(),names[0],{type:'family_create',name:'Meadow Friends',emblem:'0'}).context;
 c.players.push(...names.map(p=>({player_id:p,username:p,level:20})));
 for(const p of names.slice(1))c=run(c,p,{type:'family_join',familyId:c.families[0].id}).context;
 return c;
}
const memberOf=(c,p)=>c.members.find(m=>m.player_id===p&&!m.left_at);
const rank=(c,by,p,r)=>run(c,by,{type:'family_rank',memberId:memberOf(c,p).id,rank:r});

test('the leader sets ranks; at most two co-leaders; nobody else changes ranks',()=>{
 assert.deepEqual(Object.keys(FAMILY_RANKS),['leader','coleader','honorary','member']);assert.equal(FAMILY_MAX_COLEADERS,2);
 let c=family();
 c=rank(c,'alice','bob','coleader').context;assert.equal(memberOf(c,'bob').role,'coleader');
 const done=rank(c,'alice','carol','coleader');assert.equal(done.result.message,'carol is now a co-leader.');c=done.context;
 assert.throws(()=>rank(c,'alice','dave','coleader'),/at most 2 co-leaders/);
 c=rank(c,'alice','dave','honorary').context;assert.equal(memberOf(c,'dave').role,'honorary');
 assert.throws(()=>rank(c,'bob','erin','honorary'),/Only the family leader can do this/,'a co-leader cannot change ranks');
 assert.throws(()=>rank(c,'alice','erin','leader'),/Choose a rank/,'the leadership moves with Make leader, not as a rank');
 c=rank(c,'alice','bob','member').context;assert.equal(memberOf(c,'bob').role,'member');
});

test('a co-leader does what the leader does, except remove the leader or the other co-leader',()=>{
 let c=family(['alice','bob','carol','dave']);c=rank(c,'alice','bob','coleader').context;c=rank(c,'alice','carol','coleader').context;
 c=run(c,'bob',{type:'family_emblem',emblem:'3'}).context;assert.equal(c.families[0].emblem,'3');
 c=run(c,'bob',{type:'family_join_mode',mode:'request'}).context;
 assert.throws(()=>run(c,'bob',{type:'family_kick',memberId:memberOf(c,'alice').id}),/cannot remove the leader or the other co-leader/);
 assert.throws(()=>run(c,'bob',{type:'family_kick',memberId:memberOf(c,'carol').id}),/cannot remove the leader or the other co-leader/);
 c=run(c,'bob',{type:'family_kick',memberId:memberOf(c,'dave').id}).context;assert.equal(memberOf(c,'dave'),undefined);
 assert.throws(()=>run(c,'bob',{type:'family_promote',memberId:memberOf(c,'carol').id}),/Only the family leader/,'handing over the leadership stays with the leader');
 const view=familyPublicView(c,'bob',farm(),now);assert.equal(view.family.manager,true);assert.equal(view.family.leader,false);assert.equal(view.family.role,'coleader');
 assert.equal(familyPublicView(c,'alice',farm(),now).family.manager,true);
});

test('when the leader leaves, a co-leader takes over first',()=>{
 let c=family(['alice','bob','carol']);c=rank(c,'alice','carol','coleader').context;
 c=run(c,'alice',{type:'family_leave'}).context;
 assert.equal(memberOf(c,'carol').role,'leader','the co-leader, although bob joined earlier');assert.equal(memberOf(c,'bob').role,'member');
});

test('top farmer of the week: the most Family Chest points this week, a current member, nobody before the first point',()=>{
 const c=family(['alice','bob','carol']),id=c.families[0].id;
 assert.equal(familyTopFarmer(c,id,week),null);
 c.chestPlayers=[{family_id:id,week,player_id:'bob',points:900},{family_id:id,week,player_id:'carol',points:1200},{family_id:id,week:week-1,player_id:'alice',points:9000},{family_id:id,week,player_id:'zed',points:5000}];
 assert.equal(familyTopFarmer(c,id,week),'carol','last week and farmers who left do not count');
 const view=familyPublicView(c,'alice',farm(),now);assert.deepEqual(view.members.filter(m=>m.top).map(m=>m.username),['carol']);
 const profile=familyProfile(c,id,'alice',farm(),now);assert.equal(profile.members.find(m=>m.top).username,'carol');
});

test('ranks and the crown on screen, and the database allows the new ranks',()=>{
 assert.equal(rankChip({role:'member'}),'');
 assert.match(rankChip({role:'coleader'}),/class="family-role family-role-coleader"><img[^>]*data-art="family-rank-coleader"[^>]*>Co-leader</);
 assert.match(rankChip({role:'honorary',top:true}),/data-art="family-rank-honorary"[^>]*>Honorary<\/span><span class="family-top"[^>]*><img[^>]*data-art="family-rank-top"[^>]*>Top farmer<\/span>/);
 for(const r of ['leader','coleader','honorary','member','top'])assert.ok(existsSync(new URL(`../public/assets/icons/family-rank-${r}.webp`,import.meta.url)),r);
 const ui=read('public/family-ui.js');
 assert.match(ui,/actionButton\('family_rank',/);assert.match(ui,/memberId:b\.dataset\.memberId,rank:b\.dataset\.rank,/);
 assert.match(ui,/const canRemove=m=>f\.leader\|\|f\.manager&&!\['leader','coleader'\]\.includes\(m\.role\);/);
 assert.match(ui,/const manager=view\.family\.manager,closed=view\.family\.mode==='closed';/);assert.match(ui,/const invite=manager\?/);assert.match(ui,/offer\(player\)\{if\(!view\?\.family\?\.manager\|\|/);
 assert.match(read('public/family-invitations-ui.js'),/if\(!view\.family\?\.manager\)return '';/);
 assert.match(read('supabase/family-ranks.sql'),/check \(role in \('leader','coleader','honorary','member'\)\)/);
 assert.match(read('supabase/functions/farm-api/family-service.js'),/\(m\.role==='leader'\|\|m\.role==='coleader'\)/,'a new join request reaches the co-leaders too');
 assert.match(read('public/wiki-content.js'),/section\('Ranks and the top farmer'/);
});
