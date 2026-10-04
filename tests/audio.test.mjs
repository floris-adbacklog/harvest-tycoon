import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
import {createFarmAudio,AUDIO_DEFAULTS,AUDIO_STORAGE_KEY,MUSIC_TRACKS,MUSIC_PAD,audioSettings,soundForAction,withActionSounds,createProductionCueTracker,SOUND_CUES} from '../public/farm-audio.js';
import {CUE_ORDER,CUE_VARIANTS} from '../public/sound-kit.js';
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
 connect(){return this;}disconnect(){this.disconnected=true;}start(when,offset=0){this.started=true;this.offset=offset;this.startedAt=when;}stop(at){this.stopAt=at;if(at===undefined){this.stopped=true;this.onended?.();}}
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
function setup(saved,loader,{loadPreview}={}){
 const doc=new EventTarget();doc.hidden=false;const win=new EventTarget(),ctx=new Context(),writes=[];let created=0,loads=0,renderedFor=0;
 const audio=createFarmAudio({contextFactory:()=>{created++;return ctx;},storage:{getItem:()=>saved??null,setItem:(...args)=>writes.push(args)},documentRef:doc,windowRef:win,renderSounds:(w,accept)=>{renderedFor++;for(const k of CUE_ORDER)for(let v=0;v<(CUE_VARIANTS[k]??1);v++)accept(k,v,new Float32Array(64),8000);},loadMusic:(context,track)=>{loads++;return loader?loader(context,track):Promise.resolve({duration:144});},loadPreview});
 // Music loops; the effects (sound-kit.js buffers, or plain oscillator notes as the fallback) do not.
 const music=()=>ctx.buffers.filter(n=>n.loop),effects=()=>[...ctx.oscillators,...ctx.buffers.filter(n=>!n.loop)];
 return {audio,doc,win,ctx,writes,music,effects,created:()=>created,loads:()=>loads,renderedFor:()=>renderedFor};
}
test('quiet defaults, validation and a saved mute preference are respected before any gesture',async()=>{
 assert.deepEqual(audioSettings({ambience:Infinity,effects:-20,enabled:'yes',music:'farm-radio'}),{enabled:true,ambience:12,effects:0,music:'hayride-hop'});
 assert.deepEqual(audioSettings(null),AUDIO_DEFAULTS);
 const s=setup(JSON.stringify({enabled:false,ambience:10,effects:35}));assert.equal(s.created(),0);assert.equal(await s.audio.unlock(),false);assert.equal(s.created(),0);assert.equal(s.audio.play('levelup'),false);
 s.audio.setSettings({enabled:true});await s.audio.unlock();assert.equal(s.created(),1);assert.equal(s.ctx.state,'running');assert.equal(s.writes[0][0],AUDIO_STORAGE_KEY);assert.equal(s.audio.settings().effects,35);s.audio.dispose();
});
test('music loads once and loops without restarting on actions or volume changes',async()=>{
 const s=setup();assert.equal(s.loads(),0);await s.audio.unlock();await settle();await s.audio.unlock();
 assert.equal(s.created(),1);assert.equal(s.loads(),1);assert.equal(s.music().length,1);
 const source=s.music()[0];assert(source.loop);assert.equal(source.loopStart,0);assert.equal(source.loopEnd,144);assert.equal(source.offset,0);assert.equal(source.stopAt,undefined);
 s.audio.setSettings({ambience:35,effects:77});s.audio.play('harvest');await settle();assert.equal(s.music().length,1);assert.equal(s.effects().length,1,'one buffer for the richer harvest sound');assert.equal(s.ctx.gains[2].gain.value,.77);
 s.ctx.currentTime+=37;s.audio.setSettings({ambience:0});assert(source.stopped&&source.disconnected);
 s.audio.setSettings({ambience:22});await settle();assert.equal(s.music()[1].offset,37);assert.equal(s.loads(),1);
 s.audio.setSettings({enabled:false});assert.equal(s.ctx.state,'suspended');assert(s.effects().every(n=>n.stopped&&n.disconnected));assert.equal(s.audio.play('levelup'),false);s.audio.dispose();
});
test('hidden tabs suspend, then resume the same music position without an effect backlog',async()=>{
 const s=setup();await s.audio.unlock();await settle();s.audio.play('harvest');s.ctx.currentTime+=151;s.doc.hidden=true;s.doc.dispatchEvent(new Event('visibilitychange'));
 assert.equal(s.ctx.state,'suspended');assert(s.music()[0].stopped);assert.equal(s.audio.play('reward'),false);const count=s.effects().length;
 s.doc.hidden=false;s.doc.dispatchEvent(new Event('visibilitychange'));await settle();assert.equal(s.ctx.state,'running');assert.equal(s.effects().length,count);assert.equal(s.music()[1].offset,7);assert.equal(s.loads(),1);s.audio.dispose();assert.equal(s.ctx.state,'closed');assert(s.ctx.buffers.every(n=>n.stopped));
});
test('fast actions are throttled, level-up takes priority, and completed nodes are disconnected',async()=>{
 const s=setup();await s.audio.unlock();assert(s.audio.play('harvest'));assert.equal(s.audio.play('harvest'),false);assert(s.audio.play('levelup'));assert.equal(s.audio.play('sell'),false);
 assert(s.effects().length>0&&s.effects().slice(0,1).every(n=>n.stopped),'the level-up stops the harvest sound');for(const n of s.effects())n.onended?.();assert(s.effects().every(n=>n.disconnected));s.ctx.currentTime+=2;assert(s.audio.play('water'));s.audio.dispose();
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
test('returning from browser history resumes a single music layer',async()=>{
 const s=setup();await s.audio.unlock();await settle();s.ctx.currentTime+=15;
 const hide=new Event('pagehide');hide.persisted=true;s.win.dispatchEvent(hide);assert.equal(s.ctx.state,'suspended');
 const show=new Event('pageshow');show.persisted=true;s.win.dispatchEvent(show);await settle();assert.equal(s.ctx.state,'running');assert.equal(s.created(),1);assert.equal(s.loads(),1);assert.equal(s.ctx.buffers[1].offset,15);s.audio.dispose();
});
test('effects stay brief with soft envelopes and moderate frequencies',()=>{
 for(const cue of Object.values(SOUND_CUES)){assert(cue.volume<=.12);assert(cue.notes.length<=6);assert(cue.duration+(cue.notes.length-1)*cue.step<1.3);for(const f of cue.notes)assert(f>=90&&f<1600);}
});
test('rapid successful actions keep the voice count bounded until old notes finish',async()=>{
 const s=setup();await s.audio.unlock();for(let i=0;i<100;i++){s.ctx.currentTime+=.2;s.audio.play('harvest');}
 assert(s.effects().length<=16);assert(s.effects().length>0);s.audio.dispose();assert(s.effects().every(n=>n.disconnected));
});
test('muting during a pending browser resume cannot restart the background',async()=>{
 let resolve;const ctx=new Context();ctx.resume=()=>new Promise(r=>{resolve=()=>{ctx.state='running';r();};});
 const doc=new EventTarget();doc.hidden=false;const audio=createFarmAudio({contextFactory:()=>ctx,storage:{getItem:()=>null,setItem(){}},windowRef:new EventTarget(),documentRef:doc});
 const unlocking=audio.unlock();audio.setSettings({enabled:false});resolve();assert.equal(await unlocking,false);assert.equal(ctx.state,'suspended');assert.equal(ctx.buffers.length,0);audio.dispose();
});

test('a pending music download cannot start playback after mute, hiding or disposal',async()=>{
 for(const action of ['mute','hide','dispose']){
  let finish;const s=setup(null,()=>new Promise(resolve=>finish=resolve));await s.audio.unlock();await settle();
  for(let i=0;i<10;i++)await s.audio.unlock();assert.equal(s.loads(),1);
  if(action==='mute')s.audio.setSettings({enabled:false});
  else if(action==='hide'){s.doc.hidden=true;s.doc.dispatchEvent(new Event('visibilitychange'));}
  else s.audio.dispose();
  finish({duration:144});await settle();assert.equal(s.ctx.buffers.length,0);s.audio.dispose();
 }
});
test('the farmer picks the music (Hayride Hop unless they choose): the choice is saved, the old track fades out, the new one starts from its beginning',async()=>{
 const loaded=[],s=setup(null,(context,track)=>{loaded.push(track.id);return Promise.resolve({buffer:{duration:200},start:.5,length:190});});
 assert.equal(s.audio.settings().music,'hayride-hop');await s.audio.unlock();await settle();
 assert.deepEqual(loaded,['hayride-hop']);const first=s.music()[0];
 assert.equal(first.loopStart,.5);assert.equal(first.loopEnd,190.5,'the loop runs between the padding');assert.equal(first.offset,.5);
 s.ctx.currentTime+=30;const at=s.ctx.currentTime;s.audio.setSettings({music:'orchard-breeze'});
 assert.equal(JSON.parse(s.writes.at(-1)[1]).music,'orchard-breeze','saved on this device');
 assert.equal(first.stopAt,at+.6,'the old track fades out and stops, never cut off mid-note');assert.equal(first.stopped,false);
 const fading=s.ctx.gains[3];assert.deepEqual(fading.gain.events.at(-1),['target',0,at,.12],'its own volume goes down first');
 await settle();await settle();
 assert.deepEqual(loaded,['hayride-hop','orchard-breeze']);const second=s.music()[1];assert.equal(second.offset,.5,'from its beginning');assert.equal(second.loopEnd,190.5);
 s.ctx.currentTime+=200;s.audio.setSettings({ambience:0});s.audio.setSettings({ambience:20});await settle();
 assert.equal(s.music()[2].offset,.5+10,'the place in the loop is counted from the loop, not the file');
 s.audio.setSettings({music:'farm-radio'});assert.equal(s.audio.settings().music,'hayride-hop','an unknown track is the default');s.audio.dispose();
});
test('a track picked while another is still loading: only the last pick plays, one track in memory at a time',async()=>{
 const waiting=[],s=setup(null,(context,track)=>new Promise(resolve=>waiting.push([track.id,resolve])));
 await s.audio.unlock();s.audio.setSettings({music:'morning-market'});s.audio.setSettings({music:'sunny-acres'});
 waiting[0][1]({duration:100});await settle();await settle();
 assert.deepEqual(waiting.map(w=>w[0]),['hayride-hop','sunny-acres'],'Morning Market was never fetched');assert.equal(s.music().length,0,'Hayride Hop arrived too late and is dropped');
 waiting[1][1]({duration:107});await settle();await settle();
 assert.equal(s.music().length,1);assert.equal(s.music()[0].loopStart,0);assert.equal(s.music()[0].loopEnd,107,'Sunny Acres is a whole-file loop');
 assert.equal(s.audio.settings().musicStatus,'ready');s.audio.dispose();
 const odd=setup(null,()=>Promise.resolve({buffer:{duration:100},start:.5,length:120}));await odd.audio.unlock();await settle();
 assert.equal(odd.music()[0].loopStart,0);assert.equal(odd.music()[0].loopEnd,100,'a loop that does not fit its file is not trusted');odd.audio.dispose();
});
test('Listen plays a track\'s preview over the farm music, which is turned down meanwhile and comes back after; Stop ends it',async()=>{
 const previews=[];let fail=false;
 const s=setup(null,null,{loadPreview:(context,track)=>{previews.push(track.id);return fail?Promise.reject(Error('Offline')):Promise.resolve({duration:20});}});
 assert.equal(await s.audio.preview('orchard-breeze'),false,'never before the sound is on');
 await s.audio.unlock();await settle();const bed=s.ctx.gains[3];assert.equal(bed.gain.value,1);
 assert.equal(await s.audio.preview('orchard-breeze'),true);assert.deepEqual(s.audio.settings().preview,{id:'orchard-breeze',status:'playing'});
 const clip=s.ctx.buffers.find(n=>!n.loop&&n.buffer?.duration===20);assert(clip.started);
 assert.equal(bed.gain.value,0,'the farm music is turned down');assert.equal(s.ctx.gains.at(-1).gain.value,AUDIO_DEFAULTS.ambience/100,'at the music volume');
 s.audio.stopPreview();assert.equal(clip.stopAt,s.ctx.currentTime+.3,'Stop really stops the sound');s.audio.setSettings({ambience:40});
 assert.equal(await s.audio.preview('orchard-breeze'),true);assert.equal(s.ctx.gains.at(-1).gain.value,.4,'the music slider sets its volume');s.ctx.buffers.filter(n=>!n.loop).at(-1).onended();s.audio.setSettings({ambience:12});
 clip.onended();assert.equal(s.audio.settings().preview,null);assert.equal(bed.gain.value,1,'and comes back when the preview ends');
 await s.audio.preview('morning-market');s.audio.stopPreview();assert.equal(s.audio.settings().preview,null);assert.equal(bed.gain.value,1);
 await s.audio.preview('morning-market');assert.deepEqual(previews,['orchard-breeze','morning-market'],'the last preview is kept, not fetched again');
 s.audio.setSettings({music:'morning-market'});assert.equal(s.audio.settings().preview,null,'picking a track ends its preview');
 s.audio.setSettings({ambience:0});await s.audio.preview('hayride-hop');assert.equal(s.ctx.gains.at(-1).gain.value,AUDIO_DEFAULTS.ambience/100,'never softer than the default music volume');
 fail=true;assert.equal(await s.audio.preview('sunny-acres'),false);assert.equal(s.audio.settings().previewFailed,'sunny-acres');assert.equal(s.audio.settings().preview,null);
 s.audio.setSettings({enabled:false});assert.equal(await s.audio.preview('hayride-hop'),false,'not while the sound is off');s.audio.dispose();
});
test('a preview that fails while the farm music is still loading never leaves the music turned down',async()=>{
 let finishMusic,failPreview;
 const s=setup(null,()=>new Promise(resolve=>{finishMusic=resolve;}),{loadPreview:()=>new Promise((resolve,reject)=>{failPreview=reject;})});
 await s.audio.unlock();const asked=s.audio.preview('morning-market');assert.deepEqual(s.audio.settings().preview,{id:'morning-market',status:'loading'});
 finishMusic({duration:100});await settle();await settle();const bed=s.ctx.gains[3];assert.equal(bed.gain.value,1,'not turned down for a preview that is only loading');
 failPreview(Error('Offline'));assert.equal(await asked,false);assert.equal(bed.gain.value,1);assert.equal(s.audio.settings().previewFailed,'morning-market');s.audio.dispose();
});
test('a track that loads after another was picked, with the music at 0 meanwhile, does not leave "loading" on screen',async()=>{
 let finish;const s=setup(null,()=>new Promise(resolve=>{finish=resolve;}));
 await s.audio.unlock();assert.equal(s.audio.settings().musicStatus,'loading');
 s.audio.setSettings({music:'orchard-breeze'});s.audio.setSettings({ambience:0});finish({duration:100});await settle();await settle();
 assert.equal(s.audio.settings().musicStatus,'idle');assert.equal(s.loads(),1,'nothing loads while the music is at 0');s.audio.dispose();
});
test('every track ships its loop and preview: AAC, small, the loop as long as the game thinks, no seam once decoded',()=>{
 assert.equal(MUSIC_TRACKS[0].id,AUDIO_DEFAULTS.music);assert.deepEqual(MUSIC_TRACKS.map(t=>t.id),['hayride-hop','morning-market','orchard-breeze','sunny-acres']);
 const file=name=>new URL(`../public/assets/audio/${name}`,import.meta.url),bytes=name=>readFileSync(file(name));
 for(const track of MUSIC_TRACKS){
  const preview=bytes(track.preview);assert.equal(preview.toString('ascii',4,8),'ftyp',`${track.id}: preview is an .m4a`);assert.ok(preview.length<400e3,`${track.id}: preview under 400 KB`);
  if(!track.length){assert.deepEqual(track.sources.map(s=>s.file),['sunny-acres.flac','sunny-acres.wav']);continue;}
  const loop=bytes(`${track.id}.m4a`),info=JSON.parse(bytes(`${track.id}.json`));
  assert.equal(loop.toString('ascii',4,8),'ftyp');assert.ok(loop.length<3e6,`${track.id}: under 3 MB`);
  assert.equal(track.length,info.frames/info.sample_rate,`${track.id}: the game loops exactly the rendered loop`);assert.equal(info.channels,1);assert.equal(info.pad_seconds,MUSIC_PAD);
  assert.ok(info.duration_seconds>=180&&info.duration_seconds<=240,`${track.id}: three to four minutes`);
  assert.ok(Math.abs(info.rms-.062)<.002&&info.peak<.4,`${track.id}: as loud as the others`);assert.ok(info.decoded_seam<.1,`${track.id}: no seam once decoded`);
  assert.deepEqual(track.sources.map(s=>s.file),[`${track.id}.m4a`,'sunny-acres.flac','sunny-acres.wav'],'a browser without AAC plays Sunny Acres');
 }
});
test('a failed music load leaves game sounds available and avoids request spam',async()=>{
 const s=setup(null,async()=>{throw Error('Offline');});await s.audio.unlock();await settle();
 assert.equal(s.audio.settings().musicStatus,'unavailable');assert(s.audio.play('harvest'));
 for(let i=0;i<10;i++)await s.audio.unlock();await settle();assert.equal(s.loads(),1);s.audio.dispose();
});
test('the shipped music loop (Sunny Acres, 48 bars at 108 BPM) has no silent windows or discontinuous seam',()=>{
 const wav=readFileSync(new URL('../public/assets/audio/sunny-acres.wav',import.meta.url));
 assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt16LE(20),1);assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(24),24000);assert.equal(wav.readUInt16LE(34),16);
 const count=(wav.length-44)/2;assert.equal(count,Math.round(48*4*60/108*24000));let peak=0,minRms=1,maxStep=0,last=0;
 for(let i=0;i+1200<=count;i+=1200){let energy=0;for(let j=i;j<i+1200;j++){const sample=wav.readInt16LE(44+j*2)/32768;energy+=sample*sample;peak=Math.max(peak,Math.abs(sample));if(j)maxStep=Math.max(maxStep,Math.abs(sample-last));last=sample;}minRms=Math.min(minRms,Math.sqrt(energy/1200));}
 assert(peak<.3);assert(minRms>.01,'no quiet gap even in a 50ms window');const seam=Math.abs(wav.readInt16LE(44)-wav.readInt16LE(wav.length-2))/32768;assert(seam<.002);assert(seam<maxStep);
});
test('the effects are real little sounds (sound-kit.js): one per cue, short, never clipping or clicking, as loud as intended',async()=>{
 const {renderCue,CUE_LENGTH,CUE_LOUDNESS,loudness}=await import('../public/sound-kit.js');
 assert.deepEqual(Object.keys(CUE_LENGTH).sort(),Object.keys(SOUND_CUES).sort(),'every cue has its sound, and the plain notes stay as the fallback');
 const {CUE_VARIANTS}=await import('../public/sound-kit.js');
 assert.equal(CUE_VARIANTS.tractor,3,'the tractor, heard all the time, has three sounds that take turns');
 for(const [kind,variant] of Object.keys(SOUND_CUES).flatMap(k=>Array.from({length:CUE_VARIANTS[k]??1},(_,v)=>[k,v]))){
  const a=renderCue(kind,24000,variant),b=renderCue(kind,24000,variant);
  assert.deepEqual(a,b,`${kind}: the same every time`);assert.ok(a.length/24000<=1.5,`${kind}: short`);
  let peak=0;for(const v of a)peak=Math.max(peak,Math.abs(v));assert.ok(peak<=.5,`${kind}: far from clipping`);
  assert.ok(Math.abs(a.at(-1))<1e-4,`${kind}: ends in silence, no click`);
  assert.ok(Math.abs(loudness(a,24000)-CUE_LOUDNESS[kind])<.004,`${kind}: as loud as intended`);
 }
 assert.ok(CUE_LOUDNESS.levelup>CUE_LOUDNESS.harvest&&CUE_LOUDNESS.harvest>CUE_LOUDNESS.plant,'big moments a little louder than small ones');
});
test('the effects are made in the background (a worker), never while the farm is drawn; until one is ready its plain notes play',async()=>{
 const s=setup();await s.audio.unlock();assert.equal(s.renderedFor(),1,'rendered once, when the sound first comes on');
 await s.audio.unlock();assert.equal(s.renderedFor(),1);s.audio.dispose();
 const audio=read('public/farm-audio.js'),worker=read('public/sound-worker.js');
 assert.doesNotMatch(audio,/renderCue\(kind,ctx\.sampleRate/,'no sound is computed on the spot any more');
 assert.match(audio,/new windowRef\.Worker\(new URL\('\.\/sound-worker\.js',import\.meta\.url\),\{type:'module'\}\)/);
 assert.match(worker,/self\.postMessage\(\{kind,variant,rate,data\},\[data\.buffer\]\)/,'handed over without copying');
 const {CUE_ORDER:order,CUE_LENGTH,SFX_RATE}=await import('../public/sound-kit.js');
 assert.deepEqual([...order].sort(),Object.keys(CUE_LENGTH).sort(),'every cue is made');assert.equal(SFX_RATE,24000);
 const quiet=setup(),notes=quiet.ctx.oscillators;
 quiet.audio.dispose();assert.equal(notes.length,0);
});
test('a chore sounds happier when it also found an extra resource',()=>{
 assert.equal(soundForAction({type:'chore',id:'weeds'},{success:true,bonus:true,coins:5},1,1),'chorebonus');
 assert.equal(soundForAction({type:'chore',id:'weeds'},{success:true,bonus:false,coins:5},1,1),'chore');
 assert.equal(soundForAction({type:'chore',id:'weeds'},{success:true,bonus:true},1,2),'levelup','a level-up still comes first');
});
