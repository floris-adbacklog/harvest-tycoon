import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,levelOf,cropUnlocked,CROPS,NO_EVENT_ACTIONS,WORLD_TWO_LEVEL,
 PETS,PET_REST_MS,PET_XP,PET_DOG_COINS_PER_LEVEL,PET_CAT_CROPS,PET_DEER_PLANKS,petRest,petRestText,petDogCoins,petOpen,ACTIVITY_ROUND_REWARD} from '../game/farm-state.js';
import {INSTANT_ACTIONS,instantResult} from '../public/farm-client.js';
import {farmLog,snapshot} from '../supabase/functions/farm-api/player-log.js';
import {soundForAction} from '../public/farm-audio.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const show=(sha,path)=>{try{return execFileSync('git',['show',`${sha}:${path}`],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:1<<24,stdio:['ignore','pipe','ignore']});}catch{return null;}};

// The farm's pets (20 Oct 2026, the owner: "doe wel iets leuks"): Rex the dog and Mimi the cat by the Farmhouse, Fawn the deer in the
// village from level 100. Each can be patted once an hour for a small find and 5 XP; a pat counts for no event.
const now=Date.UTC(2026,9,20,12),MIN=60000,HOUR=3600000;
function farm(level){const s=createFarm(now-2*HOUR);s.xp=xpForLevel(level);s.coins=1000;s.boosts={...s.boosts,xpUntil:0,coinsUntil:0};return normalizeFarm(s,now);}
const pat=(s,pet,t=now,random)=>applyFarmAction(s,{type:'pet_pat',pet},t,random);
function refused(s,action,message,t=now){const before=structuredClone(s);assert.throws(()=>applyFarmAction(s,action,t),{message});assert.deepEqual(s,before,'a refusal changes nothing');}

test('the names, the rule and the finds: Rex coins, Mimi 3 crops, Fawn 2 planks, each with 5 XP',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(PETS).map(([k,p])=>[k,p.name])),{dog:'Rex',cat:'Mimi',deer:'Fawn'});
 assert.equal(PET_REST_MS,HOUR);assert.equal(PET_XP,5);assert.equal(PET_DOG_COINS_PER_LEVEL,10);assert.equal(PET_CAT_CROPS,3);assert.equal(PET_DEER_PLANKS,2);
 const s=farm(20),coins=s.coins,xp=s.xp;
 const dog=pat(s,'dog');
 assert.deepEqual(dog,{pet:'dog',name:'Rex',coins:200,item:null,count:0,xp:5});assert.equal(s.coins,coins+200);assert.equal(s.xp,xp+5);
 const before={...s.inventory},cat=pat(s,'cat',now,()=>0);
 assert.equal(cat.item,'corn','the first crop the farm grows, with the server\'s roll 0');assert.equal(cat.count,3);assert.equal(s.inventory.corn,before.corn+3);
 assert.equal(s.xp,xp+10);assert.equal(s.coins,coins+200,'Mimi brings no coins');
 const high=farm(120),planks=high.inventory.plank;
 assert.deepEqual(pat(high,'deer'),{pet:'deer',name:'Fawn',coins:0,item:'plank',count:2,xp:5});assert.equal(high.inventory.plank,planks+2);
 assert.equal(high.stats.pets_patted,1);assert.equal(s.stats.pets_patted,2);
});

test('Mimi only ever brings a crop the farm grows, whatever the roll',()=>{
 for(const level of [1,5,20,66,150])for(const roll of [0,.2,.5,.8,.999999]){
  const s=farm(level),r=pat(s,'cat',now,()=>roll);
  assert.ok(Object.hasOwn(CROPS,r.item)&&cropUnlocked(s,r.item),`level ${level}, roll ${roll}: ${r.item}`);
 }
 const low=farm(1),seen=new Set([0,.3,.6,.99].map(roll=>pat(farm(1),'cat',now,()=>roll).item));
 assert.deepEqual([...seen].sort(),['corn','wheat'],'at level 1 only corn and wheat');assert.equal(levelOf(low),1);
});

test('the rest timer: once an hour per pet, on the server\'s clock, with the minutes left in the refusal',()=>{
 const s=farm(20);pat(s,'dog');
 refused(s,{type:'pet_pat',pet:'dog'},'Pat Rex again in 60 min.',now+1);
 refused(s,{type:'pet_pat',pet:'dog'},'Pat Rex again in 42 min.',now+18*MIN);
 refused(s,{type:'pet_pat',pet:'dog'},'Pat Rex again in 1 min.',now+HOUR-1000);
 assert.equal(petRest(s,'dog',now+18*MIN),42*MIN);assert.equal(petRest(s,'cat',now),0,'each pet rests on its own');
 pat(s,'cat',now+MIN);assert.deepEqual(s.pets,{dog:now,cat:now+MIN});
 assert.equal(pat(s,'dog',now+HOUR).coins,200,'an hour later Rex finds coins again');assert.equal(s.pets.dog,now+HOUR);
 assert.equal(petRestText('deer',90000),'Pat Fawn again in 2 min.');
 // The client's own clock never decides: the server's time (applyFarmAction's now) is the one that counts.
 assert.match(read('supabase/functions/farm-api/index.ts'),/result=applyFarmAction\(state,body\.action,now,random\)/);
});

test('Fawn waits in the village from level 100 (as worldTwoOpen); below it a pat is refused and changes nothing',()=>{
 for(const level of [1,20,99]){const s=farm(level);assert.equal(petOpen(s,'deer'),false);refused(s,{type:'pet_pat',pet:'deer'},`Reach level ${WORLD_TWO_LEVEL} to travel to the village.`);}
 assert.equal(petOpen(farm(100),'deer'),true);assert.equal(pat(farm(100),'deer').count,2);
 for(const pet of ['horse','constructor','__proto__',undefined,7])refused(farm(120),{type:'pet_pat',pet},'Choose a pet.');
});

test('a pat counts for no event, challenge or chest: no event action, no earned or spent coins, only pets_patted',()=>{
 assert.ok(NO_EVENT_ACTIONS.has('pet_pat'));
 assert.match(read('supabase/functions/farm-api/index.ts'),/eventAction:NO_EVENT_ACTIONS\.has\(body\.action\.type\)\?null:body\.action\.type/);
 const s=farm(60),stats={...s.stats};pat(s,'dog');pat(s,'cat');
 for(const [k,v] of Object.entries(s.stats))if(k!=='pets_patted')assert.equal(v,stats[k],k);
 assert.equal(s.stats.pets_patted,2);
 // It waits for the server's answer (Mimi's crop is the server's roll), and it is logged with the pet's name.
 assert.ok(!INSTANT_ACTIONS.has('pet_pat'));assert.equal(instantResult(farm(20),{type:'pet_pat',pet:'dog'},now),null);
 const f=farm(20),before=snapshot(f),r=pat(f,'dog');
 assert.deepEqual(farmLog({type:'pet_pat',pet:'dog'},before,f,r).map(l=>[l.category,l.action,l.text]),[['rewards','pet_pat','Patted Rex · +200 coins · +5 XP']]);
 assert.equal(soundForAction({type:'pet_pat',pet:'dog'},r,20,20),'collect');
 assert.match(read('supabase/functions/farm-api/admin-analytics-service.js'),/\['boosts_used','Boosts used'\],\['pets_patted','Pets patted'\]\];/);
});

test('the balance: Rex finds a few minutes of income, below the helping hand\'s coins until level 25',()=>{
 // A lake cast is about 4 minutes of a steady farmer's income at every level (farm-state.js LAKE_WATER, about 1,019 coins at level 100),
 // and income grows like (1 + level/8): about 66 coins a minute at level 20, 255 at level 100.
 const perMinute=level=>1019/4*(1+level/8)/(1+100/8);
 for(const [level,low,high] of [[5,1,3],[20,2.5,3.5],[60,3,4.5],[100,3.5,4.5],[150,3.5,4.5]]){
  const minutes=petDogCoins(farm(level))/perMinute(level);assert.ok(minutes>=low&&minutes<=high,`level ${level}: ${minutes.toFixed(1)} minutes`);
 }
 assert.equal(petDogCoins(farm(25)),ACTIVITY_ROUND_REWARD.coins,'the helping hand\'s round bonus, an hour\'s coins of the hand, at level 25');
});

test('saves: a farm that never patted has no pets key, and a broken one is cleaned',()=>{
 const s=farm(20);assert.equal(s.pets,undefined);assert.equal(s.stats.pets_patted,undefined);
 const odd=farm(20);odd.pets={dog:now,cat:'soon',deer:-4,horse:now};normalizeFarm(odd,now);assert.deepEqual(odd.pets,{dog:now});
 const junk=farm(20);junk.pets=[1,2];normalizeFarm(junk,now);assert.equal(junk.pets,undefined);
});

// Release order: farm-api first, then the site. The game as it is live (f13f4d42: the pets walk, and the rules are those of 034ae5a8)
// keeps the pets key and pets_patted (normalizeFarm keeps keys it does not know), reads and plays a farm the new action touched, and
// refuses the new action cleanly; its client sends no pet_pat at all.
test('the live game (f13f4d42) reads a farm after pats, keeps them, plays on and refuses pet_pat cleanly',async t=>{
 const old=show('f13f4d42','game/farm-state.js');if(!old){t.skip('no git history here');return;}
 const O=await import(asModule(old));
 const s=farm(120);pat(s,'dog');pat(s,'cat',now+MIN);pat(s,'deer',now+2*MIN);
 const saved=structuredClone(s),copy=structuredClone(saved),t2=now+5*MIN;O.normalizeFarm(copy,t2);
 assert.deepEqual(copy.pets,saved.pets,'the times of the pats');assert.equal(copy.stats.pets_patted,3);
 O.farmSummary(copy,t2);O.unlockEntries(copy);O.dailyTasks(copy,t2);O.dailyOrders(copy,t2);
 const field=copy.plots.findIndex(p=>p.crop&&p.readyAt<=t2);if(field>=0)O.applyFarmAction(copy,{type:'field',id:field,action:'harvest'},t2);
 O.applyFarmAction(copy,{type:'sell',item:'corn',quantity:1},t2);
 assert.deepEqual(copy.pets,saved.pets,'still there after the old rules played on');assert.equal(copy.stats.pets_patted,3);
 assert.throws(()=>O.applyFarmAction(structuredClone(saved),{type:'pet_pat',pet:'dog'},t2+HOUR),{message:'Unknown farm action.'});
 // The new rules read what the old ones saved after that, and the rest goes on from the saved times.
 const back=normalizeFarm(structuredClone(copy),t2);assert.equal(petRest(back,'dog',t2),HOUR-5*MIN);
 const client=show('f13f4d42','public/farm-client.js');
 if(client){const {instantResult:oldInstant}=await import(asModule(client.replace("from './farm-state.js';",`from '${asModule(old)}';`)));assert.equal(oldInstant(saved,{type:'pet_pat',pet:'dog'},t2),null);}
 const game=show('f13f4d42','public/game.js');if(game)assert.doesNotMatch(game,/pet_pat/,'the live page never sends it');
});

test('the client: the hop and heart at once, the nap line from the farm\'s own times, the find over the pet; the wiki line',()=>{
 const game=read('public/game.js');
 const fn=/async function patPet\(id\)\{[^]*?\n\}/.exec(game)[0];
 assert.match(fn,/if\(!pets\?\.react\(id\)\|\|adminView\|\|patting\.has\(id\)\)return;/);
 assert.match(fn,/const rest=petRest\(state,id,farmNow\(\)\);if\(rest>0\)\{toast\(petRestText\(id,rest\)\);return;\}/,'resting: only the heart and the line, nothing sent');
 assert.match(fn,/runAction\(\{type:'pet_pat',pet:id\}\)/);
 assert.match(fn,/floatAt\(at\.x,at\.y,at\.z,find\+floatChip\('xp',`\+\$\{r\.xp\} XP`,'is-xp'\)\);\},Math\.max\(0,PET_FIND_AFTER-\(performance\.now\(\)-tapped\)\)\);/,'the game\'s own reward float, no new pop-up, after the heart');
 assert.match(read('public/farm-pets.js'),/const herd=\{pets,animate,pick,react,top,position,where\};/);
 const wiki=read('public/wiki-content.js');
 assert.match(wiki,/\['coins','The farm’s pets',`Pat \$\{PETS\.dog\.name\} the dog and \$\{PETS\.cat\.name\} the cat by the Farmhouse once an hour for a small find/);
 const ignore=JSON.parse(read('i18n/ignore.json'));for(const p of Object.values(PETS))assert.ok(ignore.includes(p.name),`${p.name} stays as it is in every language`);
 for(const text of [petRestText('dog',HOUR),'Patted Rex'])assert.doesNotMatch(text,/ · /);
});
