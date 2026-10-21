import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,levelOf,NO_EVENT_ACTIONS} from '../game/farm-state.js';
import {FARMER_PARTS,FARMER_REWARDS,DEFAULT_FARMER,farmerOwned,farmerOf,rewardOpen,rewardText,rewardLevel,farmerOffered,creatorParts,farmerPart,validFarmerConfig} from '../game/farmer-parts.js';
import {PLAYER_AVATARS,SEASON_AVATARS,AVATAR_GOALS,avatarOpen} from '../public/player-avatars.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source.replace("from './farmer-parts.js';",`from '${new URL('../game/farmer-parts.js',import.meta.url).href}';`)).toString('base64');
const show=(sha,path)=>{try{return execFileSync('git',['show',`${sha}:${path}`],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:1<<26,stdio:['ignore','pipe','ignore']});}catch{return null;}};

// Your own farmer (21 Oct 2026, the owner: "Doe alle 3"): the painted avatars stay everyone's picture; the 3D farmer is your own character,
// dressed in My farmer and saved in the farm (state.farmer, the farm action farmer_wear). Hats, costumes and mascots are earned: every
// earned avatar brings one, by the avatar's own rule, and the straw hat comes at level 2.
const now=Date.UTC(2026,9,21,12),HOUR=3600000;
function farm(level=20){const s=createFarm(now-2*HOUR);s.xp=xpForLevel(level);s.coins=1000;s.boosts={...s.boosts,xpUntil:0,coinsUntil:0};return normalizeFarm(s,now);}
const wear=(s,farmer,events=0)=>applyFarmAction(s,{type:'farmer_wear',farmer,events},now);
const ALL_AVATARS=[...PLAYER_AVATARS,...SEASON_AVATARS];

test('every reward is an offered earned part, from an earned avatar, opening at the avatar\'s own level or with its own goal words',()=>{
 const avatars=new Set();
 for(const [id,rule] of Object.entries(FARMER_REWARDS)){
  const p=farmerPart(id);assert.ok(p&&p.earned&&farmerOffered(p),`${id} is an earned part My farmer offers`);
  if(rule.avatar){
   const a=ALL_AVATARS.find(x=>x.id===rule.avatar);assert.ok(a,`${rule.avatar} is an avatar`);
   assert.ok(a.level||AVATAR_GOALS[a.id],`${a.id} is earned, not one of the 20 everyone has`);
   assert.ok(!avatars.has(a.id),`${a.id} gives one part`);avatars.add(a.id);
   if(a.level)assert.equal(rewardLevel(id),a.level);else assert.equal(rewardText(id),AVATAR_GOALS[a.id].text,'the avatar\'s own words');
  }
 }
 // Every earned avatar (10 levels, 10 goals, the Halloween Pass, the 3 of the Season Pass) gives a part; the straw hat comes at level 2.
 assert.equal(avatars.size,ALL_AVATARS.filter(a=>a.level||AVATAR_GOALS[a.id]).length);
 assert.deepEqual(FARMER_REWARDS.hat_009,{level:2});assert.equal(rewardText('hat_009'),'Reach level 2.');
 assert.deepEqual(Object.entries(FARMER_REWARDS).filter(([,r])=>r.avatar).map(([id,r])=>`${r.avatar}:${id}`).filter(x=>/^(ranch-owner|beekeeper|lantern-keeper|season-autumn-2026-harvest-chef):/.test(x)).sort(),
  ['beekeeper:costume_7','lantern-keeper:hat_single_002','ranch-owner:hat_001','season-autumn-2026-harvest-chef:hat_023']);
 // Hidden: earned parts that are no reward yet (all mascots among them) and every part off the farm's look.
 assert.equal(creatorParts('mascot').length,0);assert.ok(Object.values(FARMER_PARTS).filter(farmerOffered).every(p=>p.fit!=='off'));
});

test('a part opens exactly when its avatar opens, on many farms: the same rule as player-avatars.js, from the farm itself',()=>{
 let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
 const pick=(...xs)=>xs[Math.floor(rnd()*xs.length)];
 for(let k=0;k<400;k++){
  const level=1+Math.floor(rnd()*140),events=pick(0,3,24,25,26,90);
  const state={stats:{diamonds_spent:pick(0,999,1000,5000),vip_days:pick(0,89,90),fair_champion:pick(0,1),mastery_medals:pick(0,63,64),earned:pick(0,4999999,5000000)},
   mastery:{claimed:pick([],['wheat:2'],['corn:3'])},login:{best:pick(0,29,30),visits:pick(5,99,100)},inviteRewards:pick([],[1,2],[1,2,3]),
   passPremium:pick([],['halloween-2026'],['autumn-2026'],['halloween-2026','autumn-2026']),looks:pick([],['season-autumn-2026-autumn-harvester'],['season-autumn-2026-pumpkin-royal','season-autumn-2026-harvest-chef'])};
  const owned=new Set(farmerOwned(state,{level,events}));
  for(const [id,rule] of Object.entries(FARMER_REWARDS)){
   const want=rule.avatar?avatarOpen(rule.avatar,{level,state,events}):level>=rule.level;
   assert.equal(rewardOpen(id,state,{level,events}),want,`${id} (${rule.avatar??'level'}) at level ${level}`);assert.equal(owned.has(id),want);
  }
 }
 // A farmer who already has the avatar has the part at once: nothing is written, it is read from the farm.
 const s=farm(72);assert.ok(farmerOwned(s,{level:levelOf(s)}).includes('hat_001'),'the Ranch owner\'s cowboy hat at level 70');
 assert.ok(!farmerOwned(farm(1),{level:1}).length,'a new farm has none');assert.deepEqual(farmerOwned(farm(2),{level:2}),['hat_009']);
});

test('farmer_wear saves what My farmer shows, only parts the farm has, and counts for nothing',()=>{
 const s=farm(45),before=structuredClone(s);
 const outfit={body:'body_011',face:'female_emotion_happy_002',hair:'hairstyle_female_003',hat:'hat_009',top:'outwear_010',bottom:'pants_002',shoes:'shoe_sneakers_010'};
 assert.deepEqual(wear(s,{...outfit,glasses:null}),{farmer:outfit});assert.deepEqual(s.farmer,outfit,'only the worn slots, as plain ids');
 assert.equal(s.coins,before.coins);assert.equal(s.xp,before.xp);assert.deepEqual(s.stats,before.stats,'no coins, no XP, no stat');
 assert.ok(NO_EVENT_ACTIONS.has('farmer_wear'),'no event, challenge or Family Chest');
 assert.deepEqual(farmerOf(s,{level:levelOf(s)}),outfit);
 assert.equal(wear(structuredClone(s),{body:outfit.body,face:outfit.face,costume:'costume_7'}).farmer.costume,'costume_7','the Beekeeper\'s bee suit at level 40');
 const refused=(config,message,events=0)=>{const copy=structuredClone(s);assert.throws(()=>wear(copy,config,events),{message});assert.deepEqual(copy,s,'a refusal changes nothing');};
 refused({...outfit,hat:'hat_001'},'Earn this first to wear it.');                       // the cowboy hat: level 70
 refused({...outfit,hat:'hat_035'},'Earn this first to wear it.',24);                    // the Event champion's: 25 events
 assert.equal(wear(structuredClone(s),{...outfit,hat:'hat_035'},25).farmer.hat,'hat_035');
 refused({...outfit,hat:'hat_032'},'Choose a farmer.');                                   // off the farm's look (a TV head)
 refused({...outfit,hat:'hat_041'},'Choose a farmer.');                                   // earned, but no reward yet
 refused({...outfit,top:'outwear_034'},'Choose a farmer.');                               // off the farm's look
 refused({...outfit,outfit:'outfit_001'},'Choose a farmer.');                             // does not go with the top and trousers
 refused({body:'body_010'},'Choose a farmer.');refused('body_010','Choose a farmer.');refused(null,'Choose a farmer.');
 // farm-api counts the events itself: whatever the page sent, the action carries the server's own player_stats.events_finished.
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/if\(body\.action&&typeof body\.action==='object'&&body\.action\.type==='farmer_wear'\)body\.action=\{\.\.\.body\.action,events:Number\(profile\?\.events_finished\)\|\|0\};\n   const before=snapshot\(state\);/);
 assert.match(api,/select\('player_id,username,currency,level,avatar_id,events_finished,look'\)/,'the profile it reads holds events_finished');
});

test('saves: a farm that never dressed its farmer has no farmer key and shows the default farmer; a broken one is cleaned',()=>{
 const s=farm(20);assert.equal(s.farmer,undefined);assert.deepEqual(farmerOf(s,{level:20}),DEFAULT_FARMER);
 for(const junk of [[1],'x',{body:'nope',face:'male_emotion_usual_002'},{body:'body_010'},{...DEFAULT_FARMER,top:'outwear_010'}]){const j=farm(20);j.farmer=junk;normalizeFarm(j,now);assert.equal(j.farmer,undefined,JSON.stringify(junk));}
 const odd=farm(20);odd.farmer={...DEFAULT_FARMER,glasses:null,extra:undefined};normalizeFarm(odd,now);assert.deepEqual(odd.farmer,DEFAULT_FARMER);
 // A part the farm no longer has (a refunded season) or no longer offered comes off when shown; the rest stays.
 const refunded=farm(20);refunded.farmer={...DEFAULT_FARMER,hat:'hat_044'};normalizeFarm(refunded,now);
 assert.equal(refunded.farmer.hat,'hat_044','the save keeps what it holds');assert.deepEqual(farmerOf(refunded,{level:20}),DEFAULT_FARMER,'shown without the crown');
 assert.ok(validFarmerConfig(farmerOf(refunded,{level:20})).ok);
});

// Release order: farm-api first (its farm-state.js, farmer-parts.js beside it and index.ts), then the site. Only the new site sends
// farmer_wear, and only it shows My farmer; the live game (f6c82f75) keeps a farm's farmer key (normalizeFarm keeps keys it does not
// know), plays on with it and refuses the new action cleanly, so a site rolled back, or a page still open from before, is safe.
test('old rules on new saves and new rules on old saves (main f6c82f75): the key survives, nothing breaks',async t=>{
 const old=show('f6c82f75','game/farm-state.js');if(!old){t.skip('no git history here');return;}
 const O=await import(asModule(old));
 const s=farm(45);wear(s,{...DEFAULT_FARMER,hat:'hat_009'});
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
 assert.match(game,/await runAction\(\{type:'farmer_wear',farmer:config,events:finishedEvents\}\);/);
 assert.match(profiles,/function showMyFarmer\(id\)\{\n  const mine=window\.harvestMyFarmer;if\(id!==bridge\.playerId\|\|!mine\)return;/,'only on your own profile');
 assert.match(profiles,/\$\{self\?'<div class="farmer-mine" data-my-farmer hidden><\/div>/);
 // The avatar picker is untouched.
 assert.doesNotMatch(read('public/avatar-settings.js'),/farmer-creator|harvestMyFarmer/);
 for(const copy of ['public/farmer-parts.js','supabase/functions/farm-api/farmer-parts.js'])assert.equal(read(copy),read('game/farmer-parts.js'),copy);
 for(const copy of ['public/farm-state.js','supabase/functions/farm-api/farm-state.js'])assert.equal(read(copy),read('game/farm-state.js'),copy);
 assert.match(read('scripts/sync-game.mjs'),/new URL\('\.\.\/supabase\/functions\/farm-api\/farmer-parts\.js',import\.meta\.url\)/);
 // The wiki says it, and the level-up card says what an avatar brings now.
 assert.match(read('public/wiki-content.js'),/\+section\('My farmer',farmerBody\(\)\)/);
 assert.match(read('public/progression-ui.js'),/FARMER_AVATARS\.has\(a\.id\)\?'New avatar, and something new to wear in My farmer':'New avatar: pick it in Settings'/);
});
