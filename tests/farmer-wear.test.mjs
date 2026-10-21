import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,levelOf,NO_EVENT_ACTIONS} from '../game/farm-state.js';
import {FARMER_PARTS,FARMER_REWARDS,FARMER_GOALS,FARMER_OFFER,FARMER_FREE,FARMER_SLOTS,DEFAULT_FARMER,farmerOwned,farmerOf,rewardOpen,rewardProgress,farmerOffered,creatorParts,farmerPart,validFarmerConfig} from '../game/farmer-parts.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source.replace("from './farmer-parts.js';",`from '${new URL('../game/farmer-parts.js',import.meta.url).href}';`)).toString('base64');
const show=(sha,path)=>{try{return execFileSync('git',['show',`${sha}:${path}`],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:1<<26,stdio:['ignore','pipe','ignore']});}catch{return null;}};

// Your own farmer (21 Oct 2026, the owner: "Doe alle 3"): the painted avatars stay everyone's picture; the 3D farmer is your own character,
// dressed in My farmer and saved in the farm (state.farmer, the farm action farmer_wear). A short, calm choice (the owner, 21 Oct 2026:
// "Maak minder opties in mijn boer, met neutrale huidskleuren"), and hats and two costumes with goals of their own, not the avatars'
// ("maak de rewards niet identiek aan de avatars, want die zijn nu gescheiden, dus totaal andere doelen").
const now=Date.UTC(2026,9,21,12),HOUR=3600000;
function farm(level=20){const s=createFarm(now-2*HOUR);s.xp=xpForLevel(level);s.coins=1000;s.boosts={...s.boosts,xpUntil:0,coinsUntil:0};return normalizeFarm(s,now);}
const wear=(s,farmer)=>applyFarmAction(s,{type:'farmer_wear',farmer},now);

test('My farmer offers a short, calm choice, nearly all of it earned: free are the skin tones and the basics',()=>{
 const counts=Object.fromEntries(FARMER_SLOTS.map(slot=>[slot,creatorParts(slot).length]));
 assert.deepEqual(counts,{body:5,face:9,hair:12,hat:17,glasses:6,faceExtra:8,top:10,bottom:8,outfit:6,costume:2,mascot:0,shoes:8,socks:0,gloves:6});
 const free=Object.fromEntries(FARMER_SLOTS.map(slot=>[slot,creatorParts(slot).filter(p=>!p.earned).length]));
 assert.deepEqual(free,{body:5,face:2,hair:3,hat:0,glasses:1,faceExtra:1,top:2,bottom:1,outfit:1,costume:0,mascot:0,shoes:1,socks:0,gloves:1},
  'the owner, 21 Oct 2026: "maak bijna alle mijn boer items lockable, behalve huidskleuren en de basic items"');
 assert.deepEqual(creatorParts('body').map(p=>p.name),['Skin tone 1','Skin tone 2','Skin tone 3','Skin tone 4','Skin tone 5'],'no blue, green or grey skin');
 assert.ok(creatorParts('body').every(p=>!p.earned),'every skin tone is free');
 assert.ok(creatorParts('face').every(p=>/^(Smiling|Happy|Calm) face/.test(p.name)),'no cross, sad or sly faces');
 for(const id of FARMER_OFFER){const p=farmerPart(id);assert.ok(p&&p.fit!=='off',id);}
 for(const id of FARMER_FREE)assert.ok(!farmerPart(id).earned,id);
 assert.ok(Object.values(DEFAULT_FARMER).every(id=>FARMER_FREE.has(id)),'a new farmer wears only free parts');
 // Data only: every part file is still there, the ones not offered are just not shown or saved.
 assert.equal(Object.keys(FARMER_PARTS).length,395);
});

test('every reward has a goal of its own on the farm\'s own counters, from the first minutes to the long run; no avatar, no pass',()=>{
 const rewards=Object.entries(FARMER_REWARDS);
 assert.ok(rewards.length>=70&&rewards.length<=80,`${rewards.length} earned parts`);
 const goals=rewards.map(([,r])=>`${r.goal}:${r.target}`);assert.equal(new Set(goals).size,goals.length,'no two share a goal');
 assert.ok(rewards.filter(([,r])=>r.target<=25&&r.goal!=='level'||r.goal==='level'&&r.target<=5).length>=12,'plenty within the first hours');
 for(const [id,{goal,target}] of rewards){
  const p=farmerPart(id);assert.ok(p&&p.earned&&farmerOffered(p)&&p.fit!=='off',id);assert.ok(Object.hasOwn(FARMER_GOALS,goal),goal);
  assert.ok(Number.isSafeInteger(target)&&target>0);
 }
 assert.deepEqual(rewards.filter(([id])=>id.startsWith('costume_')).map(([id])=>id).sort(),['costume_11','costume_7'],'two costumes, long-term');
 assert.deepEqual(FARMER_REWARDS.hat_009,{goal:'harvested',target:10},'the straw hat in the first minutes');
 assert.equal(FARMER_REWARDS.hat_028.goal,'pets');assert.equal(FARMER_REWARDS.hat_036.goal,'fish');assert.equal(FARMER_REWARDS.hat_023.goal,'bread');assert.equal(FARMER_REWARDS.costume_7.goal,'honey');
 const rules=read('game/farmer-parts.js');assert.doesNotMatch(rules,/avatar:|passPremium|looks|halloween|season-autumn/,'no avatar, Season Pass or Halloween rule');
 // How far a farm is: read from the farm, never over the target.
 const s={stats:{fish:12,harvested:9,made_honey:250},login:{best:3}};
 assert.deepEqual(rewardProgress('hat_036',s),{goal:'fish',count:12,target:25});assert.deepEqual(rewardProgress('costume_7',s),{goal:'honey',count:100,target:100});
 assert.equal(rewardOpen('hat_009',s),false);assert.equal(rewardOpen('costume_7',s),true);assert.equal(rewardProgress('outwear_010',s),null);
 assert.deepEqual(farmerOwned({}),[]);assert.deepEqual(farmerOwned({stats:{harvested:10}}),['hat_009']);
 assert.deepEqual(farmerOwned({},{level:5}),['female_emotion_happy_002'],'a level goal reads the farm\'s level');
 // A farm that already did it has the part at once (nothing written).
 const old=farm(60);old.stats.made_bread=40;old.stats.harvested=7000;
 assert.ok(farmerOwned(old).includes('hat_023')&&farmerOwned(old).includes('costume_11'));
 assert.ok(farmerOwned(old,{level:60}).includes('outwear_032')&&!farmerOwned(old,{level:60}).includes('beard_003'),'levels 50 and 75');
});

test('farmer_wear saves what My farmer shows, only parts the farm has, and counts for nothing',()=>{
 const s=farm(45);s.stats.harvested=20;s.stats.fish=3;const before=structuredClone(s);
 const outfit={body:'body_011',face:'female_emotion_happy_002',hair:'hairstyle_female_001',hat:'hat_009',top:'outwear_010',bottom:'pants_002',shoes:'shoe_sneakers_010'};
 assert.deepEqual(wear(s,{...outfit,glasses:null}),{farmer:outfit});assert.deepEqual(s.farmer,outfit,'only the worn slots, as plain ids');
 assert.equal(s.coins,before.coins);assert.equal(s.xp,before.xp);assert.deepEqual(s.stats,before.stats,'no coins, no XP, no stat');
 assert.ok(NO_EVENT_ACTIONS.has('farmer_wear'),'no event, challenge or Family Chest');
 assert.deepEqual(farmerOf(s),outfit);
 const refused=(config,message)=>{const copy=structuredClone(s);assert.throws(()=>wear(copy,config),{message});assert.deepEqual(copy,s,'a refusal changes nothing');};
 refused({...outfit,hat:'hat_036'},'Earn this first to wear it.');                       // the sailor cap: 25 fish, this farm has 3
 const fisher=structuredClone(s);fisher.stats.fish=25;assert.equal(wear(fisher,{...outfit,hat:'hat_036'}).farmer.hat,'hat_036');
 refused({body:outfit.body,face:outfit.face,costume:'costume_7'},'Earn this first to wear it.');
 refused({...outfit,hat:'hat_032'},'Choose a farmer.');                                   // off the farm's look (a TV head)
 refused({...outfit,hat:'hat_041'},'Choose a farmer.');                                   // earned, but no reward
 refused({...outfit,body:'body_007'},'Choose a farmer.');                                 // a green body: not offered
 refused({...outfit,face:'male_emotion_angry_001'},'Choose a farmer.');                   // a cross face: not offered
 refused({...outfit,top:'outwear_029'},'Choose a farmer.');                               // a track top: not offered
 refused({...outfit,hair:'hairstyle_male_004'},'Earn this first to wear it.');           // grey curls: play on 20 days
 refused({...outfit,face:'male_emotion_usual_004'},'Choose a farmer.');                  // no longer offered
 refused({...outfit,outfit:'outfit_001'},'Choose a farmer.');                             // does not go with the top and trousers
 refused({body:'body_010'},'Choose a farmer.');refused('body_010','Choose a farmer.');refused(null,'Choose a farmer.');
 assert.doesNotMatch(read('supabase/functions/farm-api/index.ts'),/farmer_wear/,'farm-api needs nothing of its own: the farm holds every counter');
});

test('saves: a farm that never dressed its farmer has no farmer key and shows the default farmer; a broken one is cleaned',()=>{
 const s=farm(20);assert.equal(s.farmer,undefined);assert.deepEqual(farmerOf(s),DEFAULT_FARMER);
 for(const junk of [[1],'x',{body:'nope',face:'male_emotion_usual_002'},{body:'body_010'},{...DEFAULT_FARMER,top:'outwear_010'}]){const j=farm(20);j.farmer=junk;normalizeFarm(j,now);assert.equal(j.farmer,undefined,JSON.stringify(junk));}
 const odd=farm(20);odd.farmer={...DEFAULT_FARMER,glasses:null,extra:undefined};normalizeFarm(odd,now);assert.deepEqual(odd.farmer,DEFAULT_FARMER);
 // A part the farm no longer has (a refunded season) or no longer offered comes off when shown; the rest stays.
 const gone=farm(20);gone.farmer={...DEFAULT_FARMER,hat:'hat_044',glasses:'glasses_021'};normalizeFarm(gone,now);
 assert.equal(gone.farmer.hat,'hat_044','the save keeps what it holds');assert.deepEqual(farmerOf(gone),DEFAULT_FARMER,'shown without what is no longer offered or not earned');
 assert.ok(validFarmerConfig(farmerOf(gone)).ok);
});

// Release order: farm-api first (its farm-state.js, farmer-parts.js beside it and index.ts), then the site. Only the new site sends
// farmer_wear, and only it shows My farmer; the live game (f6c82f75) keeps a farm's farmer key (normalizeFarm keeps keys it does not
// know), plays on with it and refuses the new action cleanly, so a site rolled back, or a page still open from before, is safe.
test('old rules on new saves and new rules on old saves (main f6c82f75): the key survives, nothing breaks',async t=>{
 const old=show('f6c82f75','game/farm-state.js');if(!old){t.skip('no git history here');return;}
 const O=await import(asModule(old));
 const s=farm(45);s.stats.harvested=10;wear(s,{...DEFAULT_FARMER,hat:'hat_009'});
 const saved=structuredClone(s),copy=structuredClone(saved),t2=now+5*60000;O.normalizeFarm(copy,t2);
 assert.deepEqual(copy.farmer,saved.farmer,'the old rules keep the farmer');
 O.farmSummary(copy,t2);O.dailyTasks(copy,t2);O.applyFarmAction(copy,{type:'sell',item:'corn',quantity:1},t2);
 assert.deepEqual(copy.farmer,saved.farmer,'and after they played on');
 assert.throws(()=>O.applyFarmAction(structuredClone(saved),{type:'farmer_wear',farmer:DEFAULT_FARMER},t2),{message:'Unknown farm action.'});
 // New rules on what the old ones saved, and on an old save that never had the key.
 const back=normalizeFarm(structuredClone(copy),t2);assert.deepEqual(back.farmer,saved.farmer);
 const legacy=O.normalizeFarm(O.createFarm(now-HOUR),now);const fresh=normalizeFarm(structuredClone(legacy),now);
 assert.equal(fresh.farmer,undefined,'no key is made for a farm that never dressed its farmer');assert.deepEqual(farmerOf(fresh,{level:1}),DEFAULT_FARMER);
 const oldGame=show('f6c82f75','public/game.js');if(oldGame)assert.doesNotMatch(oldGame,/farmer_wear/,'the live page never sends it');
});

test('My farmer opens from Settings › Profile (under the avatar, which stays) and from your own profile; the copies are shared',()=>{
 const html=read('public/farm.html'),game=read('public/game.js'),profiles=read('src/player-profiles.js');
 assert.match(html,/<section id="avatar-settings" aria-labelledby="avatar-settings-title"><\/section><div id="farmer-settings" class="farmer-settings"><button type="button" class="secondary-button farmer-open-button" id="farmer-settings-open"><i data-game-art="my-farmer"><\/i>My farmer<\/button>/);
 assert.match(game,/\$\('farmer-settings-open'\)\.onclick=\(\)=>void openMyFarmer\(\);/);
 assert.match(game,/if\(!adminView\)window\.harvestMyFarmer=\{open:openMyFarmer\};/,'not in the admin view');
 assert.match(game,/await runAction\(\{type:'farmer_wear',farmer:config\}\);/);
 assert.match(game,/farmerNews\(\);medalToast\(newMedals\(medalsBefore,state\)\);return result;\}/,'a goal reached: one toast after the action, as a new medal');
 assert.match(profiles,/function showMyFarmer\(id\)\{\n  const mine=window\.harvestMyFarmer;if\(id!==bridge\.playerId\|\|!mine\)return;/,'only on your own profile');
 assert.match(profiles,/\$\{self\?'<div class="farmer-mine" data-my-farmer hidden><\/div>/);
 // The avatar picker is untouched.
 assert.doesNotMatch(read('public/avatar-settings.js'),/farmer-creator|harvestMyFarmer/);
 for(const copy of ['public/farmer-parts.js','supabase/functions/farm-api/farmer-parts.js'])assert.equal(read(copy),read('game/farmer-parts.js'),copy);
 for(const copy of ['public/farm-state.js','supabase/functions/farm-api/farm-state.js'])assert.equal(read(copy),read('game/farm-state.js'),copy);
 assert.match(read('scripts/sync-game.mjs'),/new URL\('\.\.\/supabase\/functions\/farm-api\/farmer-parts\.js',import\.meta\.url\)/);
 // The wiki says it; the level-up card is the avatars' again (they bring no parts).
 assert.match(read('public/wiki-content.js'),/\+section\('My farmer',farmerBody\(\)\)/);
 assert.match(read('public/progression-ui.js'),/<span>New avatar: pick it in Settings<\/span>/);assert.doesNotMatch(read('public/progression-ui.js'),/farmer-parts/);
});
