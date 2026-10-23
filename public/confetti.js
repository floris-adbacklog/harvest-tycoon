// Confetti on the screen (23 Oct 2026, the owner: "Doe confetti als je een nieuw gebouw opent en koopt"): a burst of the farm's own
// confetti colours (game.js CONFETTI: buttons.css's green, gold, red and diamond blue, and the harvest's light gold) thrown up from a
// spot and falling away, over everything: in the window that is open (a modal window lies above the rest of the page), else over the
// farm. Pieces never catch a tap and are gone after a second and a half. Never with reduced motion. Nothing here ever throws.
export const CONFETTI_COLOURS=Object.freeze(['#58b865','#f2b544','#e0624c','#7fc3ea','#ffe58a']);
export function confettiBurst({x,y,count=36,doc=globalThis.document,win=globalThis.window,random=Math.random}={}){
 try{
  if(win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return null;
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  let host=null;try{host=[...doc.querySelectorAll('dialog[open]')].filter(d=>d.matches(':modal')).at(-1)??null;}catch{}
  const layer=doc.createElement('div');layer.className='confetti-layer';layer.setAttribute('aria-hidden','true');
  layer.style.cssText='position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden';
  for(let i=0;i<count;i++){
   const piece=doc.createElement('i'),angle=-Math.PI/2+(random()-.5)*Math.PI*1.1,speed=120+random()*170;
   const dx=Math.cos(angle)*speed,dy=Math.sin(angle)*speed,fall=160+random()*140,spin=(random()-.5)*900,w=7+random()*5;
   piece.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${w*.6}px;margin:${-w*.3}px 0 0 ${-w/2}px;border-radius:2px;background:${CONFETTI_COLOURS[i%CONFETTI_COLOURS.length]}`;
   layer.append(piece);
   piece.animate?.([
    {transform:'translate(0,0) rotate(0deg)',opacity:1},
    {transform:`translate(${dx}px,${dy}px) rotate(${spin/2}deg)`,opacity:1,offset:.45},
    {transform:`translate(${dx*1.35}px,${dy+fall}px) rotate(${spin}deg)`,opacity:0}
   ],{duration:1100+random()*400,easing:'cubic-bezier(.2,.7,.35,1)',fill:'forwards'});
  }
  (host??doc.body).append(layer);
  setTimeout(()=>layer.remove(),1600);
  return layer;
 }catch{return null;}
}
// From the middle of a spot on the screen (a button's box, read before the window draws itself again).
export function confettiFrom(box,options={}){
 if(!box)return null;
 return confettiBurst({x:box.left+box.width/2,y:box.top+box.height/2,...options});
}
