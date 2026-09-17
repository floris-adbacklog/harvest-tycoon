// Original procedural sounds: no audio downloads or third-party recordings.
export const AUDIO_DEFAULTS=Object.freeze({enabled:true,ambience:22,effects:48});
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
 if(afterLevel>beforeLevel)return 'levelup';
 if(action.type==='field')return {plant:'plant',water:'water',harvest:'harvest',tend:'care'}[action.action]??null;
 if(action.type==='activity_work')return result.roundComplete?'reward':result.finished?'collect':{greenhouse:'water',apiary:'collect',paddock:'water',workshop:'chore'}[action.station]??'chore';
 if(['daily','checkin','beginner_claim'].includes(action.type))return result.diamonds>0?'diamond':'reward';
 return {sell:'sell',produce:'produce',collect:'collect',upgrade:'upgrade',expand:'upgrade',quest:'reward',mastery:'reward',level_rewards:'reward',delivery:'sell',tractor:'tractor',chore:'chore',fertilize:'care',stall_collect:'sell',stall_upgrade:'upgrade',project_start:'produce',project_collect:'reward',silo_upgrade:'upgrade',buy_boost:'diamond'}[action.type]??null;
}
export function createProductionCueTracker(buildings,now){
 let previous=new Map();
 function reset(current,time){previous=new Map(Object.entries(current).map(([id,b])=>[id,{token:b.job?`${b.job.recipe}:${b.job.startedAt}:${b.job.readyAt}`:null,ready:!!b.job&&b.job.readyAt<=time}]));}
 reset(buildings,now);
 return {reset,check(current,time){let fresh=false;for(const [id,b] of Object.entries(current)){const job=b.job,old=previous.get(id),token=job?`${job.recipe}:${job.startedAt}:${job.readyAt}`:null;if(job&&old?.token===token&&!old.ready&&job.readyAt<=time)fresh=true;}reset(current,time);return fresh;}};
}
export function createFarmAudio({contextFactory,storage,documentRef=globalThis.document,windowRef=globalThis.window,onChange=()=>{},setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout}={}){
 let settings={...AUDIO_DEFAULTS},ctx,master,ambientBus,effectBus,noiseBuffer,bed=null,birdTimer=null,unlocked=false,disposed=false,unavailable=false;
 let nextEffectAt=0,priorityUntil=0,resuming=null;
 const voices=new Set(),lastPlayed=new Map();
 try{storage??=windowRef?.localStorage;settings=audioSettings(JSON.parse(storage?.getItem(AUDIO_STORAGE_KEY)??'{}'));}catch{}
 const active=()=>!disposed&&unlocked&&settings.enabled&&!documentRef?.hidden;
 const read=()=>({...settings,available:!unavailable});
 function ramp(param,value,seconds=.08){const t=ctx.currentTime;param.cancelScheduledValues(t);param.setTargetAtTime(value,t,seconds);}
 function stopVoice(v){try{v.source.stop();}catch{}v.cleanup();}
 function stopBed(){if(birdTimer!==null){clearTimer(birdTimer);birdTimer=null;}if(bed){for(const node of bed){try{node.stop?.();node.disconnect();}catch{}}bed=null;}}
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
 function scheduleBird(){
  if(!active()||!settings.ambience)return;
  birdTimer=setTimer(()=>{
   birdTimer=null;if(!active()||ctx.state!=='running'||!settings.ambience)return;
   try{const f=1550+Math.random()*450,t=ctx.currentTime+.01;note(f,t,.14,.035,ambientBus,'sine',1.26);note(f*1.06,t+.23,.18,.028,ambientBus,'sine',.84);scheduleBird();}catch{/* Audio must never interrupt play. */}
  },11000+Math.random()*12000);
 }
 function startBed(){
  if(bed||!active()||!settings.ambience)return;
  if(!noiseBuffer){
   noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*6,ctx.sampleRate);const samples=noiseBuffer.getChannelData(0);let brown=0;
   for(let i=0;i<samples.length;i++){brown=(brown+(Math.random()*2-1)*.025)/1.025;samples[i]=brown*3.2;}
   // Fade both edges to zero to avoid an audible seam in the long breeze loop.
   const fade=Math.floor(ctx.sampleRate*.3);for(let i=0;i<fade;i++){samples[i]*=i/fade;samples[samples.length-1-i]*=i/fade;}
  }
  const breeze=ctx.createBufferSource(),low=ctx.createBiquadFilter(),high=ctx.createBiquadFilter(),gain=ctx.createGain();
  breeze.buffer=noiseBuffer;breeze.loop=true;low.type='lowpass';low.frequency.value=700;low.Q.value=.5;high.type='highpass';high.frequency.value=90;high.Q.value=.5;gain.gain.value=.7;
  breeze.connect(low);low.connect(high);high.connect(gain);gain.connect(ambientBus);breeze.start();bed=[breeze,low,high,gain];scheduleBird();
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
   cue.notes.forEach((f,i)=>note(f,now+.015+i*cue.step,cue.duration,cue.volume,effectBus,cue.type??'sine',cue.glide??1));return true;
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
 function dispose(){if(disposed)return;disposed=true;silence();documentRef?.removeEventListener('pointerup',gesture,true);documentRef?.removeEventListener('keydown',gesture,true);documentRef?.removeEventListener('visibilitychange',visibility);windowRef?.removeEventListener('pagehide',pagehide);windowRef?.removeEventListener('pageshow',pageshow);if(ctx&&ctx.state!=='closed')Promise.resolve(ctx.close()).catch(()=>{});}
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
