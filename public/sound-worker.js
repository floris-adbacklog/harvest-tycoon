// Renders the sound effects (sound-kit.js) away from the game, so the farm never stutters while a sound is made. The most frequent
// cues come first; each is sent back as soon as it is ready (farm-audio.js turns it into a buffer).
// The kit comes from the address the page sends (its import map's, with this deploy's version: a worker has no import map). A kit that
// cannot load is thrown as the worker's error, so the page makes the cues itself (farm-audio.js idle).
self.onmessage=({data:{rate,kit='./sound-kit.js'}})=>import(kit).then(({renderCue,CUE_ORDER,CUE_VARIANTS})=>{
 for(const kind of CUE_ORDER)for(let variant=0;variant<(CUE_VARIANTS[kind]??1);variant++){
  const data=renderCue(kind,rate,variant);self.postMessage({kind,variant,rate,data},[data.buffer]);
 }
}).catch(error=>setTimeout(()=>{throw error;}));
