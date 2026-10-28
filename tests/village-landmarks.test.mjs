import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,unlockEntries,recipeDuration,villageBoards,villageBrief,villageLandmark,villageSquareReady,villagerLine,
 landmarkDone,landmarkBonus,villagePremium,boatReturn,createShowcaseFarm,questXp,worldTwoBuilding,
 BUILDINGS,RECIPES,RECIPE_LEVELS,ITEMS,CROPS,HEIRLOOMS,MAX_BUILDING_LEVEL,VILLAGE_LANDMARKS,VILLAGE_LANDMARK_XP,VILLAGE_LANDMARK_BONUS,VILLAGE_HALL_PREMIUM,
 GREAT_HALL_DIAMONDS,VILLAGE_REQUEST_BOARDS_MAX,VILLAGE_REQUEST_WAIT,VILLAGE_QUESTS,VILLAGE_ALL_BUILT,VILLAGERS,BOAT_RETURN,BOAT_QUAY_RETURN,WORLD_TWO_TOP} from '../game/farm-state.js';

// World II's landmarks (Oct 2026, the owner's plan for levels 165-200): after the last village place the golden brief builds five
// landmarks, one at a time. Hand in the goods bit by bit, then pay to finish; each gives 5,000 XP and a bonus for good.
const now=Date.parse('2026-10-05T12:00:00Z'),HOUR=3600000;
const IDS=Object.keys(VILLAGE_LANDMARKS),ALL=Object.keys(BUILDINGS).filter(worldTwoBuilding);
const act=(s,a,t=now)=>applyFarmAction(s,a,t);
// Every farm building built and at level 10, the listed village places built, only the stock given, and the landmarks already finished.
function fixture(level,places=ALL,stock={},{mode='guided',done=[]}={}){
 const s=createFarm(now);s.xp=xpForLevel(level);s.coins=50000000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 if(mode==='legacy')s.progression={mode:'legacy'};
 for(const [k,b] of Object.entries(s.buildings)){if(worldTwoBuilding(k))b.built=places.includes(k);else{b.built=true;if(BUILDINGS[k].type==='production')b.level=MAX_BUILDING_LEVEL;}}
 normalizeFarm(s,now);for(const k of Object.keys(s.inventory))s.inventory[k]=0;Object.assign(s.inventory,stock);
 s.village={serial:0,boards:[],landmarks:{done,given:{}}};return normalizeFarm(s,now);
}
// No villager waiting (the boards come back in a day): only the landmark can light the market square.
const quiet=s=>{for(const b of s.village.boards){b.request=null;b.readyAt=now+24*HOUR;}return s;};
const give=(s,landmark,stock)=>{Object.assign(s.inventory,stock);return act(s,{type:'landmark_give',landmark});};

test('the landmarks wait for the last place, then come one by one, each from its own level',()=>{
 assert.deepEqual(IDS,['windpump','longhouse','stonequay','lookout','greathall']);assert.equal(VILLAGE_LANDMARKS.greathall.level,WORLD_TWO_TOP);
 for(const mode of ['guided','legacy']){
  const early=fixture(170,ALL.filter(k=>k!=='jeweller'),{rooftile:600},{mode});
  assert.equal(villageLandmark(early),null,mode);assert.equal(villageBrief(early).place,'jeweller');
  assert.throws(()=>act(early,{type:'landmark_give',landmark:'windpump'}),{message:'Build the Jeweller first: one golden brief at a time.'},mode);
  const s=fixture(160,ALL,{rooftile:600},{mode});
  assert.deepEqual((({id,open,missing,given,short,ready})=>({id,open,missing,given,short,ready}))(villageLandmark(s)),{id:'windpump',open:false,missing:{rooftile:600,plank:300,ironbar:60},given:{},short:0,ready:false},mode);
  assert.equal(villageLandmark(s).title,'Water for the fields');
  assert.throws(()=>act(s,{type:'landmark_give',landmark:'windpump'}),{message:'Reach level 165 to build the Wind pump.'});
  assert.throws(()=>act(s,{type:'landmark_finish',landmark:'windpump'}),{message:'Reach level 165 to build the Wind pump.'});
  assert.equal(s.inventory.rooftile,600,'nothing taken before its level');
  const open=fixture(165,ALL,{rooftile:600},{mode});
  assert.throws(()=>act(open,{type:'landmark_give',landmark:'longhouse'}),{message:'Finish the Wind pump first: one golden brief at a time.'});
  for(const landmark of ['castle',undefined,'__proto__',7,'toString'])assert.throws(()=>act(open,{type:'landmark_give',landmark}),{message:'Choose a landmark.'},String(landmark));
  for(const item of ['linen','__proto__',7,'toString'])assert.throws(()=>act(open,{type:'landmark_give',landmark:'windpump',item}),{message:'The Wind pump does not need that.'},String(item));
  assert.equal(open.inventory.rooftile,600);
 }
 // Below level 100 nothing of it, even with every place built.
 for(const mode of ['guided','legacy']){
  const low=fixture(99,ALL,{rooftile:600},{mode});assert.equal(villageLandmark(low),null);
  for(const type of ['landmark_give','landmark_finish'])assert.throws(()=>act(low,{type,landmark:'windpump'}),{message:'Reach level 100 to trade in the village.'},`${mode} ${type}`);
 }
});

test('bring the goods bit by bit, then pay to finish: 5,000 XP, the coins counted as spent, and the next landmark',()=>{
 const s=quiet(fixture(165,ALL,{rooftile:250,plank:300,ironbar:100}));s.coins=1000000;
 assert.deepEqual(act(s,{type:'landmark_give',landmark:'windpump',item:'rooftile'}),{handed:{rooftile:250},units:250,ready:false});
 assert.deepEqual(act(s,{type:'landmark_give',landmark:'windpump'}),{handed:{plank:300,ironbar:60},units:360,ready:false});
 assert.deepEqual([s.inventory.rooftile,s.inventory.plank,s.inventory.ironbar],[0,0,40]);
 assert.deepEqual(s.village.landmarks,{done:[],given:{rooftile:250,plank:300,ironbar:60}});
 const l=villageLandmark(s);assert.deepEqual([l.missing,l.short,l.ready],[{rooftile:350},500000,false]);
 assert.throws(()=>act(s,{type:'landmark_give',landmark:'windpump',item:'rooftile'}),{message:'You have no roof tile to give.'});
 assert.throws(()=>act(s,{type:'landmark_give',landmark:'windpump'}),{message:'You have none of the goods this landmark still needs.'});
 assert.throws(()=>act(s,{type:'landmark_give',landmark:'windpump',item:'plank'}),{message:'You have no plank to give.'},'nothing more of a good that is all handed in');
 assert.throws(()=>act(s,{type:'landmark_finish',landmark:'windpump'}),{message:'Hand in all the goods first.'});
 // Normalizing keeps what is handed in; a saved count above what it asks is cut.
 normalizeFarm(s,now);assert.deepEqual(s.village.landmarks.given,{rooftile:250,plank:300,ironbar:60});
 assert.deepEqual(give(s,'windpump',{rooftile:400}),{handed:{rooftile:350},units:350,ready:true});assert.equal(s.inventory.rooftile,50);
 assert.throws(()=>act(s,{type:'landmark_finish',landmark:'windpump'}),{message:'You need 1,500,000 coins to finish it.'});
 assert.equal(villageLandmark(s).short,500000);assert.equal(villageSquareReady(s),false,'the coins are not there yet');
 s.coins=1600000;assert.equal(villageSquareReady(s),true);
 const xp=s.xp,spent=s.stats.village_coins_spent??0,farmSpent=s.stats.coins_spent??0,diamonds=s.diamonds;
 assert.deepEqual(act(s,{type:'landmark_finish',landmark:'windpump'}),{landmark:'windpump',name:'Wind pump',coins:1500000,xp:5000,diamonds:0});
 assert.deepEqual([s.coins,s.xp-xp,s.diamonds-diamonds,s.stats.village_landmarks,s.stats.village_coins_spent-spent,(s.stats.coins_spent??0)-farmSpent],[100000,VILLAGE_LANDMARK_XP,0,1,1500000,0]);   // 27 Oct 2026: spent in the village's own count
 assert.deepEqual(s.village.landmarks,{done:['windpump'],given:{}});
 assert.equal(s.stats.sold??0,0,'never a sale');
 assert.throws(()=>act(s,{type:'landmark_finish',landmark:'windpump'}),{message:'The Wind pump is already finished.'});
 assert.throws(()=>act(s,{type:'landmark_give',landmark:'windpump'}),{message:'The Wind pump is already finished.'});
 const next=villageLandmark(s);assert.deepEqual([next.id,next.open,next.ready],['longhouse',false,false]);assert.equal(villageSquareReady(s),false);
 assert.throws(()=>give(s,'longhouse',{linen:10}),{message:'Reach level 172 to build the Longhouse.'});
 // With an XP boost a landmark's XP doubles, like every action's.
 const b=quiet(fixture(165,ALL,{rooftile:600,plank:300,ironbar:60}));b.boosts.xpUntil=now+HOUR;act(b,{type:'landmark_give',landmark:'windpump'});
 assert.equal(act(b,{type:'landmark_finish',landmark:'windpump'}).xp,2*VILLAGE_LANDMARK_XP);
});

test('the Wind pump and the Longhouse shorten village batches, never a farm building\'s; a running batch keeps its time',()=>{
 const s=fixture(200);s.rookieUntil=0;normalizeFarm(s,now);
 const times=()=>[recipeDuration(s,'sowsaffron',now),recipeDuration(s,'sowpotatoes',now),recipeDuration(s,'digiron',now),recipeDuration(s,'rubyring',now)];
 const farmTimes=()=>Object.keys(RECIPES).filter(id=>!worldTwoBuilding(RECIPES[id].building)).map(id=>recipeDuration(s,id,now));
 const before=farmTimes();
 assert.deepEqual(times(),[21600000,2700000,1800000,12600000]);
 Object.assign(s.inventory,{fertilizer:2});s.coins=1e7;const job=act(s,{type:'produce',recipe:'sowsaffron'});const saved=structuredClone(s.buildings.villagefields);
 s.village.landmarks.done=['windpump'];normalizeFarm(s,now);assert.deepEqual(times(),[16200000,2025000,1800000,12600000]);
 s.village.landmarks.done=['windpump','longhouse'];normalizeFarm(s,now);assert.deepEqual(times(),[14580000,1822500,1620000,11340000]);
 assert.deepEqual(farmTimes(),before,'the farm\'s buildings keep their times');
 assert.deepEqual(s.buildings.villagefields,saved,'the saffron sown before keeps its time');
 assert.deepEqual(act(s,{type:'collect',building:'villagefields'},job.readyAt).items,{saffron:8});
 assert.deepEqual([landmarkBonus(s,'windpump'),landmarkBonus(s,'longhouse'),landmarkBonus(s,'stonequay')],[VILLAGE_LANDMARK_BONUS.windpump,VILLAGE_LANDMARK_BONUS.longhouse,0]);
 // At level 10 both: the 6-hour saffron in 77.8 minutes, potatoes in 9.7.
 s.buildings.villagefields.level=10;assert.deepEqual([recipeDuration(s,'sowsaffron',now),recipeDuration(s,'sowpotatoes',now)].map(ms=>Math.round(ms/6000)/10),[77.8,9.7]);
});

test('the Stone quay brings the town boat back after 6 hours; a boat already away keeps its time',()=>{
 for(const mode of ['guided','legacy']){
  const s=quiet(fixture(185,ALL,{stone:2000,plank:400,scentedsachet:200},{mode,done:['windpump','longhouse']}));
  assert.equal(boatReturn(s),BOAT_RETURN);
  const c=s.village.boat.cargo;assert.equal(c.id,1,mode);
  assert.deepEqual(act(s,{type:'boat_skip',cargo:c.id}),{readyAt:now+BOAT_RETURN});
  act(s,{type:'landmark_give',landmark:'stonequay'});act(s,{type:'landmark_finish',landmark:'stonequay'});
  assert.ok(landmarkDone(s,'stonequay'));assert.equal(boatReturn(s),BOAT_QUAY_RETURN);
  assert.equal(s.village.boat.readyAt,now+BOAT_RETURN,'the boat away comes back when it said');
  const t=now+BOAT_RETURN;normalizeFarm(s,t);const next=s.village.boat.cargo;assert.equal(next.id,2);
  assert.deepEqual(act(s,{type:'boat_skip',cargo:2,input:next.input},t),{readyAt:t+6*HOUR});
 }
});

test('the Lookout tower brings a fourth villager, who never says what another card says',()=>{
 assert.equal(VILLAGE_REQUEST_BOARDS_MAX,4);
 for(const mode of ['guided','legacy']){
  assert.deepEqual([100,103,104,192].map(level=>villageBoards(fixture(level,ALL,{},{mode}))),[2,2,3,3],mode);
  const s=fixture(192,ALL,{},{mode,done:IDS.slice(0,3)});
  assert.deepEqual(s.village.boards.map(b=>b.request.id),[1,2,3]);
  assert.deepEqual(give(s,'lookout',{silvercandlestick:20,rubyring:20,saffronbun:150}),{handed:{silvercandlestick:20,rubyring:20,saffronbun:150},units:190,ready:true});
  assert.deepEqual(act(s,{type:'landmark_finish',landmark:'lookout'}),{landmark:'lookout',name:'Lookout tower',coins:3000000,xp:5000,diamonds:0});
  normalizeFarm(s,now+60000);assert.equal(villageBoards(s),4);assert.equal(s.village.boards.length,4);
  assert.deepEqual(s.village.boards[3].request,{id:4,villager:8,input:{linen:14,ironore:95,cherryjam:2},value:18770,coins:28155,xp:375},mode);
 }
 // An old save holding four boards without the tower keeps three; four with it.
 const old=fixture(192,ALL,{},{done:IDS.slice(0,3)});old.village.boards.push({request:null,readyAt:0});normalizeFarm(old,now);assert.equal(old.village.boards.length,3);
 for(const v of VILLAGERS.filter(v=>v.lines.length))assert.equal(v.lines.length,VILLAGE_REQUEST_BOARDS_MAX,v.id);
 const s=fixture(200,ALL,{},{done:IDS.slice(0,4)});
 for(let i=1;i<=300;i++){
  const said=[];for(const b of s.village.boards){const line=villagerLine(b.request,said);assert.ok(!said.includes(line),`round ${i}`);said.push(line);}
  for(const b of s.village.boards){b.request=null;b.readyAt=now+i*VILLAGE_REQUEST_WAIT;}normalizeFarm(s,now+i*VILLAGE_REQUEST_WAIT);
 }
});

test('the Great Hall: new requests pay 1.6 times, 500 diamonds once, a waiting request keeps its coins',()=>{
 for(const mode of ['guided','legacy']){
  const s=fixture(200,ALL,{},{mode,done:IDS.slice(0,4)});assert.equal(villagePremium(s),1.5);
  const waiting=structuredClone(s.village.boards[0].request);assert.equal(waiting.coins,30023);
  const diamonds=s.diamonds,earned=s.stats.village_diamonds_earned??0,xp=s.xp;   // the village's own count (28 Oct 2026)
  give(s,'greathall',{rooftile:100,linen:100,lavendersoap:100,scentedsachet:100,saffronbun:100});
  assert.deepEqual(act(s,{type:'landmark_finish',landmark:'greathall'}),{landmark:'greathall',name:'Great Hall',coins:3000000,xp:5000,diamonds:GREAT_HALL_DIAMONDS});
  assert.deepEqual([s.diamonds-diamonds,s.stats.village_diamonds_earned-earned,s.xp-xp,s.stats.village_landmarks],[500,500,5000,1],mode);
  assert.equal(villagePremium(s),VILLAGE_HALL_PREMIUM);assert.deepEqual(s.village.boards[0].request,waiting,'a waiting request keeps its coins');
  // Help, and 3 hours later the next villager pays 1.6 times.
  Object.assign(s.inventory,waiting.input);act(s,{type:'village_deliver',board:0,request:waiting.id,input:waiting.input});
  normalizeFarm(s,now+VILLAGE_REQUEST_WAIT);const next=s.village.boards[0].request;assert.equal(next.coins,Math.ceil(next.value*1.6));
  assert.throws(()=>act(s,{type:'landmark_finish',landmark:'greathall'},now+VILLAGE_REQUEST_WAIT),{message:'The Great Hall is already finished.'});
  const after=s.diamonds;for(let d=0;d<3;d++)normalizeFarm(s,now+d*86400000);assert.equal(s.diamonds,after,'normalizing adds no diamond');
  // Everything is built: no brief, no landmark, and the card's sentence.
  assert.deepEqual([villageBrief(s),villageLandmark(s),villageSquareReady(quiet(s))],[null,null,false]);
 }
 assert.equal(VILLAGE_ALL_BUILT,'Every place and landmark in the village is built.');
});

test('all five landmarks at level 200, guided and legacy: their effects, one Hall gift, and a save that loads the same',()=>{
 for(const mode of ['guided','legacy']){
  const s=quiet(fixture(200,ALL,{},{mode}));s.coins=20000000;const diamonds=s.diamonds,xp=s.xp;
  for(const id of IDS){Object.assign(s.inventory,VILLAGE_LANDMARKS[id].materials);assert.equal(act(s,{type:'landmark_give',landmark:id}).ready,true,id);act(s,{type:'landmark_finish',landmark:id});}
  assert.deepEqual(s.village.landmarks,{done:IDS,given:{}});assert.equal(s.coins,20000000-12000000);
  assert.deepEqual([s.diamonds-diamonds,s.xp-xp,s.stats.village_landmarks],[500,25000,5],mode);
  normalizeFarm(s,now+24*HOUR);
  assert.deepEqual([villageBoards(s),s.village.boards.length,villagePremium(s),boatReturn(s),villageLandmark(s)],[4,4,1.6,BOAT_QUAY_RETURN,null]);
  const saved=JSON.parse(JSON.stringify(s));normalizeFarm(saved,now+24*HOUR);assert.deepEqual(saved,s,'a JSON round trip loads the same');
 }
});

test('old farms load unchanged; junk landmarks are cleaned up; normalizing twice changes nothing',async()=>{
 const {createLegacyFarm}=await import('./legacy-farm.mjs');
 for(const s of [fixture(113,['mine','lumbercamp','smithy']),createLegacyFarm(now),fixture(99)]){
  s.village={serial:s.village.serial,boards:s.village.boards};const before=structuredClone(s);normalizeFarm(s,now);
  for(const key of ['coins','inventory','buildings','xp','stats','diamonds'])assert.deepEqual(s[key],before[key],key);
  assert.deepEqual(s.village.landmarks,{done:[],given:{}});assert.deepEqual(s.village.boards,before.village.boards);
  const again=structuredClone(s);normalizeFarm(again,now);assert.deepEqual(again,s,'idempotent');
 }
 const saved=landmarks=>{const s=fixture(200);s.village={serial:0,boards:[],landmarks};normalizeFarm(s,now);const once=structuredClone(s.village);normalizeFarm(s,now);assert.deepEqual(s.village,once);return s.village.landmarks;};
 assert.deepEqual(saved({done:['longhouse'],given:{rooftile:5}}),{done:[],given:{rooftile:5}});
 assert.deepEqual(saved({done:['windpump','windpump','x','stonequay'],given:{linen:999,rooftile:-3,plank:2.5,stone:10,lavendersoap:'7'}}),{done:['windpump'],given:{linen:300}});
 assert.deepEqual(saved({done:[...IDS].reverse(),given:{rooftile:5}}),{done:IDS,given:{}});
 for(const bad of [{done:'all',given:[1]},null,'x',[1]])assert.deepEqual(saved(bad),{done:[],given:{}},JSON.stringify(bad));
 assert.deepEqual(saved({done:[],given:{__proto__:null,rooftile:7,toString:3}}),{done:[],given:{rooftile:7}});
});

test('landmark quests: 1, 3 and 5 landmarks at levels 165, 185 and 200, claimed one by one',()=>{
 assert.deepEqual(VILLAGE_QUESTS.slice(55,58).map(q=>[q.title,q.description,q.stat,q.target,q.reward,q.minLevel]),[
  ['A landmark for the village','Finish a landmark in the village.','village_landmarks',1,300000,165],
  ['Three landmarks','Finish 3 landmarks in the village.','village_landmarks',3,400000,185],
  ['The Great Hall','Finish the Great Hall.','village_landmarks',5,500000,200]]);
 assert.deepEqual(VILLAGE_QUESTS.slice(55,58).map(questXp),[250,250,250]);
 const s=quiet(fixture(170,ALL,{rooftile:600,plank:300,ironbar:60}));
 assert.throws(()=>act(s,{type:'village_quest',id:55}),/Finish this quest/);
 act(s,{type:'landmark_give',landmark:'windpump'});act(s,{type:'landmark_finish',landmark:'windpump'});
 assert.deepEqual(act(s,{type:'village_quest',id:55}),{coins:300000,xp:250});
 s.stats.village_landmarks=3;assert.throws(()=>act(s,{type:'village_quest',id:56}),{message:'Reach level 185 for this quest.'});
});

test('the showcase farm has every landmark, no villager waiting and no boat for a month',()=>{
 const s=createShowcaseFarm(now);
 assert.deepEqual(s.village.landmarks,{done:IDS,given:{}});assert.equal(s.stats.village_landmarks,5);
 assert.equal(s.village.boards.length,4);assert.ok(s.village.boards.every(b=>b.request===null&&b.readyAt===now+30*86400000));
 assert.deepEqual([s.village.boat.cargo,s.village.boat.readyAt],[null,now+30*86400000]);
 assert.deepEqual([villageSquareReady(s),villageLandmark(s),villageBrief(s)],[false,null,null]);
 const entries=unlockEntries(s).filter(e=>e.kind==='Landmark');assert.equal(entries.length,5);assert.ok(entries.every(e=>e.unlocked));
});

test('Coming up and the level-up card name the landmarks from level 100 only, guided and legacy',()=>{
 for(const mode of ['guided','legacy']){
  const at=level=>{const s=createFarm(now);if(mode==='legacy')s.progression={mode:'legacy'};s.xp=xpForLevel(level);s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};return unlockEntries(normalizeFarm(s,now)).filter(e=>e.id.startsWith('landmark:'));};
  assert.deepEqual(at(99),[],mode);
  assert.deepEqual(at(100),IDS.map(k=>({id:'landmark:'+k,name:VILLAGE_LANDMARKS[k].name,art:VILLAGE_LANDMARKS[k].art,kind:'Landmark',level:VILLAGE_LANDMARKS[k].level,unlocked:false,hint:`Reach level ${VILLAGE_LANDMARKS[k].level}.`})),mode);
  assert.deepEqual(at(165).map(e=>e.unlocked),[true,false,false,false,false]);
  assert.ok(at(200).every(e=>e.unlocked));
 }
});

// What a good comes from, down to the field (as the balance check traces it): each good from its first non-Factory recipe, packed lunches
// from the canteen's pasties, crops and heirlooms are the ends; what a recipe makes besides counts for nothing (1 beeswax = 1/3 sunflower).
function raw(key,n=1,out={},seen=[]){
 if(Object.hasOwn(CROPS,key)||Object.hasOwn(HEIRLOOMS,key)){out[key]=(out[key]??0)+n;return out;}
 const id=key==='packedlunch'?'pastylunch':Object.keys(RECIPES).filter(id=>RECIPES[id].building!=='factory'&&RECIPES[id].output[key]).sort((a,b)=>RECIPE_LEVELS[a]-RECIPE_LEVELS[b])[0];
 assert.ok(id&&!seen.includes(key),`${key} has a recipe and no loop`);
 const r=RECIPES[id];for(const [k,m] of Object.entries(r.input))raw(k,n*m/r.output[key],out,[...seen,key]);
 return out;
}
test('no slow crop hidden in the landmarks: about 57 sunflowers for all five, no heirloom from the Seed Lab',()=>{
 const total={},per={};
 for(const [id,l] of Object.entries(VILLAGE_LANDMARKS)){per[id]={};for(const [k,n] of Object.entries(l.materials)){raw(k,n,per[id]);raw(k,n,total);}}
 assert.deepEqual(Object.fromEntries(IDS.map(id=>[id,Math.round((per[id].sunflower??0)*10)/10])),{windpump:0,longhouse:0,stonequay:0,lookout:40,greathall:16.7});
 assert.ok(total.sunflower<=60,`${total.sunflower} sunflowers (10 Oct 2026: sachets in the Longhouse keep it under 60)`);
 assert.ok(Object.keys(total).every(k=>!Object.hasOwn(HEIRLOOMS,k)),Object.keys(total).join());
 assert.equal(total.apples??0,0,'pasty lunches, no apples');
 // Every landmark asks whole numbers of village goods only: nothing of the farm's own Market.
 for(const l of Object.values(VILLAGE_LANDMARKS))assert.ok(Object.entries(l.materials).every(([k,n])=>Number.isInteger(n)&&n>0&&ITEMS[k].village===true),l.name);
});

// The next landmark's pin and its tooltip (game.js landmarkNote, 10 Oct 2026, review fix): "Bring the goods" while any is missing, then
// "Pay the coins" once all are handed in, whether the coins are there yet or not, as the market square says; the bonus once finished.
test('the next landmark\'s pin says what the market square asks: the goods, then the coins, then its bonus',async()=>{
 const game=(await import('node:fs')).readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 const from=game.indexOf('const landmarkNote=(key,done)=>'),to=game.indexOf('\n',from);assert.ok(from>0,'game.js landmarkNote');
 const note=(s,key)=>new Function('state','villageLandmark','VILLAGE_LANDMARKS',`${game.slice(from,to)}return landmarkNote;`)(s,villageLandmark,VILLAGE_LANDMARKS)(key,landmarkDone(s,key));
 const s=quiet(fixture(166)),l=VILLAGE_LANDMARKS.windpump,[first]=Object.keys(l.materials);
 assert.equal(villageLandmark(s).id,'windpump');assert.equal(note(s,'windpump'),'Bring the goods to the market square.');
 give(s,'windpump',{...l.materials,[first]:l.materials[first]-1});
 assert.equal(note(s,'windpump'),'Bring the goods to the market square.','one good short');
 give(s,'windpump',{[first]:1});assert.deepEqual(villageLandmark(s).missing,{});
 s.coins=l.coins-1;assert.equal(villageLandmark(s).ready,false);assert.equal(note(s,'windpump'),'Pay the coins at the market square to finish it.','coins short');
 s.coins=l.coins;assert.equal(villageLandmark(s).ready,true);assert.equal(note(s,'windpump'),'Pay the coins at the market square to finish it.');
 act(s,{type:'landmark_finish',landmark:'windpump'});assert.equal(note(s,'windpump'),l.effect);
});
