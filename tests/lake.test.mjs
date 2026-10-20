import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {farmLog,snapshot} from '../supabase/functions/farm-api/player-log.js';
import {createLegacyFarm} from './legacy-farm.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
// The village lake (12 Oct 2026, plan D): World II's fishing, the pond's rules with the lake's own casts, fish, book and coins. It ships
// closed first (LAKE_OPEN false): these tests play the rules with the lake open, from the same source with only the switch turned (G),
// and check the closed build (C) as it ships.
const SOURCE=read('game/farm-state.js');
const OPEN=asModule(SOURCE.replace(/export const LAKE_OPEN=(true|false),/,'export const LAKE_OPEN=true,'));
const G=await import(OPEN);
const C=await import(asModule(SOURCE.replace(/export const LAKE_OPEN=(true|false),/,'export const LAKE_OPEN=false,')));
const {instantResult,INSTANT_ACTIONS}=await import(asModule(read('public/farm-client.js').replace("from './farm-state.js';",`from '${OPEN}';`)));
const show=(sha,path)=>{try{return execFileSync('git',['show',`${sha}:${path}`],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:1<<24,stdio:['ignore','pipe','ignore']});}catch{return null;}};
const now=Date.UTC(2026,9,12,9),GAP=G.POND_MIN_GAP_MS,LATER=G.POND_REFILL_MS*5,TWO=G.LAKE_PAGE_TWO_LEVEL;
const [ONE_KINDS,TWO_KINDS]=G.LAKE_FISH_PAGES;
const at=(level,M=G)=>{const s=M.createFarm(now-3600000);s.xp=M.xpForLevel(level);s.coins=500;M.normalizeFarm(s,now);return s;};
const water=(n,best={},extra={})=>({firstAt:now-86400000,n,casts:5,castsAt:0,lastAt:0,prevAt:0,best,...extra});
const lake=(s,t,landed=true,perfect=false)=>G.applyFarmAction(s,{type:'lake_fish',n:s.lake?.n??0,landed,perfect},t);
const pond=(s,t,landed=true,perfect=false)=>G.applyFarmAction(s,{type:'fish',n:s.pond?.n??0,landed,perfect},t);
const allOne=()=>Object.fromEntries(ONE_KINDS.map(k=>[k,G.LAKE_FISH[k].kg[0]]));
const LAKE_STATS=['lake_fish','lake_fish_coins','lake_fish_perfect','lake_fish_released'];

test('one switch, closed in this build: nothing of the lake is listed, every lake fish is refused, no save gets a lake; one file in three places',()=>{
 assert.equal((SOURCE.match(/export const LAKE_OPEN=(true|false),/g)??[]).length,1,'one switch, in game/farm-state.js');
 // Step 1 of the release (plan D, section 4) ships the lake closed; step 2 turns only this switch (and this line) to true.
 assert.match(SOURCE,/export const LAKE_OPEN=true,LAKE_LEVEL=WORLD_TWO_LEVEL;/);   // step 2 (12 Oct 2026): the lake is open
 assert.equal(read('public/farm-state.js'),SOURCE,'scripts/sync-game.mjs copies the rules to the browser');
 assert.equal(read('supabase/functions/farm-api/farm-state.js'),SOURCE,'and to farm-api');
 for(const level of [100,120,180]){
  const s=at(level,C);assert.equal(C.lakeOpen(s),false);assert.equal(C.lakePageTwoOpen(s),false);
  assert.ok(!C.unlockEntries(s).some(e=>e.id.startsWith('lake:')||/lake/i.test(e.name)),`level ${level}: no card line, no Coming up`);
  assert.throws(()=>C.applyFarmAction(s,{type:'lake_fish',n:0,landed:true,perfect:false},now),{message:'The village lake is not open yet.'});
  assert.equal('lake' in s,false,'no save gets a lake');for(const k of LAKE_STATS)assert.equal(k in s.stats,false);
 }
 // The pond is open as before in the closed build.
 const p=at(10,C);assert.equal(C.applyFarmAction(p,{type:'fish',n:0,landed:true,perfect:false},now).species,'minnow');
});

test('open from level 100 (World II) for every farm, old or new; level 99 is refused with the rule and lists nothing of it',()=>{
 assert.equal(G.LAKE_LEVEL,100);assert.equal(G.LAKE_LEVEL,G.WORLD_TWO_LEVEL);
 const nine=at(99);assert.equal(G.lakeOpen(nine),false);
 assert.throws(()=>lake(nine,now),{message:'Reach level 100 to fish at the village lake.'});assert.equal('lake' in nine,false);
 assert.ok(!G.unlockEntries(nine).some(e=>e.id.startsWith('lake:')||/lake/i.test(e.name)),'no level-card line and no Coming up line at 99');
 const hundred=at(100);assert.equal(G.lakeOpen(hundred),true);const r=lake(hundred,now);assert.equal(r.species,'bleak');assert.equal(r.first,true);
 const old=createLegacyFarm(now);old.xp=G.xpForLevel(99);G.normalizeFarm(old,now);assert.equal(G.lakeOpen(old),false);old.xp=G.xpForLevel(100);assert.equal(G.lakeOpen(old),true);
 // Listed from 100 (unlocked, so never in Coming up); page two's line only from 120.
 const entry=id=>s=>G.unlockEntries(s).find(e=>e.id===id);
 assert.deepEqual(['name','art','kind','level','unlocked'].map(k=>entry('lake:open')(hundred)[k]),['Village lake','villagelake','Activity',100,true]);
 assert.equal(entry('lake:page2')(at(119)),undefined);
 assert.deepEqual(['name','art','kind','level','unlocked'].map(k=>entry('lake:page2')(at(TWO))[k]),['10 new fish in the Village lake','fish-goldentrout','Activity',TWO,true]);
 for(const level of [100,119,120,150])assert.ok(G.unlockEntries(at(level)).filter(e=>e.id.startsWith('lake:')).every(e=>e.unlocked),`level ${level}: never a locked line, so never in Coming up`);
});

test('the level cards: level 100\'s names the Village lake, level 120\'s its 10 new fish; a farm already past them gets no card',async()=>{
 const {progressionSnapshot,progressionChange,nextUnlock}=await import(asModule(read('public/progression-ui.js').replace("import {art} from './visual-icons.js';","const art=()=>'';").replace("from './farm-state.js';",`from '${OPEN}';`).replace(/import \{PLAYER_AVATARS[^\n]*\n/,'const PLAYER_AVATARS=[],avatarGoal=()=>null,avatarOpen=()=>false;\n')));
 // Level 99 to 100 on a pond fish's XP: the card names the lake.
 const s=at(99);s.xp=G.xpForLevel(100)-2;G.normalizeFarm(s,now);assert.ok(!nextUnlock(s)||!nextUnlock(s).id.startsWith('lake:'),'not in Coming up at 99');
 const snap=progressionSnapshot(s);pond(s,now);assert.equal(G.levelOf(s),100);
 const change=progressionChange(snap,s,null);assert.ok(change.leveled&&change.entries.some(e=>e.id==='lake:open'),'on level 100\'s card');
 assert.ok(!change.entries.some(e=>e.id==='lake:page2'));
 // Level 119 to 120 on a lake fish's XP: its page two.
 const t=at(119);t.xp=G.xpForLevel(TWO)-2;G.normalizeFarm(t,now);t.lake=water(40,{});
 const snap2=progressionSnapshot(t);lake(t,now);assert.equal(G.levelOf(t),TWO);
 const change2=progressionChange(snap2,t,null);assert.deepEqual(change2.entries.filter(e=>e.id.startsWith('lake:')).map(e=>e.id),['lake:page2']);
 // A farm at 105 when the lake opens: both seen at once, before anything happens, so no card.
 const u=at(105),snap3=progressionSnapshot(u);assert.ok(snap3.ids.has('lake:open'));pond(u,now);assert.deepEqual(progressionChange(snap3,u,null).entries.filter(e=>e.id.startsWith('lake:')),[]);
});

test('20 kinds on two pages, apart from the pond\'s 16; each chance column adds up to 100%; the first three lake fish are fixed',()=>{
 assert.deepEqual(ONE_KINDS,['bleak','chub','whitefish','nase','grayling','browntrout','char','burbot','huchen','oldgranite']);
 assert.deepEqual(TWO_KINDS,['bullhead','vendace','ide','goldenorfe','brooktrout','laketrout','salmon','goldentrout','marbletrout','glacierghost']);
 assert.deepEqual(ONE_KINDS.map(k=>G.LAKE_FISH[k].name),['Bleak','Chub','Whitefish','Nase','Grayling','Brown trout','Arctic char','Burbot','Huchen','Old Granite']);
 assert.deepEqual(TWO_KINDS.map(k=>G.LAKE_FISH[k].name),['Bullhead','Vendace','Ide','Golden orfe','Brook trout','Lake trout','Salmon','Golden trout','Marble trout','Glacier Ghost']);
 for(const k of Object.keys(G.LAKE_FISH))assert.ok(!Object.hasOwn(G.FISH,k),`${k}: not a pond kind`);
 assert.equal(Object.keys(G.FISH).length,16,'the pond\'s table keeps its 16 kinds');assert.equal(Object.keys(G.ALL_FISH).length,36,'one list of all 36');
 const sum=key=>Object.values(G.LAKE_FISH).reduce((s,f)=>s+f[key],0).toFixed(6);
 assert.equal(sum('chance'),'100.000000','levels 100 to 119');assert.equal(sum('chance120'),'100.000000','from level 120');
 for(const k of TWO_KINDS)assert.equal(G.LAKE_FISH[k].chance,0,`${k}: never below level 120`);
 for(const k of ONE_KINDS)assert.ok(G.LAKE_FISH[k].chance120>0&&G.LAKE_FISH[k].chance120<=G.LAKE_FISH[k].chance);
 // The plan's table (section 2): weights, bases and XP.
 assert.deepEqual(Object.values(G.LAKE_FISH).map(f=>[f.kg[0],f.kg[1],f.coins,f.xp]),[[.03,.12,30,4],[.5,4,45,5],[.5,4,50,5],[.4,2.5,60,6],[.3,2.5,65,6],[.5,8,90,8],[.5,6,120,10],[1,12,220,15],[5,35,360,20],[25,45,1100,40],
  [.02,.15,25,4],[.05,.4,35,5],[.5,3.5,45,6],[.4,3,60,8],[.3,3,65,8],[2,20,100,12],[3,25,130,14],[.3,2.5,200,18],[3,22,350,25],[30,60,1100,40]]);
 assert.equal(G.LAKE_FISH.glacierghost.kg[1],60);assert.equal(G.LAKE_FISH.oldgranite.kg[1],45);assert.ok(Math.max(...Object.values(G.FISH).map(f=>f.kg[1]))<G.LAKE_FISH.huchen.kg[1],'heavier than the pond\'s heaviest');
 for(const rookieUntil of [0,1,123456789,Date.UTC(2026,9,1)])assert.deepEqual([0,1,2].map(n=>G.lakeFish({rookieUntil},n)).map(f=>[f.species,f.kg]),[['bleak',.07],['chub',1.35],['browntrout',2.1]]);
 for(const [species,kg] of G.LAKE_FIRST_FISH){const [lo,hi]=G.LAKE_FISH[species].kg;assert.ok(kg>lo&&kg<(lo+hi)/2,`${species}: a light one, so records come`);}
});

test('the farm\'s own seed with the lake\'s own salt: the same fish every time, lake fish 7 is not pond fish 7, shares as the tables say',()=>{
 const a={rookieUntil:1760000000000},b={rookieUntil:1760000000001},seq=s=>Array.from({length:60},(_,i)=>G.lakeFish(s,i+3)).map(f=>`${f.species}:${f.kg}`).join();
 assert.equal(seq(a),seq(structuredClone(a)),'the same fish every time');assert.notEqual(seq(a),seq(b),'another farm, other fish');
 assert.equal(seq({}),seq({rookieUntil:0}),'a farm without a seed shares one sequence (harmless, as on the pond)');
 // The salt: with the pond's random numbers a lake fish would sit at the same place in its weight range as the pond fish of that number.
 let same=0;for(let n=3;n<403;n++){const p=G.pondFish(a,n),l=G.lakeFish(a,n);if(Math.abs(p.share-l.share)<.01)same++;}
 assert.ok(same<40,`${same} of 400 at the same place: another sequence`);
 // Over 100,000 fish the kinds come as the table says, before and from page two (the legends' own rules left out: both landed).
 for(const [two,key] of [[false,'chance'],[true,'chance120']]){
  const counts={},s={rookieUntil:42,lake:{n:0,best:{oldgranite:30,glacierghost:40},...(two?{page2At:0}:{})}};
  for(let n=3;n<100003;n++){const f=G.lakeFish(s,n);counts[f.species]=(counts[f.species]??0)+1;const [lo,hi]=G.LAKE_FISH[f.species].kg;assert.ok(f.kg>=lo&&f.kg<=hi&&f.share>=0&&f.share<=1);}
  for(const [k,f] of Object.entries(G.LAKE_FISH))assert.ok(Math.abs((counts[k]??0)/1000-f[key])<.5,`${key} ${k}: ${(counts[k]??0)/1000}% for ${f[key]}%`);
 }
});

test('casts: the lake\'s own 5 and one every 20 minutes; fishing one water never uses the other\'s casts; 77 a day at each',()=>{
 const s=at(110);assert.deepEqual(G.lakeCasts(s,now),{casts:5,nextAt:0});assert.deepEqual(G.pondCasts(s,now),{casts:5,nextAt:0});
 lake(s,now);assert.deepEqual(G.lakeCasts(s,now),{casts:4,nextAt:now+20*60000});assert.deepEqual(G.pondCasts(s,now),{casts:5,nextAt:0},'the pond keeps its casts');
 pond(s,now+1);assert.equal(G.pondCasts(s,now+1).casts,4);assert.equal(G.lakeCasts(s,now+1).casts,4,'and the lake its own');
 lake(s,now+GAP,false);assert.equal(G.lakeCasts(s,now+GAP).casts,3,'letting a fish go uses its cast');assert.equal(G.pondCasts(s,now+GAP).casts,4);
 assert.equal(s.lake.n,2);assert.equal(s.pond.n,1);
 assert.deepEqual(G.lakeCasts(s,now+10*3600000),{casts:5,nextAt:0},'never more than 5');
 // A whole day at both waters: 77 at most at each, 154 in all.
 const d=at(110);let atLake=0,atPond=0;
 for(let k=0;k<24*12;k++){const t=now+k*5*60000;
  for(let i=0;G.lakeCasts(d,t+i*GAP).casts>0;i++){lake(d,t+i*GAP);atLake++;}
  for(let i=0;G.pondCasts(d,t+i*GAP+1).casts>0;i++){pond(d,t+i*GAP+1);atPond++;}}
 assert.ok(atLake>=72&&atLake<=G.POND_START_CASTS+72,`${atLake} lake fish in a day`);assert.ok(atPond>=72&&atPond<=G.POND_START_CASTS+72,`${atPond} pond fish`);
 assert.equal(d.stats.lake_fish,atLake);assert.equal(d.stats.fish,atPond);
});

test('refused: no cast left, the wrong number (the lake\'s own count), too fast, a landing that is not a plain true or false',()=>{
 const s=at(110);
 for(const [landed,perfect] of [[1,false],['yes',false],[true,undefined],[true,1],[null,null]])assert.throws(()=>G.applyFarmAction(s,{type:'lake_fish',n:0,landed,perfect},now),{message:'Choose whether you landed the fish.'});
 assert.throws(()=>G.applyFarmAction(s,{type:'lake_fish',n:1,landed:true,perfect:false},now),{message:'Your lake changed in another tab.'});
 assert.throws(()=>G.applyFarmAction(s,{type:'lake_fish',n:'0',landed:true,perfect:false},now),{message:'Your lake changed in another tab.'});
 pond(s,now-10);pond(s,now-9);assert.throws(()=>G.applyFarmAction(s,{type:'lake_fish',n:2,landed:true,perfect:false},now-8),{message:'Your lake changed in another tab.'},'the pond\'s count is not the lake\'s');
 lake(s,now);lake(s,now+100);   // two close together pass, also right after two pond fish: each water has its own pace
 assert.throws(()=>lake(s,now+GAP-1),{message:'Give the line a moment.'},'a third within 3.5 s of the first does not');
 lake(s,now+GAP);lake(s,now+2*GAP);lake(s,now+3*GAP);
 assert.throws(()=>lake(s,now+4*GAP),{message:'No casts left. A new cast comes every 20 minutes.'});
 assert.equal(s.lake.n,5,'nothing refused moved the count');assert.equal(s.pond.n,2);
 assert.deepEqual(Object.keys(s.lake).sort(),['best','casts','castsAt','firstAt','lastAt','n','prevAt'],'the pond\'s shape (no page2At below 120)');
});

test('pay: the pond\'s coin rule on the lake\'s bases; double for today\'s fish (page one\'s five), a fifth more when perfect, the first of a kind 3 times; XP flat',()=>{
 for(const level of [100,120,150,200]){
  const s=at(level),f=G.lakeFish(s,0),r=lake(s,now),base=Math.round(30*(.8+.4*f.share)*(1+level/8)*(G.lakeTodaysFish(now)==='bleak'?2:1));
  assert.equal(r.coins,base*3,`level ${level}: the first bleak pays three times`);assert.equal(r.xp,4+10,'XP is flat: no level in it');
 }
 const five=['bleak','chub','whitefish','nase','grayling'],days=Array.from({length:400},(_,d)=>now+d*G.DAY_MS+(d%24)*3600000);
 assert.deepEqual([...new Set(days.map(t=>G.lakeTodaysFish(t)))].sort(),[...five].sort(),'one of page one\'s five common kinds, never page two\'s');
 assert.notEqual(G.lakeTodaysFish(now),G.lakeTodaysFish(now+G.DAY_MS),'another one tomorrow');
 const dayOf=sp=>{for(let d=0;d<5;d++)if(G.lakeTodaysFish(now+d*G.DAY_MS)===sp)return now+d*G.DAY_MS;};
 const s=at(130),f={species:'chub',kg:2,share:(2-.5)/3.5},base=45*(.8+.4*f.share)*(1+130/8);
 assert.equal(G.lakeFishCoins(s,f,false,dayOf('bleak')),Math.round(base));
 assert.equal(G.lakeFishCoins(s,f,true,dayOf('bleak')),Math.round(base*1.2),'a perfect catch pays a fifth more');
 assert.equal(G.lakeFishCoins(s,f,false,dayOf('chub')),Math.round(base*2),'today\'s fish pays double');
 assert.equal(G.lakeFishCoins(s,f,true,dayOf('chub')),Math.round(base*2*1.2));
 // A page-two kind never doubles, at any level.
 for(const t of days.slice(0,10))for(const k of TWO_KINDS)assert.equal(G.lakeFishCoins(s,{species:k,kg:1,share:.5},false,t),Math.round(G.LAKE_FISH[k].coins*1*(1+130/8)));
 // The second of a kind pays once, its XP is the table's at any level.
 const t=at(150);t.lake=water(3,{bleak:.05,chub:.6,browntrout:1,whitefish:.6,nase:.5,grayling:.4});G.normalizeFarm(t,now);
 for(let k=0;k<40;k++){const next=G.lakeFish(t,t.lake.n),had=t.lake.best[next.species]>0,before=t.coins,r=lake(t,now+k*LATER,true,k%2===0);
  assert.equal(r.first,!had);assert.equal(r.xp,G.LAKE_FISH[r.species].xp+(had?0:10));assert.equal(t.coins-before,r.coins);
  assert.equal(r.coins,(had?1:3)*G.lakeFishCoins(t,next,k%2===0,now+k*LATER));assert.equal(r.today,G.lakeTodaysFish(now+k*LATER)===r.species);}
});

test('Old Granite: lake fish 120 is him for a farm that never landed him, again at 240 if he was let go',()=>{
 for(const rookieUntil of [0,7,1760000000000]){assert.equal(G.lakeFish({rookieUntil},119).species,'oldgranite');assert.equal(G.lakeFish({rookieUntil},239).species,'oldgranite');}
 let ordinary=0;for(let seed=1;seed<=20;seed++)if(G.lakeFish({rookieUntil:seed,lake:{best:{oldgranite:30}}},119).species!=='oldgranite')ordinary++;
 assert.ok(ordinary>=18,'once landed, fish 120 is an ordinary roll');
 // The pond's own count is not the lake's: pond fish 120 does not bring him.
 assert.notEqual(G.pondFish({rookieUntil:7},119).species,'oldgranite');
 const s=at(110);s.lake=water(119,{});G.normalizeFarm(s,now);assert.equal(lake(s,now,false).released,true);
 s.lake.n=239;const r=lake(s,now+LATER);assert.equal(r.species,'oldgranite');assert.ok(r.kg>=25&&r.kg<=45);assert.equal(r.xp,40+10);
});

test('the Glacier Ghost: one of the first 60 lake fish from level 120 for a farm that never landed one, with the pond\'s tie rule',()=>{
 const K=G.LAKE_GHOST_BY,L=G.LAKE_LEGEND_BY;assert.equal(K,60);assert.equal(L,120);let landedAgain=0;
 for(let from=0;from<300;from+=7)for(const seed of [0,5,1760000000000]){
  const best={oldgranite:30},s={rookieUntil:seed,lake:{n:0,page2At:from,best}};
  const slot=from+K-1,due=(slot+1)%L===0?slot-1:slot;
  assert.equal(G.lakeFish(s,due).species,'glacierghost',`page two from ${from}, seed ${seed}: fish ${due}`);
  const next=from+2*K-1,due2=(next+1)%L===0?next-1:next;assert.equal(G.lakeFish(s,due2).species,'glacierghost','let go: the next 60 bring it again');
  if(G.lakeFish({...s,lake:{...s.lake,best:{...best,glacierghost:40}}},due).species==='glacierghost')landedAgain++;
 }
 assert.ok(landedAgain<=2,`${landedAgain} on the 60th once one was landed`);
 // Old Granite keeps fish 120 when the Ghost's 60th falls on it (the Ghost is the 59th then).
 const s={rookieUntil:3,lake:{n:0,page2At:60,best:{}}};assert.equal(G.lakeFish(s,119).species,'oldgranite');assert.equal(G.lakeFish(s,118).species,'glacierghost');
 // Below level 120 (no mark) there is no Ghost at all, nor any page-two kind.
 for(let n=3;n<3000;n++)assert.equal(G.LAKE_FISH[G.lakeFish({rookieUntil:n,lake:{n:0,best:{}}},n).species].page,1);
});

test('page two only from level 120 and after the farm\'s first lake fish there (lake.page2At); below 120 the lake never turns over',()=>{
 const s=at(TWO);s.rookieUntil=4242;s.lake=water(57,allOne(),{bookPaid:true});G.normalizeFarm(s,now);
 assert.equal(G.lakePageTwo(s),false,'not before the farm fished at 120');
 const first=G.lakeFish(s,57),r=lake(s,now);
 assert.equal(r.species,first.species);assert.equal(s.lake.page2At,57);assert.equal(G.LAKE_FISH[r.species].page,1,'the marking fish is still page one\'s');
 assert.equal(G.lakePageTwo(s),true);assert.equal(G.lakePageTwo(s,57),false);assert.equal(G.lakePageTwo(s,58),true);
 const g=at(TWO+5);g.lake=water(9,{});G.normalizeFarm(g,now);lake(g,now,false);assert.equal(g.lake.page2At,9,'a fish let go marks it too');
 const l=at(TWO-1);l.lake=water(9,{});G.normalizeFarm(l,now);for(let k=0;k<30;k++){const q=lake(l,now+k*LATER);assert.equal(G.LAKE_FISH[q.species].page,1);}assert.equal(l.lake.page2At,undefined);
 // The pond's mark is the pond's: a farm at 120 with pond.page2At has no lake page two until it fishes at the lake.
 const m=at(TWO);m.pond={...water(30,{}),page2At:3};m.lake=water(30,{});G.normalizeFarm(m,now);assert.equal(G.lakePageTwo(m),false);assert.equal(G.pondPageTwo(m),true);
 const fresh=at(130);for(let k=0;k<3;k++)assert.equal(lake(fresh,now+k*GAP).species,G.LAKE_FIRST_FISH[k][0]);assert.equal(fresh.lake.page2At,0);
 assert.equal(G.lakePageTwoOpen(at(119)),false);assert.equal(G.lakePageTwoOpen(at(TWO)),true);
});

test('the lake\'s book: 35 diamonds once for page one, 65 once for all 20, both as diamonds earned; both at once when the last was page one\'s',()=>{
 assert.equal(G.LAKE_BOOK_DIAMONDS,35);assert.equal(G.LAKE_BOOK2_DIAMONDS,65);assert.equal(G.LAKE_BOOK_DIAMONDS+G.LAKE_BOOK2_DIAMONDS,100);
 const s=at(110);s.lake=water(3,{bleak:.05,chub:.6,whitefish:.6,nase:.5,grayling:.4,browntrout:1,char:1,burbot:2,huchen:6});G.normalizeFarm(s,now);
 const diamonds=s.diamonds,earned=s.stats.diamonds_earned??0;let t=now,paid=0;
 for(let k=0;k<400&&!(s.lake.best.oldgranite>0);k++){t+=LATER;const next=G.lakeFish(s,s.lake.n),had=s.lake.best[next.species]??0,r=lake(s,t);paid+=r.diamonds;
  assert.equal(r.record,had>0&&next.kg>had);assert.equal(s.lake.best[next.species],Math.max(had,next.kg));}
 assert.ok(s.lake.best.oldgranite>=25,'Old Granite came');assert.equal(paid,35);assert.equal(s.diamonds,diamonds+35);assert.equal(s.lake.bookPaid,true);assert.ok(G.lakeBookDone(s));
 assert.equal(s.stats.diamonds_earned,earned+35,'counted as diamonds earned');assert.equal(s.lake.book2Paid,undefined,'below 120 never the whole book');
 for(let k=0;k<30;k++){t+=LATER;assert.equal(lake(s,t).diamonds,0,'never again');}
 // From 120: all 20 kinds pay 65 more, once.
 const w=at(130);w.lake=water(200,{...allOne(),bullhead:.05,vendace:.1},{bookPaid:true,page2At:150});G.normalizeFarm(w,now);
 const d2=w.diamonds;let tt=now,paid2=0,count=0,book2=0;
 for(;count<800&&!w.lake.book2Paid;count++){tt+=LATER;const r=lake(w,tt);paid2+=r.diamonds;if(r.book2)book2++;}
 assert.ok(G.lakeBook2Done(w));assert.equal(paid2,65);assert.equal(book2,1);assert.equal(w.diamonds,d2+65);
 for(let k=0;k<40;k++){tt+=LATER;const r=lake(w,tt);assert.equal(r.diamonds,0);assert.equal(r.book2,undefined);}
 // The last kind missing is Old Granite (page one): his fish pays 35 and 65, 100 at once.
 const o=at(130);o.lake=water(119,{...allOne(),...Object.fromEntries(TWO_KINDS.map(k=>[k,G.LAKE_FISH[k].kg[0]]))},{page2At:100});delete o.lake.best.oldgranite;G.normalizeFarm(o,now);
 const r=lake(o,now);assert.equal(r.species,'oldgranite');assert.equal(r.diamonds,100);assert.equal(r.book2,true);assert.ok(o.lake.bookPaid&&o.lake.book2Paid);
 // The pond's book is the pond's: a full lake book pays nothing of the pond's, and the other way round.
 assert.equal(G.pondBookDone(o),false);assert.equal(o.pond,undefined);
});

test('stats: the lake counts on its own (lake_fish, its coins, perfect catches, fish let go); no items, no market earnings, no diamonds per fish',()=>{
 const s=at(120),inv={...s.inventory},earned=s.stats.earned,spent=s.stats.coins_spent??0,d=s.diamonds;
 let coins=0;for(let k=0;k<90;k++){const r=lake(s,now+k*LATER,k%7!==3,k%3===0);coins+=r.coins??0;}
 const ks=Array.from({length:90},(_,k)=>k),landed=ks.filter(k=>k%7!==3);
 assert.equal(s.stats.lake_fish,landed.length);assert.equal(s.stats.lake_fish_released,90-landed.length);assert.equal(s.stats.lake_fish_perfect,landed.filter(k=>k%3===0).length,'a perfect catch counts only when landed');assert.equal(s.stats.lake_fish_coins,coins);
 // The pond's quests (17 Oct 2026) keep a 0 for fish and fish_perfect on every farm; the lake moves none of the pond's counters.
 for(const k of ['fish','fish_coins','fish_perfect','fish_released','fish_kinds','caught_whiskers'])assert.equal(s.stats[k]??0,0,`${k}: the pond's counter is untouched`);
 assert.equal('pond' in s,false);assert.deepEqual(s.inventory,inv,'no items, no Market goods');
 assert.equal(s.stats.earned,earned,'lake coins are not "coins earned"');assert.equal(s.stats.coins_spent??0,spent);
 assert.ok(s.diamonds-d<=G.LAKE_BOOK_DIAMONDS+G.LAKE_BOOK2_DIAMONDS,'diamonds only for the book');
 const after=at(120);for(let k=0;k<4;k++)pond(after,now+k*GAP);for(const k of LAKE_STATS)assert.equal(k in after.stats,false,'and a pond fish moves none of the lake\'s');
});

// 20 Oct 2026: a lake cast counts for the village events ("Catch lake fish"), so farm-api saves it as an event action. It still moves
// no stat a farm event, a challenge or the Family Chest counts.
test('lists: lake_fish counts for village events, not the Family Chest, shows at once, and is a line in the farm\'s log',()=>{
 assert.ok(!G.NO_EVENT_ACTIONS.has('lake_fish'));assert.ok(G.NO_EVENT_ACTIONS.has('fish'));
 {const s=at(110),before=structuredClone(s.stats);lake(s,now);lake(s,now+GAP,false);
  for(const k of ['earned','coins_spent','diamonds_spent','harvested','produced','deliveries','chores','activities'])assert.equal(s.stats[k]??0,before[k]??0,`a lake cast moves no ${k}`);
  assert.ok(s.stats.lake_fish>(before.lake_fish??0),'only the lake\'s own counters');}
 assert.ok(INSTANT_ACTIONS.has('lake_fish'));assert.ok(INSTANT_ACTIONS.has('fish'));
 assert.match(read('supabase/functions/farm-api/index.ts'),/eventAction:NO_EVENT_ACTIONS\.has\(body\.action\.type\)\?null:body\.action\.type/);
 assert.equal(G.LAKE_WATER.action,'lake_fish');assert.equal(G.POND_WATER.action,'fish');assert.deepEqual(G.WATERS,{pond:G.POND_WATER,lake:G.LAKE_WATER});
 const s=at(110),before=snapshot(s),r=lake(s,now);
 const [row]=farmLog({type:'lake_fish',n:0,landed:true,perfect:false},before,s,r);
 assert.equal(row.category,'rewards');assert.equal(row.action,'lake_fish');assert.match(row.text,/^Caught a fish at the village lake: Bleak, 0\.07 kg · \+\d[\d,]* coins · \+14 XP$/);
 const b2=snapshot(s),r2=lake(s,now+GAP,false);assert.equal(farmLog({type:'lake_fish',n:1,landed:false,perfect:false},b2,s,r2)[0].text,'Let a fish go at the village lake');
 // The pond's line is as it was.
 const p=at(10),pb=snapshot(p),pr=pond(p,now);assert.match(farmLog({type:'fish',n:0,landed:true,perfect:false},pb,p,pr)[0].text,/^Caught a fish: Minnow, 0\.11 kg · \+\d+ coins · \+12 XP$/);
});

test('what the screen shows at once is what the server pays, lake fish after lake fish, across the mark at 120',()=>{
 for(const level of [100,119,TWO,160]){
  const s=at(level);s.rookieUntil=777+level;s.lake=water(40,allOne(),{bookPaid:true});G.normalizeFarm(s,now);let t=now;
  for(let k=0;k<12;k++){
   t+=GAP+1;const action={type:'lake_fish',n:s.lake.n,landed:k!==4,perfect:k%2===0};
   const shown=instantResult(s,action,t),server=structuredClone(s),paid=G.applyFarmAction(server,action,t);
   assert.ok(shown,'a lake fish shows at once');assert.deepEqual(shown.result,paid,`level ${level}, fish ${k}`);assert.deepEqual(shown.trial.lake,server.lake);
   G.applyFarmAction(s,action,t);if(G.lakeCasts(s,t).casts<1)t+=LATER;
  }
  assert.equal(s.lake.page2At,level>=TWO?40:undefined);
 }
 // A refused lake fish is refused on the screen too (it throws, as the server would).
 const c=at(99);assert.throws(()=>instantResult(c,{type:'lake_fish',n:0,landed:true,perfect:false},now),{message:'Reach level 100 to fish at the village lake.'});
});

test('the save: loading never makes state.lake; a garbled one is cleaned without losing its count or book; each book keeps only its own kinds',()=>{
 const s=at(130);G.normalizeFarm(s,now);assert.equal('lake' in s,false,'a farm that never fished at the lake keeps its shape');
 for(const k of LAKE_STATS)assert.equal(k in s.stats,false);
 const g=at(130);g.lake={n:7.5,casts:9,castsAt:'x',firstAt:-5,lastAt:null,best:{bleak:.123,minnow:4,chub:-1,nase:'2',huchen:Infinity,char:2.5},bookPaid:'yes',book2Paid:1,page2At:-1};G.normalizeFarm(g,now);
 assert.deepEqual(g.lake,{n:0,casts:5,castsAt:0,firstAt:0,lastAt:0,prevAt:0,best:{bleak:.12,char:2.5}});
 const kept=at(130);kept.lake={n:12,casts:9,best:{huchen:12.4},page2At:15};G.normalizeFarm(kept,now);
 assert.equal(kept.lake.n,12);assert.deepEqual(kept.lake.best,{huchen:12.4});assert.equal(kept.lake.casts,5);assert.equal('page2At' in kept.lake,false,'the number of a fish not cast yet');
 const h=at(130);h.lake=water(60,{...allOne(),glacierghost:44.5},{bookPaid:true,book2Paid:true,page2At:12,casts:2,castsAt:now-60000,lastAt:now-60000,prevAt:now-90000});
 const copy=structuredClone(h.lake);G.normalizeFarm(h,now);assert.deepEqual(h.lake,copy,'a good lake is left as it is');
 for(const bad of [null,5,'lake',[1,2]]){const b=at(130);b.lake=bad;G.normalizeFarm(b,now);assert.equal('lake' in b,false,String(bad));}
 // lake.best holds only lake kinds and pond.best only farm kinds: a kind of the other water is dropped, a fish never lands in the other book.
 const x=at(130);x.lake=water(5,{huchen:9,whiskers:12,sturgeon:15});x.pond=water(5,{carp:3,huchen:9,oldgranite:30});G.normalizeFarm(x,now);
 assert.deepEqual(x.lake.best,{huchen:9});assert.deepEqual(x.pond.best,{carp:3});
 const y=at(130);for(let k=0;k<30;k++){lake(y,now+k*LATER);pond(y,now+k*LATER+1);}
 assert.ok(Object.keys(y.lake.best).every(k=>Object.hasOwn(G.LAKE_FISH,k)));assert.ok(Object.keys(y.pond.best).every(k=>Object.hasOwn(G.FISH,k)));
 // A good lake survives a round trip through JSON (what farm-api saves) and a second load unchanged.
 const z=structuredClone(y),json=JSON.parse(JSON.stringify(z));G.normalizeFarm(json,now+LATER*40);assert.deepEqual(json.lake,{...z.lake});
});

// The farm pond must not change at all (plan D, 3.1): every pond fish, coin amount and Today's fish, and whole days of fishing, are
// exactly those of the live rules (fe636fc, v208), for farms of every kind.
test('the farm pond is unchanged: every pond fish, its coins, Today\'s fish and whole days of fishing are those of fe636fc',async t=>{
 const old=show('fe636fc','game/farm-state.js');if(!old){t.skip('no git history here');return;}
 const O=await import(asModule(old));
 for(const key of ['FISH','FISH_PAGES','POND_FIRST_FISH','POND_START_CASTS','POND_MAX_CASTS','POND_REFILL_MS','POND_MIN_GAP_MS','POND_PERFECT','POND_DAY_FACTOR','POND_NEW_FISH_COINS','POND_NEW_FISH_XP','POND_LEGEND_BY','POND_BOOK_DIAMONDS','POND_PAGE_TWO_LEVEL','POND_BOOK2_DIAMONDS','POND_STURGEON_BY','POND_OPEN','POND_LEVEL'])
  assert.deepEqual(G[key],O[key],key);
 for(const key of Object.keys(O).filter(k=>/pond|fish/i.test(k)))assert.equal(typeof G[key],typeof O[key],`${key}: still exported`);
 const DAY=G.DAY_MS;
 for(let seed=0;seed<30;seed++)for(const variant of [{},{whiskers:10},{whiskers:10,sturgeon:12}]){
  for(const mark of [undefined,0,37,150]){
   const extra=mark===undefined?{}:{page2At:mark},s={...at([8,19,20,60,110][seed%5]),rookieUntil:seed*7919+13,pond:water(0,{...variant},extra)},o=structuredClone(s);
   for(let n=0;n<320;n++){s.pond.n=o.pond.n=n;const a=G.pondFish(s,n),b=O.pondFish(o,n);
    assert.deepEqual(a,b,`seed ${seed}, fish ${n}`);assert.equal(G.pondPageTwo(s,n),O.pondPageTwo(o,n));
    if(n%23===0)for(const perfect of [false,true])assert.equal(G.fishCoins(s,a,perfect,now+(n%10)*DAY),O.fishCoins(o,b,perfect,now+(n%10)*DAY));}
   assert.equal(G.pondBookDone(s),O.pondBookDone(o));assert.equal(G.pondBook2Done(s),O.pondBook2Done(o));assert.equal(G.pondPageTwoOpen(s),O.pondPageTwoOpen(o));
  }
 }
 for(let d=0;d<60;d++)for(const h of [0,11,23])assert.equal(G.todaysFish(now+d*DAY+h*3600000),O.todaysFish(now+d*DAY+h*3600000),`day ${d}`);
 // Whole days, fish by fish through applyFarmAction: results, ponds, stats, coins, XP and diamonds as before, below and across level 20.
 for(const level of [4,19,20,45,110]){
  const s=at(level,O);s.rookieUntil=level*31+7;if(level===110)s.pond=water(115,{minnow:.1,perch:.3},{page2At:60});O.normalizeFarm(s,now);const o=structuredClone(s);
  for(let k=0;k<160;k++){const tt=now+k*LATER+(k%3)*GAP,action={type:'fish',n:s.pond?.n??0,landed:k%7!==3,perfect:k%3===0};
   // Once the whole book is caught (17 Oct 2026) a new cast comes every 15 minutes instead of 20: only when the next one comes moves.
   const full=G.pondBook2Done(s),a=G.applyFarmAction(s,action,tt),b=O.applyFarmAction(o,action,tt);
   if(!G.pondBook2Done(s))assert.deepEqual(a,b,`level ${level}, fish ${k}`);
   else{assert.deepEqual({...a,casts:null},{...b,casts:null},`level ${level}, fish ${k}`);if(full)assert.equal(G.waterRefill(G.POND_WATER,s),G.POND_BOOK_REFILL_MS);}}
  // The quests' collection counts (17 Oct 2026) are the only stats more: they follow the book.
  const counts=['fish_kinds','caught_whiskers','lake_fish_kinds','caught_oldgranite','heirlooms_found','lab_crosses'],rest=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!counts.includes(k)));
  assert.deepEqual(s.pond,o.pond);assert.deepEqual([s.coins,s.xp,s.diamonds,rest(s.stats)],[o.coins,o.xp,o.diamonds,rest(o.stats)],`level ${level}`);
  assert.equal(s.stats.fish_kinds,Object.keys(s.pond?.best??{}).length);assert.equal(s.stats.caught_whiskers,s.pond?.best?.whiskers>0?1:0);
  if(!G.pondBook2Done(s))for(const tt of [now,now+LATER*200])assert.deepEqual(G.pondCasts(s,tt),O.pondCasts(o,tt));
 }
 // Refusals word for word, and a garbled pond cleaned the same way.
 const r=at(10),q=structuredClone(r);for(const action of [{type:'fish',n:3,landed:true,perfect:false},{type:'fish',n:0,landed:1,perfect:false}]){
  let a,b;try{G.applyFarmAction(r,action,now);}catch(e){a=e.message;}try{O.applyFarmAction(q,action,now);}catch(e){b=e.message;}assert.equal(a,b);assert.ok(a);}
 const three=at(3),three2=structuredClone(three);let m1,m2;try{G.applyFarmAction(three,{type:'fish',n:0,landed:true,perfect:false},now);}catch(e){m1=e.message;}try{O.applyFarmAction(three2,{type:'fish',n:0,landed:true,perfect:false},now);}catch(e){m2=e.message;}assert.equal(m1,m2);
 const g=at(10),h=structuredClone(g);g.pond=h.pond={n:7.5,casts:9,castsAt:'x',firstAt:-5,lastAt:null,best:{minnow:.123,shark:4,huchen:3,perch:-1,pike:2.5},bookPaid:'yes',page2At:4};
 h.pond=structuredClone(g.pond);G.normalizeFarm(g,now);O.normalizeFarm(h,now);assert.deepEqual(g.pond,h.pond);
 // The pond's lines in the unlock list are as before.
 for(const level of [3,4,19,20,60])assert.deepEqual(G.unlockEntries(at(level)).filter(e=>/fish|pond/.test(e.id)),O.unlockEntries(at(level,O)).filter(e=>/fish|pond/.test(e.id)),`level ${level}`);
});

// Release order (new save keys: site first, then farm-api). The live game (21e4e5a) must read a farm that carries state.lake and the
// lake's stats without throwing, keep them and pond.best, play on, and refuse a lake fish cleanly: the lake opens with farm-api first.
test('the live game (21e4e5a) reads a farm with a lake, keeps it, plays on and refuses a lake fish cleanly',async t=>{
 const old=show('21e4e5a','game/farm-state.js');if(!old){t.skip('no git history here');return;}
 const O=await import(asModule(old));
 const s=at(125);s.rookieUntil=99;for(let k=0;k<8;k++){lake(s,now+k*LATER,k!==2,k===0);pond(s,now+k*LATER+1,true,false);}
 const saved=structuredClone(s);assert.ok(saved.lake.page2At===0&&saved.stats.lake_fish===7&&saved.stats.lake_fish_released===1&&Object.keys(saved.pond.best).length);
 saved.lake.bookPaid=true;
 const copy=structuredClone(saved),t2=now+9*LATER;O.normalizeFarm(copy,t2);
 assert.deepEqual(copy.lake,saved.lake,'the old rules leave the lake as it is');assert.deepEqual(copy.pond,saved.pond,'and the pond and its book');
 for(const k of LAKE_STATS)assert.equal(copy.stats[k],saved.stats[k],k);
 O.farmSummary(copy,t2);O.unlockEntries(copy);O.dailyTasks(copy,t2);O.dailyOrders(copy,t2);O.pondBookDone(copy);O.pondCasts(copy,t2);
 const play=action=>{try{return O.applyFarmAction(copy,action,t2);}catch(error){if(error instanceof TypeError||error instanceof RangeError||error instanceof ReferenceError)throw error;}};
 assert.ok(Object.hasOwn(O.FISH,play({type:'fish',n:copy.pond.n,landed:true,perfect:false}).species),'a pond fish with its own rules');
 play({type:'sell',item:'corn',quantity:1});const field=copy.plots.findIndex(p=>p.crop&&p.readyAt<=t2);if(field>=0)play({type:'field',id:field,action:'harvest'});
 assert.deepEqual(copy.lake,saved.lake,'and still after playing on');for(const k of LAKE_STATS)assert.equal(copy.stats[k],saved.stats[k]);
 assert.throws(()=>O.applyFarmAction(structuredClone(saved),{type:'lake_fish',n:saved.lake.n,landed:true,perfect:false},t2),{message:'Unknown farm action.'},'an old farm-api refuses a lake fish');
 // The old screen's instant path waits for the server for a lake fish (it is not one of its quick taps).
 const client=show('21e4e5a','public/farm-client.js');
 if(client){const {instantResult:oldInstant}=await import(asModule(client.replace("from './farm-state.js';",`from '${asModule(old)}';`)));assert.equal(oldInstant(saved,{type:'lake_fish',n:saved.lake.n,landed:true,perfect:false},t2),null);}
 // And the new rules read the old game's saves (no lake) as before: nothing is made.
 const plain=at(130,O);plain.pond=water(10,{carp:2});const mine=structuredClone(plain);G.normalizeFarm(mine,now);assert.equal('lake' in mine,false);assert.deepEqual(mine.pond,plain.pond);
});

test('texts: every language has the lake\'s name, its 20 fish and its lines; number forms where a count comes first; never the pond\'s words',async()=>{
 const {createTranslator}=await import('../public/i18n.js'),readme=read('i18n/README.md'),catalog=JSON.parse(read('i18n/catalog.json'));
 const names=Object.values(G.LAKE_FISH).map(f=>f.name);
 for(const name of ['Village lake',...names])assert.equal((readme.match(new RegExp(` ${name} `,'g'))??[]).length>=15,true,`${name} in all 15 glossary lines`);
 const texts=[...names,'Village lake','{0} new fish in the Village lake','Reach level {0} to fish at the village lake.','The village lake is not open yet.','Your lake changed in another tab.','Caught a fish at the village lake: {0}, {1} kg','Let a fish go at the village lake'];
 for(const text of texts)assert.ok(text in catalog,text);
 const forms={ru:['few','many','one','other'],uk:['few','many','one','other'],cs:['few','many','one','other'],ar:['few','many','one','other','two','zero'],hi:['one','other'],fr:['one','other']};
 for(const code of ['ar','cs','de','es','fr','hi','hu','id','ja','nl','pt','ru','tr','uk','zh']){
  const dict=JSON.parse(read(`public/i18n/${code}.json`)),t=createTranslator(dict,code);
  for(const text of texts)assert.ok(text in dict,`${code}: ${text}`);
  if(forms[code])assert.deepEqual(Object.keys(dict['{0} new fish in the Village lake']).sort(),forms[code],`${code}: number forms`);
  assert.notEqual(dict['Village lake'],dict['Fishing pond'],`${code}: the lake is not the pond`);
  assert.notEqual(dict['Your lake changed in another tab.'],dict['Your pond changed in another tab.'],code);
  assert.notEqual(dict['Caught a fish at the village lake: {0}, {1} kg'],dict['Caught a fish: {0}, {1} kg'],code);
  // The level-120 card and a log line read whole, the fish's name inside them translated too.
  const card=t.translate('10 new fish in the Village lake'),log=t.translate('Caught a fish at the village lake: Huchen, 12.40 kg');
  assert.ok(card&&card.includes('10')&&card!=='10 new fish in the Village lake',`${code}: ${card}`);
  assert.ok(log&&log.includes('12.40')&&(code==='de'||!log.includes('Huchen')||dict['Huchen'].includes('Huchen')),`${code}: ${log}`);
  for(const text of texts){const out=dict[text];for(const v of typeof out==='object'?Object.values(out):[out])assert.doesNotMatch(v,/ · /,`${code}: no middle dot`);}
 }
 const nl=JSON.parse(read('public/i18n/nl.json')),ru=JSON.parse(read('public/i18n/ru.json'));
 assert.equal(createTranslator(nl,'nl').translate('10 new fish in the Village lake'),'10 nieuwe vissen in het Dorpsmeer');
 assert.equal(createTranslator(ru,'ru').translate('10 new fish in the Village lake'),'10 новых рыб в Деревенском озере');
 assert.equal(createTranslator(ru,'ru').translate('Caught a fish at the village lake: Huchen, 12.40 kg'),'Поймана рыба на деревенском озере: Дунайский лосось, 12.40 кг');
 for(const text of texts)assert.doesNotMatch(text,/ · /,'no middle dot in the English either');
});
