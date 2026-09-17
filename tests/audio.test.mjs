import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarmAudio,AUDIO_DEFAULTS,AUDIO_STORAGE_KEY,audioSettings,soundForAction,withActionSounds,createProductionCueTracker,SOUND_CUES} from '../public/farm-audio.js';
class Param{
 value=0;events=[];
 setValueAtTime(v,t){assert(Number.isFinite(v));this.value=v;this.events.push(['set',v,t]);}
 setTargetAtTime(v,t,c){assert(Number.isFinite(v));this.value=v;this.events.push(['target',v,t,c]);}
 linearRampToValueAtTime(v,t){this.setValueAtTime(v,t);}
 exponentialRampToValueAtTime(v,t){assert(v>0);this.setValueAtTime(v,t);}
 cancelScheduledValues(t){this.events.push(['cancel',t]);}
}
class Node{
 gain=new Param();frequency=new Param();Q=new Param();threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param();stopped=false;disconnected=false;started=false;
 connect(){return this;}disconnect(){this.disconnected=true;}start(){this.started=true;}stop(at){this.stopAt=at;if(at===undefined){this.stopped=true;this.onended?.();}}
}
class Context{
 state='suspended';currentTime=1;sampleRate=8000;destination=new Node();oscillators=[];buffers=[];gains=[];
 createGain(){const n=new Node();this.gains.push(n);return n;}
 createOscillator(){const n=new Node();this.oscillators.push(n);return n;}
 createDynamicsCompressor(){return new Node();}createBiquadFilter(){return new Node();}
 createBufferSource(){const n=new Node();this.buffers.push(n);return n;}
 createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}
 async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}
}
function setup(saved){
 const doc=new EventTarget();doc.hidden=false;const win=new EventTarget(),ctx=new Context(),timers=new Map(),writes=[];let created=0,id=0;
 const audio=createFarmAudio({contextFactory:()=>{created++;return ctx;},storage:{getItem:()=>saved??null,setItem:(...args)=>writes.push(args)},documentRef:doc,windowRef:win,setTimer:fn=>{timers.set(++id,fn);return id;},clearTimer:key=>timers.delete(key)});
 return {audio,doc,win,ctx,timers,writes,created:()=>created};
}
test('quiet defaults, validation and a saved mute preference are respected before any gesture',async()=>{
 assert.deepEqual(audioSettings({ambience:Infinity,effects:-20,enabled:'yes'}),{enabled:true,ambience:22,effects:0});
 assert.deepEqual(audioSettings(null),AUDIO_DEFAULTS);
 const s=setup(JSON.stringify({enabled:false,ambience:10,effects:35}));assert.equal(s.created(),0);assert.equal(await s.audio.unlock(),false);assert.equal(s.created(),0);assert.equal(s.audio.play('levelup'),false);
 s.audio.setSettings({enabled:true});await s.audio.unlock();assert.equal(s.created(),1);assert.equal(s.ctx.state,'running');assert.equal(s.writes[0][0],AUDIO_STORAGE_KEY);assert.equal(s.audio.settings().effects,35);s.audio.dispose();
});
test('ambience starts once, sliders have separate buses, and mute stops sources and bird timers',async()=>{
 const s=setup();assert.equal(s.timers.size,0);await s.audio.unlock();await s.audio.unlock();assert.equal(s.created(),1);assert.equal(s.ctx.buffers.length,1);assert.equal(s.timers.size,1);
 s.audio.setSettings({ambience:0,effects:77});assert.equal(s.ctx.buffers[0].stopped,true);assert.equal(s.timers.size,0);assert.equal(s.ctx.gains[2].gain.value,.77);assert.equal(s.audio.play('harvest'),true);
 s.audio.setSettings({enabled:false});assert.equal(s.ctx.state,'suspended');assert(s.ctx.oscillators.every(n=>n.stopped&&n.disconnected));assert.equal(s.audio.play('levelup'),false);s.audio.dispose();
});
test('hidden tabs suspend and clear effects; returning fades ambience back without a sound backlog',async()=>{
 const s=setup();await s.audio.unlock();s.audio.play('harvest');s.doc.hidden=true;s.doc.dispatchEvent(new Event('visibilitychange'));
 assert.equal(s.ctx.state,'suspended');assert.equal(s.timers.size,0);assert.equal(s.audio.play('reward'),false);const count=s.ctx.oscillators.length;
 s.doc.hidden=false;s.doc.dispatchEvent(new Event('visibilitychange'));await Promise.resolve();await Promise.resolve();assert.equal(s.ctx.state,'running');assert.equal(s.ctx.oscillators.length,count);assert.equal(s.timers.size,1);s.audio.dispose();assert.equal(s.ctx.state,'closed');assert.equal(s.timers.size,0);
});
test('fast actions are throttled, level-up takes priority, and completed nodes are disconnected',async()=>{
 const s=setup();await s.audio.unlock();assert(s.audio.play('harvest'));assert.equal(s.audio.play('harvest'),false);assert(s.audio.play('levelup'));assert.equal(s.audio.play('sell'),false);
 assert(s.ctx.oscillators.slice(0,3).every(n=>n.stopped));for(const n of s.ctx.oscillators)n.onended?.();assert(s.ctx.oscillators.every(n=>n.disconnected));s.ctx.currentTime+=2;assert(s.audio.play('water'));s.audio.dispose();
});
test('successful actions have one cue and failures, unknown actions and refreshes have none',async()=>{
 let level=1;const sounds=[];const run=withActionSounds(async action=>{if(action.type==='bad')throw Error('Rejected');if(action.level)level=action.level;return {coins:8};},()=>level,s=>sounds.push(s));
 await run({type:'sell'});await run({type:'field',action:'harvest',level:3});await run({type:'activity_start'});await assert.rejects(run({type:'bad'}),/Rejected/);assert.deepEqual(sounds,['sell','levelup']);
 const safe=withActionSounds(async()=>({saved:true}),()=>1,()=>{throw Error('Audio failed');});assert.deepEqual(await safe({type:'collect'}),{saved:true});
 assert.equal(soundForAction({type:'daily'},{diamonds:2},1,1),'diamond');assert.equal(soundForAction({type:'activity_work',station:'paddock'},{finished:false},1,1),'water');assert.equal(soundForAction({type:'activity_work'},{roundComplete:true},1,1),'reward');
});
test('production completion gives one gentle cue, not repeated or login catch-up alerts',()=>{
 const b={mill:{job:{recipe:'feed',startedAt:1,readyAt:1000}},bakery:{job:{recipe:'bread',startedAt:2,readyAt:1000}}},tracker=createProductionCueTracker(b,900);
 assert.equal(tracker.check(b,1000),true);assert.equal(tracker.check(b,2000),false);
 const loaded=createProductionCueTracker(b,2000);assert.equal(loaded.check(b,2100),false);
 b.mill.job={recipe:'feed',startedAt:2200,readyAt:3000};assert.equal(tracker.check(b,2300),false);tracker.reset(b,3100);assert.equal(tracker.check(b,3200),false);
});
test('storage failure and missing audio support do not interrupt the game',async()=>{
 const a=createFarmAudio({storage:{getItem(){throw Error();},setItem(){throw Error();}},contextFactory:()=>{throw Error('Unavailable');},windowRef:new EventTarget(),documentRef:new EventTarget()});
 assert.equal(await a.unlock(),false);assert.equal(a.settings().available,false);assert.doesNotThrow(()=>a.setSettings({enabled:false}));assert.equal(a.play('levelup'),false);a.dispose();
});
test('returning from browser history restarts a single ambience layer',async()=>{
 const s=setup();await s.audio.unlock();const hide=new Event('pagehide');hide.persisted=true;s.win.dispatchEvent(hide);assert.equal(s.ctx.state,'suspended');
 const show=new Event('pageshow');show.persisted=true;s.win.dispatchEvent(show);await Promise.resolve();await Promise.resolve();assert.equal(s.ctx.state,'running');assert.equal(s.created(),1);assert.equal(s.timers.size,1);s.audio.dispose();
});
test('effects stay brief with soft envelopes and moderate frequencies',()=>{
 for(const cue of Object.values(SOUND_CUES)){assert(cue.volume<=.12);assert(cue.notes.length<=6);assert(cue.duration+(cue.notes.length-1)*cue.step<1.3);for(const f of cue.notes)assert(f>=90&&f<1600);}
});
test('rapid successful actions keep the voice count bounded until old notes finish',async()=>{
 const s=setup();await s.audio.unlock();for(let i=0;i<100;i++){s.ctx.currentTime+=.2;s.audio.play('harvest');}
 assert(s.ctx.oscillators.length<=16);assert(s.ctx.oscillators.length>0);s.audio.dispose();assert(s.ctx.oscillators.every(n=>n.disconnected));
});
test('muting during a pending browser resume cannot restart the background',async()=>{
 let resolve;const ctx=new Context();ctx.resume=()=>new Promise(r=>{resolve=()=>{ctx.state='running';r();};});
 const doc=new EventTarget();doc.hidden=false;const audio=createFarmAudio({contextFactory:()=>ctx,storage:{getItem:()=>null,setItem(){}},windowRef:new EventTarget(),documentRef:doc});
 const unlocking=audio.unlock();audio.setSettings({enabled:false});resolve();assert.equal(await unlocking,false);assert.equal(ctx.state,'suspended');assert.equal(ctx.buffers.length,0);audio.dispose();
});
