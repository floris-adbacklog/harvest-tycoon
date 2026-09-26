// Renders the sound effects (sound-kit.js) away from the game, so the farm never stutters while a sound is made. The most frequent
// cues come first; each is sent back as soon as it is ready (farm-audio.js turns it into a buffer).
import {renderCue,CUE_ORDER,CUE_VARIANTS} from './sound-kit.js';
self.onmessage=({data:{rate}})=>{
 for(const kind of CUE_ORDER)for(let variant=0;variant<(CUE_VARIANTS[kind]??1);variant++){
  const data=renderCue(kind,rate,variant);self.postMessage({kind,variant,rate,data},[data.buffer]);
 }
};
