import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSweepTip,SWEEP_TIP_KEY,SWEEP_TIP_TAPS,SWEEP_TIP_WINDOW_MS,SWEEP_TIP_GAP_MS,SWEEP_TIP_TEXTS} from '../public/sweep-tip.js';
import {LANGUAGES} from '../public/languages.js';
import {catalog,translations} from '../scripts/i18n.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const ACTIONS=['plant','water','tend','harvest'],SEC=1000,MIN=60000;
const memoryStorage=(start={})=>{const map=new Map(Object.entries(start));return {map,getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v))};};
// A tip on a clock that only moves when the test moves it.
function setup({storage=memoryStorage(),quiet=()=>false,start=Date.UTC(2026,9,16,12)}={}){
 const shown=[],clock={t:start};
 const tip=createSweepTip({storage,now:()=>clock.t,show:text=>shown.push(text),quiet});
 const tap=(action,touch=false,gap=SEC)=>{clock.t+=gap;tip.tapped(action,{touch});};
 return {tip,shown,clock,storage,tap};
}

// 16 Oct 2026 (the owner): "Many people plant and water one by one; it is too unclear that you can go faster by swiping. When you plant,
// water or give care one by one, show a small message that you can also swipe." Harvest the same.
test('the rule: 3 taps in a row of one action within 30 seconds, at most one tip in 10 minutes',()=>{
 assert.equal(SWEEP_TIP_KEY,'harvest-tycoon:sweep-tip');
 assert.equal(SWEEP_TIP_TAPS,3);assert.equal(SWEEP_TIP_WINDOW_MS,30*SEC);assert.equal(SWEEP_TIP_GAP_MS,10*MIN);
 assert.ok(Object.isFrozen(SWEEP_TIP_TEXTS)&&Object.isFrozen(SWEEP_TIP_TEXTS.mouse)&&Object.isFrozen(SWEEP_TIP_TEXTS.touch));
 assert.deepEqual(Object.keys(SWEEP_TIP_TEXTS.mouse),ACTIONS);assert.deepEqual(Object.keys(SWEEP_TIP_TEXTS.touch),ACTIONS);
});

test('the third tap of one action shows its tip once, in mouse words or in phone words',()=>{
 const want={
  mouse:{plant:'Tip: hold the mouse button on an empty field and sweep across your fields to plant them all at once.',water:'Tip: hold the mouse button on a crop and sweep across your fields to water them all at once.',tend:'Tip: hold the mouse button on a crop and sweep across your fields to give them all extra care at once.',harvest:'Tip: hold the mouse button on a ripe crop and sweep across your fields to harvest them all at once.'},
  touch:{plant:'Tip: hold an empty field for a moment, then swipe across your fields to plant them all at once.',water:'Tip: hold a crop for a moment, then swipe across your fields to water them all at once.',tend:'Tip: hold a crop for a moment, then swipe across your fields to give them all extra care at once.',harvest:'Tip: hold a ripe crop for a moment, then swipe across your fields to harvest them all at once.'}
 };
 assert.deepEqual(JSON.parse(JSON.stringify(SWEEP_TIP_TEXTS)),want);
 for(const kind of ['mouse','touch'])for(const action of ACTIONS){
  const {shown,tap}=setup();
  tap(action,kind==='touch');tap(action,kind==='touch');
  assert.deepEqual(shown,[],`${kind} ${action}: two taps show nothing`);
  tap(action,kind==='touch');
  assert.deepEqual(shown,[want[kind][action]],`${kind} ${action}`);
 }
 // touch is true unless the game says it was a mouse.
 const {tip,shown}=setup();for(let i=0;i<3;i++)tip.tapped('water');
 assert.deepEqual(shown,[want.touch.water]);
});

test('another action in between, or a run longer than 30 seconds, starts counting again',()=>{
 {const {shown,tap}=setup();tap('water');tap('water');tap('plant');tap('water');tap('water');
  assert.deepEqual(shown,[],'water, water, plant, water, water: no third water in a row');
  tap('water');assert.equal(shown.length,1,'the third water of the new run');}
 {const {shown,tap}=setup();tap('plant');tap('plant',false,20*SEC);tap('plant',false,10*SEC+1);
  assert.deepEqual(shown,[],'the third tap comes 30 s and 1 ms after the first');
  tap('plant',false,SEC);tap('plant',false,SEC);
  assert.equal(shown.length,1,'the late tap started a new run, whose third tap shows');}
 {const {shown,tap}=setup();tap('harvest');tap('harvest',false,15*SEC);tap('harvest',false,15*SEC);
  assert.equal(shown.length,1,'exactly 30 s after the first tap is still the same run');}
 {const {shown,tap}=setup();for(const a of ['plant','water','tend','harvest','plant','water'])tap(a);
  assert.deepEqual(shown,[],'every action once, no run of three');}
 {const {shown,tip}=setup();for(const a of ['field','fields','expand',undefined,null,'Plant'])for(let i=0;i<3;i++)tip.tapped(a,{touch:false});
  assert.deepEqual(shown,[],'only plant, water, extra care and harvest count');}
});

test('at most one tip in 10 minutes, whatever the action; after a tip the run starts over',()=>{
 const {shown,tap,clock}=setup();
 tap('water');tap('water');tap('water');assert.equal(shown.length,1);
 const tipAt=clock.t;
 tap('water');tap('water');assert.equal(shown.length,1,'the run starts over after a tip');
 tap('plant');tap('plant');tap('plant');assert.equal(shown.length,1,'another action within 10 minutes: no tip');
 // A new run of plant taps whose third tap comes 1 second before the 10 minutes are up: none yet, and the run waits.
 clock.t=tipAt+SWEEP_TIP_GAP_MS-4*SEC;tap('plant');tap('plant');tap('plant');assert.equal(shown.length,1,'just under 10 minutes');
 tap('plant');assert.equal(clock.t-tipAt,SWEEP_TIP_GAP_MS);assert.equal(shown.length,2,'10 minutes after the last tip the waiting run shows it');
 assert.match(shown[1],/plant them all/);
});

test('a sweep over 2 fields or more ends that action\'s tip on this device for good; a sweep of 1 field does not',()=>{
 const storage=memoryStorage(),{tip,shown,tap,clock}=setup({storage});
 tip.swept('water',1);
 for(let i=0;i<3;i++)tap('water');assert.equal(shown.length,1,'a sweep of one field is a tap: the tip still comes');
 tip.swept('water',2);clock.t+=SWEEP_TIP_GAP_MS;
 for(let i=0;i<9;i++)tap('water');assert.equal(shown.length,1,'water was swept: never again');
 for(let i=0;i<3;i++)tap('plant');assert.equal(shown.length,2,'plant was not swept: its tip still comes');
 tip.swept('nonsense',5);tip.swept('harvest',NaN);tip.swept('tend','3');tip.swept('tend',null);
 assert.deepEqual(JSON.parse(storage.map.get(SWEEP_TIP_KEY)).swept,['water'],'nothing else is kept');
 // A new page on the same device remembers both the swept action and the last tip.
 const again=setup({storage,start:clock.t+SEC});
 for(let i=0;i<3;i++)again.tap('water');assert.deepEqual(again.shown,[],'water stays swept');
 for(let i=0;i<3;i++)again.tap('harvest');assert.deepEqual(again.shown,[],'the 10 minutes since the last tip carry over');
 again.clock.t+=SWEEP_TIP_GAP_MS;for(let i=0;i<3;i++)again.tap('harvest');assert.equal(again.shown.length,1);
 const saved=JSON.parse(storage.map.get(SWEEP_TIP_KEY));
 assert.deepEqual(saved,{swept:['water'],at:again.clock.t},'{swept:[actions],at:last tip}');
 // Two tabs of the farm on one device: neither forgets what the other swept.
 const shared=memoryStorage(),a=setup({storage:shared}),b=setup({storage:shared});
 a.tip.swept('plant',3);b.tip.swept('harvest',2);
 assert.deepEqual(JSON.parse(shared.map.get(SWEEP_TIP_KEY)).swept.sort(),['harvest','plant']);
});

test('blocked, throwing or missing storage and junk in it never break a tap; the page then remembers for itself',()=>{
 const boom=()=>{throw new Error('blocked');};
 for(const storage of [null,undefined,{getItem:boom,setItem:boom},{getItem:()=>'{"swept":',setItem:boom},{}]){
  const {tip,shown,tap,clock}=setup({storage});
  for(let i=0;i<3;i++)tap('tend');assert.equal(shown.length,1,'the tip still shows');
  clock.t+=SWEEP_TIP_GAP_MS;tip.swept('tend',4);
  for(let i=0;i<3;i++)tap('tend');assert.equal(shown.length,1,'swept, for the page');
  for(let i=0;i<3;i++)tap('harvest');assert.equal(shown.length,2);
  for(let i=0;i<3;i++)tap('harvest');assert.equal(shown.length,2,'the 10 minutes, for the page');
 }
 for(const junk of ['not json','null','[]','42','"water"','{"swept":"water","at":"soon"}','{"swept":[1,null,{},"weed"],"at":null}','{"swept":["water"],"at":1e400}',`{"swept":[],"at":"${Date.UTC(2026,9,16,12)}"}`]){
  const storage=memoryStorage({[SWEEP_TIP_KEY]:junk}),{shown,tap}=setup({storage});
  for(let i=0;i<3;i++)tap(junk.includes('"water"]')?'plant':'water');assert.equal(shown.length,1,junk);
 }
 // What can be read of a half-good save is used.
 const half=memoryStorage({[SWEEP_TIP_KEY]:'{"swept":["water",7,"weed"],"at":"x"}'}),{shown,tap,clock}=setup({storage:half});
 for(let i=0;i<3;i++)tap('water');assert.deepEqual(shown,[],'water was swept');
 for(let i=0;i<3;i++)tap('plant');assert.equal(shown.length,1,'no last tip to wait for');
 assert.deepEqual(JSON.parse(half.map.get(SWEEP_TIP_KEY)),{swept:['water'],at:clock.t},'the junk is not written back');
 // A tip time in the future (the clock was turned back) holds nothing back; a show that throws breaks nothing.
 const future=memoryStorage({[SWEEP_TIP_KEY]:JSON.stringify({swept:[],at:Date.UTC(2030,0,1)})}),later=setup({storage:future});
 for(let i=0;i<3;i++)later.tap('harvest');assert.equal(later.shown.length,1);
 const loud=createSweepTip({storage:memoryStorage(),now:()=>1e12,show:boom});
 assert.doesNotThrow(()=>{for(let i=0;i<4;i++)loud.tapped('plant',{touch:true});loud.swept('plant',3);});
 const noShow=createSweepTip({storage:memoryStorage()});assert.doesNotThrow(()=>{for(let i=0;i<3;i++)noShow.tapped('plant');});
});

test('quiet() holds the tip back (the Beginner guide, the admin view, the village), and the next tap of the run may show it',()=>{
 let hush=true;const storage=memoryStorage(),{shown,tap}=setup({storage,quiet:()=>hush});
 for(let i=0;i<5;i++)tap('plant');
 assert.deepEqual(shown,[]);assert.equal(storage.map.has(SWEEP_TIP_KEY),false,'a held-back tip is no tip: nothing saved');
 hush=false;tap('plant');assert.equal(shown.length,1,'the guide is finished: the next tap of the run shows it');
 const broken=setup({quiet:()=>{throw new Error('no state');}});
 for(let i=0;i<3;i++)broken.tap('water');assert.deepEqual(broken.shown,[],'a quiet() that throws counts as quiet');
});

test('the 8 tips are in the catalog and in every language, without a middle dot',()=>{
 const all=catalog(),texts=ACTIONS.flatMap(a=>[SWEEP_TIP_TEXTS.mouse[a],SWEEP_TIP_TEXTS.touch[a]]);
 assert.equal(new Set(texts).size,8);
 for(const text of texts){
  assert.equal(all[text],'public/sweep-tip.js',text);
  assert.doesNotMatch(text,/·/);
 }
 for(const {code} of LANGUAGES.filter(l=>l.code!=='en')){
  const done=translations(code);
  for(const text of texts){
   assert.equal(typeof done[text],'string',`${code}: ${text}`);
   assert.doesNotMatch(done[text],/·/,`${code}: ${text}`);
  }
 }
 assert.doesNotMatch(read('public/sweep-tip.js'),/ · /);
});

// The game uses it (16 Oct 2026): a tap that did its action counts (never the guide's own forced one), a sweep that ended counts its
// fields, and the tip keeps quiet while the Beginner guide still has steps, in the admin view and in the village.
test('the game counts every field tap and every finished sweep, and keeps the tip quiet in the guide, the admin view and the village',()=>{
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(game,/\nimport \{ createSweepTip \} from '\.\/sweep-tip\.js';\n/);
 assert.match(game,/const sweepTip=createSweepTip\(\{storage:\(\(\)=>\{try\{return localStorage;\}catch\{return null;\}\}\)\(\),show:text=>toast\(text\),quiet:\(\)=>villageWorld\|\|adminView\|\|!beginnerProgress\(state\)\.every\(q=>q\.done\)\}\);/);
 const interact=game.slice(game.indexOf('async function interact('),game.indexOf('\n}\n',game.indexOf('async function interact(')));
 assert.match(interact,/const result=await runAction\(\{type:'field',id,action,crop:selectedCrop\}\);[^]*\n  if\(!forcedAction&&!waited\)sweepTip\.tapped\(action,\{touch:lastPointer\?\.type!=='mouse'\}\);\n  drawCrop\(id\);/,'after the action succeeded, a tap only');
 assert.ok(interact.indexOf('sweepTip.tapped')<interact.indexOf('}catch(e){'),'never on an error');
 const end=game.slice(game.indexOf('function endSweep('),game.indexOf('\n}\n',game.indexOf('function endSweep(')));
 assert.match(end,/ if\(!result\)\{if\(run\.handle\.reason\)toast\(run\.handle\.reason\);return;\}\n sweepTip\.swept\(action,run\.count\);/,'a sweep the server took, with its fields');
 assert.match(read('public/farm.html'),/<link rel="modulepreload" href="\/sweep-tip\.js[^"]*">/,'preloaded with the rest of the game');
 assert.ok(read('public/privacy.html').includes(`<code>${SWEEP_TIP_KEY}</code>`),'the device key is in the privacy policy\'s storage table');
});
