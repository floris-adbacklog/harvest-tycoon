import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createReel,REEL,FIGHTS} from '../public/pond-reel.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
// The village lake's balance (12 Oct 2026, plan D sections 2 and 3.5), played with the lake open as in tests/lake.test.mjs.
const G=await import(asModule(read('game/farm-state.js').replace(/export const LAKE_OPEN=(true|false),/,'export const LAKE_OPEN=true,')));
const now=Date.UTC(2026,9,12,9),LATER=G.POND_REFILL_MS*5;
const [ONE_KINDS,TWO_KINDS]=G.LAKE_FISH_PAGES;
const at=level=>{const s=G.createFarm(now-3600000);s.xp=G.xpForLevel(level);s.coins=500;G.normalizeFarm(s,now);return s;};
// The plan's modelled day of a steady farmer (6 sessions, 35k farm XP a day; the live level-111 farm earns 306k to 386k a day): deliveries,
// Valley Market baskets, villagers, the Trade Depot, the stall, gifts, events and the family, without fishing.
const MODEL_DAY={100:359000,120:410000,150:553000};
// Expected coins a cast at a water and level, from real fish (no first catches: the legends landed; a perfect catch 3 in 10; ten days of
// Today's fish), the plan's way of counting.
const perCast=(water,level,two,N=30000)=>{const s=at(level);s[water.key]={n:0,casts:5,castsAt:0,firstAt:0,lastAt:0,prevAt:0,best:{[water.legend]:water.fish[water.legend].kg[0],[water.giant]:water.fish[water.giant].kg[0]},...(two?{page2At:0}:{})};
 let coins=0;for(let i=0;i<N;i++){const n=3+i;s.rookieUntil=Math.floor(i/40)*7919+13;s[water.key].n=n;coins+=G.waterCoins(water,s,G.waterFish(water,s,n),i%10<3,now+(i%10)*G.DAY_MS);}return coins/N;};

test('the coin base: the pond\'s rule on the lake\'s table; from level 120 a cast\'s average base moves +1.4% (within 1.5%), the pond\'s as before',()=>{
 // Exactly, from the tables: a kind's base times its chance, and today's fish doubling its kind on one day in 5.
 const base=(T,key,five)=>Object.entries(T).reduce((sum,[k,f])=>sum+f[key]/100*f.coins*(1+(five.includes(k)?1/five.length:0)),0);
 const lake100=base(G.LAKE_FISH,'chance',['bleak','chub','whitefish','nase','grayling']),lake120=base(G.LAKE_FISH,'chance120',['bleak','chub','whitefish','nase','grayling']);
 assert.equal(lake100.toFixed(3),'74.660');assert.equal(lake120.toFixed(3),'75.700');
 assert.ok(Math.abs(lake120/lake100-1)<=.015,`${lake100.toFixed(3)} -> ${lake120.toFixed(3)}: page two is something to collect, not a raise`);
 assert.equal(base(G.FISH,'chance',['minnow','perch','roach','carp','tench']).toFixed(3),'9.808','the pond below 20, as before');
 assert.equal(base(G.FISH,'chance20',['minnow','perch','roach','carp','tench']).toFixed(3),'9.860','and from 20');
 assert.ok(lake100/9.808>7.5&&lake100/9.808<7.7,'about 7.6 times the pond');
});

test('a lake cast pays at least 5 times a pond cast, about 4 minutes of a steady farmer\'s income; 77 casts stay at or below 25% of the day',t=>{
 const rows=[];
 for(const level of [100,120,150]){
  const lake=perCast(G.LAKE_WATER,level,level>=G.LAKE_PAGE_TWO_LEVEL),pond=perCast(G.POND_WATER,level,true),day=MODEL_DAY[level],minutes=lake/(day/1440);
  assert.ok(lake>=5*pond,`level ${level}: ${lake.toFixed(0)} against the pond's ${pond.toFixed(0)}`);
  assert.ok(lake/pond>7&&lake/pond<8.5,`level ${level}: ${(lake/pond).toFixed(2)} times the pond`);
  assert.ok(minutes>=3.5&&minutes<=4.6,`level ${level}: ${minutes.toFixed(2)} minutes of income a cast`);
  assert.ok(77*lake<=.25*day,`level ${level}: 77 casts ${Math.round(77*lake)} of a ${day} day`);
  rows.push(`level ${level}: lake ${Math.round(lake)} a cast (pond ${Math.round(pond)}, ${(lake/pond).toFixed(2)}x, ${minutes.toFixed(1)} min of income); a day of 15 ${Math.round(15*lake)}, 30 ${Math.round(30*lake)}, 77 ${Math.round(77*lake)} (${(77*lake/day*100).toFixed(1)}%)`);
 }
 // The plan's own numbers, within sampling: 1,019 at 100, 1,225 at 120, 1,512 at 150.
 const at100=perCast(G.LAKE_WATER,100,false);assert.ok(Math.abs(at100/1019-1)<.02,`${at100.toFixed(0)} at level 100`);
 for(const row of rows)t.diagnostic(row);
});

test('XP stays small and flat: about 6.2 a cast on page one and 7.1 from 120, at most 600 for 77 casts, the same at every level',()=>{
 const xp=key=>Object.values(G.LAKE_FISH).reduce((sum,f)=>sum+f[key]/100*f.xp,0);
 assert.equal(xp('chance').toFixed(3),'6.155');assert.equal(xp('chance120').toFixed(3),'7.074');
 for(const key of ['chance','chance120'])assert.ok(77*xp(key)<=600,`${key}: ${(77*xp(key)).toFixed(0)} XP a day`);
 assert.ok(77*xp('chance120')<=.02*35000,'under 2% of a 35k-XP day (World II\'s pace barely moves)');
 for(const f of Object.values(G.LAKE_FISH))assert.ok(f.xp>=4&&f.xp<=40);
 // No level in it: the same fish pays the same XP at 100 and at 200.
 const xpAt=level=>{const s=at(level);return G.applyFarmAction(s,{type:'lake_fish',n:0,landed:true,perfect:false},now).xp;};
 assert.equal(xpAt(100),xpAt(200));
});

test('no diamonds per fish: over 300 lake fish from a new lake only the book pays (35 and 65), when a page fills',()=>{
 const s=at(130),start=s.diamonds;let paid=0;
 for(let k=0;k<300;k++){const page1=s.lake?.bookPaid,page2=s.lake?.book2Paid,r=G.applyFarmAction(s,{type:'lake_fish',n:s.lake?.n??0,landed:true,perfect:k%2===0},now+k*LATER);
  paid+=r.diamonds;if(r.diamonds)assert.ok(!page1&&s.lake.bookPaid||!page2&&s.lake.book2Paid,`fish ${k}: diamonds only when a page fills`);}
 assert.equal(s.diamonds-start,paid);assert.ok(paid<=G.LAKE_BOOK_DIAMONDS+G.LAKE_BOOK2_DIAMONDS);assert.ok(s.lake.bookPaid,'page one by fish 120 (Old Granite)');
 assert.ok(!Object.values(G.LAKE_FISH).some(f=>'diamonds' in f));
});

test('the book takes time: page one a median of about 120 lake fish (Old Granite decides it), page two about 93 from level 120',t=>{
 const F=3000,q=(a,p)=>a[Math.min(a.length-1,Math.floor(p*a.length))],one=[],two=[];
 for(let seed=1;seed<=F;seed++){
  const s={rookieUntil:seed*104729+17,lake:{n:0,best:{}}};let n=0;
  for(;!G.lakeBookDone(s);n++){s.lake.n=n;const f=G.lakeFish(s,n);s.lake.best[f.species]=Math.max(s.lake.best[f.species]??0,f.kg);}
  one.push(n);
  const from=150+seed%97,w={rookieUntil:s.rookieUntil,lake:{n:from,page2At:from,best:Object.fromEntries(ONE_KINDS.map(k=>[k,1]))}};let m=from+1;
  for(;!G.lakeBook2Done(w);m++){w.lake.n=m;const f=G.lakeFish(w,m);w.lake.best[f.species]=1;}
  two.push(m-from);
 }
 one.sort((a,b)=>a-b);two.sort((a,b)=>a-b);
 assert.ok(q(one,.5)>=110&&q(one,.5)<=120,`page one: median ${q(one,.5)}`);assert.ok(q(one,.9)<=145,`90% within ${q(one,.9)}`);
 assert.ok(q(two,.5)>=80&&q(two,.5)<=105,`page two: median ${q(two,.5)}`);assert.ok(q(two,.9)<=205,`90% within ${q(two,.9)}`);
 t.diagnostic(`page one: median ${q(one,.5)} lake fish, 90% within ${q(one,.9)}; page two from 120: median ${q(two,.5)}, 90% within ${q(two,.9)} (${F} farms); at 77 casts a day page one takes about ${(q(one,.5)/77).toFixed(1)} days, at 10 a day ${(q(one,.5)/10).toFixed(0)}`);
});

test('the one-offs: first catches about 55k once for page one at 100 and 64k for page two at 120; the legends 12k to 25k a catch',t=>{
 const firsts=(level,kinds)=>{const s=at(level);return kinds.reduce((sum,k)=>sum+G.POND_NEW_FISH_COINS*G.lakeFishCoins(s,{species:k,kg:0,share:1/2.6},false,now+G.DAY_MS*2.5),0);};
 const one=firsts(100,ONE_KINDS),two=firsts(G.LAKE_PAGE_TWO_LEVEL,TWO_KINDS);
 assert.ok(one>=45000&&one<=65000,`page one ${Math.round(one)}`);assert.ok(two>=55000&&two<=75000,`page two ${Math.round(two)}`);
 assert.ok(one<=.2*MODEL_DAY[100]&&two<=.2*MODEL_DAY[120],'each less than a fifth of a day, once');
 const range=(level,k)=>{const s=at(level),d=now+G.DAY_MS*2.5;return [G.lakeFishCoins(s,{species:k,kg:0,share:0},false,d),G.lakeFishCoins(s,{species:k,kg:0,share:1},true,d)];};
 assert.deepEqual(range(100,'oldgranite'),[11880,21384]);assert.deepEqual(range(120,'glacierghost'),[14080,25344]);
 t.diagnostic(`first catches: page one ${Math.round(one)} at 100, page two ${Math.round(two)} at 120; Old Granite ${range(100,'oldgranite').join(' to ')} at 100, the Glacier Ghost ${range(120,'glacierghost').join(' to ')} at 120`);
});

// The reel (pond-reel.js) with the pond's simulated players (tests/fishing-ui.test.mjs): a player who watches the fish with a delay and
// holds while it is above the middle of the green (slow: half a second behind, sloppy).
const seeded=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function play(species,{tries=0,first=false,seed=1,delay=.45,skill=.5,idle=false,frame=1/60}={}){
 const random=seeded(seed),r=createReel(species,{tries,first,random}),seen=[];let t=0;
 while(!r.done&&t<90){seen.push(r.fish);const late=seen[Math.max(0,seen.length-1-Math.round(delay/frame))],aim=late+(random()-.5)*8*(2-skill);
  r.run(frame,!idle&&aim>r.zone+r.size/2+r.v*.22*skill);t+=frame;}
 r.time=t;return r;
}
const BIG=['huchen','oldgranite','laketrout','salmon','marbletrout','glacierghost'];
test('the reel: a slow, sloppy player lands every common lake fish on the first try and every one within three tries; doing nothing lands no big one',()=>{
 for(const [species,f] of Object.entries(G.LAKE_FISH)){
  let first=0,within=0;const N=60;
  for(let i=0;i<N;i++){let ok=false;for(let tries=0;tries<3&&!ok;tries++){const r=play(species,{tries,seed:i*31+tries*7+1});if(r.done==='landed'){ok=true;if(!tries)first++;}}if(ok)within++;}
  if(f.chance>=9||f.chance120>=9)assert.ok(first/N>=.9,`${species}: ${first}/${N} on the first try`);else assert.ok(first/N>=.8,`${species}: ${first}/${N} on the first try`);
  assert.ok(within/N>=.9,`${species}: ${within}/${N} within three tries`);
  let idle=0;for(let i=0;i<N;i++)if(play(species,{idle:true,seed:i+500}).done==='landed')idle++;
  if(BIG.includes(species))assert.equal(idle,0,`${species}: never landed by doing nothing`);else assert.ok(idle/N<=.3,`${species}: ${idle}/${N} by doing nothing`);
 }
 // The lake's very first fish (a Bleak) hardly moves and drains slowly when the screen says so, like the farm's first Minnow.
 for(let i=0;i<40;i++)assert.equal(play(G.LAKE_FIRST_FISH[0][0],{first:true,seed:i+900,delay:.6,skill:.3}).done,'landed');
});

test('the big ones pull a little longer than the pond fish of their rarity; the reel plays them the same on a slow screen and a quick one',t=>{
 // Each lake kind started from the pond kind of the same rarity; the big ones then got a slower fill (or longer runs), so they take a
 // little longer to land, for a slow player and a casual one (a quarter of a second behind, steadier).
 const time=(species,o)=>{let sum=0,n=0;for(let i=0;i<80;i++){const r=play(species,{seed:i*13+5,...o});if(r.done==='landed'){sum+=r.time;n++;}}return sum/n;};
 for(const [big,from] of [['huchen','goldencarp'],['laketrout','barbel'],['salmon','trout'],['marbletrout','koi'],['oldgranite','whiskers'],['glacierghost','sturgeon']])for(const [who,o] of [['slow',{}],['casual',{delay:.3,skill:.7}]]){
  const a=time(big,o),b=time(from,o);assert.ok(a>b,`${who}: ${big} ${a.toFixed(1)} s against ${from} ${b.toFixed(1)} s`);assert.ok(a<b*1.6,`${who}: ${big} a little longer, not a chore`);
  if(who==='slow')t.diagnostic(`${big} ${a.toFixed(1)} s, ${from} ${b.toFixed(1)} s (a slow player)`);
 }
 for(const species of Object.keys(G.LAKE_FISH)){const quick=play(species,{seed:77,frame:1/120}),slow=play(species,{seed:77,frame:1/30});assert.ok(quick.done&&slow.done,species);}
 // Every lake kind has the reel's values in the pond's ranges and a fight the reel knows; the legends fight in phases like the pond's.
 for(const [species,f] of Object.entries(G.LAKE_FISH)){
  assert.ok(f.strike>=.6&&f.strike<=1.2&&f.zone>=22&&f.zone<=36&&f.speed>=20&&f.speed<=45&&f.fill>=10&&f.fill<=28&&f.drain>=10&&f.drain<=13,species);
  assert.ok(f.fight==='phases'||FIGHTS[f.fight],`${species}: ${f.fight}`);
 }
 assert.equal(G.LAKE_FISH.oldgranite.fight,'phases');assert.equal(G.LAKE_FISH.glacierghost.fight,'phases');
 const tired=createReel('huchen',{tries:9,random:seeded(1)});assert.equal(tired.size,G.LAKE_FISH.huchen.zone+REEL.tireZone*REEL.tireMax,'a lake fish tires like a pond fish');
 assert.match(read('public/pond-reel.js'),/import \{ALL_FISH as FISH\} from '\.\/farm-state\.js';/,'the reel reads all 36 kinds');
});
