import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,applyFarmAction as act,BEGINNER_QUESTS,beginnerProgress} from '../game/farm-state.js';
import {bindFarmInput,SWIPE_HOLD_MS} from '../public/farm-input.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,11,12);

// A small page for the guide (beginner-ui.js): elements by id, an open window or not, and a clock the test moves.
function page(){
 const els=new Map();let dialogOpen=false;
 class El{hidden=false;open=false;disabled=false;className='';textContent='';innerHTML='';attrs={};listeners={};classes=new Set();
  classList={toggle:(c,on)=>{if(on??!this.classes.has(c))this.classes.add(c);else this.classes.delete(c);},add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),contains:c=>this.classes.has(c)};
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}close(){this.open=false;}showModal(){this.open=true;}focus(){}querySelector(){return new El();}getClientRects(){return [];}}
 const get=id=>{if(!els.has(id))els.set(id,new El());return els.get(id);};
 return {get,setDialog:v=>{dialogOpen=v;},document:{getElementById:get,querySelector:sel=>sel==='dialog[open]'?(dialogOpen?{}:null):get(sel),querySelectorAll:()=>[]}};
}

// 11 Oct 2026 (Part A, A11 and A12): only step 2 showed the way by itself; every other step needed Show me, which short frames hid.
test('every finished step shows the way to the next one by itself, once: 1.8 s later, no window open, the pointer free',async()=>{
 const {createBeginnerUI,AUTO_WAIT_MS,canPointNow}=await import('../public/beginner-ui.js');
 assert.equal(AUTO_WAIT_MS,1800);
 const previous={document:globalThis.document,now:Date.now},p=page();globalThis.document=p.document;
 let clock=now;Date.now=()=>clock;
 try{
  const s=createFarm(now),pointed=[],notes=[];let coachBusy=false;
  const ui=createBeginnerUI({state:s,runAction:async a=>act(s,a,clock),icons(){},notify:n=>notes.push(n),onChange(){},guide:(target,o)=>pointed.push([target,o?.auto??false]),idle:()=>!coachBusy});
  assert.equal(p.get('market-button').classList.contains('guide-next'),false);
  // The first harvest: step 2 waits for the harvest to land at the Market, then points at once.
  const r=act(s,{type:'field',id:0,action:'harvest'},clock);ui.afterAction(r);ui.refresh();
  assert.equal(p.get('market-button').classList.contains('guide-next'),true,'the Market stays lit while step 2 waits');
  assert.deepEqual(notes,[],'one message: the level-2 line says the next step (progression-ui.js), not the guide as well');
  clock+=500;ui.tick();assert.deepEqual(pointed,[]);
  ui.landed();assert.deepEqual(pointed,[['market',true]],'the moment the corn lands');
  ui.landed();clock+=5000;ui.tick();assert.equal(pointed.length,1,'once per step');
  // The sale: the Market's glow goes, and the next step is pointed at 1.8 s later, only with no window open and the pointer free.
  s.onboarding.milestones.sell=true;const sold=act(s,{type:'sell',item:'corn'},clock);ui.afterAction(sold);ui.refresh();
  assert.equal(beginnerProgress(s).find(q=>q.current).id,'plant');assert.equal(p.get('market-button').classList.contains('guide-next'),false);
  p.setDialog(true);clock+=5000;ui.tick();assert.equal(pointed.length,1,'a window is open');
  p.setDialog(false);ui.tick();clock+=1000;ui.tick();assert.equal(pointed.length,1,'not yet: 1.8 s with no window');
  coachBusy=true;clock+=1000;ui.tick();assert.equal(pointed.length,1,'the pointer is busy');
  coachBusy=false;ui.tick();clock+=1900;ui.tick();assert.deepEqual(pointed.at(-1),['plant',true]);
  // A step that cannot be done yet waits for its moment: the wheat step points once a crop is ripe.
  assert.equal(canPointNow({plots:[{crop:'wheat',readyAt:now+60000}],buildings:{}},'harvest',now),false);
  assert.equal(canPointNow({plots:[{crop:'wheat',readyAt:now-1}],buildings:{}},'harvest',now),true);
  assert.equal(canPointNow({plots:[],buildings:{coop:{job:{id:'a',recipe:'eggs',startedAt:now,readyAt:now+60000}}},inventory:{eggs:0}},'eggs',now),false,'eggs on their way');
  assert.equal(canPointNow({plots:[],buildings:{coop:{job:null}},inventory:{eggs:0}},'eggs',now),true,'a Coop that can start them');
  assert.equal(canPointNow({plots:[{crop:'wheat',tended:false,careAt:now-1,readyAt:now+9000}],buildings:{}},'tend',now),true);
 }finally{globalThis.document=previous.document;Date.now=previous.now;}
});

// Step 7 asks two things, collect the eggs and sell one (11 Oct 2026): its first pointer went to the Coop, and after collecting nothing
// pointed at Market. Once the eggs are in, the way to Market is shown by itself too, and Market glows as in step 2.
test('step 7: once its eggs are in, the guide points at Market by itself as well, and Market glows',async()=>{
 const {createBeginnerUI}=await import('../public/beginner-ui.js');
 const previous={document:globalThis.document,now:Date.now},p=page();globalThis.document=p.document;
 let clock=now;Date.now=()=>clock;
 try{
  const s=createFarm(now),ids=beginnerProgress(s).map(q=>q.id),pointed=[];
  assert.equal(ids[6],'sell_egg');
  s.onboarding={...s.onboarding,completed:6,milestones:Object.fromEntries(ids.slice(0,6).map(k=>[k,true]))};s.inventory.eggs=0;
  const ui=createBeginnerUI({state:s,runAction:async a=>act(s,a,clock),icons(){},notify(){},onChange(){},guide:(target,o)=>pointed.push([target,o?.auto??false])});
  assert.equal(p.get('market-button').classList.contains('guide-next'),false,'not while the eggs are still in the Coop');
  clock+=5000;ui.tick();assert.deepEqual(pointed,[],'loaded on this step: nothing changed yet');
  s.inventory.eggs=3;ui.refresh();
  assert.equal(p.get('market-button').classList.contains('guide-next'),true,'the eggs are in: Market glows');
  ui.landed();assert.deepEqual(pointed,[['eggs',true]],'the moment they land at the Market');
  clock+=5000;ui.refresh();ui.tick();assert.equal(pointed.length,1,'once');
 }finally{globalThis.document=previous.document;Date.now=previous.now;}
});

test('the pointer by itself ends on any tap that is not on it, and never opens a window',async()=>{
 const {createCoach}=await import('../public/coach.js');
 const listeners={},doc={addEventListener:(t,fn)=>{(listeners[t]??=[]).push(fn);},removeEventListener:(t,fn)=>{listeners[t]=(listeners[t]??[]).filter(f=>f!==fn);},createElement:()=>({}),body:{}};
 const saved={raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 try{
  const coach=createCoach({doc,win:{innerWidth:900,innerHeight:500}});
  coach.start([{find:()=>null,text:'x'}],{auto:true});assert.equal(coach.active,true);assert.equal(coach.auto,true);
  coach.stop();coach.start([{find:()=>null,text:'x'}]);assert.equal(coach.auto,false,'Show me as before');coach.stop();
 }finally{globalThis.requestAnimationFrame=saved.raf;globalThis.cancelAnimationFrame=saved.caf;}
 const src=read('public/coach.js');
 assert.match(src,/r\.onDown=event=>\{if\(run!==r\|\|!r\.auto\|\|!r\.target\)return;if\(!\(event\.target\?\.nodeType===1&&r\.target\.contains\(event\.target\)\)&&!onSpot\(r\.target,event\)\)stop\(\);\};/);
 assert.match(src,/doc\.addEventListener\('pointerdown',r\.onDown,true\);/);
 const game=read('public/game.js');
 assert.match(game,/\n \/\/ By itself the guide only points; it never opens a window \(no extra pop-ups\)\.\n else if\(auto\)return;/);
 assert.match(game,/if\(auto&&target==='water'&&state\.plots\.some\(p=>canWater\(p,farmNow\(\)\)\)\)\{coach\.stop\(\);showTool\('water'\);toast\('Water it within a minute\.'\);return;\}/,'step 4: the Water tool lights');
 assert.match(game,/onArrive:\(\)=>\{bump\(market\);beginner\?\.landed\?\.\(\);\}/);
});

test('from the first harvest to the first sale: the badge says what the basket is worth, Market opens on Crops, one message',()=>{
 const game=read('public/game.js'),ui=read('public/economy-ui.js'),rules=read('game/farm-state.js');
 // The same number as "This basket is worth" on the Crops tab Market opens on (the corn and the starter wheat), and as Sell all crops.
 assert.match(game,/const worth=guideAt\('sell'\)\?marketWorth\(state,'crops',farmNow\(\)\):0/);
 assert.match(game,/market\.setAttribute\('aria-label',`Market: your basket is worth \$\{text\} coins`\);/);
 assert.match(ui,/export function marketWorth\(state,tab,now=Date\.now\(\)\)\{return marketSaleValue\(state,marketItems\(state,tab\)\.reduce\(\(v,k\)=>v\+sellableStock\(state,k,now\)\*marketQuote\(k,now\)\.price,0\),now\);\}/);
 assert.match(ui,/function categoryTotal\(now=farmNow\(\)\)\{return marketWorth\(state,marketTab,now\);\}/,'the Market\'s own total is the same sum');
 // Every time Market opens then, the pointer shows Sell all corn (step 7: Sell all eggs once they are in), also when the pointer to
 // Market went with an earlier tap.
 assert.match(game,/function guidedMarket\(\)\{return guideAt\('sell'\)\?'market':guideAt\('sell_egg'\)&&\(state\.inventory\.eggs\?\?0\)>0\?'eggs':null;\}/);
 assert.match(game,/if\(way\)\{economy\.openMarket\(way==='market'\?'crops':'goods'\);\$\(id\)\.scrollTop=0;const steps=coach\.active\?null:guideSteps\(way,\{state,now:farmNow\(\)\}\);if\(steps\)coach\.start\(steps\.slice\(1\),\{auto:true\}\);return;\}/);
 assert.match(game,/if\(guideAt\('sell'\)\)\{heldMedals\.push\(\.\.\.medals\);heldTimer\|\|=setTimeout\(/,'the medal waits until after the sale');
 assert.match(game,/const MEDAL_HOLD_MS=20000;/,'and at most 20 s for a farmer who does not sell yet');
 assert.match(game,/if\(heldMedals\.length&&!guideAt\('sell'\)\)\{const medals=heldMedals;heldMedals=\[\];clearTimeout\(heldTimer\);heldTimer=0;setTimeout\(\(\)=>medalToast\(medals\),2600\);\}/);
 assert.match(rules,/\{id:'sell',title:'Your first market sale',description:'Open Market and sell your corn\.',guide:'market',icon:'store'\}/);
 // The harvest's worth at today's prices, on the field, beside what it brought in.
 assert.match(game,/return worth>0\?floatChip\('coins',`worth \$\{worth\.toLocaleString\('en-US'\)\}`,'is-worth'\):'';/);
 assert.match(game,/\+Object\.entries\(crops\)\.map\(\(\[crop,n\]\)=>floatChip\(crop,`\+\$\{n\}`\)\)\.join\(''\)\+worthChip\(crops\)\+/);
 // ... and stays in sight (11 Oct 2026: at 918x516 it rose under the level card and the level-2 line): below the top bars and the toast's
 // place all the way up, between the side tools and the guide card, its chips wrapping on a phone.
 assert.match(game,/\$\('game'\)\.append\(e\);floatClear\(e\);setTimeout/);
 assert.match(game,/const FLOAT_RISE=75,FLOAT_OVER=\['#journal-button','\.resources','#beginner-mobile','#next-goal-mobile'\];/);
 assert.match(game,/if\(t\)\{const w=Math\.max\(t\.offsetWidth,360\),c=g\.left\+g\.width\/2,top=g\.top\+t\.offsetTop;over\.push\(/,'the toast\'s place, also before its line comes');
 assert.match(read('public/styles.css'),/@keyframes reward\{0%\{opacity:1;transform:translate\(-50%,0\)\}100%\{opacity:0;transform:translate\(-50%,-75px\)\}\}/,'the rise floatClear allows for');
 assert.match(read('public/mobile.css'),/\.floating-reward\{font-size:17px;max-width:230px;text-align:center;flex-wrap:wrap;justify-content:center;row-gap:4px\}/);
 assert.match(read('public/beginner.css'),/\.side-tool\.guide-next>span\{box-shadow:0 0 0 3px #f2c14e/);
});

// A15: before the first harvest a mouse drag from anywhere sweeps from the first ripe crop it crosses (the fields with other work on the
// way, an empty one and the growing starter wheat, are passed by: 11 Oct 2026, they used to start a plant or care sweep instead).
function setup({early=true,pointerType='mouse'}={}){
 const handlers={},log={pan:0,added:[],ended:null,settled:0,opened:[]};
 const canvas={addEventListener:(type,fn)=>{handlers[type]=fn;},setPointerCapture(){},hasPointerCapture:()=>false,releasePointerCapture(){}};
 // Fields 50 px wide in a row at y below 100; grass above. Field 0 is empty, field 1 grows wheat with a care marker, fields 2-4 are ripe,
 // as on a new farm, where the empty fields and the wheat lie between the grass in front and the corn.
 const work={0:'plant',1:'tend',2:'harvest',3:'harvest',4:'harvest'},pick=e=>e.clientY>=100&&e.clientY<150?{type:'plot',id:Math.floor(e.clientX/50)}:null;
 bindFarmInput({canvas,isReady:()=>true,pick,open:t=>log.opened.push(t.id),pan:()=>log.pan++,zoom(){},settle:()=>log.settled++,
  sweep:{action:t=>work[t.id]??null,add:t=>log.added.push(t.id),end:(action,ids)=>{log.ended={action,ids};},early:()=>early},
  later:(fn,ms)=>{assert.equal(ms,SWIPE_HOLD_MS);return 7;},cancelLater(){}});
 const at=(type,x,y,button=0)=>handlers[type]({pointerId:1,pointerType,button,clientX:x,clientY:y,preventDefault(){}});
 return {log,at};
}
test('before the first harvest a mouse drag from the grass sweeps the ripe corn it crosses; after it, the grass moves the farm again',()=>{
 let {log,at}=setup();
 at('pointerdown',60,40);at('pointermove',90,60);at('pointermove',130,125);at('pointermove',240,125);at('pointerup',240,125);
 assert.deepEqual(log.ended,{action:'harvest',ids:[2,3,4]},'from the first ripe field it reaches');assert.equal(log.pan,0,'the farm stays put');assert.equal(log.settled,1);
 // From the grass in front, over the empty field and the growing wheat first: nothing is planted or cared for, the corn is harvested.
 ({log,at}=setup());at('pointerdown',10,60);at('pointermove',10,120);at('pointermove',75,125);at('pointermove',240,125);at('pointerup',240,125);
 assert.deepEqual(log.ended,{action:'harvest',ids:[2,3,4]},'the empty field and the wheat on the way are passed by');assert.deepEqual(log.added,[2,3,4]);
 // A drag that starts on the growing wheat looks for the corn too; a click on it still works that field.
 ({log,at}=setup());at('pointerdown',75,125);at('pointermove',110,125);at('pointermove',240,125);at('pointerup',240,125);
 assert.deepEqual(log.ended,{action:'harvest',ids:[2,3,4]},'from the wheat: the corn, not extra care');
 ({log,at}=setup());at('pointerdown',75,125);at('pointerup',75,125);
 assert.equal(log.ended,null);assert.deepEqual(log.opened,[1],'a click on the wheat still opens its work');
 // Over fields with other work only: nothing is worked.
 ({log,at}=setup());at('pointerdown',10,60);at('pointermove',10,125);at('pointermove',90,125);at('pointerup',90,125);
 assert.equal(log.ended,null);assert.deepEqual(log.added,[]);assert.equal(log.pan,0);
 ({log,at}=setup());at('pointerdown',60,40);at('pointermove',200,40);at('pointerup',200,40);
 assert.equal(log.ended,null);assert.equal(log.pan,0,'over the grass only: nothing moves and nothing is worked');
 ({log,at}=setup({early:false}));at('pointerdown',60,40);at('pointermove',130,125);at('pointermove',240,125);at('pointerup',240,125);
 assert.equal(log.ended,null);assert.ok(log.pan>0,'after the first harvest the grass moves the farm');
 ({log,at}=setup());at('pointerdown',60,40,2);at('pointermove',130,125);at('pointermove',240,125);at('pointerup',240,125,2);
 assert.equal(log.ended,null);assert.ok(log.pan>0,'a right-button drag always moves it');
 ({log,at}=setup({pointerType:'touch'}));at('pointerdown',60,40);at('pointermove',130,125);at('pointermove',240,125);at('pointerup',240,125);
 assert.equal(log.ended,null);assert.ok(log.pan>0,'a finger keeps its hold rule');
 const game=read('public/game.js');
 assert.match(game,/const firstBasketWaits=\(\)=>!adminView&&!villageWorld&&!\(state\.stats\.harvested>0\)&&state\.plots\.some\(p=>p\.crop&&farmNow\(\)>=p\.readyAt\);/);
 assert.match(read('public/farm-input.js'),/if\(over\?\.type==='plot'&&sweep\.action\(over\)==='harvest'\)\{point\.sweep=\{action:'harvest',/,'only a ripe crop starts the early sweep');
 assert.match(game,/settle:\(\)=>\{if\(firstBasketWaits\(\)&&viewMode==='fields'\)easeToFields\(\);\},/);
 // The texts say the same rule: the hint, the line at the bottom and How to play.
 assert.match(game,/'Your first crops are ready\. Click one, or hold the mouse button anywhere and sweep across them to harvest them all!'/);
 assert.match(game,/firstBasketWaits\(\)\?'Sweep across your ripe crops from anywhere\. Drag with the right mouse button to explore\.':'Click to work · Sweep across crops · Drag the grass to explore'/);
 assert.match(read('public/wiki-content.js'),/Before your first harvest, a mouse sweep harvests the ripe crops it crosses, wherever it starts\./);
 assert.match(read('public/wiki-content.js'),/With a mouse, a drag with the right button moves it from anywhere; before your first harvest only that one does\./,'a finger still moves the farm before the first harvest');
});

// A14: the short-frame contract (840x430, 918x516, 1000x520, checked in the harness too).
test('short frames: every side tool on screen, the guide as a banner under 500 px, main buttons in sight, the fields fill the room',()=>{
 const hud=read('public/desktop-hud.css'),cards=read('public/progression.css'),game=read('public/game.js');
 const under600=hud.slice(hud.indexOf('@media(min-width:901px) and (max-height:599px) and (min-height:551px),(min-width:901px) and (max-height:599px) and (pointer:fine){'));
 assert.ok(under600.length>100);
 assert.match(under600,/\.side-tools\{top:150px;bottom:auto;grid-template-columns:repeat\(3,60px\);gap:6px 2px;max-height:calc\(100dvh - 158px\);padding:4px\}/);
 assert.match(under600,/\.side-tools \.side-tool>span\{width:43px;height:43px;/);assert.match(under600,/\.side-tools \.side-tool b\{max-width:64px;font-size:10\.5px;/);
 const under500=hud.slice(hud.indexOf('@media(min-width:901px) and (max-height:500px) and (orientation:landscape) and (pointer:fine){'));
 assert.match(under500,/\.beginner-card,\.next-goal-card\{display:none\}/);assert.match(under500,/\.beginner-mobile\{position:absolute;display:grid;/);
 assert.match(hud,/@media\(min-width:901px\) and \(max-width:1000px\)\{\.topbar \.level-card\{flex:0 1 auto;min-width:0\}/,'the Pass keeps its place; the level card gives way');
 assert.match(hud,/@media\(min-width:901px\) and \(max-width:960px\)\{\.topbar #xp-text\{display:none\}\}/,'at 918 px the XP numbers leave the bar to say it, not cut off mid-number');
 assert.match(cards,/@media\(max-height:599px\)\{\n #level-up-dialog>\.level-up-done,#gift-dialog>\.gift-done\{position:sticky;bottom:-12px;/);
 assert.match(cards,/#level-up-dialog>\.level-up-actions,#gift-dialog>\.gift-actions\{position:sticky;bottom:-24px;/);
 assert.match(game,/const fitRoom=height<650&&fieldRoom&&!villageWorld\?fieldRoom:null,fieldFit=fitRoom\?\(6\.1\+rows\*2\.06\)\*height\/\(fitRoom\.bottom-fitRoom\.top\):0;/);
 assert.match(game,/const fieldSpan=fitRoom\?Math\.max\(24\/aspect,\(10\+2\.26\*rows\)\/aspect,fieldFit\):Math\.max\(21,24\/aspect,\(10\+2\.26\*rows\)\/aspect,10\.6\+rows\*2\.06\);/,'650 px and taller keep their view');
 assert.match(game,/const lift=viewMode==='fields'&&fitRoom\?\(\(fitRoom\.top\+fitRoom\.bottom\)\/2-height\/2\)\*span\/height\+1\.25:0;/,'with room for the markers above the back row');
 // The fitted fields for 2 rows at 840x430 (the farm view 288 px tall, 239 px free): about one and a half times as big as the 21 units.
 const rows=2,fit=(6.1+rows*2.06)*288/239;assert.ok(21/fit>1.45&&21/fit<1.75,String(21/fit));
});

test('the guide steps of a guided farm still number ten, and step 2 asks one thing',()=>{
 assert.equal(BEGINNER_QUESTS.length,10);assert.equal(BEGINNER_QUESTS[1].description,'Open Market and sell your corn.');
});
