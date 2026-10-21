// The farm's 3D view and an honest error card (21 Oct 2026). Before, public/game.js init showed "This game needs WebGL 2" for anything
// that broke before its renderer was made: its own UI code ran first, so a bug there (or a missing piece of an old browser) read as a
// browser without WebGL 2, and nothing of it reached farm-api (a player in the Android app saw it the day after playing in a browser).
// Now the renderer is made on its own (createFarmRenderer): once as before, once more with the safest options some Android WebViews
// need (no antialiasing, the default power preference, no refusal on a slow GPU), and only when even a plain WebGL 2 context cannot be
// made is it "needs WebGL 2" (in the Android app: update Android System WebView and Chrome, or play in the browser). Anything else is
// "Your saved farm could not load" with Try again. Either way the failure is noted for the next farm load (public/loading-screen.js
// startFailure, farm-api load-stall-service.js): kind 'card', the error line starting with [webgl] or [init].
export const WEBGL_FAILED='WebGL2Unavailable';
// The options of the second try: what a WebView that refuses the first still gives (failIfMajorPerformanceCaveat false is three.js's
// own default; it is said here so no later default can change it).
export const SAFE_CONTEXT=Object.freeze({antialias:false,powerPreference:'default',failIfMajorPerformanceCaveat:false});
export const START_TEXTS=Object.freeze({
 webgl:'This game needs WebGL 2. Try a current browser with hardware acceleration enabled.',
 androidApp:'This phone could not start the 3D farm. Update Android System WebView and Chrome in the Play Store, or play in your browser at harvesttycoon.com.',
 init:'Your saved farm could not load. Please try again.'
});
const freeContext=gl=>{try{gl?.getExtension?.('WEBGL_lose_context')?.loseContext();}catch{}};
// Whether this browser can make a WebGL 2 context at all, with no options: a renderer that failed while it can is not a missing WebGL 2.
export function webgl2Available(makeCanvas){
 try{const gl=makeCanvas().getContext('webgl2');if(!gl)return false;freeContext(gl);return true;}catch{return false;}
}
// make(options) builds the renderer (new THREE.WebGLRenderer); each try gets a canvas of its own (one that refused a context is not asked
// again), with the browser's reason when it gives one (webglcontextcreationerror's statusMessage). Returns {renderer, retried}. Throws
// an error named WebGL2Unavailable only when both tries failed and a plain WebGL 2 context cannot be made either; otherwise the last
// error as it was (a fault of the renderer, not of the browser).
export function createFarmRenderer(make,options,{makeCanvas=()=>document.createElement('canvas'),warn=(...a)=>console.warn(...a)}={}){
 const reasons=[];
 const attempt=extra=>{
  const canvas=makeCanvas(),heard=event=>{const reason=typeof event?.statusMessage==='string'?event.statusMessage.trim():'';if(reason&&!reasons.includes(reason))reasons.push(reason);};
  canvas.addEventListener?.('webglcontextcreationerror',heard);
  try{return make({...options,...extra,canvas});}finally{canvas.removeEventListener?.('webglcontextcreationerror',heard);}
 };
 let last;
 try{return {renderer:attempt({}),retried:false};}catch(error){last=error;}
 try{const renderer=attempt(SAFE_CONTEXT);warn('The 3D view started with the safe options.',last?.message);return {renderer,retried:true};}catch(error){last=error;}
 if(webgl2Available(makeCanvas))throw last;
 const message=String(last?.message||'No WebGL 2 context.')+(reasons.length?` (${reasons.join('; ')})`:'');
 throw Object.assign(new Error(message),{name:WEBGL_FAILED,webgl:true,...(typeof last?.stack==='string'?{stack:last.stack}:{})});
}
// The Android app (public/android-app.js marks <html data-app="android">, the iPhone app also data-app-os="ios"): this page or the page
// around this frame. Only there is the WebView an app of its own that the Play Store updates.
export function androidPhoneApp(win=globalThis.window){
 const marked=w=>{try{const html=w?.document?.documentElement;return html?.getAttribute?.('data-app')==='android'&&html.getAttribute('data-app-os')!=='ios';}catch{return false;}};
 if(marked(win))return true;
 try{return Boolean(win?.parent&&win.parent!==win&&marked(win.parent));}catch{return false;}
}
// The error card's line. A missing WebGL 2: its own text (the app's in the Android app). A message written for players (the village
// that could not load, a server answer) as before; a fault in the code itself (TypeError and the like, whose message means nothing to a
// player) or no message: "Your saved farm could not load. Please try again."
const CODE_FAULTS=['TypeError','ReferenceError','RangeError','SyntaxError','EvalError','URIError','InternalError','AggregateError'];
export function startErrorText(error,{androidApp=false}={}){
 if(error?.name===WEBGL_FAILED)return androidApp?START_TEXTS.androidApp:START_TEXTS.webgl;
 if(!error||typeof error.message!=='string'||!error.message.trim()||CODE_FAULTS.includes(error.name))return START_TEXTS.init;
 return error.message;
}
