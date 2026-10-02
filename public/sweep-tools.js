// The hand tools of a sweep (Oct 2026, the CrazyGames review: "harvesting should feel physical"). With a mouse the tool a sweep would
// use is the cursor over a field (a sickle over a ripe crop, a watering can over a crop to water, a seed bag over an empty field, gloves
// over a crop that needs care), and during a sweep that tool follows the pointer and swings at every field it works. Show me for the
// first harvest draws a see-through sickle sweeping over the ripe corn. Looks only, game.js keeps the rules.
// Painted pictures (Oct 2026): the owner painted the four tools (WebP like every game picture, public/assets/icons/tool-*.webp, 256 px,
// listed in visual-icons.js), so care has its own tool now too. The small inline drawings below stay as the cursor until a picture has
// loaded, and if one cannot load, so a field never loses its tool.
import {pictureFile} from './visual-icons.js';
const SICKLE='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M29 31 41 44" stroke="#5a3a1c" stroke-width="8" stroke-linecap="round"/><path d="M29 31 41 44" stroke="#b47a3c" stroke-width="4.5" stroke-linecap="round"/><path d="M31 28C18 35 3 25 9 5c0 13 8 19 21 17z" fill="#e3eaee" stroke="#34424a" stroke-width="2.2" stroke-linejoin="round"/><path d="M11 10c1 7 7 12 16 12" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85"/><circle cx="30" cy="29.5" r="3.4" fill="#d6a640" stroke="#34424a" stroke-width="1.8"/></svg>';
const CAN='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M19 31 6 17" stroke="#24546b" stroke-width="7" stroke-linecap="round"/><path d="M19 31 6 17" stroke="#5fb3d6" stroke-width="3.5" stroke-linecap="round"/><circle cx="5.5" cy="16" r="4" fill="#5fb3d6" stroke="#24546b" stroke-width="2"/><path d="M24 20c0-11 17-11 17 0" fill="none" stroke="#24546b" stroke-width="3.2"/><rect x="17" y="19" width="26" height="22" rx="5" fill="#5fb3d6" stroke="#24546b" stroke-width="2.2"/><path d="M21 24h18" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/><circle cx="4" cy="25" r="1.8" fill="#5fb3d6"/><circle cx="9" cy="28" r="1.6" fill="#5fb3d6"/></svg>';
const SEEDS='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M16 19c-6 6-8 14-6 20 2 6 27 6 29 0 2-6 0-14-6-20z" fill="#d2ab72" stroke="#5e4220" stroke-width="2.2" stroke-linejoin="round"/><path d="M17 19h15l-2-6H19z" fill="#bf9459" stroke="#5e4220" stroke-width="2" stroke-linejoin="round"/><path d="M15.5 19.5h18" stroke="#5e4220" stroke-width="3" stroke-linecap="round"/><path d="M24.5 37c0-5 0-8 4-10-1 4-2 6-4 7m0-1c-3-1-5-3-5-6 3 1 5 3 5 6" fill="#5c9a2f" stroke="#3c6b1c" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="9" cy="8" rx="2" ry="2.8" fill="#8a6420" transform="rotate(-25 9 8)"/><ellipse cx="14" cy="5" rx="1.8" ry="2.5" fill="#8a6420" transform="rotate(20 14 5)"/><ellipse cx="6" cy="14" rx="1.7" ry="2.4" fill="#8a6420"/></svg>';
// picture: the painted tool, TOOL_SIZE px square; hot: its working point in those pixels, the point that is the pointer (the sickle's
// blade tip, the can's rose, the bag's opening, the tip of the leaf the gloves hold). svg and svgHot (48 grid): the inline drawing that
// stands in until the picture is there (care has none: a plain pointer meanwhile, as care had before).
export const TOOL_SIZE=256;
export const TOOL_ART=Object.freeze({
 harvest:Object.freeze({picture:pictureFile('tool-sickle'),hot:[47,10],svg:SICKLE,svgHot:[14,18]}),
 water:Object.freeze({picture:pictureFile('tool-can'),hot:[52,54],svg:CAN,svgHot:[6,16]}),
 plant:Object.freeze({picture:pictureFile('tool-seeds'),hot:[100,84],svg:SEEDS,svgHot:[9,9]}),
 tend:Object.freeze({picture:pictureFile('tool-gloves'),hot:[10,16]})
});
// The cursor over a field whose sweep would use this tool. A CSS cursor does not reliably take a WebP and wants a small picture, so the
// painted tool is drawn once on a 40 px canvas (and an 80 px one for sharp screens, where the browser takes image-set) and handed over
// as a PNG. Until then, or if the picture cannot load, the inline drawing at 32 px is the cursor (a plain pointer where there is none).
// Made once per tool (it is asked on every mouse move); the fallback is joined on, so the translation catalog never takes ", pointer"
// for a text.
export const CURSOR_PX=40;
const CURSORS=new Map(),LOADING=new Set(),LOADED=new Set();
function drawingCursor(art){
 if(!art.svg)return '';
 const svg=art.svg.replace('<svg ','<svg width="32" height="32" ');
 return [`url("data:image/svg+xml,${encodeURIComponent(svg)}") ${Math.round(art.svgHot[0]*2/3)} ${Math.round(art.svgHot[1]*2/3)}`,'pointer'].join(', ');
}
function pictureCursor(img,art,doc){
 const png=px=>{const c=doc.createElement('canvas');c.width=c.height=px;const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(img,0,0,px,px);return c.toDataURL('image/png');};
 const [x,y]=art.hot.map(v=>Math.round(v*CURSOR_PX/TOOL_SIZE)),one=png(CURSOR_PX),plain=[`url("${one}")`,x,y].join(' ');
 const sharp=[['image-set(',`url("${one}") 1x, url("${png(CURSOR_PX*2)}") 2x`,')'].join(''),x,y].join(' ');   // joined, as above
 return [globalThis.CSS?.supports?.('cursor',[sharp,'pointer'].join(', '))?sharp:plain,'pointer'].join(', ');
}
// Loads the painted tool once; when it is there its cursor replaces the drawing from the next mouse move on (and LOADED tells the hand
// the picture is there). Without a browser (the tests) nothing loads and the drawing stays.
function loadCursor(action,art){
 const doc=globalThis.document,Img=globalThis.Image;
 if(LOADING.has(action)||!doc||typeof Img!=='function')return;
 LOADING.add(action);const img=new Img();
 img.onload=()=>{LOADED.add(action);try{CURSORS.set(action,pictureCursor(img,art,doc));}catch{}};   // a canvas that cannot be read keeps the drawing
 img.src=art.picture;
}
export function toolCursor(action){
 const art=TOOL_ART[action];if(!art)return '';
 loadCursor(action,art);
 if(!CURSORS.has(action))CURSORS.set(action,drawingCursor(art));
 return CURSORS.get(action);
}
// Puts a tool's painted picture in el at size px, with its working point as --hot-x/--hot-y (the point on the pointer and the turning
// point of the swing). If the picture cannot load the inline drawing takes its place (care has none: the hand only takes its gloves
// once they have loaded, see createSweepTool).
function holdTool(el,art,size){
 const img=el.ownerDocument.createElement('img'),hot=([x,y],of)=>{el.style.setProperty('--hot-x',`${x*size/of}px`);el.style.setProperty('--hot-y',`${y*size/of}px`);};
 img.alt='';img.draggable=false;img.decoding='async';
 img.addEventListener('error',()=>{if(!art.svg||img.parentNode!==el)return;img.outerHTML=art.svg;hot(art.svgHot,48);},{once:true});
 img.src=art.picture;el.replaceChildren(img);hot(art.hot,TOOL_SIZE);
}
// The tool in the hand during a sweep with a mouse: it follows the pointer, faces the way it moves and swings at each field it works
// (no swing when motion is reduced). 48 px, the painted picture (it is loaded already: the cursor over the first field asked for it).
// Review (Oct 2026): a tool without a drawing (care) is only taken in the hand once its picture has loaded. The cursor hides while the
// hand holds a tool, so gloves that are not there (yet, or at all) would leave a care sweep without any pointer; it keeps the plain
// pointer instead, as care had before.
export function createSweepTool({doc=globalThis.document,reducedMotion=false}={}){
 const el=doc.createElement('div');el.className='sweep-tool';el.setAttribute('aria-hidden','true');el.hidden=true;doc.body.append(el);
 let kind='';
 return {
  show(action){const art=TOOL_ART[action];kind=art&&(art.svg||LOADED.has(action))?action:'';if(!kind){el.hidden=true;return;}if(el.dataset.tool!==kind){el.dataset.tool=kind;holdTool(el,TOOL_ART[kind],48);}},
  move(x,y,dx=0){if(!kind)return false;el.hidden=false;el.style.translate=`${x}px ${y}px`;if(Math.abs(dx)>1.5)el.classList.toggle('to-left',dx<0);return true;},
  cut(){if(reducedMotion||el.hidden)return;el.classList.remove('is-cutting');void el.offsetWidth;el.classList.add('is-cutting');},
  hide(){kind='';el.hidden=true;el.classList.remove('is-cutting');},
  get shown(){return !el.hidden;}
 };
}
// Show me for the first harvest: one loop of the ghost sickle over the ripe fields (screen points, in order) at k (0 to 1). It comes in
// over the first field, holds there a moment (a finger on a phone holds before it sweeps), sweeps over the others and lifts away.
export const GHOST_LOOP_MS=2800;
export function ghostPose(points,k){
 if(!points?.length)return null;
 const at=(p,extra)=>({x:p.x,y:p.y,opacity:1,press:0,...extra});
 if(k<.12)return at(points[0],{opacity:k/.12});
 if(k<.3)return at(points[0],{press:1});
 if(k>=.8)return at(points.at(-1),{opacity:Math.max(0,1-(k-.8)/.2)});
 const legs=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=legs.reduce((a,b)=>a+b,0);
 if(!total)return at(points[0],{press:1});
 const u=(k-.3)/.5,eased=u<.5?2*u*u:1-2*(1-u)*(1-u);let left=eased*total;
 for(let i=0;i<legs.length;i++){if(left<=legs[i]||i===legs.length-1){const f=legs[i]?Math.min(1,left/legs[i]):1,a=points[i],b=points[i+1];return at({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f},{press:.6,dx:b.x-a.x});}left-=legs[i];}
 return at(points.at(-1));
}
// points(): where the ripe fields are on the screen right now (the farm may move), or null when the ghost is done (the first harvest
// is in). It lets every tap through and leaves by itself; with reduced motion it stays still over the first field.
export function createSweepGhost({doc=globalThis.document,win=globalThis,reducedMotion=false}={}){
 let run=null;
 function stop(){if(!run)return;win.cancelAnimationFrame(run.frame);run.el.remove();run=null;}
 function start(points){
  stop();
  const el=doc.createElement('div');el.className='sweep-tool sweep-ghost';el.setAttribute('aria-hidden','true');
  // The painted sickle, a little bigger than the tool in the hand (56 px), so it reads as a hint over the fields.
  holdTool(el,TOOL_ART.harvest,56);el.style.opacity='0';doc.body.append(el);
  const r=run={el,points,began:win.performance?.now?.()??Date.now(),frame:0};
  const tick=now=>{
   if(run!==r)return;const pts=r.points();if(!pts){stop();return;}
   const pose=reducedMotion?{...pts[0],opacity:1,press:0}:ghostPose(pts,((now-r.began)%GHOST_LOOP_MS)/GHOST_LOOP_MS);
   if(pose){el.style.translate=`${pose.x}px ${pose.y}px`;el.style.opacity=String(.85*pose.opacity);el.style.scale=String(1-.12*pose.press);if(pose.dx)el.classList.toggle('to-left',pose.dx<0);}
   r.frame=win.requestAnimationFrame(tick);
  };
  r.frame=win.requestAnimationFrame(tick);
 }
 return {start,stop,get active(){return Boolean(run);}};
}
