import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarmAudio,RESUME_WAIT,STILL_WAIT,MAKE_TRIES} from '../public/farm-audio.js';
import {CUE_ORDER,CUE_VARIANTS} from '../public/sound-kit.js';
// 11 Oct 2026: a player's iPhone app (home screen) went silent after a trip to the village and back, until the app was restarted.
// On iOS a resume() can wait for good, a context can stay 'interrupted' or 'suspended', can say 'running' with its clock standing still,
// and making one can fail. These fakes do each of those; the sound must come back on a later tap, and never where it may not play.
const settle=()=>new Promise(resolve=>setImmediate(resolve));
class Param{value=0;setValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node{
 gain=new Param();frequency=new Param();playbackRate=new Param();threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param();started=false;stopped=false;
 connect(){return this;}disconnect(){this.disconnected=true;}start(when,offset=0){this.started=true;this.offset=offset;}stop(at){if(at===undefined){this.stopped=true;this.onended?.();}else this.stopAt=at;}
}
// mode, how resume() answers: 'ok' runs; 'never' waits for good (WebKit's parked promise) in stuckIn ('suspended' or 'interrupted');
// 'idle' settles but stays suspended; 'reject' fails; 'still' says 'running' while its clock never moves. statechange comes as a task.
class Context{
 constructor(mode='ok',stuckIn='suspended'){this.mode=mode;this.stuckIn=stuckIn;}
 state='suspended';currentTime=0;destination=new Node();sources=[];gains=[];resumes=0;closes=0;
 createGain(){const n=new Node();this.gains.push(n);return n;}
 createOscillator(){const n=new Node();this.sources.push(n);return n;}
 createBufferSource(){const n=new Node();this.sources.push(n);return n;}
 createDynamicsCompressor(){return new Node();}
 createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}
 resume(){
  this.resumes++;if(this.state==='closed')return Promise.reject(Error('closed'));
  if(this.mode==='ok'||this.mode==='still'){this.go('running');return Promise.resolve();}
  if(this.mode==='idle')return Promise.resolve();
  if(this.mode==='reject')return Promise.reject(Error('device'));
  this.go(this.stuckIn);return new Promise(()=>{});
 }
 suspend(){if(this.state!=='closed')this.go('suspended');return Promise.resolve();}
 close(){this.closes++;this.go('closed');return Promise.resolve();}
 go(state){if(this.state===state||this.state==='closed')return;this.state=state;setImmediate(()=>this.onstatechange?.());}
}
// A page (document or window) whose events are trusted, like a real tap.
function page(){
 const on=new Map();
 return {hidden:false,on,addEventListener(type,fn){on.set(type,[...(on.get(type)??[]),fn]);},removeEventListener(type,fn){on.set(type,(on.get(type)??[]).filter(f=>f!==fn));},
  fire(type,props={}){for(const fn of on.get(type)??[])fn({type,isTrusted:true,...props});}};
}
// One farm.html document. plans: how each context it makes behaves, in turn ('throw': the browser will not make one).
function farm(plans=[]){
 const doc=page(),win=page(),made=[],loads=[];let now=0,asked=0,rendered=0,changes=0;
 const audio=createFarmAudio({clock:()=>now,documentRef:doc,windowRef:win,storage:{getItem:()=>null,setItem(){}},onChange:()=>changes++,
  contextFactory:()=>{asked++;const plan=plans.length?plans.shift():'ok';if(plan==='throw')throw Error('busy');const c=new Context(...[plan].flat());made.push(c);return c;},
  renderSounds:(w,accept)=>{rendered++;for(const k of CUE_ORDER)for(let v=0;v<(CUE_VARIANTS[k]??1);v++)accept(k,v,new Float32Array(64),8000);},
  loadMusic:(context,track)=>{loads.push(track.id);return Promise.resolve({duration:144});}});
 const ctx=()=>made.at(-1);
 return {audio,doc,win,made,loads,ctx,asked:()=>asked,rendered:()=>rendered,changes:()=>changes,
  // A finger on the screen: pointerdown (not a gesture for touch), pointerup, touchend and click.
  async tap(){for(const type of ['pointerdown','pointerup'])doc.fire(type,{pointerType:'touch'});doc.fire('touchend');doc.fire('click');await settle();await settle();},
  // Time goes by; a context that runs moves its clock (one that is 'still' does not).
  wait(ms){now+=ms;for(const c of made)if(c.state==='running'&&c.mode!=='still')c.currentTime+=ms/1000;},
  async hide(){doc.hidden=true;doc.fire('visibilitychange');await settle();},
  async show(){doc.hidden=false;doc.fire('visibilitychange');await settle();await settle();},
  live:()=>made.filter(c=>c.state!=='closed'),
  music:(c=ctx())=>c.sources.filter(n=>n.loop&&n.started&&!n.stopped&&n.stopAt===undefined),
  mixed:(c=ctx())=>c.gains[0].gain.value===.55,
  heard(c=ctx()){return c.state==='running'&&this.mixed(c)&&this.music(c).length===1&&audio.play('harvest');}};
}
test('a resume() that never settles does not hold the next taps back: each tap asks again, and a fresh context takes over after RESUME_WAIT',async()=>{
 assert.equal(RESUME_WAIT,1000);
 const s=farm(['never']);await s.tap();
 const first=s.ctx();assert.equal(s.made.length,1,'one tap (pointerup, touchend, click) makes one context');assert.equal(first.state,'suspended');
 assert.equal(s.audio.play('harvest'),false);const asked=first.resumes;assert.ok(asked>=1);
 s.wait(400);await s.tap();assert.equal(s.made.length,1,'not replaced yet');assert.ok(first.resumes>asked,'but asked again: the old wait does not block');
 s.wait(RESUME_WAIT);await s.tap();
 assert.equal(s.made.length,2);assert.equal(first.state,'closed');assert.equal(first.closes,1);assert.equal(first.onstatechange,null);
 assert.deepEqual(s.live(),[s.ctx()],'one live context');assert.ok(s.heard(),'music and game sounds are back');
 assert.equal(s.rendered(),1,'the effects were rendered once');assert.deepEqual(s.loads,['hayride-hop']);
 await s.tap();s.wait(5000);await s.tap();assert.equal(s.made.length,2,'a context that runs stays');s.audio.dispose();
});
test('a context stuck "interrupted" comes back by itself when the interruption ends; one that stays interrupted is replaced on a later tap',async()=>{
 const s=farm([['never','interrupted']]);await s.tap();
 assert.equal(s.ctx().state,'interrupted');assert.equal(s.audio.play('harvest'),false);
 s.ctx().go('running');await settle();await settle();await settle();
 assert.equal(s.made.length,1);assert.ok(s.heard(),'the mix and the music come back without a tap');s.audio.dispose();
 const t=farm([['never','interrupted'],'ok']);await t.tap();t.wait(RESUME_WAIT);await t.tap();
 assert.equal(t.made.length,2);assert.equal(t.made[0].state,'closed');assert.ok(t.heard());
 // A call while playing: 'interrupted', then back by itself, with the same music where it was.
 const bed=t.music()[0];t.ctx().go('interrupted');await settle();assert.equal(t.audio.play('sell'),false);
 t.ctx().go('running');await settle();await settle();t.wait(500);assert.deepEqual(t.music(),[bed],'the music goes on, not started again');assert.ok(t.audio.play('sell'));
 await t.tap();t.wait(2*STILL_WAIT);await t.tap();   // a tap hears its clock move: the next replacement waits 1 s again
 // One that does not end: the first tap asks again, a tap after RESUME_WAIT replaces it.
 t.ctx().mode='never';t.ctx().stuckIn='interrupted';t.ctx().go('interrupted');await settle();
 await t.tap();assert.equal(t.made.length,2);t.wait(RESUME_WAIT);await t.tap();assert.equal(t.made.length,3);assert.equal(t.made[1].state,'closed');assert.ok(t.heard());
 assert.deepEqual(t.live(),[t.ctx()]);t.audio.dispose();
});
test('a context that stays suspended after a tap\'s resume is closed and replaced on the next tap, keeping the rendered effects and the music\'s place',async()=>{
 const s=farm();await s.tap();const a=s.ctx();assert.ok(s.heard());
 const harvest=a.sources.filter(n=>!n.loop).at(-1).buffer,track=s.music()[0].buffer;assert.ok(harvest&&track);
 s.wait(30000);await s.hide();assert.equal(a.state,'suspended');
 a.mode='idle';await s.show();assert.equal(a.state,'suspended','back in view: asked without a tap, still suspended');assert.equal(s.made.length,1,'never replaced without a tap');
 await s.tap();assert.equal(s.made.length,1,'the first tap asks it again');assert.equal(a.state,'suspended');
 await s.tap();assert.equal(s.made.length,2,'the next tap replaces it');assert.equal(a.state,'closed');assert.equal(a.closes,1);
 const b=s.ctx();assert.deepEqual(s.live(),[b]);assert.ok(s.heard());
 assert.equal(s.music(b)[0].buffer,track,'the music is not downloaded again');assert.equal(s.music(b)[0].offset,30,'and goes on where it was');assert.deepEqual(s.loads,['hayride-hop']);
 assert.equal(b.sources.filter(n=>!n.loop).at(-1).buffer,harvest,'the rendered effects are kept');assert.equal(s.rendered(),1);
 // A resume that fails outright (iOS 26 PWAs: "Failed to start the audio device") is replaced on the next tap too.
 const r=farm(['reject','ok']);await r.tap();assert.equal(r.made.length,1);await r.tap();assert.equal(r.made.length,2);assert.equal(r.made[0].state,'closed');assert.ok(r.heard());r.audio.dispose();
 s.audio.dispose();
});
test('a context closed behind the game is replaced on the next tap',async()=>{
 const s=farm();await s.tap();s.ctx().go('closed');await settle();assert.equal(s.audio.play('harvest'),false);
 await s.tap();assert.equal(s.made.length,2);assert.ok(s.heard());s.audio.dispose();
});
test('a context that says "running" while its clock stands still is replaced on a tap; a healthy one, or one paused while hidden, never is',async()=>{
 assert.equal(STILL_WAIT,2000);
 const s=farm(['still']);await s.tap();assert.equal(s.ctx().state,'running');
 s.wait(500);await s.tap();assert.equal(s.made.length,1);
 s.wait(STILL_WAIT);await s.tap();assert.equal(s.made.length,2,'its clock did not move');assert.equal(s.made[0].state,'closed');assert.ok(s.heard());s.audio.dispose();
 const ok=farm();await ok.tap();for(let i=0;i<20;i++){ok.wait(1500);await ok.tap();}assert.equal(ok.made.length,1);
 await ok.hide();ok.wait(60000);await ok.show();await ok.tap();ok.wait(STILL_WAIT);await ok.tap();ok.wait(STILL_WAIT);await ok.tap();
 assert.equal(ok.made.length,1,'a suspended clock stands still on purpose');assert.ok(ok.heard());ok.audio.dispose();
});
test('a device whose sound stays broken is not hammered: each replacement waits twice as long until a tap hears the clock move',async()=>{
 const s=farm(['never','never','never','ok']);await s.tap();
 s.wait(RESUME_WAIT);await s.tap();assert.equal(s.made.length,2);
 s.wait(RESUME_WAIT);await s.tap();assert.equal(s.made.length,2,'the second waits 2 s');s.wait(RESUME_WAIT);await s.tap();assert.equal(s.made.length,3);
 s.wait(2*RESUME_WAIT);await s.tap();assert.equal(s.made.length,3,'the third 4 s');s.wait(2*RESUME_WAIT);await s.tap();assert.equal(s.made.length,4);
 assert.ok(s.heard());assert.equal(s.live().length,1);
 await s.tap();s.wait(8*STILL_WAIT);await s.tap();s.ctx().mode='never';s.ctx().go('suspended');await settle();
 await s.tap();s.wait(RESUME_WAIT);await s.tap();assert.equal(s.made.length,5,'once heard working, the first wait is 1 s again');s.audio.dispose();
});
test('a context the browser would not make is made on a later tap; without Web Audio the page stops asking',async()=>{
 assert.equal(MAKE_TRIES,3);
 const s=farm(['throw','ok']);await s.tap();
 assert.equal(s.made.length,0);assert.equal(s.audio.settings().available,false,'Settings says so meanwhile');const told=s.changes();
 await s.tap();assert.equal(s.made.length,0,'not again in the same moment');
 s.wait(RESUME_WAIT);await s.tap();assert.equal(s.made.length,1);assert.equal(s.audio.settings().available,true);assert.ok(s.changes()>told,'and Settings hears it is back');assert.ok(s.heard());s.audio.dispose();
 const never=farm(Array(10).fill('throw'));for(let i=0;i<10;i++){await never.tap();never.wait(RESUME_WAIT);}
 assert.equal(never.asked(),MAKE_TRIES,'three in a row at most');assert.equal(never.audio.settings().available,false);never.audio.dispose();
 const doc=page(),bare=createFarmAudio({documentRef:doc,windowRef:page(),storage:{getItem:()=>null,setItem(){}},renderSounds:()=>()=>{}});
 for(let i=0;i<3;i++){doc.fire('pointerup',{pointerType:'touch'});await settle();}
 assert.equal(bare.settings().available,false);assert.equal(bare.play('harvest'),false);bare.dispose();
});
test('farm, village, farm: each page closes its context when it goes, and the farm\'s new page heals a first context that misbehaves',async()=>{
 for(const bad of ['never',['never','interrupted'],'idle','reject','still']){
  const home=farm();await home.tap();assert.ok(home.heard());
  home.win.fire('pagehide',{persisted:false});assert.equal(home.ctx().state,'closed');
  assert.ok(['pointerup','pointerdown','touchend','click','keydown','visibilitychange'].every(type=>!home.doc.on.get(type)?.length),'the old page listens no more');
  const village=farm();await village.tap();assert.ok(village.heard());village.win.fire('pagehide',{persisted:false});assert.equal(village.ctx().state,'closed');
  const back=farm([bad,'ok']);await back.tap();
  if(bad!=='still')assert.equal(back.audio.play('harvest'),false,`${bad}: silent at first`);
  back.wait(Math.max(RESUME_WAIT,STILL_WAIT));await back.tap();
  if(back.made.length<2){back.wait(STILL_WAIT);await back.tap();}
  assert.equal(back.made.length,2,`${bad}: replaced`);assert.equal(back.made[0].state,'closed');assert.deepEqual(back.live(),[back.ctx()],`${bad}: one live context`);
  assert.ok(back.heard(),`${bad}: the sound is back`);
  back.win.fire('pagehide',{persisted:false});assert.equal(back.live().length,0);
 }
});
test('nothing plays while hidden, with the sound off, muted from outside or after dispose, even when a stuck context comes back by itself',async()=>{
 for(const quiet of ['hidden','off','outside','disposed']){
  const s=farm([['never','interrupted']]);await s.tap();const a=s.ctx();
  if(quiet==='hidden')await s.hide();else if(quiet==='off')s.audio.setSettings({enabled:false});else if(quiet==='outside')s.audio.muteFromOutside(true);else s.audio.dispose();
  a.go('running');await settle();await settle();await settle();
  assert.notEqual(a.state,'running',`${quiet}: suspended or closed again`);assert.equal(s.music(a).length,0,quiet);assert.equal(a.gains[0].gain.value,0,quiet);
  assert.equal(s.audio.play('harvest'),false,quiet);assert.equal(s.audio.snip(0),false,quiet);
  s.wait(10*RESUME_WAIT);assert.equal(await s.audio.unlock(),false,quiet);await s.tap();
  assert.equal(s.made.length,1,`${quiet}: no new context`);assert.equal(s.music(a).length,0);
  s.audio.dispose();
 }
});
test('a resume asked without a tap (the app back in view) that never settles does not block the next tap',async()=>{
 const s=farm();await s.tap();await s.hide();s.ctx().mode='never';await s.show();
 assert.equal(s.ctx().state,'suspended');assert.equal(s.audio.play('harvest'),false);
 s.ctx().mode='ok';await s.tap();assert.equal(s.made.length,1,'asked again on the same context');assert.ok(s.heard());s.audio.dispose();
});
test('only real taps count: a touch pointerdown or an untrusted event does not start the sound, a mouse button going down does',async()=>{
 const s=farm();s.doc.fire('pointerdown',{pointerType:'touch'});s.doc.fire('pointerup',{pointerType:'touch',isTrusted:false});s.doc.fire('click',{isTrusted:false});await settle();
 assert.equal(s.made.length,0);s.doc.fire('pointerdown',{pointerType:'mouse'});await settle();await settle();assert.ok(s.heard());s.audio.dispose();
 for(const type of ['touchend','click']){const t=farm();t.doc.fire(type);await settle();await settle();assert.ok(t.heard(),type);t.audio.dispose();}
});
