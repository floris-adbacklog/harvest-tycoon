import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,applyFarmAction as act,beginnerProgress,FAMILY_MIN_LEVEL,FEATURE_LEVELS} from '../game/farm-state.js';
import {startLoadingTips,LOADING_TIPS,PASS_LOADING_TIP,POND_LOADING_TIP,LATER_TIPS,BEGINNER_TIP_LEVEL} from '../public/loading-screen.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,13,12);

// Item 1 of the 13 Oct 2026 proposal (plan-wachten/E-verbeteringen.md): since 11 Oct the pointer "Tap Market to open it." showed once, the
// next tap on a corn ended it, and on a phone the sales within 30 s of the first harvest fell from 60% to 20%.

// A small page for the guide (beginner-ui.js): elements by id, an open window or not, taps on the page, and a clock the test moves (no
// reminder card: beginner-ui.js quiet looks for it since 13 Oct 2026).
function page(){
 const els=new Map(),listeners={};let dialogOpen=false;
 class El{hidden=false;open=false;disabled=false;className='';textContent='';innerHTML='';attrs={};listeners={};classes=new Set();
  classList={toggle:(c,on)=>{if(on??!this.classes.has(c))this.classes.add(c);else this.classes.delete(c);},add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),contains:c=>this.classes.has(c)};
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}close(){this.open=false;}showModal(){this.open=true;}focus(){}querySelector(){return new El();}getClientRects(){return [];}}
 const get=id=>{if(!els.has(id))els.set(id,new El());return els.get(id);};
 const touch=type=>(listeners[type]??[]).forEach(fn=>fn({type}));
 return {get,touch,setDialog:v=>{dialogOpen=v;},document:{getElementById:get,querySelector:sel=>sel==='dialog[open]'?(dialogOpen||get('market-dialog').open?{}:null):sel==='.reminder-nudge'?null:get(sel),querySelectorAll:()=>[],addEventListener:(type,fn)=>{(listeners[type]??=[]).push(fn);}}};
}
async function guide(setup=s=>s){
 const {createBeginnerUI,AUTO_WAIT_MS}=await import('../public/beginner-ui.js');
 const p=page(),s=setup(createFarm(now)),pointed=[],clock={t:now};let coachBusy=false;
 const ui=createBeginnerUI({state:s,runAction:async a=>act(s,a,clock.t),icons(){},notify(){},onChange(){},guide:(target,o)=>pointed.push([target,o??{}]),idle:()=>!coachBusy});
 return {ui,p,s,pointed,clock,AUTO_WAIT_MS,busy:v=>{coachBusy=v;}};
}
const withPage=async fn=>{const previous={document:globalThis.document,now:Date.now};try{return await fn();}finally{globalThis.document=previous.document;Date.now=previous.now;}};

test('step 2: the pointer to Market comes back each time nothing has been touched for 1.8 s, until Market has been opened',()=>withPage(async()=>{
 const {createBeginnerUI}=await import('../public/beginner-ui.js');
 const p=page();globalThis.document=p.document;let t=now;Date.now=()=>t;
 const s=createFarm(now),pointed=[];let coachBusy=false;
 const ui=createBeginnerUI({state:s,runAction:async a=>act(s,a,t),icons(){},notify(){},onChange(){},guide:(target,o)=>pointed.push([target,o]),idle:()=>!coachBusy});
 ui.afterAction(act(s,{type:'field',id:0,action:'harvest'},t));ui.refresh();
 assert.equal(beginnerProgress(s).find(q=>q.current).id,'sell');
 // The first time the moment the corn lands at the Market, and it stays while the farm is worked (stay, coach.js).
 ui.landed();assert.deepEqual(pointed,[['market',{auto:true,stay:true}]]);
 coachBusy=true;p.touch('pointerdown');t+=5000;ui.tick();ui.landed();assert.equal(pointed.length,1,'while it shows, nothing more');
 // The pointer went (a tap on another button, or its 25 s): back 1.8 s after the last touch, not after the first.
 coachBusy=false;ui.tick();t+=1000;p.touch('pointerdown');ui.tick();t+=1000;ui.tick();assert.equal(pointed.length,1,'1 s after a touch');
 ui.landed();assert.equal(pointed.length,1,'a later harvest landing does not skip the wait');
 t+=900;ui.tick();assert.deepEqual(pointed.at(-1),['market',{auto:true,stay:true}],'1.9 s after the last touch');assert.equal(pointed.length,2);
 // A window open (Quests) holds it; after it closes, 1.8 s more.
 coachBusy=false;p.setDialog(true);t+=5000;ui.tick();assert.equal(pointed.length,2,'a window is open');
 p.setDialog(false);p.touch('pointerdown');ui.tick();t+=1000;ui.tick();assert.equal(pointed.length,2);t+=900;ui.tick();assert.equal(pointed.length,3);
 // Market opened: its work is done (inside Market it points at Sell all itself); closed again without a sale, it stays away.
 p.get('market-dialog').open=true;ui.tick();p.get('market-dialog').open=false;t+=60000;ui.tick();ui.landed();assert.equal(pointed.length,3,'never again after Market was opened');
 // Keys and the wheel count as touches too.
 const listens=read('public/beginner-ui.js');
 assert.match(listens,/for\(const type of \['pointerdown','keydown','wheel'\]\)document\.addEventListener\?\.\(type,\(\)=>\{touchedAt=Date\.now\(\);\},\{capture:true,passive:true\}\);/);
}));

test('a farm that opens on step 2 points at Market 1.8 s after the farm is on screen, and again after each pause',()=>withPage(async()=>{
 const {createBeginnerUI}=await import('../public/beginner-ui.js');
 const p=page();globalThis.document=p.document;let t=now;Date.now=()=>t;
 const s=createFarm(now);act(s,{type:'field',id:0,action:'harvest'},t);assert.equal(beginnerProgress(s).find(q=>q.current).id,'sell');
 t+=3600000;const pointed=[];
 const ui=createBeginnerUI({state:s,runAction:async a=>act(s,a,t),icons(){},notify(){},onChange(){},guide:(target,o)=>pointed.push([target,o])});
 t+=9000;ui.tick();assert.deepEqual(pointed,[],'not while the farm is still loading: the wait starts at the first tick');
 t+=1000;ui.tick();assert.deepEqual(pointed,[]);t+=900;ui.tick();assert.deepEqual(pointed,[['market',{auto:true,stay:true}]]);
 ui.tick();t+=1900;ui.tick();assert.equal(pointed.length,2,'the pointer was free again: 1.8 s later once more');
}));

test('the other steps still point once by themselves, and step 7 is not kept standing',()=>withPage(async()=>{
 const {createBeginnerUI}=await import('../public/beginner-ui.js');
 const p=page();globalThis.document=p.document;let t=now;Date.now=()=>t;
 const s=createFarm(now),ids=beginnerProgress(s).map(q=>q.id),pointed=[];
 s.onboarding={...s.onboarding,completed:6,milestones:Object.fromEntries(ids.slice(0,6).map(k=>[k,true]))};s.inventory.eggs=0;
 const ui=createBeginnerUI({state:s,runAction:async a=>act(s,a,t),icons(){},notify(){},onChange(){},guide:(target,o)=>pointed.push([target,o])});
 t+=5000;ui.tick();assert.deepEqual(pointed,[],'loaded on step 7: nothing changed yet');
 s.inventory.eggs=3;ui.refresh();ui.landed();assert.deepEqual(pointed,[['eggs',{auto:true}]]);
 t+=60000;ui.refresh();ui.tick();ui.landed();assert.equal(pointed.length,1,'once');
}));

test('the pointer that stays: a tap on the farm leaves it, a tap on another button or a window over it ends it',async()=>{
 const {createCoach,FARM_VIEW}=await import('../public/coach.js');
 const listeners={},frames=[];let dialog=null;
 const market={nodeType:1,contains:el=>el===market,getBoundingClientRect:()=>({left:180,top:790,width:40,height:46,right:220,bottom:836})};
 const doc={addEventListener:(t,fn)=>{(listeners[t]??=[]).push(fn);},removeEventListener:(t,fn)=>{listeners[t]=(listeners[t]??[]).filter(f=>f!==fn);},body:{append(){}},querySelector:sel=>sel==='dialog[open]'?dialog:null,
  createElement:()=>({setAttribute(){},dataset:{},style:{setProperty(){}},classList:{toggle(){}},remove(){},getBoundingClientRect:()=>({left:0,top:0,width:120,height:30,right:120,bottom:30})})};
 const saved={raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame,gcs:globalThis.getComputedStyle};
 globalThis.requestAnimationFrame=fn=>frames.push(fn);globalThis.cancelAnimationFrame=()=>{};globalThis.getComputedStyle=()=>({visibility:'visible',display:'block'});
 market.isConnected=true;market.closest=()=>null;market.classList={add(){},remove(){}};
 const farm={nodeType:1,closest:sel=>sel===FARM_VIEW?{}:null},quests={nodeType:1,closest:()=>null};
 const down=target=>(listeners.pointerdown??[]).forEach(fn=>fn({target,clientX:100,clientY:400}));
 const step=[{find:()=>market,text:'Tap Market to open it.'},{find:()=>null,text:'Open Crops.'}];
 try{
  const coach=createCoach({doc,win:{innerWidth:390,innerHeight:844}});
  coach.start(step,{auto:true,stay:true});frames.shift()();
  down(farm);down(farm);assert.equal(coach.active,true,'taps on the corn and the grass leave it standing');
  down(quests);assert.equal(coach.active,false,'a tap on Quests ends it');
  coach.start(step,{auto:true});frames.shift()();down(farm);assert.equal(coach.active,false,'the other steps by themselves: any tap ends it, as before');
  // A building's window from a tap on the farm ends it; Market's own window from a tap on Market does not (the next step is in it).
  coach.start(step,{auto:true,stay:true});frames.shift()();down(farm);dialog={};frames.shift()();assert.equal(coach.active,false,'a window over it');
  dialog=null;coach.start(step,{auto:true,stay:true});frames.shift()();
  (listeners.click??[]).forEach(fn=>fn({target:market}));dialog={};frames.shift()();assert.equal(coach.active,true,'Market opened by a tap on it');
  coach.stop();
 }finally{globalThis.requestAnimationFrame=saved.raf;globalThis.cancelAnimationFrame=saved.caf;globalThis.getComputedStyle=saved.gcs;}
 const game=read('public/game.js');
 assert.match(game,/function showWay\(target,\{auto=false,stay=false\}=\{\}\)\{/);
});

test('until the first sale only the Market carries a mark; before the first harvest not even its stock number',()=>withPage(async()=>{
 const {createBeginnerUI}=await import('../public/beginner-ui.js');
 const p=page();globalThis.document=p.document;let t=now;Date.now=()=>t;
 const s=createFarm(now),game=p.get('game');
 const ui=createBeginnerUI({state:s,runAction:async a=>act(s,a,t),icons(){},notify(){},onChange(){},guide(){}});
 assert.equal(game.classList.contains('first-sale-waits'),true);assert.equal(game.classList.contains('first-harvest-waits'),true);
 ui.afterAction(act(s,{type:'field',id:0,action:'harvest'},t));ui.refresh();
 assert.equal(game.classList.contains('first-sale-waits'),true,'harvested, not sold');assert.equal(game.classList.contains('first-harvest-waits'),false,'the Market shows what the basket is worth');
 t+=31*60000;ui.afterAction(act(s,{type:'sell',item:'corn'},t));ui.refresh();
 assert.notEqual(beginnerProgress(s).find(q=>q.current).id,'sell');
 assert.equal(game.classList.contains('first-sale-waits'),false,'sold: Quests, Today and More show their marks again');
 // A farm that sold before (starter wheat before its first harvest, 42 farms on 13 Oct), past the guide, or the village, is never quiet.
 const early=page();globalThis.document=early.document;const before=createFarm(now);before.stats.sold=8;
 createBeginnerUI({state:before,runAction:async()=>({}),icons(){},notify(){},onChange(){},guide(){}});assert.equal(early.get('game').classList.contains('first-sale-waits'),false);
 // Review fix: coins from an order count as the first sale too (14 farms on step 2 delivered orders but never sold at Market).
 const order=page();globalThis.document=order.document;const delivered=createFarm(now);act(delivered,{type:'field',id:0,action:'harvest'},now);delivered.stats.deliveries=1;delivered.stats.earned=41;
 assert.equal(beginnerProgress(delivered).find(q=>q.current).id,'sell');
 createBeginnerUI({state:delivered,runAction:async()=>({}),icons(){},notify(){},onChange(){},guide(){}});assert.equal(order.get('game').classList.contains('first-sale-waits'),false,'earned from an order');
 const done=createFarm(now);done.onboarding={...done.onboarding,completed:10,rewardClaimed:true};const q=page();globalThis.document=q.document;
 createBeginnerUI({state:done,runAction:async()=>({}),icons(){},notify(){},onChange(){},guide(){}});assert.equal(q.get('game').classList.contains('first-sale-waits'),false);
 const v=page();globalThis.document=v.document;createBeginnerUI({state:createFarm(now),runAction:async()=>({}),icons(){},notify(){},onChange(){},guide(){},village:true});
 assert.equal(v.get('game').classList.contains('first-sale-waits'),false);assert.equal(v.get('game').classList.contains('first-harvest-waits'),false);
 // beginner.css hides the marks, all four inside the game (farm.html).
 assert.match(read('public/beginner.css'),/#game\.first-sale-waits :is\(#task-dot,#today-dot,#more-dot\),#game\.first-harvest-waits #stock-count\{display:none\}/);
 const farm=read('public/farm.html'),inGame=farm.slice(farm.indexOf('<main id="game"'),farm.indexOf('</main>'));assert.match(farm,/href="\/beginner\.css/);
 for(const id of ['task-dot','today-dot','more-dot','stock-count'])assert.match(inGame,new RegExp(`id="${id}"`),id);
}));

test('loading tips: a beginner sees only the basics; the tips about what opens at level 10 or later wait until level 10',()=>{
 assert.equal(BEGINNER_TIP_LEVEL,FAMILY_MIN_LEVEL);
 // Each later tip is about something that opens at level 10 or later.
 const opens={'live-events':Number(read('public/live-events-ui.js').match(/export const EVENTS_LEVEL=(\d+);/)[1]),'chore-weeds':FEATURE_LEVELS.chores,
  'family-chest-gold':FAMILY_MIN_LEVEL,'family-sharing':FAMILY_MIN_LEVEL,'family-tournament':FAMILY_MIN_LEVEL,'family-weekly-order':FAMILY_MIN_LEVEL,'family-members':FAMILY_MIN_LEVEL,
  'valley-market':FEATURE_LEVELS.valleymarket,'trade-depot':FEATURE_LEVELS.tradedepot,'giant-small':Number(PASS_LOADING_TIP[1].match(/from level (\d+)/)[1])};
 assert.deepEqual([...LATER_TIPS].sort(),Object.keys(opens).sort());
 for(const [picture,level] of Object.entries(opens))assert.ok(level>=BEGINNER_TIP_LEVEL,`${picture} opens at ${level}`);
 // The basics mention none of them.
 const all=[POND_LOADING_TIP,PASS_LOADING_TIP,...LOADING_TIPS],basics=all.filter(([picture])=>!LATER_TIPS.includes(picture));
 assert.ok(basics.length>=10);for(const [picture,text] of basics)assert.doesNotMatch(text,/famil|event|Pass|Valley|Depot|chore/i,picture);
 // The farm page: the farmer's level; the page around it (play.html, the portals) does not know it, so 0.
 const seen=level=>{const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id))nodes.set(id,{textContent:'',src:'',parentElement:{classList:{add(){},remove(){}}}});return nodes.get(id);}};
  const timers={intervals:[],setInterval(fn){this.intervals.push(fn);return 1;},setTimeout(fn){fn();return 2;},clearInterval(){},clearTimeout(){}};
  startLoadingTips(doc,{tips:all,timers,now:0,...(level===undefined?{}:{level:()=>level})});const out=[];for(let i=0;i<all.length*2;i++){out.push(nodes.get('loading-tip-icon').src.match(/icons\/(.+)\.webp/)[1]);timers.intervals[0]();}return new Set(out);};
 for(const level of [undefined,0,1,9]){const shown=seen(level);assert.ok(![...shown].some(p=>LATER_TIPS.includes(p)),`level ${level}`);assert.equal(shown.size,new Set(basics.map(([p])=>p)).size,`every basic tip at level ${level}`);}
 assert.equal(seen(10).size,new Set(all.map(([p])=>p)).size,'from level 10 every tip');
 assert.match(read('public/game.js'),/\.\.\.\(passPhase\(Date\.now\(\)\)==='open'\?\[PASS_LOADING_TIP,\.\.\.LOADING_TIPS\]:LOADING_TIPS\)\],level:\(\)=>levelProgress\(state\)\.level\}\);/);
});
