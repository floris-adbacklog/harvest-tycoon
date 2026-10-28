import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBack,watchWindows,modalOpen,handheldDevice,farmRests,FARM_REST_MS} from '../public/windows.js';
import {createFarmSession} from '../src/farm-session.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 13 Oct 2026 (Android app 1.3, the Back button): the app first asks the page (window.harvestBack) to close its top-most window, and
// only when nothing was open does what Back did before (back a page, or leave the game). Back does what Escape does on a computer.
// A small page: window > document > body > dialogs (and what is inside them), events that go down (capture) and up (bubble) that path.
class FakeEvent{constructor(type,{bubbles=false,cancelable=false,key}={}){Object.assign(this,{type,bubbles,cancelable,key,defaultPrevented:false,stopped:false});}preventDefault(){if(this.cancelable)this.defaultPrevented=true;}stopPropagation(){this.stopped=true;}}
class FakeKeyboardEvent extends FakeEvent{}
class Node{
 constructor(parent=null,tag='DIV'){this.parent=parent;this.tagName=tag;this.listeners=[];this.kids=[];parent?.kids.push(this);this.classList=new Set();this.classList.contains=this.classList.has;}
 addEventListener(type,fn,options){this.listeners.push({type,fn,capture:options===true||options?.capture===true});}
 contains(node){for(let n=node;n;n=n.parent)if(n===this)return true;return false;}
 dispatchEvent(event){
  const path=[];for(let n=this;n;n=n.parent)path.push(n);
  const run=(node,capture)=>{for(const l of node.listeners)if(l.type===event.type&&(node===this||l.capture===capture)&&!event.stopped)l.fn.call(node,event);};
  for(const node of path.slice(1).reverse()){run(node,true);if(event.stopped)return !event.defaultPrevented;}
  run(this,null);
  if(event.bubbles)for(const node of path.slice(1)){if(event.stopped)break;run(node,false);}
  return !event.defaultPrevented;
 }
}
function page(){
 const records=[],win=new Node(null,'WINDOW'),doc=new Node(win,'#document'),body=new Node(doc,'BODY'),dialogs=[];
 Object.assign(win,{KeyboardEvent:FakeKeyboardEvent,Event:FakeEvent,document:doc});doc.documentElement=doc;doc.activeElement=body;
 doc.querySelectorAll=selector=>{assert.equal(selector,'dialog[open]');return dialogs.filter(d=>d.open);};
 doc.querySelector=selector=>{assert.equal(selector,'dialog:modal');return dialogs.find(d=>d.open&&d.isModal)??null;};
 // A watch as MutationObserver's: told about every open attribute that comes or goes, read (takeRecords) when Back is pressed.
 win.MutationObserver=class{constructor(note){this.note=note;}observe(target,options){assert.deepEqual(options,{subtree:true,attributes:true,attributeFilter:['open']});}takeRecords(){return records.splice(0);}disconnect(){}};
 const dialog=(id,{watched=true}={})=>{
  const d=new Node(body,'DIALOG');Object.assign(d,{id,open:false,isModal:false,closes:0});dialogs.push(d);
  const flip=open=>{d.open=open;if(watched)records.push({target:d,attributeName:'open'});};
  d.matches=selector=>selector===':modal'&&d.open&&d.isModal;
  d.showModal=()=>{d.isModal=true;flip(true);doc.activeElement=d;};
  d.show=()=>{d.isModal=false;flip(true);};
  d.close=()=>{if(!d.open)return;d.isModal=false;d.closes++;flip(false);d.dispatchEvent(new FakeEvent('close'));};
  return d;
 };
 return {win,doc,body,dialog,records,back:()=>win.harvestBack()};
}
const farm=()=>{const p=page();p.win.harvestBack=createBack({doc:p.doc,win:p.win});return p;};

test('Back closes the top-most window and says true; with nothing open it says false, and the app does what Back did before',()=>{
 const p=farm(),market=p.dialog('market-dialog');
 assert.equal(p.back(),false,'the farm with no window');
 market.showModal();const confirm=p.dialog('sale-confirm');confirm.showModal();
 assert.equal(p.back(),true);assert.equal(confirm.open,false,'the confirmation over Market first');assert.equal(market.open,true);
 assert.equal(p.back(),true);assert.equal(market.open,false);assert.equal(market.closes,1,'closed as Escape closes it: its close event, once');
 assert.equal(p.back(),false);
});
test('the window opened last is on top, wherever it sits in the page; one already open when the watch started counts as below',()=>{
 const p=page(),early=p.dialog('welcome-back-dialog',{watched:false});early.showModal();
 p.win.harvestBack=createBack({doc:p.doc,win:p.win});
 const levelUp=p.dialog('level-up-dialog'),chat=p.dialog('chat-dialog');
 chat.showModal();levelUp.showModal();   // Level up over the chat: before it in the page, but opened after it
 assert.equal(p.back(),true);assert.equal(levelUp.open,false);assert.equal(chat.open,true);
 assert.equal(p.back(),true);assert.equal(chat.open,false);assert.equal(early.open,true);
 assert.equal(p.back(),true);assert.equal(early.open,false);assert.equal(p.back(),false);
 // Without a watch (no MutationObserver) page order decides; windows opened with showModal stay above the pond either way.
 const q=page(),first=q.dialog('market-dialog'),second=q.dialog('chat-dialog'),pond=q.dialog('pond-view'),watched=watchWindows(q.doc,q.win.MutationObserver);
 second.showModal();first.showModal();pond.show();
 assert.equal(watched.top(),first,'opened last');assert.equal(watchWindows(q.doc,undefined).top(),second,'page order');
});
// The pond and the lake (public/pond-ui.js) open with show, under any window opened with showModal; their own Escape closes the fish
// book first, then the pond (gliding shut: .is-closing, no longer open). A window over the pond (a level-up after a catch) goes first.
// Review (13 Oct 2026): a Back during the pond's glide says true and does nothing, so a quick second Back does not leave the game; and
// the pond acts on Escape's keydown only (its keyup closed the pond too: one Escape shut the book and the pond, or a window and the pond).
test('the pond and its fish book close by their own Escape, after a window over them; a pond gliding shut is no longer open',()=>{
 const p=farm(),pond=p.dialog('pond-view'),book={hidden:true};let isOpen=false;
 const open=()=>{isOpen=true;pond.classList.delete('is-closing');pond.show();},close=()=>{isOpen=false;pond.classList.add('is-closing');};
 const key=event=>{if(!isOpen)return;if(event.key==='Escape'){if(event.type!=='keydown'||modalOpen(p.doc))return;event.preventDefault();if(!book.hidden)book.hidden=true;else close();}};p.win.addEventListener('keydown',key,true);p.win.addEventListener('keyup',key,true);
 open();book.hidden=false;const levelUp=p.dialog('level-up-dialog');levelUp.showModal();
 assert.equal(p.back(),true);assert.equal(levelUp.open,false,'the level-up first');assert.equal(book.hidden,false);assert.equal(isOpen,true);
 assert.equal(p.back(),true);assert.equal(book.hidden,true,'then the fish book');assert.equal(isOpen,true);assert.equal(pond.closes,0);
 assert.equal(p.back(),true);assert.equal(isOpen,false,'then the pond, by its own close (its glide)');assert.equal(pond.closes,0);
 assert.equal(p.back(),true,'gliding shut: a second Back is taken, so the app does not leave the game');assert.equal(pond.closes,0,'and nothing more is done');
 pond.close();assert.equal(p.back(),false,'the glide over: nothing open any more');
 open();book.hidden=false;p.body.dispatchEvent(new FakeKeyboardEvent('keyup',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(book.hidden,false,'a keyup does nothing');assert.equal(isOpen,true);
 // The pond's own rule: a window over it closes first, also with Escape on a computer.
 assert.match(read('public/pond-ui.js'),/if\(event\.key==='Escape'\)\{if\(event\.type!=='keydown'\|\|modalOpen\(document\)\)return;event\.preventDefault\(\);if\(!book\.hidden\)closeBook\(\);else close\(\);return;\}/);
 assert.match(read('public/pond-ui.js'),/import \{modalOpen\} from '\.\/windows\.js';/);
});
test('a menu inside a window closes before the window; a window that waits for the server stays open, and Back still says true',()=>{
 const p=farm(),family=p.dialog('family-dialog'),menu=new Node(family,'DETAILS');menu.open=false;
 // As public/field-picker.js and public/pretty-select.js: Escape on the open list closes the list only.
 menu.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){event.preventDefault();event.stopPropagation();menu.open=false;}});
 family.showModal();menu.open=true;p.doc.activeElement=menu;
 assert.equal(p.back(),true);assert.equal(menu.open,false);assert.equal(family.open,true);
 assert.equal(p.back(),true);assert.equal(family.open,false);
 // As public/discord-link-ui.js: no closing while the server answers (its cancel says no).
 const link=p.dialog('discord-link');let busy=true;link.addEventListener('cancel',event=>{if(busy)event.preventDefault();});link.showModal();
 assert.equal(p.back(),true);assert.equal(link.open,true,'it stays');busy=false;assert.equal(p.back(),true);assert.equal(link.open,false);
 // A page that cannot answer: false, so the app does what Back did before.
 const broken=createBack({doc:p.doc,win:p.win,windows:{top(){throw new Error('no');}}});assert.equal(broken(),false);
});
test('the farm page sets window.harvestBack; the page around it asks the farm (website, apps and portals): only true counts',async()=>{
 const game=read('public/game.js'),main=read('src/main.js'),session=read('src/farm-session.js');
 assert.match(game,/import \{ createBack,modalOpen,handheldDevice,farmRests \} from '\.\/windows\.js';/);
 assert.match(game,/\nwindow\.harvestBack=createBack\(\);\n/);
 const forward="harvestBack=()=>{try{return frame?.contentWindow?.harvestBack?.()===true;}catch{return false;}};";
 assert.ok(main.includes(`\nwindow.${forward}`),'src/main.js');assert.ok(session.includes(` win.${forward}`),'src/farm-session.js');
 // The portals' page around the farm (src/farm-session.js), as it runs.
 const frames=[],host={append(n){frames.push(n);},replaceChildren(){}},win={location:{search:'',href:'https://www.harvesttycoon.com/crazygames.html',assign(){}},history:{replaceState(){}},addEventListener(){}};
 const s=createFarmSession({supabase:{},verifiedUser:async()=>({id:'A'}),farmRequest:async()=>({profile:{player_id:'A'},state:{coins:1},serverNow:5}),fetchLeaderboard:async()=>({rows:[]}),
  createFarmPresence:()=>({dispose(){},snapshot:()=>({})}),createChatClient:()=>({dispose(){}}),host:()=>host,
  doc:{hidden:false,body:{dataset:{}},createElement(){const frame={dataset:{},contentWindow:null,remove(){frame.removed=true;}};return frame;},addEventListener(){}},win,nav:{onLine:true},timers:{setTimeout:()=>0,clearTimeout(){},setInterval:()=>0}});
 assert.equal(win.harvestBack(),false,'no farm yet');
 await s.open();const frame=frames[0],replaced=[];
 frame.contentWindow={harvestBack:()=>true,location:{replace:address=>replaced.push(address)}};
 assert.equal(win.harvestBack(),true);
 for(const answer of [()=>false,()=>'yes',()=>{throw new Error('no');}])assert.equal((frame.contentWindow.harvestBack=answer,win.harvestBack()),false);
 delete frame.contentWindow.harvestBack;assert.equal(win.harvestBack(),false,'a farm page still loading');
 // A trip takes the frame's own place in the history: no new step for Back to go back to.
 await win.harvestBridge.travel('village');assert.deepEqual(replaced,['/farm.html?world=village']);assert.equal(frame.src,'/farm.html','the frame was not sent through its src');
 assert.equal(frame.dataset.address,'/farm.html?world=village','where it went, for the loading watch (public/loading-screen.js)');
 await win.harvestBridge.travel('farm');assert.deepEqual(replaced,['/farm.html?world=village','/farm.html']);
 frame.contentWindow=null;await win.harvestBridge.travel('village');assert.equal(frame.src,'/farm.html?world=village','no window to send: its src, as before');
 // Without a page around it (a test stage) the farm page travels by replacing itself as well.
 assert.match(game,/else location\.replace\(location\.pathname\+\(to==='village'\|\|to==='harbour'\?`\?world=\$\{to\}`:''\)\);\};/);
 assert.doesNotMatch(game,/location\.search=to==='village'/);
});

// The GPU stalls (13 Oct 2026, Android vitals): on phones, tablets and the apps the farm is drawn once a second under a window opened
// with showModal; a computer draws as before, and the pond (opened with show) keeps its 30 frames a second.
test('the farm rests under a window only on phones, tablets and the apps: once a second instead of 30 times',()=>{
 const draws=({handheld,modal})=>{let lastDraw=0,n=0;for(let now=1000;now<4000;now+=33){if(farmRests(handheld,now-lastDraw,()=>modal))continue;lastDraw=now;n++;}return n;};
 assert.equal(FARM_REST_MS,1000);
 assert.equal(draws({handheld:true,modal:true}),3,'three seconds under Market on a phone: three pictures');
 assert.equal(draws({handheld:true,modal:false}),91,'no window: every frame (30 a second)');
 assert.equal(draws({handheld:false,modal:true}),91,'a computer: as before');
 let asked=0;farmRests(false,0,()=>{asked++;return true;});assert.equal(asked,0,'a computer never looks for a window');
 const android='Mozilla/5.0 (Linux; Android 14; SM-A055F Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 HarvestTycoonApp/1.0 PlayBilling/1';
 assert.equal(handheldDevice({ua:android,touchPoints:5,app:true}),true,'the Android app');
 assert.equal(handheldDevice({ua:'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',touchPoints:5,app:false}),true,'an Android tablet in Chrome (wide: no phone layout)');
 assert.equal(handheldDevice({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',touchPoints:5,app:false}),true);
 assert.equal(handheldDevice({ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',touchPoints:5,app:false}),true,'an iPad says Macintosh, with a touch screen');
 assert.equal(handheldDevice({ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',touchPoints:0,app:false}),false,'a Mac');
 assert.equal(handheldDevice({ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',touchPoints:10,app:false}),false,'a Windows laptop with a touch screen');
 assert.equal(handheldDevice({ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HarvestTycoonApp/1.0',touchPoints:5,app:true}),true,'the iPhone app');
 // Only windows opened with showModal count (:modal); an older WebView that does not know :modal draws as before.
 assert.equal(modalOpen({querySelector:selector=>selector==='dialog:modal'?{}:null}),true);assert.equal(modalOpen({querySelector:()=>null}),false);
 assert.equal(modalOpen({querySelector:()=>{throw new SyntaxError(':modal');}}),false);
});
test('public/game.js frame(): the farm rests after its 500 ms tick and before it is drawn; a new size is drawn at once',()=>{
 const game=read('public/game.js'),frame=game.slice(game.indexOf('function frame(now){'),game.indexOf('function registerAgentTools('));
 const rest="if(farmRests(handheld||mobileLayout.matches,now-lastDraw,modalOpen))return;lastDraw=now;";
 assert.ok(frame.includes(rest));
 assert.ok(frame.indexOf('lastTick=now;}')<frame.indexOf(rest),'the tick (timers, labels, crops) still runs every 500 ms');
 assert.ok(frame.indexOf(rest)<frame.indexOf('if(!reducedMotion){')&&frame.indexOf(rest)<frame.indexOf('renderer.render(scene,camera);'),'no animation step and no picture while it rests');
 assert.ok(frame.indexOf('pond?.tick(now,dt);')<frame.indexOf(rest),'the pond is never held up');
 assert.match(game,/\nconst handheld=handheldDevice\(\);/);assert.match(game,/lastTick=0,lastFrame=0,lastDraw=0;/);
 assert.match(game,/renderer\.setSize\(width,height\);viewportWidth=width;viewportHeight=height;lastDraw=0;\}/,'a resize clears the canvas: drawn again at once');
});
