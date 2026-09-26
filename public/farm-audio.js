import {productionJobs} from './farm-state.js';
import {renderCue,CUE_VARIANTS,CUE_ORDER,SFX_RATE} from './sound-kit.js';
// Original continuous music and procedural effects. No third-party recordings.
// "Sunny Acres" (scripts/generate-farm-music.mjs, 26 Sep 2026: an upbeat folk loop in place of the calm Harvest Meadow piano).
// The same 107-second loop twice: the FLAC is lossless (every sample identical, so the seamless loop stays seamless) at under half
// the WAV's size. The WAV stays as the fallback for a browser that cannot fetch or decode the FLAC.
const MUSIC_URLS=['./assets/audio/sunny-acres.flac','./assets/audio/sunny-acres.wav'].map(path=>new URL(path,import.meta.url));
async function loadFarmMusic(context){
 let failure;
 for(const url of MUSIC_URLS){
  try{
   const response=await fetch(url);
   if(!response.ok)throw new Error('Music unavailable');
   return await context.decodeAudioData(await response.arrayBuffer());
  }catch(error){failure=error;}
 }
 throw failure;
}
// Music starts a little softer (16%, was 22%) now that Sunny Acres is livelier than the old piano; a farmer's own setting stays.
export const AUDIO_DEFAULTS=Object.freeze({enabled:true,ambience:16,effects:48});
export const AUDIO_STORAGE_KEY='harvest-tycoon-audio-v1';
export function audioSettings(value={}){
 const percent=(v,fallback)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(100,Math.round(v))):fallback;
 return {enabled:typeof value?.enabled==='boolean'?value.enabled:AUDIO_DEFAULTS.enabled,ambience:percent(value?.ambience,AUDIO_DEFAULTS.ambience),effects:percent(value?.effects,AUDIO_DEFAULTS.effects)};
}
export const SOUND_CUES=Object.freeze({
 plant:{notes:[196,294],step:.065,duration:.13,volume:.09,type:'triangle'},
 harvest:{notes:[392,523.25,659.25],step:.065,duration:.24,volume:.11},
 water:{notes:[620,820,710],step:.075,duration:.15,volume:.065,glide:.53},
 care:{notes:[523.25,783.99],step:.08,duration:.28,volume:.09},
 sell:{notes:[880,1174.66],step:.075,duration:.2,volume:.075},
 produce:{notes:[196,246.94,293.66],step:.07,duration:.15,volume:.075,type:'triangle'},
 collect:{notes:[587.33,739.99,880],step:.09,duration:.32,volume:.10},
 ready:{notes:[659.25,783.99],step:.15,duration:.38,volume:.055},
 chore:{notes:[261.63,392],step:.08,duration:.16,volume:.07,type:'triangle'},
 upgrade:{notes:[392,523.25,659.25,783.99],step:.1,duration:.35,volume:.11},
 reward:{notes:[523.25,659.25,783.99,1046.5],step:.1,duration:.38,volume:.105},
 diamond:{notes:[659.25,987.77,1318.51],step:.11,duration:.42,volume:.08},
 tractor:{notes:[98,123.47,146.83],step:.085,duration:.16,volume:.06,type:'triangle'},
 levelup:{notes:[523.25,659.25,783.99,1046.5,1318.51,1046.5],step:.14,duration:.52,volume:.12},
});
export function soundForAction(action,result,beforeLevel,afterLevel){
 if(action.type==='chore'&&result.success===false)return null;
 if(afterLevel>beforeLevel)return 'levelup';
 if(action.type==='field')return {plant:'plant',water:'water',harvest:'harvest',tend:'care'}[action.action]??null;
 if(action.type==='fields')return {plant:'plant',water:'water',harvest:'harvest',tend:'care'}[action.action]??null;
 if(action.type==='activity_work')return result.roundComplete?'reward':result.finished?'collect':{greenhouse:'water',apiary:'collect',paddock:'water',workshop:'chore'}[action.station]??'chore';
 if(['daily','checkin','beginner_claim'].includes(action.type))return result.diamonds>0?'diamond':'reward';
 return {sell:'sell',produce:'produce',collect:'collect',collect_all:'collect',upgrade:'upgrade',expand:'upgrade',quest:'reward',mastery:'reward',level_rewards:'reward',delivery:'sell',tractor:'tractor',chore:'chore',fertilize:'care',stall_collect:'sell',stall_upgrade:'upgrade',project_start:'produce',project_collect:'reward',silo_upgrade:'upgrade',buy_boost:'diamond'}[action.type]??null;
}
export function createProductionCueTracker(buildings,now){
 let previous=new Map();
 const key=(id,j)=>`${id}:${j.id??j.recipe+':'+j.startedAt}`;
 function reset(current,time){previous=new Map(Object.entries(current).flatMap(([id,b])=>productionJobs(b).map(j=>[key(id,j),j.readyAt<=time])));}
 reset(buildings,now);
 return {reset,check(current,time){let fresh=false;for(const [id,b] of Object.entries(current))for(const job of productionJobs(b)){if(previous.get(key(id,job))===false&&job.readyAt<=time)fresh=true;}reset(current,time);return fresh;}};
}
// The effects are rendered in a worker (sound-worker.js), away from the game; without workers, one cue per idle moment instead.
function renderInBackground(windowRef,accept){
 try{
  const worker=new windowRef.Worker(new URL('./sound-worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>accept(data.kind,data.variant,data.data,data.rate);worker.onerror=()=>worker.terminate();
  worker.postMessage({rate:SFX_RATE});return ()=>worker.terminate();
 }catch{
  const jobs=CUE_ORDER.flatMap(kind=>Array.from({length:CUE_VARIANTS[kind]??1},(_,variant)=>[kind,variant]));let stopped=false;
  const later=fn=>windowRef?.requestIdleCallback?windowRef.requestIdleCallback(fn,{timeout:2000}):setTimeout(fn,50);
  const next=()=>{if(stopped)return;const job=jobs.shift();if(!job)return;accept(job[0],job[1],renderCue(job[0],SFX_RATE,job[1]),SFX_RATE);later(next);};
  later(next);return ()=>{stopped=true;};
 }
}
export function createFarmAudio({contextFactory,storage,documentRef=globalThis.document,windowRef=globalThis.window,onChange=()=>{},loadMusic=loadFarmMusic,renderSounds=renderInBackground}={}){
 let settings={...AUDIO_DEFAULTS},ctx,master,ambientBus,effectBus,musicBuffer=null,musicLoading=null,bed=null,musicOffset=0,musicStartedAt=0,musicRetryAt=0,musicStatus='idle',unlocked=false,disposed=false,unavailable=false;
 let nextEffectAt=0,priorityUntil=0,resuming=null;
 const voices=new Set(),lastPlayed=new Map();
 try{storage??=windowRef?.localStorage;settings=audioSettings(JSON.parse(storage?.getItem(AUDIO_STORAGE_KEY)??'{}'));}catch{}
 const active=()=>!disposed&&unlocked&&settings.enabled&&!documentRef?.hidden;
 const read=()=>({...settings,available:!unavailable,musicStatus});
 function ramp(param,value,seconds=.08){const t=ctx.currentTime;param.cancelScheduledValues(t);param.setTargetAtTime(value,t,seconds);}
 function stopVoice(v){try{v.source.stop();}catch{}v.cleanup();}
 function stopBed(){
  if(!bed)return;
  if(musicBuffer)musicOffset=(musicOffset+Math.max(0,ctx.currentTime-musicStartedAt))%musicBuffer.duration;
  for(const node of bed){try{node.stop?.();node.disconnect();}catch{}}bed=null;
 }
 function silence(){
  if(!ctx)return;master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(0,ctx.currentTime);stopBed();for(const v of [...voices])stopVoice(v);
  nextEffectAt=0;priorityUntil=0;lastPlayed.clear();
  if(ctx.state!=='closed')Promise.resolve(ctx.suspend()).catch(()=>{});
 }
 function makeContext(){
  const AudioContext=windowRef?.AudioContext??windowRef?.webkitAudioContext;
  ctx=contextFactory?contextFactory():new AudioContext();
  master=ctx.createGain();master.gain.value=0;
  const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-16;compressor.knee.value=12;compressor.ratio.value=8;compressor.attack.value=.006;compressor.release.value=.18;
  ambientBus=ctx.createGain();ambientBus.gain.value=0;effectBus=ctx.createGain();effectBus.gain.value=settings.effects/100;
  ambientBus.connect(compressor);effectBus.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
  prepareSounds();
 }
 // The effects themselves (sound-kit.js: soil, water, leaves, coins, wood, bells), rendered in the background once the sound is on.
 // Until a cue is ready (a second or two), or if it cannot be made, it plays its plain notes (SOUND_CUES).
 // A cue with several versions (the tractor) plays them in turn.
 const rendered=new Map(),turns=new Map();let stopRendering=null;
 function prepareSounds(){
  if(stopRendering)return;
  stopRendering=renderSounds(windowRef,(kind,variant,data,rate)=>{if(!ctx||disposed)return;try{const buffer=ctx.createBuffer(1,data.length,rate);buffer.getChannelData(0).set(data);rendered.set(`${kind}:${variant}`,buffer);}catch{}})??(()=>{});
 }
 function sample(kind,when){
  const variant=(turns.get(kind)??0)%(CUE_VARIANTS[kind]??1),buffer=rendered.get(`${kind}:${variant}`);turns.set(kind,variant+1);
  if(!buffer)return false;
  if(voices.size>=16)return true;
  const source=ctx.createBufferSource(),voice={source,cleanup:()=>{voices.delete(voice);source.disconnect();}};
  source.buffer=buffer;source.connect(effectBus);source.onended=voice.cleanup;voices.add(voice);source.start(when);return true;
 }
 // Every short voice disconnects when it ends; rapid actions cannot pile up.
 function note(frequency,when,duration,volume,bus,type='sine',glide=1){
  if(voices.size>=16)return;
  const source=ctx.createOscillator(),gain=ctx.createGain(),voice={source,cleanup:()=>{voices.delete(voice);source.disconnect();gain.disconnect();}};
  source.type=type;source.frequency.setValueAtTime(frequency,when);
  if(glide!==1)source.frequency.exponentialRampToValueAtTime(frequency*glide,when+duration);
  gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(volume,when+.014);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
  source.connect(gain);gain.connect(bus);source.onended=voice.cleanup;voices.add(voice);source.start(when);source.stop(when+duration+.02);
 }
 function startBed(){
  if(bed||!active()||!settings.ambience||ctx.state!=='running')return;
  if(!musicBuffer){
   if(musicLoading||Date.now()<musicRetryAt)return;
   musicStatus='loading';onChange(read());
   musicLoading=Promise.resolve().then(()=>loadMusic(ctx)).then(buffer=>{
    if(disposed)return;
    if(!buffer||!Number.isFinite(buffer.duration)||buffer.duration<=0)throw new Error('Invalid music');
    musicBuffer=buffer;musicStatus='ready';onChange(read());startBed();
   }).catch(()=>{if(!disposed){musicStatus='unavailable';musicRetryAt=Date.now()+15000;onChange(read());}}).finally(()=>{musicLoading=null;});
   return;
  }
  // One sample-accurate loop: release tails already wrap in the WAV. No end fade,
  // restart timers, compressed padding or silent gap between repeats.
  const music=ctx.createBufferSource(),gain=ctx.createGain();
  music.buffer=musicBuffer;music.loop=true;music.loopStart=0;music.loopEnd=musicBuffer.duration;
  gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.setTargetAtTime(1,ctx.currentTime,.4);
  music.connect(gain);gain.connect(ambientBus);musicStartedAt=ctx.currentTime;
  music.start(0,musicOffset);bed=[music,gain];
 }
 function applyMix(fadeIn=false){
  ramp(effectBus.gain,settings.effects/100);ramp(ambientBus.gain,settings.ambience/100,fadeIn?.75:.15);ramp(master.gain,.55,fadeIn?.3:.05);
  if(settings.ambience)startBed();else stopBed();
 }
 function unlock(){
  if(disposed||!settings.enabled||documentRef?.hidden||unavailable)return Promise.resolve(false);
  unlocked=true;
  try{
   const first=!ctx;if(!ctx)makeContext();
   if(ctx.state==='running'){applyMix(first);return Promise.resolve(true);}
   if(resuming)return resuming;
   resuming=Promise.resolve(ctx.resume()).then(()=>{if(!active()){silence();return false;}applyMix(true);return ctx.state==='running';}).catch(()=>false).finally(()=>{resuming=null;});return resuming;
  }catch{unavailable=true;onChange(read());return Promise.resolve(false);}
 }
 function play(kind){
  const cue=SOUND_CUES[kind];if(!cue||!active()||!settings.effects||ctx?.state!=='running')return false;
  const now=ctx.currentTime,isLevel=kind==='levelup';
  if(now-(lastPlayed.get(kind)??-Infinity)<(isLevel?1.4:.18)||(!isLevel&&(now<nextEffectAt||now<priorityUntil)))return false;
  try{
   if(isLevel){for(const v of [...voices])stopVoice(v);priorityUntil=now+1.4;ramp(ambientBus.gain,settings.ambience/100*.35,.08);ambientBus.gain.setTargetAtTime(settings.ambience/100,now+1.4,.5);}
   lastPlayed.set(kind,now);nextEffectAt=now+.14;
   if(!sample(kind,now+.015))cue.notes.forEach((f,i)=>note(f,now+.015+i*cue.step,cue.duration,cue.volume,effectBus,cue.type??'sine',cue.glide??1));return true;
  }catch{return false;}
 }
 function setSettings(next){
  settings=audioSettings({...settings,...next});try{storage?.setItem(AUDIO_STORAGE_KEY,JSON.stringify(settings));}catch{}
  onChange(read());
  if(!settings.enabled){silence();return;}
  if(unlocked)void unlock();
 }
 function gesture(event){if(event.isTrusted&&(event.type!=='keydown'||['Enter',' ','1','2','3','4'].includes(event.key)))void unlock();}
 function visibility(){if(documentRef.hidden)silence();else if(unlocked)void unlock();}
 function pagehide(event){if(event.persisted)silence();else dispose();}
 function pageshow(event){if(event.persisted&&unlocked)void unlock();}
 function dispose(){if(disposed)return;disposed=true;stopRendering?.();silence();documentRef?.removeEventListener('pointerup',gesture,true);documentRef?.removeEventListener('keydown',gesture,true);documentRef?.removeEventListener('visibilitychange',visibility);windowRef?.removeEventListener('pagehide',pagehide);windowRef?.removeEventListener('pageshow',pageshow);musicBuffer=null;if(ctx&&ctx.state!=='closed')Promise.resolve(ctx.close()).catch(()=>{});}
 documentRef?.addEventListener('pointerup',gesture,true);documentRef?.addEventListener('keydown',gesture,true);documentRef?.addEventListener('visibilitychange',visibility);windowRef?.addEventListener('pagehide',pagehide);windowRef?.addEventListener('pageshow',pageshow);
 return {settings:read,setSettings,unlock,play,dispose};
}

export function withActionSounds(runAction,getLevel,play){
 return async action=>{
  const before=getLevel(),result=await runAction(action);
  try{const cue=soundForAction(action,result,before,getLevel());if(cue)play(cue);}catch{/* Sound must not turn a successful save into an error. */}
  return result;
 };
}
