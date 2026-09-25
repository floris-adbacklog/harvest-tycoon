import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,buyVip,finishSingleCrop,SINGLE_CROP_COST,CROPS,MASTERY_TIERS} from '../game/farm-state.js';
import {AVATAR_GOALS,avatarGoal,goalCount,avatarOpen,isPlayerAvatar} from '../public/player-avatars.js';
import {avatarBadge} from '../public/avatar-settings.js';
import {savePlayerAvatar} from '../supabase/functions/farm-api/avatar-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,25,12);

test('the farm counts every diamond spent and every VIP day bought, from today',()=>{
 const s=createFarm(now);normalizeFarm(s,now);s.diamonds=2000;
 assert.equal(s.stats.diamonds_spent,0);assert.equal(s.stats.vip_days,0);
 buyVip(s,'month',1500,s.vipExpiresAt??0,now);
 assert.equal(s.stats.vip_days,30);assert.equal(s.stats.diamonds_spent,1500);
 buyVip(s,'week',500,s.vipExpiresAt,now);assert.equal(s.stats.vip_days,37);assert.equal(s.stats.diamonds_spent,2000);
 s.diamonds=50;const plot=s.plots[0];plot.crop='corn';plot.readyAt=now+60000;
 finishSingleCrop(s,0,SINGLE_CROP_COST,now);assert.equal(s.stats.diamonds_spent,2000+SINGLE_CROP_COST);
 const rules=read('game/farm-state.js');
 assert.equal((rules.match(/state\.diamonds-=/g)||[]).length,1,'the only place diamonds leave a farm is spendDiamonds');
 assert.match(rules,/export function spendDiamonds\(state,amount\)\{state\.diamonds-=amount;state\.stats\.diamonds_spent=/);
});
test('ten goals, each read from the farm itself, and the numbers match the rules',()=>{
 assert.deepEqual(Object.keys(AVATAR_GOALS),['gem-collector','velvet-farmer','crop-master','early-riser','event-champion','grand-champion','good-neighbor','seed-keeper','coin-baron','valley-regular']);
 assert.equal(AVATAR_GOALS['seed-keeper'].target,Object.keys(CROPS).length*MASTERY_TIERS.length,'all crop medals');
 assert.equal(MASTERY_TIERS[3].name,'Platinum','tier 3 is the highest medal');
 const farm={events:25,state:{stats:{diamonds_spent:1000,vip_days:90,fair_champion:1,mastery_medals:64,earned:5000000},login:{best:30,visits:100},mastery:{claimed:['corn:0','wheat:3']},inviteRewards:['a','b','c']}};
 for(const id of Object.keys(AVATAR_GOALS))assert.equal(avatarOpen(id,farm),true,id);
 const short={events:24,state:{stats:{diamonds_spent:999,vip_days:89,fair_champion:0,mastery_medals:63,earned:4999999},login:{best:29,visits:99},mastery:{claimed:['corn:2']},inviteRewards:['a','b']}};
 for(const id of Object.keys(AVATAR_GOALS))assert.equal(avatarOpen(id,short),false,id);
 assert.equal(goalCount('gem-collector',{}),0,'a farm without the number counts as 0');assert.equal(avatarOpen('gem-collector',{}),false);
 assert.equal(avatarGoal('__proto__'),null);assert.equal(avatarGoal('tractor-driver'),null);
 assert.equal(avatarOpen('tractor-driver',{level:20}),true,'level avatars still open by level');
});
test('in the picker an achievement avatar carries a trophy: grey with a lock until earned, then gold with an open lock',()=>{
 assert.match(avatarBadge('gem-collector',{state:{stats:{diamonds_spent:10}}}),/^<span class="avatar-level is-locked"><svg[^]*<\/svg><svg[^]*<\/svg><\/span>$/);
 assert.match(avatarBadge('gem-collector',{state:{stats:{diamonds_spent:1000}}}),/^<span class="avatar-level is-open">/);
 assert.doesNotMatch(avatarBadge('gem-collector',{}),/Lv\./);assert.match(avatarBadge('tractor-driver',25),/Lv\. 20/);
 const picker=read('public/avatar-settings.js');
 assert.match(picker,/`\$\{goal\.text\} to use this avatar\.\$\{goal\.target>1\?` You are at \$\{number\(Math\.min\(goalCount\(id,farm\),goal\.target\)\)\} of \$\{number\(goal\.target\)\}\.`:''\}`/);
 assert.match(read('src/game-cloud.js'),/state:window\.harvestInitialFarm\.state/);
 assert.match(read('supabase/functions/farm-api/index.ts'),/select\('player_id,username,currency,level,avatar_id,events_finished'\)/,'the picker knows the farm events finished');
 const ui=read('public/progression-ui.js');
 assert.match(ui,/if\(earned\.length\)announce\(\{leveled:false,level,entries:\[\],reward:null,avatars:earned\}\);/,'an avatar earned while playing is announced');
 assert.match(ui,/const earned=toldGoals\?goals\.filter/,'not the ones the farm already had when the game opened');
});
test('the server saves an achievement avatar only when the farm has earned it',async()=>{
 assert.ok(Object.keys(AVATAR_GOALS).every(isPlayerAvatar),'all ten are in the list');
 function db({spent,events=0}){
  return {from(table){const q={select(){return q;},eq(){return q;},gte(){return q;},update(value){q.value=value;return q;},
   async maybeSingle(){if(table==='player_farms')return {data:{stats:{diamonds_spent:spent},login:{},claimed:[],invites:[]},error:null};
    return {data:q.value?{player_id:'owner',username:'Sunny',currency:1,level:30,avatar_id:q.value.avatar_id}:{events_finished:events},error:null};}};return q;}};
 }
 const no=await savePlayerAvatar({admin:db({spent:999}),player:'owner',avatarId:'gem-collector'});
 assert.equal(no.status,403);assert.equal(no.data.error,'Spend 1,000 diamonds to use the Gem collector avatar.');
 const yes=await savePlayerAvatar({admin:db({spent:1000}),player:'owner',avatarId:'gem-collector'});assert.equal(yes.status,200);assert.equal(yes.data.profile.avatar_id,'gem-collector');
});
