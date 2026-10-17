import {productionJobs} from './farm-state.js';
import {renderCue,CUE_VARIANTS,CUE_ORDER,SFX_RATE} from './sound-kit.js';
// Original continuous music and procedural effects. No third-party recordings.
// The farm's music (4 Oct 2026): four original loops, and the farmer picks one in Settings › Sound (Hayride Hop unless they choose).
// Hayride Hop, Morning Market and Orchard Breeze (scripts/music/, built by scripts/build-farm-music.mjs) are mono AAC (.m4a): about a
// third of a stereo FLAC's size. A compressed file can gain or lose a few milliseconds at its edges when it is decoded (the encoder's
// start-up and padding), so each file holds MUSIC_PAD seconds of the loop's end before the loop and MUSIC_PAD seconds of its start
// after it, and the game loops from MUSIC_PAD to MUSIC_PAD + length: wherever the decoder puts the edges, that stretch is exactly one
// turn of continuous music, so the repeat has no seam. Sunny Acres (scripts/generate-farm-music.mjs, 26 Sep 2026) stays the lossless
// FLAC with the WAV as fallback, and is also what a browser that cannot decode AAC plays.
// Each track has a 20-second preview (<id>-preview.m4a) that Settings plays before the farmer picks it.
export const MUSIC_PAD=.5;
const SUNNY_ACRES=Object.freeze([{file:'sunny-acres.flac'},{file:'sunny-acres.wav'}]);
// length: the loop in seconds (its frames at 32 kHz, from public/assets/audio/<id>.json); none for the whole-file Sunny Acres.
const musicTrackOf=(id,title,about,length)=>Object.freeze({id,title,about,length,preview:`${id}-preview.m4a`,
 sources:Object.freeze(length?[{file:`${id}.m4a`,start:MUSIC_PAD,length},...SUNNY_ACRES]:SUNNY_ACRES)});
export const MUSIC_TRACKS=Object.freeze([
 musicTrackOf('hayride-hop','Hayride Hop','Banjo, fiddle and a whistled tune, with a gentle swing',6144000/32000),
 musicTrackOf('morning-market','Morning Market','Bouncy strings, tuba and bells',6355862/32000),
 musicTrackOf('orchard-breeze','Orchard Breeze','Ukulele, marimba and recorder, calm and cosy',6257778/32000),
 musicTrackOf('sunny-acres','Sunny Acres','The first farm tune: banjo, guitar and whistling',null)
]);
export const musicTrack=id=>MUSIC_TRACKS.find(track=>track.id===id)??MUSIC_TRACKS[0];
const audioUrl=file=>new URL(`./assets/audio/${file}`,import.meta.url);
async function loadFarmMusic(context,track){
 let failure;
 for(const source of track.sources){
  try{
   const response=await fetch(audioUrl(source.file));
   if(!response.ok)throw new Error('Music unavailable');
   const buffer=await context.decodeAudioData(await response.arrayBuffer());
   return {buffer,start:source.start??0,length:source.length??buffer.duration};
  }catch(error){failure=error;}
 }
 throw failure;
}
async function loadMusicPreview(context,track){
 const response=await fetch(audioUrl(track.preview));
 if(!response.ok)throw new Error('Preview unavailable');
 return await context.decodeAudioData(await response.arrayBuffer());
}
// What a loader gave: {buffer,start,length}, or just a buffer (the whole buffer is the loop). A loop that does not fit in the buffer
// is not trusted: the whole buffer loops instead.
function musicLoop(result){
 const buffer=result?.buffer??result,duration=buffer?.duration;
 if(!Number.isFinite(duration)||duration<=0)return null;
 const start=Number(result?.start)||0,length=Number(result?.length)||duration;
 return start>=0&&length>0&&start+length<=duration?{buffer,start,length}:{buffer,start:0,length:duration};
}
// Music 12% (was 16%) and game sounds 75% (was 48%) from 4 Oct 2026: the farm's own sounds lead, the music sits underneath.
// A farmer's own setting stays.
export const AUDIO_DEFAULTS=Object.freeze({enabled:true,ambience:12,effects:75,music:'hayride-hop'});
export const AUDIO_STORAGE_KEY='harvest-tycoon-audio-v1';
export function audioSettings(value={}){
 const percent=(v,fallback)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(100,Math.round(v))):fallback;
 return {enabled:typeof value?.enabled==='boolean'?value.enabled:AUDIO_DEFAULTS.enabled,ambience:percent(value?.ambience,AUDIO_DEFAULTS.ambience),effects:percent(value?.effects,AUDIO_DEFAULTS.effects),
  music:MUSIC_TRACKS.some(track=>track.id===value?.music)?value.music:AUDIO_DEFAULTS.music};
}
export const SOUND_CUES=Object.freeze({
 plant:{notes:[196,294],step:.065,duration:.13,volume:.09,type:'triangle'},
 harvest:{notes:[392,523.25,659.25],step:.065,duration:.24,volume:.11},
 snip:{notes:[783.99],step:.05,duration:.07,volume:.05,type:'triangle'},
 water:{notes:[620,820,710],step:.075,duration:.15,volume:.065,glide:.53},
 care:{notes:[523.25,783.99],step:.08,duration:.28,volume:.09},
 sell:{notes:[880,1174.66],step:.075,duration:.2,volume:.075},
 produce:{notes:[196,246.94,293.66],step:.07,duration:.15,volume:.075,type:'triangle'},
 collect:{notes:[587.33,739.99,880],step:.09,duration:.32,volume:.10},
 ready:{notes:[659.25,783.99],step:.15,duration:.38,volume:.055},
 chore:{notes:[261.63,392],step:.08,duration:.16,volume:.07,type:'triangle'},
 chorebonus:{notes:[261.63,392,659.25,783.99],step:.08,duration:.2,volume:.075,type:'triangle'},
 upgrade:{notes:[392,523.25,659.25,783.99],step:.1,duration:.35,volume:.11},
 reward:{notes:[523.25,659.25,783.99,1046.5],step:.1,duration:.38,volume:.105},
 diamond:{notes:[659.25,987.77,1318.51],step:.11,duration:.42,volume:.08},
 dailygift:{notes:[659.25,783.99,987.77,1174.66,1567.98],step:.07,duration:.45,volume:.1},
 construct:{notes:[392,523.25,659.25,783.99],step:.1,duration:.35,volume:.1,type:'triangle'},
 purchase:{notes:[523.25,659.25,783.99,1046.5,1318.51],step:.09,duration:.45,volume:.11},
 offer:{notes:[523.25,659.25,783.99,1046.5,1567.98],step:.07,duration:.5,volume:.1},
 message:{notes:[1174.66,1567.98],step:.09,duration:.25,volume:.06},
 finish:{notes:[783.99,1046.5,1396.91],step:.06,duration:.3,volume:.08},
 quest:{notes:[523.25,659.25,1046.5],step:.08,duration:.26,volume:.09},
 delivery:{notes:[440,523.25,659.25,880],step:.09,duration:.28,volume:.09},
 stall:{notes:[1174.66,1567.98,1174.66],step:.07,duration:.25,volume:.08},
 boost:{notes:[392,523.25,659.25,783.99,1046.5],step:.06,duration:.28,volume:.09},
 expand:{notes:[196,293.66,587.33],step:.1,duration:.25,volume:.09,type:'triangle'},
 valley:{notes:[1244.51,1567.98],step:.07,duration:.3,volume:.07},
 depot:{notes:[329.63,415.3,659.25],step:.15,duration:.3,volume:.08,type:'triangle'},
 fair:{notes:[523.25,659.25,783.99,1046.5],step:.09,duration:.35,volume:.1},
 improve:{notes:[392,523.25,698.46],step:.13,duration:.4,volume:.09},
 tractor:{notes:[98,123.47,146.83],step:.085,duration:.16,volume:.06,type:'triangle'},
 levelup:{notes:[523.25,659.25,783.99,1046.5,1318.51,1046.5],step:.14,duration:.52,volume:.12},
 bell:{notes:[392,329.63,261.63],step:.3,duration:.6,volume:.07},
 // The Fishing pond (11 Oct 2026, pond-ui.js plays them itself): the cast, a nibble, the bite, a fish landed and one that slipped off.
 cast:{notes:[520,330],step:.06,duration:.18,volume:.05,type:'triangle',glide:.7},
 nibble:{notes:[1174.66],step:.05,duration:.06,volume:.035,type:'triangle'},
 bite:{notes:[330,220],step:.05,duration:.18,volume:.08,glide:.6},
 catch:{notes:[523.25,659.25,783.99,1046.5],step:.08,duration:.3,volume:.1},
 escape:{notes:[392,293.66,220],step:.08,duration:.2,volume:.06,type:'triangle'},
});
export function soundForAction(action,result,beforeLevel,afterLevel){
 if(action.type==='chore'&&result.success===false)return null;
 if(afterLevel>beforeLevel)return 'levelup';
 // A chore always pays; one that also found an extra resource (bonus) sounds happier.
 if(action.type==='chore')return result.bonus?'chorebonus':'chore';
 if(action.type==='field')return {plant:'plant',water:'water',harvest:'harvest',tend:'care'}[action.action]??null;
 if(action.type==='fields')return {plant:'plant',water:'water',harvest:'harvest',tend:'care'}[action.action]??null;
 if(action.type==='activity_work')return result.roundComplete?'reward':result.finished?'collect':{greenhouse:'water',apiary:'collect',paddock:'water',workshop:'chore'}[action.station]??'chore';
 if(['checkin','comeback'].includes(action.type))return 'dailygift';   // the daily gift has its own, fuller sound; the comeback chest shares it
 if(['daily','beginner_claim'].includes(action.type))return result.diamonds>0?'diamond':'reward';
  // A load that fills the export trailer sends it off (horn); a part load is just crates going on.
 if(action.type==='depot_load')return result.shipped?'depot':'produce';
 // The village (Oct 2026): the Help that opens the market crate sounds like diamonds, sowing in the Village Fields like planting; a full
 // town boat sails off with the depot's horn and a part load is crates going on, like the trailer.
 if(action.type==='village_deliver'&&result.crate>0)return 'diamond';
 if(action.type==='produce'&&result.building==='villagefields')return 'plant';
 if(action.type==='boat_load')return result.sailed?'depot':'produce';
 return {sell:'sell',produce:'produce',collect:'collect',collect_all:'collect',upgrade:'upgrade',expand:'expand',quest:'quest',mastery:'reward',level_rewards:'reward',delivery:'delivery',tractor:'tractor',chore:'chore',fertilize:'care',stall_collect:'stall',stall_upgrade:'upgrade',project_start:'produce',project_collect:'reward',silo_upgrade:'upgrade',buy_boost:'boost',
  construct:'construct',finish_crop:'finish',finish_batch:'finish',valley_sell:'valley',fair_enter:'fair',improve:'improve',
  // The market square (Oct 2026): helping a villager sounds like a sold basket, a golden brief like a new building; "Not now" is quiet.
  village_deliver:'valley',village_build:'construct',
  // The miller's order (17 Oct 2026): it pays diamonds every time.
  miller_deliver:'diamond',
  // A landmark (Oct 2026): goods handed in are crates going on, finishing it is a lasting improvement; turning a boat cargo down is quiet.
  landmark_give:'produce',landmark_finish:'improve'}[action.type]??null;
}
// A sweep's snip per field (Oct 2026): step n of the sweep (from 0) is a step higher on a pentatonic scale, up to an octave and then
// it stays there; every sweep starts low again.
export const SNIP_SCALE=Object.freeze([0,2,4,7,9,12]);
export const snipRate=n=>2**(SNIP_SCALE[Math.min(Math.max(0,Math.floor(n)||0),SNIP_SCALE.length-1)]/12);
export const SNIP_GAP=.055;
export function createProductionCueTracker(buildings,now){
 let previous=new Map();
 const key=(id,j)=>`${id}:${j.id??j.recipe+':'+j.startedAt}`;
 function reset(current,time){previous=new Map(Object.entries(current).flatMap(([id,b])=>productionJobs(b).map(j=>[key(id,j),j.readyAt<=time])));}
 reset(buildings,now);
 return {reset,check(current,time){let fresh=false;for(const [id,b] of Object.entries(current))for(const job of productionJobs(b)){if(previous.get(key(id,job))===false&&job.readyAt<=time)fresh=true;}reset(current,time);return fresh;}};
}
// The effects are rendered in a worker (sound-worker.js), away from the game; without workers, one cue per idle moment instead.
// The worker and the sound kit come at the addresses the page's import map gives them, with this deploy's version (scripts/cache-bust.mjs:
// Discord's proxy keeps a script 4 hours). A worker has no import map of its own, so it is told where the kit is (a browser without
// import.meta.resolve: the plain addresses, the worker's own ./sound-kit.js).
function renderInBackground(windowRef,accept){
 const jobs=CUE_ORDER.flatMap(kind=>Array.from({length:CUE_VARIANTS[kind]??1},(_,variant)=>[kind,variant])),done=new Set();let stopped=false,worker=null;
 // Without a worker (or if it fails to start, as in an older browser): one cue per idle moment, only the ones still missing.
 const idle=()=>{
  worker?.terminate();worker=null;
  const later=fn=>windowRef?.requestIdleCallback?windowRef.requestIdleCallback(fn,{timeout:2000}):setTimeout(fn,50);
  const next=()=>{if(stopped)return;const job=jobs.find(([k,v])=>!done.has(`${k}:${v}`));if(!job)return;done.add(`${job[0]}:${job[1]}`);accept(job[0],job[1],renderCue(job[0],SFX_RATE,job[1]),SFX_RATE);later(next);};
  later(next);
 };
 try{
  worker=new windowRef.Worker(import.meta.resolve?.('./sound-worker.js')??new URL('./sound-worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{done.add(`${data.kind}:${data.variant}`);accept(data.kind,data.variant,data.data,data.rate);};worker.onerror=idle;
  worker.postMessage({rate:SFX_RATE,kit:import.meta.resolve?.('./sound-kit.js')});
 }catch{idle();}
 return ()=>{stopped=true;worker?.terminate();};
}
// 11 Oct 2026 (a player's iPhone app stayed silent after a trip to the village and back): on iOS a resume() can wait for good (WebKit
// parks it while it may not start: a tap it did not count, an interruption that never ends) and a context can say 'running' while its
// clock stands still. So every tap asks again; a context a tap could not start within RESUME_WAIT, or whose clock stood still for
// STILL_WAIT, is closed and a fresh one made in that tap (each wait twice as long after every replacement, up to 32 times, until a tap
// hears the clock move again); a context the browser would not make is tried again on a tap RESUME_WAIT later, MAKE_TRIES in a row
// at most.
export const RESUME_WAIT=1000,STILL_WAIT=2000,MAKE_TRIES=3;
// touchend and click too (11 Oct 2026): older iOS did not count a pointerup as a tap that may start sound, and VoiceOver only clicks.
const GESTURES=['pointerup','pointerdown','touchend','click','keydown'];
// 13 Oct 2026 (an iPhone player, after the 12 Oct fix: no tune and no sound for 30-60 s after every trip between the farm and the
// village): a trip loads the farm's page again in its frame and a context belongs to the page that made it, so every trip closed a
// running context (iOS then turns the phone's sound session off) and the new page had to make and start one of its own, which iOS only
// allows inside a tap on that new page and can refuse for a while, each replacement waiting twice as long. Now the context belongs to the
// page around the farm (home: the website's own page or a portal's, same origin) and stays there through a trip, running: the new page
// takes it over as it is and the sound goes on at once, no tap needed. Only the context is kept there (made with that page's own
// AudioContext), never one of this page's objects, so nothing of a page that went stays in memory.
const HOME_CONTEXT='harvestAudioContext';
// 13 Oct 2026 (review, not yet seen on an iPhone): iOS may not let a tap in the farm's frame start a context of the page around it, and
// then the game would have no sound at all. So until a context there has run (HOME_SHARED true on that page), a tap that asks it to
// start and does not see it run within SHARED_WAIT (at once when its start fails) goes back to the 12 Oct way: that context is closed
// and this page makes its own, still inside that tap where it can (WebKit carries a tap into a timer under a second; if not, the next
// tap starts it), and HOME_SHARED false tells every later page of the session to make its own at once, without waiting again.
export const SHARED_WAIT=500;
const HOME_SHARED='harvestAudioShared';
export function createFarmAudio({contextFactory,storage,documentRef=globalThis.document,windowRef=globalThis.window,home=null,onChange=()=>{},loadMusic=loadFarmMusic,loadPreview=loadMusicPreview,renderSounds=renderInBackground,clock=()=>globalThis.performance?.now?.()??Date.now(),later=(fn,ms)=>globalThis.setTimeout(fn,ms)}={}){
 let settings={...AUDIO_DEFAULTS},ctx,master,compressor,ambientBus,effectBus,music=null,musicLoading=null,bed=null,musicOffset=0,musicStartedAt=0,musicRetryAt=0,musicStatus='idle',unlocked=false,disposed=false,unavailable=false;
 let nextEffectAt=0,priorityUntil=0,resuming=null,lastSnip=-Infinity;
 // tried: when a tap first asked this context to start since it last ran; gaveUp: such a start ended without it running; renewals:
 // contexts replaced since a tap last heard the clock move; heard: the clock at a tap, to see it moves; makeFails, failedAt: makes
 // failed in a row, and when the last one did.
 let tried=null,gaveUp=false,renewals=0,heard=null,makeFails=0,failedAt=0;
 // CrazyGames' own sound switch (Oct 2026, settings.muteAudio through public/portal.js): while it is off the game is silent, whatever
 // Settings say, and the sound comes back as Settings have it once CrazyGames turns it on again.
 let outsideMute=false;
 // The page around the farm, when there is one we may use (not farm.html on its own, nor a page of another site); trip: this page is
 // about to make way for the farm's other world (travel()), so its context stays running there for the next page.
 // onState: this page's statechange handler, so a page that goes knows whether a later page already took the context over.
 // A page around the farm whose context would not start from a tap here (HOME_SHARED false) is not used: this page keeps its own.
 // waiting: the SHARED_WAIT check a tap set off, until it is done.
 let homeRef=null,trip=false,onState=null,waiting=null;try{if(home&&home!==windowRef&&home[HOME_SHARED]!==false){void home[HOME_CONTEXT];homeRef=home;}}catch{}
 const voices=new Set(),lastPlayed=new Map();
 // A track's preview in Settings: {id,status:'loading'|'playing',source,gain}; the farm's music is turned down while it plays.
 let preview=null,previewTurn=0,previewFailed=null,previewBuffer=null;
 try{storage??=windowRef?.localStorage;settings=audioSettings(JSON.parse(storage?.getItem(AUDIO_STORAGE_KEY)??'{}'));}catch{}
 const active=()=>!disposed&&unlocked&&settings.enabled&&!outsideMute&&!documentRef?.hidden;
 const read=()=>({...settings,available:!unavailable,musicStatus,preview:preview?{id:preview.id,status:preview.status}:null,previewFailed,...(outsideMute?{outsideMute:true}:{})});
 function ramp(param,value,seconds=.08){const t=ctx.currentTime;param.cancelScheduledValues(t);param.setTargetAtTime(value,t,seconds);}
 function stopVoice(v){try{v.source.stop();}catch{}v.cleanup();}
 function stopBed(){
  if(!bed)return;
  if(music)musicOffset=(musicOffset+Math.max(0,ctx.currentTime-musicStartedAt))%music.length;
  for(const node of bed){try{node.stop?.();node.disconnect();}catch{}}bed=null;
 }
 // Another track was picked: the one playing fades out in half a second rather than stopping mid-note.
 function fadeOutBed(){
  if(!bed)return;const [source,gain]=bed,t=ctx.currentTime;bed=null;
  gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(0,t,.12);
  source.onended=()=>{try{source.disconnect();gain.disconnect();}catch{}};try{source.stop(t+.6);}catch{}
 }
 function endPreview(){
  if(!preview)return false;const {source,gain}=preview;preview=null;previewTurn++;
  if(source&&ctx){const t=ctx.currentTime;try{gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(0,t,.06);source.onended=()=>{try{source.disconnect();gain.disconnect();}catch{}};source.stop(t+.3);}catch{}}
  if(bed)ramp(bed[1].gain,1,.4);
  return true;
 }
 // running: the sounds stop but the context keeps running (a trip, 13 Oct 2026).
 function silence(running=false){
  if(!ctx)return;master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(0,ctx.currentTime);stopBed();for(const v of [...voices])stopVoice(v);
  if(preview){if(preview.source){try{preview.source.stop();preview.source.disconnect();preview.gain.disconnect();}catch{}}preview=null;previewTurn++;if(!disposed)onChange(read());}
  nextEffectAt=0;priorityUntil=0;lastSnip=-Infinity;lastPlayed.clear();
  // A resume still waiting does not hold back the next one (11 Oct 2026); a suspended clock stands still on purpose.
  resuming=null;heard=null;
  if(!running&&ctx.state!=='closed')Promise.resolve(ctx.suspend()).catch(()=>{});
 }
 // The context the page around the farm holds (13 Oct 2026), while it is open: a context is made only when there is none.
 function parked(){try{const c=homeRef?.[HOME_CONTEXT];return c&&c.state!=='closed'?c:null;}catch{return null;}}
 function makeContext(){
  const AudioContext=homeRef?.AudioContext??homeRef?.webkitAudioContext??windowRef?.AudioContext??windowRef?.webkitAudioContext;
  const kept=parked(),c=ctx=kept??(contextFactory?contextFactory():new AudioContext());
  master=ctx.createGain();master.gain.value=0;
  compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-16;compressor.knee.value=12;compressor.ratio.value=8;compressor.attack.value=.006;compressor.release.value=.18;
  ambientBus=ctx.createGain();ambientBus.gain.value=0;effectBus=ctx.createGain();effectBus.gain.value=settings.effects/100;
  ambientBus.connect(compressor);effectBus.connect(compressor);compressor.connect(master);master.connect(ctx.destination);
  // An interruption that ends (a call, Siri, an alarm) brings the mix back, or keeps it silent while the game may not sound; one that
  // does not end is the next tap's to heal.
  c.onstatechange=onState=()=>{if(c!==ctx||disposed)return;heard=null;if(c.state!=='running')return;ran();if(active())applyMix(true);else silence();};
  prepareSounds();
  if(homeRef&&!kept)try{homeRef[HOME_CONTEXT]=c;}catch{}
 }
 // A context the browser would not make (11 Oct 2026): sound is 'not available' until a later tap makes one (not the same tap's
 // touchend or click), MAKE_TRIES in a row at most; a browser without Web Audio is not asked again.
 function make(){
  if(makeFails&&clock()-failedAt<RESUME_WAIT)return false;
  try{makeContext();makeFails=0;if(unavailable){unavailable=false;onChange(read());}return true;}
  catch{shut(ctx);ctx=null;makeFails=contextFactory||windowRef?.AudioContext||windowRef?.webkitAudioContext?makeFails+1:MAKE_TRIES;failedAt=clock();unavailable=true;onChange(read());return false;}
 }
 function shut(c){if(!c)return;c.onstatechange=null;try{if(homeRef?.[HOME_CONTEXT]===c)homeRef[HOME_CONTEXT]=null;}catch{}try{if(c.state!=='closed')Promise.resolve(c.close()).catch(()=>{});}catch{}}
 // A context of the page around the farm that runs shows it works here (13 Oct 2026 review): it is never given up for one of our own.
 function ran(){tried=null;gaveUp=false;if(homeRef)try{homeRef[HOME_SHARED]=true;}catch{}}
 const untried=()=>{try{return Boolean(homeRef)&&homeRef[HOME_SHARED]!==true;}catch{return false;}};
 // The page around the farm's context would not start from a tap here: it is closed (one live context), the page around remembers it
 // for the session, and this page makes its own and asks it to start at once (in the tap still, where the browser carries it over).
 function goLocal(){try{homeRef[HOME_SHARED]=false;}catch{}silence();shut(ctx);ctx=null;homeRef=null;tried=null;gaveUp=false;if(make())void unlock(false);}
 // On a tap: a context closed behind the game, one a tap could not start in time (at once if its start already gave up), or one that
 // says 'running' while its clock stood still since an earlier tap (WebKit bugs 263627, 276687).
 function stuck(){
  const now=clock(),later=2**Math.min(renewals,5);
  if(ctx.state==='closed')return true;
  if(ctx.state!=='running'){heard=null;return tried!==null&&now-tried>=(gaveUp&&!renewals?0:RESUME_WAIT*later);}
  if(heard&&now-heard.at>=STILL_WAIT*later){if(ctx.currentTime<=heard.time)return true;heard=null;renewals=0;}
  heard??={time:ctx.currentTime,at:now};return false;
 }
 // The old context is closed before the new one is made: one live context per page. The rendered effects and the music are plain
 // AudioBuffers, not tied to a context, so they are kept, and the music goes on where it was.
 function renew(){silence();shut(ctx);ctx=null;tried=null;gaveUp=false;renewals++;}
 // The effects themselves (sound-kit.js: soil, water, leaves, coins, wood, bells), rendered in the background once the sound is on.
 // Until a cue is ready (a second or two), or if it cannot be made, it plays its plain notes (SOUND_CUES).
 // A cue with several versions (the tractor) plays them in turn.
 const rendered=new Map(),turns=new Map();let stopRendering=null;
 function prepareSounds(){
  if(stopRendering)return;
  stopRendering=renderSounds(windowRef,(kind,variant,data,rate)=>{if(!ctx||disposed)return;try{const buffer=ctx.createBuffer(1,data.length,rate);buffer.getChannelData(0).set(data);rendered.set(`${kind}:${variant}`,buffer);}catch{}})??(()=>{});
 }
 function sample(kind,when,rate=1){
  const variant=(turns.get(kind)??0)%(CUE_VARIANTS[kind]??1),buffer=rendered.get(`${kind}:${variant}`);turns.set(kind,variant+1);
  if(!buffer)return false;
  if(voices.size>=16)return true;
  const source=ctx.createBufferSource(),voice={source,cleanup:()=>{voices.delete(voice);source.disconnect();}};
  source.buffer=buffer;if(rate!==1)source.playbackRate.value=rate;source.connect(effectBus);source.onended=voice.cleanup;voices.add(voice);source.start(when);return true;
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
  if(music?.id!==settings.music){
   if(musicLoading||Date.now()<musicRetryAt)return;
   // One track in memory at a time: the old one goes as the new one loads.
   const id=settings.music;music=null;
   musicStatus='loading';onChange(read());
   musicLoading=Promise.resolve().then(()=>loadMusic(ctx,musicTrack(id))).then(result=>{
    if(disposed)return;
    const loop=musicLoop(result);if(!loop)throw new Error('Invalid music');
    if(id===settings.music){music={id,...loop};musicStatus='ready';onChange(read());}
   }).catch(()=>{if(!disposed&&id===settings.music){musicStatus='unavailable';musicRetryAt=Date.now()+15000;onChange(read());}})
    .finally(()=>{
     musicLoading=null;if(disposed||!ctx)return;
     startBed();   // the track loaded, or the farmer picked another meanwhile
     // A load for a track no longer picked, with nothing loading after it (the music turned to 0 meanwhile): not 'loading' any more.
     if(!musicLoading&&!music&&musicStatus==='loading'){musicStatus='idle';onChange(read());}
    });
   return;
  }
  // One sample-accurate loop: release tails already wrap in the music. No end fade,
  // restart timers or silent gap between repeats.
  const source=ctx.createBufferSource(),gain=ctx.createGain();
  source.buffer=music.buffer;source.loop=true;source.loopStart=music.start;source.loopEnd=music.start+music.length;
  gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.setTargetAtTime(preview?.source?0:1,ctx.currentTime,.4);   // down only while a preview plays
  source.connect(gain);gain.connect(ambientBus);musicStartedAt=ctx.currentTime;
  source.start(0,music.start+musicOffset%music.length);bed=[source,gain];
 }
 // Settings › Sound: a track's 20-second preview, before the farmer picks it. It plays at the music's volume, but never softer than
 // the default music volume (the music slider may be down at 0), and the farm's own music is turned down while it plays.
 async function playPreview(id){
  const track=MUSIC_TRACKS.find(t=>t.id===id);if(!track)return false;
  endPreview();previewFailed=null;
  if(!active()||ctx?.state!=='running'){onChange(read());return false;}
  const turn=previewTurn;preview={id,status:'loading'};onChange(read());
  try{
   const buffer=previewBuffer?.id===id?previewBuffer.buffer:await loadPreview(ctx,track);
   if(turn!==previewTurn)return false;
   if(!active()||ctx.state!=='running'){preview=null;previewTurn++;onChange(read());return false;}   // e.g. iOS interrupted the sound
   previewBuffer={id,buffer};
   const source=ctx.createBufferSource(),gain=ctx.createGain(),t=ctx.currentTime;
   source.buffer=buffer;gain.gain.setValueAtTime(0,t);gain.gain.setTargetAtTime(Math.max(settings.ambience,AUDIO_DEFAULTS.ambience)/100,t,.05);
   source.connect(gain);gain.connect(compressor);
   source.onended=()=>{try{source.disconnect();gain.disconnect();}catch{}if(preview?.source===source){preview=null;previewTurn++;if(bed)ramp(bed[1].gain,1,.4);onChange(read());}};
   if(bed)ramp(bed[1].gain,0,.12);
   preview={id,status:'playing',source,gain};source.start(t+.02);onChange(read());return true;
  }catch{
   if(turn===previewTurn){preview=null;previewTurn++;previewFailed=id;if(bed)ramp(bed[1].gain,1,.4);onChange(read());}
   return false;
  }
 }
 function stopPreview(){const failed=previewFailed;previewFailed=null;if(endPreview()||failed)onChange(read());}
 function applyMix(fadeIn=false){
  ramp(effectBus.gain,settings.effects/100);ramp(ambientBus.gain,settings.ambience/100,fadeIn?.75:.15);ramp(master.gain,.55,fadeIn?.3:.05);
  if(settings.ambience)startBed();else stopBed();
 }
 // byGesture: a tap, a click, a key or one of Settings' buttons. Without one (the page back in view, a slider, CrazyGames' switch) the
 // context is asked to start once at a time, and a context is only made or replaced on a tap.
 function unlock(byGesture=true){
  if(disposed||!settings.enabled||outsideMute||documentRef?.hidden||makeFails>=MAKE_TRIES)return Promise.resolve(false);
  unlocked=true;
  try{
   if(ctx&&byGesture&&stuck())renew();
   const first=!ctx;if(!ctx&&!(byGesture&&make()))return Promise.resolve(false);
   if(ctx.state==='running'){ran();applyMix(first);return Promise.resolve(true);}
   // Every tap asks again (11 Oct 2026): WebKit may never settle a resume() it could not start, and only a new tap lets it start.
   if(resuming&&!byGesture)return resuming;
   const c=ctx;if(byGesture)tried??=clock();
   // A tap asks the page around the farm's context, which never ran here (13 Oct 2026 review): not running SHARED_WAIT later, or its
   // start failed, this page goes its own way.
   if(byGesture&&!waiting&&untried()){const turn=waiting={};later(()=>{if(waiting!==turn)return;waiting=null;if(ctx&&ctx.state!=='running'&&untried()&&active())goLocal();},SHARED_WAIT);}
   const asked=resuming=new Promise(resolve=>resolve(c.resume())).then(()=>{if(c!==ctx)return false;if(!active()){silence();return false;}applyMix(true);if(c.state!=='running'){if(byGesture)gaveUp=true;return false;}ran();return true;})
    .catch(()=>{if(c===ctx&&byGesture){gaveUp=true;if(untried()&&active())goLocal();}return false;}).finally(()=>{if(resuming===asked)resuming=null;});
   return asked;
  }catch{return Promise.resolve(false);}
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
 // A sweep cuts a field every few frames, so its snips have their own way past the one-cue-at-a-time rule of play(): at most one
 // every SNIP_GAP seconds (a quicker field stays silent), never over a level-up, and they leave the closing chime free to play.
 function snip(n){
  if(!active()||!settings.effects||ctx?.state!=='running')return false;
  const now=ctx.currentTime;if(now-lastSnip<SNIP_GAP||now<priorityUntil)return false;
  try{lastSnip=now;const rate=snipRate(n),cue=SOUND_CUES.snip;if(!sample('snip',now+.005,rate))note(cue.notes[0]*rate,now+.005,cue.duration,cue.volume,effectBus,cue.type);return true;}catch{return false;}
 }
 function setSettings(next){
  const before=settings.music;
  settings=audioSettings({...settings,...next});try{storage?.setItem(AUDIO_STORAGE_KEY,JSON.stringify(settings));}catch{}
  // Another track: it starts from its beginning, and the one playing fades out.
  if(settings.music!==before){musicOffset=0;musicRetryAt=0;previewFailed=null;endPreview();if(ctx)fadeOutBed();}
  onChange(read());
  if(!settings.enabled){silence();return;}
  if(unlocked)void unlock(false);
 }
 function muteFromOutside(on){if(outsideMute===Boolean(on))return;outsideMute=Boolean(on);onChange(read());if(outsideMute)silence();else if(unlocked)void unlock(false);}
 // A mouse button going down counts too (Oct 2026), so a first sweep with the mouse already has its snips.
 function gesture(event){if(event.isTrusted&&(event.type!=='keydown'||['Enter',' ','1','2','3','4'].includes(event.key))&&(event.type!=='pointerdown'||event.pointerType==='mouse'))void unlock();}
 function visibility(){if(documentRef.hidden)silence();else if(unlocked)void unlock(false);}
 function pagehide(event){if(event.persisted)silence();else dispose();}
 function pageshow(event){if(event.persisted&&unlocked)void unlock(false);}
 // A context the page around the farm holds is never closed here (13 Oct 2026): this page's sounds stop and its mix comes off it, and
 // it stays running on a trip, for the next page, or is suspended when the farm closes otherwise (signed out, paused). One a later page
 // already took over (its handler is on it, review 13 Oct 2026) is that page's: this page only takes its own sounds off.
 function dispose(){
  if(disposed)return;disposed=true;stopRendering?.();const kept=Boolean(ctx)&&parked()===ctx,taken=kept&&ctx.onstatechange!==onState;silence(kept&&(trip||taken));
  for(const type of GESTURES)documentRef?.removeEventListener(type,gesture,true);documentRef?.removeEventListener('visibilitychange',visibility);windowRef?.removeEventListener('pagehide',pagehide);windowRef?.removeEventListener('pageshow',pageshow);music=null;previewBuffer=null;
  if(kept){if(!taken)ctx.onstatechange=null;for(const node of [effectBus,ambientBus,compressor,master])try{node.disconnect();}catch{}ctx=null;}else shut(ctx);
 }
 for(const type of GESTURES)documentRef?.addEventListener(type,gesture,true);documentRef?.addEventListener('visibilitychange',visibility);windowRef?.addEventListener('pagehide',pagehide);windowRef?.addEventListener('pageshow',pageshow);
 // After a trip (13 Oct 2026): the context the page before left is taken over at once, before any tap here (the farmer tapped for it
 // there). Running, the sound goes on; suspended or interrupted, it is asked to start, and every tap here asks again, with no wait
 // carried over; where the game may not sound (hidden, sound off in Settings, muted from outside) it is suspended.
 if(parked()&&make()){unlocked=true;if(active())void unlock(false);else silence();}
 // travel(false): the trip did not happen (its load failed), so a farm closed later is not taken for one.
 return {settings:read,setSettings,unlock,play,snip,dispose,muteFromOutside,preview:playPreview,stopPreview,travel(on=true){trip=Boolean(on);}};
}

export function withActionSounds(runAction,getLevel,play){
 return async action=>{
  const before=getLevel(),result=await runAction(action);
  try{const cue=soundForAction(action,result,before,getLevel());if(cue)play(cue);}catch{/* Sound must not turn a successful save into an error. */}
  return result;
 };
}
