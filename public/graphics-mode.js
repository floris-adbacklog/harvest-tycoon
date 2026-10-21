// How heavy the farm's 3D view may be (21 Oct 2026). A player on a Google Pixel 10 Pro Fold lost the 3D view ("Getting your farm back…",
// then "The 3D view was interrupted"), and in the end the app closed on every start at 94%, in Chrome too. The Pixel 10 is the first Pixel
// with an Imagination PowerVR GPU; five public reports from Aug-Oct 2026 lose the WebGL context there as soon as many draws read the shadow
// map, and Chrome then blocks WebGL for the site after two losses. The owner picked four steps:
// 1. Every note about a start or a lost view carries the graphics chip's name (gpuName) and the mode the farm ran in (load_stalls gpu, gfx).
// 2. On a PowerVR or Imagination GPU the farm draws no shadows (mode 'noshadow').
// 3. Simple graphics after any trouble: once the 3D view was lost, a start had to fall back to the safe options, or a start ended without
//    ever reaching 60 seconds of play twice in a row (the app or the browser closed under it), the next start is simple: no shadows, no antialiasing, the
//    low-power GPU, a pixel ratio of at most 1.25, and no walking animals, pets or farmers. Settings › Graphics says so and switches it back.
// 4. A phone, a tablet, the apps or an unfolded foldable never get the computer's heavy settings (4x antialiasing, the high-performance GPU,
//    2048 shadows, pixel ratio 1.75) just because their screen is wider than 900 px, and their picture stays under 2.2 megapixels.
// Simple graphics is off unless the player or real trouble switched it on (the owner, 21 Oct 2026: "Zet de graphics setting standaard
// uit, ik logde in en kreeg aan"): one start that ended early is not enough (a sign-in or an app the player closed looks the same), only
// two in a row. The choice moved to a key of its own, so every device that had simple switched on that first afternoon starts full again.
// Everything here reads and writes this device's own storage and nothing else; any storage that refuses is simply the full graphics.
export const GRAPHICS_KEY='harvest-tycoon:graphics-choice';   // 'simple' or 'full' (the player's own choice, or 'simple' set after trouble)
export const OLD_GRAPHICS_KEY='harvest-tycoon:graphics';       // 21 Oct 2026 only: removed at the start, never read
export const CRASHES_FOR_SIMPLE=2;                             // starts in a row that ended without a minute of play
export const RUN_KEY='harvest-tycoon:graphics-run';    // while a farm start runs: {at, stage, step, percent, gpu, gfx, away, crashes}; gone after 60 s of play or when the page goes
export const HEALTHY_MS=60000;                         // a start that reached a minute of play was a good one
export const RUN_MAX_AGE=20*3600000;                   // an older mark is not this player's last start (and farm-api takes a day at most)
export const PIXEL_RATIO=Object.freeze({simple:1.25,handheld:1.5,desktop:1.75});
export const HANDHELD_MAX_PIXELS=2.2e6;
export const GFX_MODES=Object.freeze(['full','noshadow','simple']);
const POWERVR=/PowerVR|Imagination/i;

const read=(storage,key)=>{try{return storage?.getItem(key)??null;}catch{return null;}};
const write=(storage,key,value)=>{try{if(value==null)storage?.removeItem(key);else storage?.setItem(key,value);}catch{}};

// The graphics chip's name as the browser tells it (WEBGL_debug_renderer_info, else the plain RENDERER, which current browsers fill
// with the same name), on one line of at most 100 characters; null when there is none.
export function gpuName(gl){
 try{
  const ext=gl?.getExtension?.('WEBGL_debug_renderer_info');
  const name=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl?.getParameter?.(gl.RENDERER);
  if(typeof name!=='string')return null;
  const line=name.replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim();
  return line?Array.from(line).slice(0,100).join(''):null;
 }catch{return null;}
}
export const shadowTrouble=gpu=>typeof gpu==='string'&&POWERVR.test(gpu);

// Simple graphics or not, and why: a link (?gfx=simple or ?gfx=full, for a test or the app's own safe start) wins, then the device's
// stored choice. Simple is off unless something said so.
export function graphicsChoice({storage,search=''}={}){
 let asked=null;try{asked=new URLSearchParams(search).get('gfx');}catch{}
 if(asked==='simple'||asked==='full')return {simple:asked==='simple',from:'link'};
 const stored=read(storage,GRAPHICS_KEY);
 return {simple:stored==='simple',from:stored==null?null:'device'};
}
export const chooseGraphics=(storage,simple)=>write(storage,GRAPHICS_KEY,simple?'simple':'full');
// After trouble (a lost 3D view, the safe second try, two starts in a row that never reached a minute): simple from the next start on, whatever was
// chosen before. Settings › Graphics says it switches on by itself, and switches it back.
export const graphicsTrouble=storage=>write(storage,GRAPHICS_KEY,'simple');

// The mark of a start in progress. markRun at the start (and again with what is learnt on the way: the stage, the chip, the mode);
// endRun when the farm has run a minute or the page goes (the player left: not a crash). A page out of sight is marked away (the phone
// may end an app in the background), and marked back when it shows again.
export function markRun(storage,patch,now=Date.now()){
 let run=null;try{run=JSON.parse(read(storage,RUN_KEY));}catch{}
 const next={...(run&&typeof run==='object'&&!Array.isArray(run)?run:{}),...patch,at:run?.at&&patch?.at==null?run.at:now};
 write(storage,RUN_KEY,JSON.stringify(next));return next;
}
export const endRun=storage=>write(storage,RUN_KEY,null);
// The last start's mark, when that start ended without a minute of play, in sight, and without the page going away: the app or the
// browser closed under it (or the whole device stopped). Read once at the start, before markRun writes the new one. null otherwise.
export function lastRunCrashed(storage,now=Date.now()){
 let run=null;try{run=JSON.parse(read(storage,RUN_KEY));}catch{return null;}
 if(!run||typeof run!=='object'||Array.isArray(run)||typeof run.at!=='number'||run.away===true)return null;
 return now-run.at>=0&&now-run.at<=RUN_MAX_AGE?run:null;
}

// The renderer's options and the shadows for this device and mode.
export function rendererOptions({handheld,simple}){
 const light=handheld||simple;
 return {antialias:!light,alpha:false,powerPreference:light?'low-power':'high-performance'};
}
export const shadowSize=({handheld,simple})=>handheld||simple?1024:2048;
export const graphicsMode=({simple,gpu})=>simple?'simple':shadowTrouble(gpu)?'noshadow':'full';
// The pixel ratio: simple 1.25, a handheld 1.5 and no more than 2.2 megapixels for the whole picture, a computer 1.75. Never above the
// screen's own ratio, never below 1.
export function pixelRatioFor({devicePixelRatio=1,width=0,height=0,handheld=false,simple=false}){
 const own=Number(devicePixelRatio)>0?Number(devicePixelRatio):1;
 let ratio=Math.min(own,simple?PIXEL_RATIO.simple:handheld?PIXEL_RATIO.handheld:PIXEL_RATIO.desktop);
 if(handheld||simple){const area=Math.max(1,width*height),fit=Math.sqrt(HANDHELD_MAX_PIXELS/area);ratio=Math.min(ratio,fit);}
 return Math.max(Math.min(1,own),Math.floor(ratio*100+1e-9)/100);   // down, so the cap holds
}
