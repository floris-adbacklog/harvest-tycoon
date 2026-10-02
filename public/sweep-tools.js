// The hand tools of a sweep (Oct 2026, the CrazyGames review: "harvesting should feel physical"). With a mouse the tool a sweep would
// use is the cursor over a field (a sickle over a ripe crop, a watering can over a crop to water, a seed bag over an empty field), and
// during a sweep that tool follows the pointer and swings at every field it works. Show me for the first harvest draws a see-through
// sickle sweeping over the ripe corn. Drawn here as small inline pictures (no image files); looks only, game.js keeps the rules.
const SICKLE='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M29 31 41 44" stroke="#5a3a1c" stroke-width="8" stroke-linecap="round"/><path d="M29 31 41 44" stroke="#b47a3c" stroke-width="4.5" stroke-linecap="round"/><path d="M31 28C18 35 3 25 9 5c0 13 8 19 21 17z" fill="#e3eaee" stroke="#34424a" stroke-width="2.2" stroke-linejoin="round"/><path d="M11 10c1 7 7 12 16 12" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85"/><circle cx="30" cy="29.5" r="3.4" fill="#d6a640" stroke="#34424a" stroke-width="1.8"/></svg>';
const CAN='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M19 31 6 17" stroke="#24546b" stroke-width="7" stroke-linecap="round"/><path d="M19 31 6 17" stroke="#5fb3d6" stroke-width="3.5" stroke-linecap="round"/><circle cx="5.5" cy="16" r="4" fill="#5fb3d6" stroke="#24546b" stroke-width="2"/><path d="M24 20c0-11 17-11 17 0" fill="none" stroke="#24546b" stroke-width="3.2"/><rect x="17" y="19" width="26" height="22" rx="5" fill="#5fb3d6" stroke="#24546b" stroke-width="2.2"/><path d="M21 24h18" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/><circle cx="4" cy="25" r="1.8" fill="#5fb3d6"/><circle cx="9" cy="28" r="1.6" fill="#5fb3d6"/></svg>';
const SEEDS='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M16 19c-6 6-8 14-6 20 2 6 27 6 29 0 2-6 0-14-6-20z" fill="#d2ab72" stroke="#5e4220" stroke-width="2.2" stroke-linejoin="round"/><path d="M17 19h15l-2-6H19z" fill="#bf9459" stroke="#5e4220" stroke-width="2" stroke-linejoin="round"/><path d="M15.5 19.5h18" stroke="#5e4220" stroke-width="3" stroke-linecap="round"/><path d="M24.5 37c0-5 0-8 4-10-1 4-2 6-4 7m0-1c-3-1-5-3-5-6 3 1 5 3 5 6" fill="#5c9a2f" stroke="#3c6b1c" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="9" cy="8" rx="2" ry="2.8" fill="#8a6420" transform="rotate(-25 9 8)"/><ellipse cx="14" cy="5" rx="1.8" ry="2.5" fill="#8a6420" transform="rotate(20 14 5)"/><ellipse cx="6" cy="14" rx="1.7" ry="2.4" fill="#8a6420"/></svg>';
// hot: the point of the picture that is the pointer (the sickle's cutting edge, the can's rose, the falling seeds), in the 48 grid.
export const TOOL_ART=Object.freeze({harvest:{svg:SICKLE,hot:[14,18]},water:{svg:CAN,hot:[6,16]},plant:{svg:SEEDS,hot:[9,9]}});
// The cursor over a field whose sweep would use this tool, at 32 px (a plain pointer where there is none, or where SVG cursors are not drawn).
export function toolCursor(action){
 const art=TOOL_ART[action];if(!art)return '';
 const svg=art.svg.replace('<svg ','<svg width="32" height="32" ');
 return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${Math.round(art.hot[0]*2/3)} ${Math.round(art.hot[1]*2/3)}, pointer`;
}
// The tool in the hand during a sweep with a mouse: it follows the pointer, faces the way it moves and swings at each field it works
// (no swing when motion is reduced).
export function createSweepTool({doc=globalThis.document,reducedMotion=false}={}){
 const el=doc.createElement('div');el.className='sweep-tool';el.setAttribute('aria-hidden','true');el.hidden=true;doc.body.append(el);
 let kind='';
 return {
  show(action){kind=TOOL_ART[action]?action:'';if(!kind){el.hidden=true;return;}if(el.dataset.tool!==kind){el.dataset.tool=kind;el.innerHTML=TOOL_ART[kind].svg;const [x,y]=TOOL_ART[kind].hot;el.style.setProperty('--hot-x',`${x}px`);el.style.setProperty('--hot-y',`${y}px`);}},
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
  const el=doc.createElement('div');el.className='sweep-tool sweep-ghost';el.setAttribute('aria-hidden','true');el.innerHTML=SICKLE;
  // A little bigger than the tool in the hand (56 px), so it reads as a hint over the fields.
  const [x,y]=TOOL_ART.harvest.hot;el.style.setProperty('--hot-x',`${x*7/6}px`);el.style.setProperty('--hot-y',`${y*7/6}px`);el.style.opacity='0';doc.body.append(el);
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
