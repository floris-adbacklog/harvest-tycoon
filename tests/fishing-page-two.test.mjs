import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {FISH_PICTURES} from '../public/visual-icons.js';
import {wikiArticle} from '../public/wiki-content.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// The 3D fish's looks (pond-scene.js needs three.js, so its table is read from the file).
const FISH_LOOK=new Function(`return ${read('public/pond-scene.js').match(/export const FISH_LOOK=Object\.freeze\((\{[\s\S]*?\})\);/)[1]};`)();
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
// Page two of the Fishing pond (11 Oct 2026, the owner's call): from level 20, 8 more fish swim in the same pond and fill a second
// page of the fish book; all 16 kinds pay 50 diamonds once (25 + 50 = 75 in all). Below level 20 nothing changes. The rules are played
// with the pond open, whatever the switch says (as in fishing.test.mjs).
const SOURCE=read('game/farm-state.js');
const OPEN=asModule(SOURCE.replace(/export const POND_OPEN=(true|false),/,'export const POND_OPEN=true,'));
const G=await import(OPEN);
const {instantResult}=await import(asModule(read('public/farm-client.js').replace("from './farm-state.js';",`from '${OPEN}';`)));
const now=Date.UTC(2026,9,11,9),GAP=G.POND_MIN_GAP_MS,LATER=G.POND_REFILL_MS*5,TWO=G.POND_PAGE_TWO_LEVEL;
const [ONE_KINDS,TWO_KINDS]=G.FISH_PAGES;
const at=level=>{const s=G.createFarm(now-3600000);s.xp=G.xpForLevel(level);s.coins=500;G.normalizeFarm(s,now);return s;};
const pond=(n,best={},extra={})=>({firstAt:now-86400000,n,casts:5,castsAt:0,lastAt:0,prevAt:0,best,...extra});
const fish=(s,t,landed=true,perfect=false)=>G.applyFarmAction(s,{type:'fish',n:s.pond?.n??0,landed,perfect},t);
const allOne=()=>Object.fromEntries(ONE_KINDS.map(k=>[k,G.FISH[k].kg[0]]));
// The game before page two (this branch's base 01ff2cd and the closed pond fd1cf29), for the differential tests; null without git.
const show=(sha,path)=>{try{return execFileSync('git',['show',`${sha}:${path}`],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:1<<24,stdio:['ignore','pipe','ignore']});}catch{return null;}};
const before=sha=>show(sha,'game/farm-state.js');
const OLD_SOURCE=before('01ff2cd'),OLD_URL=OLD_SOURCE&&asModule(OLD_SOURCE.replace(/export const POND_OPEN=(true|false),/,'export const POND_OPEN=true,')),OLD=OLD_URL&&await import(OLD_URL);

test('16 kinds on two pages: the first 8 as before, page two\'s 8 only from level 20, each table adding up to 100%',()=>{
 assert.deepEqual(ONE_KINDS,['minnow','perch','roach','carp','tench','pike','goldencarp','whiskers']);
 assert.deepEqual(TWO_KINDS,['rudd','bream','eel','trout','barbel','zander','koi','sturgeon']);
 assert.deepEqual(TWO_KINDS.map(k=>G.FISH[k].name),['Rudd','Bream','Eel','Rainbow trout','Barbel','Zander','Koi','Sturgeon']);
 const sum=key=>Object.values(G.FISH).reduce((s,f)=>s+f[key],0).toFixed(6);
 assert.equal(sum('chance'),'100.000000','below level 20');assert.equal(sum('chance20'),'100.000000','from level 20');
 for(const k of TWO_KINDS)assert.equal(G.FISH[k].chance,0,`${k}: never below level 20`);
 for(const k of ONE_KINDS)assert.ok(G.FISH[k].chance20>0&&G.FISH[k].chance20<=G.FISH[k].chance,`${k}: still there from 20, a little less often`);
 // The koi is rare like the Golden carp, the sturgeon very rare like Old Whiskers; XP stays 2 to 20.
 assert.ok(G.FISH.koi.chance20<=3&&G.FISH.sturgeon.chance20===G.FISH.whiskers.chance20);
 for(const f of Object.values(G.FISH))assert.ok(f.xp>=2&&f.xp<=20&&f.kg[0]<f.kg[1]&&f.coins>0);
 assert.equal(G.POND_BOOK_DIAMONDS+G.POND_BOOK2_DIAMONDS,75,'the News message: 75 diamonds in all');
});

test('below level 20 every fish, its coins and today\'s fish are exactly as before page two (the game at 01ff2cd)',t=>{
 if(!OLD){t.skip('no git history here');return;}
 const DAY=G.DAY_MS;
 for(let seed=0;seed<40;seed++){
  const best=seed%3?{whiskers:10}:{};
  const s={...at(seed%2?19:8),rookieUntil:seed*7919+13,pond:pond(0,best)},o=structuredClone(s);
  for(let n=0;n<400;n++){s.pond.n=o.pond.n=n;const a=G.pondFish(s,n),b=OLD.pondFish(o,n);
   assert.deepEqual([a.species,a.kg,a.share],[b.species,b.kg,b.share],`seed ${seed}, fish ${n}`);
   if(n%37===0)for(const perfect of [false,true])assert.equal(G.fishCoins(s,a,perfect,now+(n%10)*DAY),OLD.fishCoins(o,b,perfect,now+(n%10)*DAY));}
 }
 for(let d=0;d<30;d++)assert.equal(G.todaysFish(now+d*DAY),OLD.todaysFish(now+d*DAY),`day ${d}`);
 // A whole first day at level 19 pays the same coins and XP, fish by fish, as the game before.
 const s=at(19),o=structuredClone(s);
 for(let k=0;k<77;k++){const tt=now+k*LATER,a=fish(s,tt,k%7!==3,k%3===0),b=OLD.applyFarmAction(o,{type:'fish',n:k,landed:k%7!==3,perfect:k%3===0},tt);
  const {book2,...rest}=a;assert.equal(book2,undefined);assert.deepEqual(rest,b,`fish ${k}`);}
 assert.equal(s.pond.page2At,undefined,'below 20 the pond never turns over');assert.deepEqual(s.pond,o.pond);
});

test('from level 20 the farm\'s first fish marks the pond (pond.page2At) and is still one of the 8; every fish after it may be any of the 16',()=>{
 const s=at(TWO);s.rookieUntil=4242;s.pond=pond(57,allOne(),{bookPaid:true});G.normalizeFarm(s,now);
 assert.equal(G.pondPageTwo(s),false,'not before the farm fished at level 20');
 const first=G.pondFish(s,57),r=fish(s,now);
 assert.equal(r.species,first.species);assert.equal(s.pond.page2At,57);assert.ok(G.FISH[r.species].page===1);
 assert.equal(G.pondPageTwo(s),true);assert.equal(G.pondPageTwo(s,57),false);assert.equal(G.pondPageTwo(s,58),true);
 // A fish let go marks it too; a farm below 20 never gets the mark.
 const g=at(TWO+5);g.pond=pond(9,{});G.normalizeFarm(g,now);fish(g,now,false);assert.equal(g.pond.page2At,9);
 const l=at(TWO-1);l.pond=pond(9,{});G.normalizeFarm(l,now);fish(l,now);assert.equal(l.pond.page2At,undefined);
 // Over 100,000 fish of the 16 the kinds come as often as chance20 says (the giants' own rules left out: both landed).
 const counts={},w={rookieUntil:42,pond:{n:0,page2At:0,best:{whiskers:10,sturgeon:12}}};
 for(let n=3;n<100003;n++){const f=G.pondFish(w,n);counts[f.species]=(counts[f.species]??0)+1;const [lo,hi]=G.FISH[f.species].kg;assert.ok(f.kg>=lo&&f.kg<=hi&&f.share>=0&&f.share<=1);}
 for(const [key,f] of Object.entries(G.FISH))assert.ok(Math.abs((counts[key]??0)/1000-f.chance20)<.5,`${key}: ${(counts[key]??0)/1000}% for ${f.chance20}%`);
 // The first three fish of a farm are still a Minnow, a Perch and a Carp, also for a farm that first fishes at level 20 or later.
 const fresh=at(30);for(let k=0;k<3;k++)assert.deepEqual([fish(fresh,now+k*GAP).species],[G.POND_FIRST_FISH[k][0]]);assert.equal(fresh.pond.page2At,0);
});

test('every fish is fixed in advance: the same farm the same fish, the screen shows what the server pays, page two included',()=>{
 const seq=s=>Array.from({length:80},(_,i)=>G.pondFish(s,i+3)).map(f=>`${f.species}:${f.kg}`).join();
 const a={rookieUntil:1760000000000,pond:{n:0,page2At:2,best:{}}},b={rookieUntil:1760000000001,pond:{n:0,page2At:2,best:{}}};
 assert.equal(seq(a),seq(structuredClone(a)));assert.notEqual(seq(a),seq(b));
 assert.equal(read('supabase/functions/farm-api/farm-state.js'),SOURCE,'the farm-api copy is the same file');assert.equal(read('public/farm-state.js'),SOURCE);
 // The browser's instant result (farm-client.js) is the server's, fish by fish, across the mark at level 20 and the 16 after it.
 for(const level of [19,20,45]){
  const s=at(level);s.rookieUntil=777+level;s.pond=pond(40,allOne(),{bookPaid:true});G.normalizeFarm(s,now);let tt=now;
  for(let k=0;k<12;k++){
   tt+=GAP+1;const action={type:'fish',n:s.pond.n,landed:k!==4,perfect:k%2===0};
   const shown=instantResult(s,action,tt),server=structuredClone(s),paid=G.applyFarmAction(server,action,tt);
   assert.ok(shown);assert.deepEqual(shown.result,paid,`level ${level}, fish ${k}`);assert.deepEqual(shown.trial.pond,server.pond);
   G.applyFarmAction(s,action,tt);if(G.pondCasts(s,tt).casts<1)tt+=LATER;
  }
  assert.equal(s.pond.page2At,level>=TWO?40:undefined);
 }
});

test('the sturgeon: one of the first 60 fish from level 20 is always a sturgeon for a farm that never landed one, again 60 later if let go',()=>{
 const K=G.POND_STURGEON_BY,L=G.POND_LEGEND_BY;let landedAgain=0;
 for(let from=0;from<300;from+=7)for(const seed of [0,5,1760000000000]){
  const best={whiskers:9},s={rookieUntil:seed,pond:{n:0,page2At:from,best}};
  // Counting the first fish at level 20 (from) as 1: the 60th, or the 59th when the 60th is one of Old Whiskers' numbers.
  const slot=from+K-1,due=(slot+1)%L===0?slot-1:slot;
  assert.equal(G.pondFish(s,due).species,'sturgeon',`page two from ${from}, seed ${seed}: fish ${due}`);
  // Let go: the next 60 bring it again; landed: an ordinary fish (the sturgeon's own 0.2%).
  const next=from+2*K-1,due2=(next+1)%L===0?next-1:next;assert.equal(G.pondFish(s,due2).species,'sturgeon');
  if(G.pondFish({...s,pond:{...s.pond,best:{...best,sturgeon:12}}},due).species==='sturgeon')landedAgain++;
 }
 assert.ok(landedAgain<=2,`${landedAgain} sturgeons on the 60th once one was landed`);
 // Old Whiskers keeps fish 120 for a farm that never landed him, also when the sturgeon's 60th falls on it (the sturgeon is the 59th then).
 const s={rookieUntil:3,pond:{n:0,page2At:60,best:{}}};
 assert.equal(G.pondFish(s,119).species,'whiskers');assert.equal(G.pondFish(s,118).species,'sturgeon');
 // Below level 20 (no mark) there is no sturgeon at all, at any number.
 for(let n=3;n<3000;n++)assert.notEqual(G.pondFish({rookieUntil:n,pond:{n:0,best:{}}},n).species,'sturgeon');
});

test('page two\'s book: all 16 kinds pay 50 diamonds exactly once, both pages at once when the last kind was page one\'s',()=>{
 const s=at(30);s.pond=pond(200,{...allOne(),rudd:.5,bream:1},{bookPaid:true,page2At:150});G.normalizeFarm(s,now);
 const diamonds=s.diamonds,earned=s.stats.diamonds_earned??0;let tt=now,paid=0,count=0,book2=0;
 for(;count<600&&!s.pond.book2Paid;count++){tt+=LATER;const r=fish(s,tt);paid+=r.diamonds;if(r.book2)book2++;}
 assert.ok(G.pondBook2Done(s));assert.equal(paid,50);assert.equal(book2,1);assert.equal(s.diamonds,diamonds+50);assert.equal(s.stats.diamonds_earned,earned+50);
 assert.ok(count<=G.POND_STURGEON_BY+250,`${count} fish`);
 for(let k=0;k<40;k++){tt+=LATER;const r=fish(s,tt);assert.equal(r.diamonds,0);assert.equal(r.book2,undefined);}
 // The last kind missing is Old Whiskers (page one): his fish pays page one's 25 and the whole book's 50, 75 at once.
 const w=at(30);w.pond=pond(119,{...allOne(),...Object.fromEntries(TWO_KINDS.map(k=>[k,G.FISH[k].kg[0]]))},{page2At:100});delete w.pond.best.whiskers;G.normalizeFarm(w,now);
 const r=fish(w,now);assert.equal(r.species,'whiskers');assert.equal(r.diamonds,75);assert.equal(r.book2,true);assert.ok(w.pond.bookPaid&&w.pond.book2Paid);
 // Page one's 25 alone at level 20 and up (page two not full yet), and nothing of page two's 50 below 20.
 const p=at(25);p.pond=pond(119,{minnow:.1},{page2At:100});for(const k of ONE_KINDS.slice(1,7))p.pond.best[k]=1+G.FISH[k].kg[0];G.normalizeFarm(p,now);
 const q=fish(p,now);assert.equal(q.species,'whiskers');assert.equal(q.diamonds,25);assert.equal(q.book2,undefined);assert.equal(p.pond.book2Paid,undefined);
 assert.equal(G.pondBookDone(p),true);assert.equal(G.pondBook2Done(p),false);
});

test('balance: from level 20 a cast pays on average what it paid before (coins within 1.5%, XP not more); still 77 casts a day',t=>{
 // Exactly, from the tables: a kind's coins times its chance, and today's fish doubling its kind on one day in 5, at every level (the
 // same 5 kinds: 9.808 coins a cast below 20, 9.860 from 20, +0.5%; with 10 kinds from 20 it was 9.737, -0.7%).
 const table=(key,today)=>Object.entries(G.FISH).reduce((sum,[k,f])=>sum+f[key]/100*f.coins*(1+(today.includes(k)?1/today.length:0)),0);
 const five=['minnow','perch','roach','carp','tench'];
 const coinsWas=table('chance',five),coinsIs=table('chance20',five),xp=key=>Object.values(G.FISH).reduce((sum,f)=>sum+f[key]/100*f.xp,0);
 assert.equal(coinsWas.toFixed(3),'9.808');assert.equal(coinsIs.toFixed(3),'9.860');
 assert.ok(Math.abs(coinsIs/coinsWas-1)<=.015,`coin base a cast ${coinsWas.toFixed(3)} -> ${coinsIs.toFixed(3)}`);assert.ok(xp('chance20')<=xp('chance'),`${xp('chance')} -> ${xp('chance20')} XP a cast`);
 if(!OLD){t.skip('no git history here');return;}
 // Expected coins and XP a cast for a farm whose legends are landed (no first catches): perfect 3 in 10, ten days of today's fish.
 const perCast=(M,level,two,N=40000)=>{const s=at(level);s.pond=pond(0,{whiskers:9,sturgeon:12},two?{page2At:0}:{});let coins=0,xp=0;
  for(let i=0;i<N;i++){const n=3+i;s.rookieUntil=Math.floor(i/40)*7919+13;s.pond.n=n;const f=M.pondFish(s,n);coins+=M.fishCoins(s,f,i%10<3,now+(i%10)*G.DAY_MS);xp+=M.FISH[f.species].xp;}
  return {coins:coins/N,xp:xp/N};};
 for(const level of [20,40,80]){
  const was=perCast(OLD,level,false),is=perCast(G,level,true);
  assert.ok(Math.abs(is.coins/was.coins-1)<=.03,`level ${level}: ${was.coins.toFixed(2)} -> ${is.coins.toFixed(2)} coins a cast`);
  assert.ok(is.xp<=was.xp*1.02,`level ${level}: ${was.xp.toFixed(3)} -> ${is.xp.toFixed(3)} XP a cast`);
  assert.ok(77*is.xp<=300,'a full day of casts stays under 300 XP');
 }
 assert.equal(G.POND_START_CASTS+24*60*60000/G.POND_REFILL_MS+(G.POND_MAX_CASTS-G.POND_START_CASTS),77,'5 to start and one every 20 minutes');
 // The one-off extras of page two at level 20: 8 first catches (3 times their coins, 10 XP more) and the 50 diamonds. At most (every
 // one the heaviest of its kind and perfect) about 2,150 coins once, less than a day of selling there.
 const s=at(TWO),bonus=TWO_KINDS.reduce((sum,k)=>sum+G.POND_NEW_FISH_COINS*G.fishCoins(s,{species:k,kg:G.FISH[k].kg[1],share:1},true,now),0);
 assert.ok(bonus<2500,`${bonus} coins once`);
});

test('today\'s fish: one of page one\'s 5 common kinds at every level, exactly as at 01ff2cd, page two or not (the review)',t=>{
 // The review (11 Oct 2026): a day's fish that changed at the farm's first fish at level 20 could not be understood, and a rare kind
 // never pays double. So it is the game's one fish of the day, the same for every farm, by the UTC day only.
 const five=['minnow','perch','roach','carp','tench'];
 assert.doesNotMatch(SOURCE,/POND_COMMON20/);assert.match(SOURCE,/export const todaysFish=\(now=Date\.now\(\)\)=>POND_COMMON\[dayNumber\(now\)%POND_COMMON\.length\];/);
 const days=Array.from({length:400},(_,d)=>now+d*G.DAY_MS+(d%24)*3600000);
 assert.deepEqual([...new Set(days.map(tt=>G.todaysFish(tt)))].sort(),[...five].sort());
 if(OLD)for(const tt of days)assert.equal(G.todaysFish(tt),OLD.todaysFish(tt));
 // Farms below 20, at 20 before and after their first fish there (pond.page2At), and far past it: the day's fish doubles the same kind
 // for all of them (as at 01ff2cd for page one's kinds), and never one of page two's.
 const farms=[at(10),at(19),at(TWO),at(TWO),at(40),at(80)];
 farms[2].pond=pond(30,{});farms[3].pond=pond(30,{},{page2At:10});farms[4].pond=pond(300,{},{page2At:0});farms[5].pond=pond(9000,{whiskers:9,sturgeon:12},{page2At:400});
 for(const s of farms){G.normalizeFarm(s,now);const o=structuredClone(s);
  for(const tt of days.slice(0,12)){
   const today=G.todaysFish(tt),factor=1+G.levelOf(s)/8;
   for(const [kind,f] of Object.entries(G.FISH))for(const perfect of [false,true]){
    const caught={species:kind,kg:f.kg[1],share:1},paid=G.fishCoins(s,caught,perfect,tt);
    assert.equal(paid,Math.round(f.coins*1.2*factor*(kind===today?2:1)*(perfect?1.2:1)),`level ${G.levelOf(s)}, ${kind}`);
    if(f.page===2)assert.notEqual(kind,today);else if(OLD)assert.equal(paid,OLD.fishCoins(o,caught,perfect,tt),`level ${G.levelOf(s)}, ${kind}: as at 01ff2cd`);
   }
  }
 }
 // Fish after fish across ten days at level 30 with page two: the catch card's tag says the day's own fish, a page-two kind never.
 const s=at(30);s.rookieUntil=31;s.pond=pond(50,allOne(),{bookPaid:true,page2At:40});G.normalizeFarm(s,now);let tt=now,two=0;
 for(let k=0;k<300;k++){tt+=k%30===29?G.DAY_MS:GAP+1;if(G.pondCasts(s,tt).casts<1)tt+=LATER;const r=fish(s,tt);
  assert.equal(r.today,r.species===G.todaysFish(tt));if(G.FISH[r.species].page===2){two++;assert.equal(r.today,false);}
  if(OLD)assert.equal(G.todaysFish(tt),OLD.todaysFish(tt));}
 assert.ok(two>50,`${two} fish of page two`);
 if(!OLD)t.diagnostic('no git history here: 01ff2cd not compared');
});

test('the save: page two adds kinds to pond.best, pond.book2Paid and pond.page2At; garbled ones are cleaned, a good pond is left as it is',()=>{
 const h=at(30);h.pond=pond(60,{...allOne(),koi:2.2,sturgeon:14.5},{bookPaid:true,book2Paid:true,page2At:12});const copy=structuredClone(h.pond);G.normalizeFarm(h,now);assert.deepEqual(h.pond,copy);
 const g=at(30);g.pond=pond(20,{koi:'2',shark:3,eel:1.234},{book2Paid:'yes',page2At:25});G.normalizeFarm(g,now);
 assert.deepEqual(g.pond.best,{eel:1.23});assert.equal('book2Paid' in g.pond,false);assert.equal('page2At' in g.pond,false,'the number of a fish not cast yet');
 for(const bad of [-1,1.5,'3',null]){const b=at(30);b.pond=pond(20,{},{page2At:bad});G.normalizeFarm(b,now);assert.equal('page2At' in b.pond,false,String(bad));}
 const fresh=at(30);G.normalizeFarm(fresh,now);assert.equal('pond' in fresh,false,'a farm that never fished keeps its shape');
});

// Release order (new save keys: site first, then farm-api). The game before page two must read a farm that has page two's kinds, both
// paid flags and the mark without throwing, play on, and show no broken screen: its own rules only ever name its own 8 kinds.
for(const [sha,label] of [['01ff2cd','this branch\'s base'],['fd1cf29','the closed pond']])test(`the game at ${sha} (${label}) reads a farm with page two, plays on and shows only its own fish`,async t=>{
 const old=before(sha);if(!old){t.skip('no git history here');return;}
 const O=await import(asModule(old.replace(/export const POND_OPEN=(true|false),/,'export const POND_OPEN=true,')));
 const s=at(30);s.rookieUntil=99;s.pond=pond(70,{...allOne(),rudd:.4,koi:2.5,sturgeon:15},{bookPaid:true});G.normalizeFarm(s,now);
 let tt=now;for(let k=0;k<6;k++){tt+=LATER;fish(s,tt);}
 const saved=structuredClone(s);assert.ok(saved.pond.page2At===70&&saved.pond.best.koi>0);
 saved.pond.book2Paid=true;
 const copy=structuredClone(saved),t2=tt+60000;O.normalizeFarm(copy,t2);
 assert.equal(copy.pond.n,saved.pond.n);assert.equal(copy.pond.bookPaid,true);assert.equal(copy.pond.book2Paid,true,'a flag it does not know is kept');assert.equal(copy.pond.page2At,70);
 assert.ok(Object.keys(copy.pond.best).every(k=>Object.hasOwn(O.FISH,k)),'its copy of the book holds only its own kinds (so farm-api never goes back before page two)');
 O.farmSummary(copy,t2);O.unlockEntries(copy);O.dailyTasks(copy,t2);O.dailyOrders(copy,t2);O.pondBookDone(copy);O.pondCasts(copy,t2);O.todaysFish(t2);
 for(let n=copy.pond.n;n<copy.pond.n+200;n++)assert.ok(Object.hasOwn(O.FISH,O.pondFish(copy,n).species));
 // The old screen (its pond-ui.js) reads the book by its own FISH, and the catch card from its own instant result.
 let ui;try{ui=execFileSync('git',['show',`${sha}:public/pond-ui.js`],{cwd:new URL('..',import.meta.url),encoding:'utf8',stdio:['ignore','pipe','ignore']});}catch{ui='';}
 if(ui){assert.match(ui,/Object\.entries\(FISH\)\.map\(\(\[key,f\]\)=>\{const have=best\[key\]>0/);assert.match(ui,/caught=Object\.keys\(FISH\)\.filter\(k=>best\[k\]>0\)\.length/);}
 if(sha==='01ff2cd'){
  const {instantResult:oldInstant}=await import(asModule(execFileSync('git',['show',`${sha}:public/farm-client.js`],{cwd:new URL('..',import.meta.url),encoding:'utf8'}).replace("from './farm-state.js';",`from '${asModule(old.replace(/export const POND_OPEN=(true|false),/,'export const POND_OPEN=true,'))}';`)));
  const shown=oldInstant(saved,{type:'fish',n:saved.pond.n,landed:true,perfect:false},t2+LATER);assert.ok(shown&&Object.hasOwn(O.FISH,shown.result.species));
  // And it plays on: a fish with its own rules, the farm's other actions, page two's flags and mark untouched.
  const play=structuredClone(saved);const r=O.applyFarmAction(play,{type:'fish',n:play.pond.n,landed:true,perfect:false},t2+LATER);assert.ok(Object.hasOwn(O.FISH,r.species));
  assert.equal(play.pond.book2Paid,true);assert.equal(play.pond.page2At,70);
 }
});

test('level 20\'s card names it; below 20 nothing of page two is listed, a farm already past 20 has it without a card',async()=>{
 const {progressionSnapshot,progressionChange}=await import(asModule(read('public/progression-ui.js').replace("import {art} from './visual-icons.js';","const art=()=>'';").replace("from './farm-state.js';",`from '${OPEN}';`).replace(/import \{PLAYER_AVATARS[^\n]*\n/,'const PLAYER_AVATARS=[],avatarGoal=()=>null,avatarOpen=()=>false;\n')));
 for(const level of [4,10,19])assert.ok(!G.unlockEntries(at(level)).some(e=>e.id==='pond:page2'||/fish/i.test(e.name)&&e.level===TWO),`level ${level}`);
 const s=at(19);s.xp=G.xpForLevel(TWO)-3;G.normalizeFarm(s,now);s.pond=pond(40,{});
 const snap=progressionSnapshot(s);fish(s,now);assert.equal(G.levelOf(s),TWO);
 const change=progressionChange(snap,s,null),entry=change.entries.find(e=>e.id==='pond:page2');
 assert.ok(change.leveled&&entry,'on the level-up card');assert.deepEqual([entry.name,entry.art,entry.kind,entry.level,entry.unlocked],['8 new fish in the Fishing pond','fish-koi','Activity',TWO,true]);
 const later=at(35);assert.ok(G.unlockEntries(later).find(e=>e.id==='pond:page2').unlocked);
 // The same words as the book (the review: "all 16 kinds pay 50 diamonds" read as 50 for each kind).
 assert.match(read('public/progression-ui.js'),/e\.id==='pond:page2'\?`Catch all \$\{Object\.keys\(FISH\)\.length\} kinds: \$\{POND_BOOK2_DIAMONDS\} diamonds, once\.`/);
 // Closed (POND_OPEN false): nothing of it.
 const C=await import(asModule(SOURCE.replace(/export const POND_OPEN=(true|false),/,'export const POND_OPEN=false,')));
 const c=C.createFarm(now);c.xp=C.xpForLevel(40);C.normalizeFarm(c,now);assert.ok(!C.unlockEntries(c).some(e=>e.id==='pond:page2'));assert.equal(C.pondPageTwoOpen(c),false);
});

test('the pond screen: page 2 is a tab of the book from level 20 only, its reward and secret on it, the right tag on the catch card',()=>{
 assert.equal(G.pondPageTwoOpen(at(19)),false);assert.equal(G.pondPageTwoOpen(at(TWO)),true);
 const ui=read('public/pond-ui.js');
 assert.match(ui,/const best=state\[W\.key\]\?\.best\?\?\{\},two=pageTwo\(\),turned=page!==undefined;/);
 assert.match(ui,/\$\{two\?`<div class="market-tabs pond-book-pages" role="tablist" aria-label="Fish book">\$\{\[0,1\]\.map\(i=>`<button type="button" role="tab" aria-selected="\$\{i===page\}" data-book-page="\$\{i\}">Page \$\{i\+1\}<\/button>`\)\.join\(''\)\}<\/div>`:''\}/,'no tabs below level 20');
 assert.match(ui,/page=two\?Math\.min\(1,Math\.max\(0,page\)\):0;/,'and page 1 only');
 assert.match(ui,/`Catch all \$\{Object\.keys\(FISH\)\.length\} kinds on both pages: \$\{W\.book2\} diamonds, once\.`/);
 assert.match(ui,/`Catch all \$\{kinds\.length\} kinds: \$\{W\.book\} diamonds, once\.`/,'page one says 8, as before');
 assert.match(ui,/const secrets=\{whiskers:'Something big lives in this pond\.',sturgeon:'Something even bigger swims at the bottom\.'\};/);
 assert.match(ui,/if\(r\.diamonds\)tags\.push\(\['is-book',r\.book2\|\|!pageTwo\(\)\?'Fish book complete!':pageDone\(1\)\]\);/);
 assert.match(ui,/const c=casts\(\),t=W\.today\(now\(\)\),pill=\$\('casts'\);/,'the day\'s one fish, as at 01ff2cd');
 for(const text of ui.match(/'[^'\n]*'|`[^`]*`/g))assert.doesNotMatch(text,/ · /);
 assert.match(read('public/pond.css'),/\.pond-book-pages\{margin:10px 0 0\}/);
});

test('page two\'s pictures: the owner\'s 256 px WebP on a clear ground, registered like the first 8, and a look for the 3D fish',()=>{
 const icons=read('public/visual-icons.js');
 for(const key of TWO_KINDS){
  const name=`fish-${key}`,file=new URL(`../public/assets/icons/${name}.webp`,import.meta.url),data=existsSync(file)?readFileSync(file):null;
  assert.ok(data,name);assert.ok(statSync(file).size<40000);assert.equal(data.subarray(8,12).toString('ascii'),'WEBP');
  assert.equal(data.subarray(12,16).toString('ascii'),'VP8X','extended WebP');assert.ok(data[20]&0x10,'with an alpha channel');
  assert.equal(1+data.readUIntLE(24,3),256);assert.equal(1+data.readUIntLE(27,3),256);
  assert.ok(!existsSync(new URL(`../public/assets/icons/${name}.png`,import.meta.url)));assert.ok(FISH_PICTURES.includes(name));assert.ok(icons.includes(`'${name}'`));
 }
 for(const key of Object.keys(G.FISH))assert.ok(FISH_LOOK[key],`${key}: a colour and size in the 3D pond`);
});

test('the wiki explains page two from the rules: from level 20, 50 diamonds for all 16 (75 in all), the sturgeon within 60 fish',()=>{
 const pondPart=html=>html.slice(html.indexOf('id="sec-fishing-pond"'),html.indexOf('</section>',html.indexOf('id="sec-fish-book-page-2"')));
 const site=pondPart(wikiArticle('helpers',{}).html),high=pondPart(wikiArticle('helpers',{level:30}).html),at20=pondPart(wikiArticle('helpers',{level:TWO}).html);
 for(const html of [site,high,at20]){
  assert.match(html,/<h3>Fish book page 2<\/h3>/);
  assert.ok(html.includes('Catch all 16 kinds, on both pages, for 50 diamonds more, once: 75 diamonds in all.'));
  assert.ok(html.includes('one of your first 60 fish from level 20 is always a sturgeon.'));
  assert.ok(html.includes('Catch all 8 kinds for 25 diamonds, once.'));
  assert.ok(!/Today’s fish can|page 2’s common/.test(html),'today\'s fish is page one\'s, so the wiki says nothing more of it');
  for(const key of TWO_KINDS)assert.ok(html.includes(G.FISH[key].name),key);
 }
 assert.ok(site.includes('From level 20')&&site.includes(`${G.FISH.minnow.chance}%`)&&site.includes(`${G.FISH.minnow.chance20}%`),'both chances on the website');
 assert.ok(!high.includes(`<td>${G.FISH.minnow.chance}%</td>`),'a farmer of 20 and up sees the chance that is theirs');
 assert.doesNotMatch(site,/ · /);
});

// The review (11 Oct 2026): a farmer below level 20 reads the pond's section exactly as at 01ff2cd, with nothing of page two (no section,
// no "From level 20" column or notes). The wiki of 01ff2cd is that version's wiki-content.js on its own farm-state.js.
test('the wiki below level 20 is the pond section of 01ff2cd, word for word; page two only on the website and from level 20',async t=>{
 const pond=html=>{const from=html.lastIndexOf('<section',html.indexOf('id="sec-fishing-pond"'));return html.slice(from,html.indexOf('</section>',from)+'</section>'.length);};
 for(const level of [1,10,19]){
  const html=wikiArticle('helpers',{level}).html;
  assert.ok(html.includes('id="sec-fishing-pond"'),`level ${level}`);
  assert.ok(!html.includes('sec-fish-book-page-2')&&!html.includes('Fish book page 2'),`level ${level}: no page two`);
  assert.ok(!pond(html).includes(`From level ${TWO}`),`level ${level}: no "From level 20"`);
  for(const key of TWO_KINDS)assert.ok(!html.includes(`fish-${key}`),`level ${level}: no ${key}`);
 }
 for(const html of [wikiArticle('helpers',{}).html,wikiArticle('helpers',{level:30}).html])assert.ok(html.includes('id="sec-fish-book-page-2"'));
 const old=show('01ff2cd','public/wiki-content.js');if(!old||!OLD_URL){t.skip('no git history here');return;}
 const here=file=>new URL(`../public/${file}`,import.meta.url).href;
 const O=await import(asModule(old.replace(/from '\.\/([\w-]+\.js)';/g,(all,file)=>`from '${file==='farm-state.js'?OLD_URL:here(file)}';`)));
 for(const level of [1,4,10,19])assert.equal(pond(wikiArticle('helpers',{level}).html),pond(O.wikiArticle('helpers',{level}).html),`level ${level}`);
 assert.notEqual(pond(wikiArticle('helpers',{level:30}).html),pond(O.wikiArticle('helpers',{level:30}).html),'from 20 the section is page two\'s');
});

test('texts: every language has page two (fish names in the glossary, number forms for Russian and Ukrainian)',()=>{
 const readme=read('i18n/README.md');
 for(const name of TWO_KINDS.map(k=>G.FISH[k].name))assert.equal((readme.match(new RegExp(` · ${name} `,'g'))??[]).length,15,`${name} in all 15 glossary lines`);
 for(const code of ['ru','uk']){
  const dict=JSON.parse(read(`public/i18n/${code}.json`));
  for(const key of ['{0} new fish in the Fishing pond','Catch all {0} kinds on both pages: {1} diamonds, once.','Catch all {0} kinds: {1} diamonds, once.'])
   assert.deepEqual(Object.keys(dict[key]).sort(),['few','many','one','other'],`${code}: ${key}`);
 }
 assert.equal(JSON.parse(read('public/i18n/ru.json'))['Barbel'],'Марена','not Усач: that is Old Whiskers');
});

test('level 20\'s card line is the book\'s own text in every language (16 kinds, 50 diamonds), the old line gone from the catalogs',async()=>{
 const {createTranslator}=await import('../public/i18n.js');
 const old='Page 2 of the fish book: all {0} kinds pay {1} diamonds',card='Catch all 16 kinds: 50 diamonds, once.';
 assert.equal(old in JSON.parse(read('i18n/catalog.json')),false);assert.ok('Catch all {0} kinds: {1} diamonds, once.' in JSON.parse(read('i18n/catalog.json')));
 const want={nl:'Vang alle 16 soorten: 50 diamanten, eenmalig.',ru:'Поймай все 16 видов: 50 алмазов, один раз.',uk:'Злови всі 16 видів: 50 діамантів, один раз.'};
 for(const code of ['ar','cs','de','es','fr','hi','hu','id','ja','nl','pt','ru','tr','uk','zh']){
  const dict=JSON.parse(read(`public/i18n/${code}.json`)),text=createTranslator(dict,code).translate(card);
  assert.equal(old in dict,false,code);assert.ok(text&&text!==card&&text.includes('16')&&text.includes('50'),`${code}: ${text}`);
  if(want[code])assert.equal(text,want[code]);
  // Page one's book (8 kinds, 25 diamonds) reads as before.
  if(code==='ru')assert.equal(createTranslator(dict,code).translate('Catch all 8 kinds: 25 diamonds, once.'),'Поймай все 8 видов: 25 алмазов, один раз.');
 }
});
