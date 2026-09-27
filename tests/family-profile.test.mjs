import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {familyProfile,emptyFamilyContext,familyWeek,createFarm,xpForLevel,FAMILY_MIN_LEVEL} from '../game/farm-state.js';
import {familyProfileAction} from '../public/family-profile.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 27 Sep 2026: a family's profile, opened from a farmer's profile, the list of families, your own family's heading and the
// tournament: its level, its farmers and how it has done.
const now=Date.UTC(2026,8,27,12),week=familyWeek(now);
function context(){
 const c=emptyFamilyContext();
 c.families=[{id:'f1',name:'Berry Cool',emblem:'5',join_mode:'request',created_at:'2026-09-18T10:00:00Z'},{id:'gone',name:'Old',emblem:'1',deleted_at:'2026-09-20T00:00:00Z'}];
 c.members=[{player_id:'a',family_id:'f1',role:'member'},{player_id:'b',family_id:'f1',role:'leader'},{player_id:'c',family_id:'f1',role:'member',left_at:'2026-09-21T00:00:00Z'}];
 c.players=[{player_id:'a',username:'Anna',level:30,online:true,avatar_id:'orchard-grower'},{player_id:'b',username:'Bram',level:12},{player_id:'c',username:'Chris',level:50}];
 c.results=[{week:week-1,family_id:'f1',rank:1,points:9000},{week:week-2,family_id:'f1',rank:3,points:5000},{week:week-3,family_id:'f1',rank:6,points:900},{week:week-1,family_id:'other',rank:2,points:8000}];
 c.orders=[{family_id:'f1',week:week-1,completed_at:1},{family_id:'f1',week,completed_at:null}];
 c.chests=[{family_id:'f1',week:week-1,points:5200},{family_id:'f1',week,points:1600}];
 c.contributions=[{family_id:'f1',player_id:'a',week,points:1400,last_at:now-1000}];
 return c;
}
const farmAt=level=>{const s=createFarm(now);s.xp=xpForLevel(level);return s;};

test('the profile: members (leader first), level, tournaments, chests, orders and this week',()=>{
 const p=familyProfile(context(),'f1','x',farmAt(20),now);
 assert.equal(p.name,'Berry Cool');assert.equal(p.mode,'request');assert.equal(p.createdAt,Date.parse('2026-09-18T10:00:00Z'));
 assert.deepEqual(p.members.map(m=>[m.username,m.leader,m.online]),[['Bram',true,false],['Anna',false,true]],'the leader first, a farmer who left is not listed');
 assert.equal(p.online,1);assert.equal(p.full,false);assert.equal(p.maxMembers,10);
 assert.deepEqual(p.stats,{wins:1,podiums:2,tournaments:3,bestRank:1,chestTiers:p.standing.tiers,orders:1});
 assert.ok(p.standing.tiers>=3,'5,200 and 1,600 points open chest tiers');
 assert.equal(p.thisWeek.chestPoints,1600);assert.equal(p.thisWeek.points,1400);assert.equal(p.thisWeek.rank,1);
 assert.deepEqual(p.recent.map(r=>r.rank),[1,3,6]);
 assert.equal(familyProfile(context(),'gone','x',farmAt(20),now),null,'a family that is gone has no profile');
 assert.equal(familyProfile(context(),'nope','x',farmAt(20),now),null);
});

test('what the farmer looking can do, in the same words as the list of families',()=>{
 const c=context(),base=familyProfile(c,'f1','x',farmAt(20),now);
 assert.deepEqual(familyProfileAction(base),{button:'family_request',label:'Ask to join'});
 assert.deepEqual(familyProfileAction(familyProfile(c,'f1','a',farmAt(20),now)),{button:'open',label:'Open your family'});
 assert.equal(familyProfileAction({...base,mode:'open'}).button,'family_join');
 assert.match(familyProfileAction({...base,viewer:{...base.viewer,unlocked:false}}).note,new RegExp(`level ${FAMILY_MIN_LEVEL}`));
 assert.equal(familyProfileAction({...base,viewer:{...base.viewer,inFamily:true}}).note,'You are in another family.');
 assert.equal(familyProfileAction({...base,viewer:{...base.viewer,requestId:'r1'}}).button,'family_request_cancel');
 assert.equal(familyProfileAction({...base,full:true}).note,'This family is full.');
 assert.match(familyProfileAction({...base,mode:'invite'}).note,/Invite only/);
 c.requests=[{id:'r9',player_id:'x',family_id:'f1',status:'pending',expires_at:now+3600000}];
 assert.equal(familyProfile(c,'f1','x',farmAt(20),now).viewer.requestId,'r9','your own open request to this family');
});

test('one read-only request, and every way in: farmer profile, family list, your own family, the tournament',()=>{
 const api=read('supabase/functions/farm-api/index.ts'),service=read('supabase/functions/farm-api/family-service.js');
 assert.match(api,/'family','family_profile','player_search'/,'on the list of requests farm-api accepts');
 assert.match(api,/if\(body\.operation==='family_profile'\)\{const shown=await handleFamilyProfile\(\{admin,body,state,player:user\.id\}\);return reply\(shown\.data,shown\.status\);\}/);
 assert.match(service,/export async function handleFamilyProfile/);assert.doesNotMatch(service.slice(service.indexOf('export async function handleFamilyProfile'),service.indexOf('// null tells')),/harvest_family_commit/,'it never writes');
 assert.match(service,/profile:\{player_id:player\}/,'the answer names whose farm asked, as every answer does');
 assert.match(read('src/connection.js'),/'load','family_profile',/);
 assert.match(read('supabase/functions/farm-api/player-profile-service.js'),/\{id:f\.id,name:f\.name,emblem:f\.emblem,/);
 const profiles=read('src/player-profiles.js');
 assert.match(profiles,/class="farmer-family-open" data-family-profile=/);assert.match(profiles,/window\.harvestFamilyProfile\?\.open\(/);
 const ui=read('public/family-ui.js');
 assert.match(ui,/const familyProfile=createFamilyProfile\(\{emblem,act,openFamily:\(\)=>open\(\)\}\);/);
 assert.match(ui,/<button type="button" class="family-list-open" data-family-profile="\$\{esc\(f\.id\)\}">/);
 assert.match(ui,/content\.querySelectorAll\('\[data-family-profile\]'\)\.forEach\(b=>b\.onclick=\(\)=>familyProfile\.open\(b\.dataset\.familyProfile\)\);/);
 assert.match(ui,/el\.onclick=\(\)=>familyProfile\.open\(f\.id\);/,'your own family heading');
 assert.match(read('public/family-tournament.js'),/data-family-profile="\$\{esc\(f\.familyId\)\}"/);
 assert.match(read('game/farm-state.js'),/top:board\.qualifying\.slice\(0,10\)\.map\(\(f,i\)=>\(\{familyId:f\.family_id,/);
});
