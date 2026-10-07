// "Show me" points the way instead of doing it (1 Oct 2026, player feedback: "The help needs to teach rather than do"). A coach
// is a short list of steps; each step finds a button, gives it a glowing ring and a speech bubble with one short sentence, and
// waits for the farmer to tap it. Then the next step looks for its button (in the window that tap opened), and so on. The bubble
// lets every tap through (pointer-events: none), sits inside the open window when the button is in one (so it is drawn above it),
// stays on screen on a phone, and goes away after the last tap, on Escape, when its window closes, or after a while.
const visible=el=>{if(!el?.isConnected)return false;const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&!el.closest('[hidden]');};
// On the screen right now (a map label can be outside the view on a phone).
export const onScreen=(el,win=globalThis)=>{if(!visible(el))return false;const r=el.getBoundingClientRect();return r.bottom>0&&r.right>0&&r.top<win.innerHeight&&r.left<win.innerWidth;};
// Part of its own window lies over the button's middle (7 Oct 2026: at 1280x720 the Market's sticky "This basket is worth" bar sat over
// Sell all, and a new farmer had to find it by scrolling). Something from another layer (a toast, a second window) does not count:
// scrolling the window would not help.
export const covered=(el,host,doc=globalThis.document)=>{const r=el.getBoundingClientRect(),top=doc.elementFromPoint?.(r.left+r.width/2,r.top+r.height/2);return Boolean(top)&&!el.contains(top)&&host.contains(top);};
// Where the bubble goes: above the button when there is room (the bottom bar on a phone), otherwise below it; centred on the button
// and kept 12 px from the edges. The arrow points at the middle of the button.
export function bubblePlace(target,bubble,view){
 const gap=12,margin=12,above=target.top-gap-bubble.height>=margin;
 const left=Math.min(Math.max(margin,target.left+target.width/2-bubble.width/2),Math.max(margin,view.width-margin-bubble.width));
 const top=above?target.top-gap-bubble.height:Math.min(target.bottom+gap,view.height-margin-bubble.height);
 const arrow=Math.min(Math.max(16,target.left+target.width/2-left),bubble.width-16);
 return {left,top,above,arrow};
}
export function createCoach({doc=globalThis.document,win=globalThis,timeout=25000}={}){
 let run=null;
 function stop(){
  if(!run)return;const r=run;run=null;
  cancelAnimationFrame(r.frame);clearTimeout(r.timer);r.target?.classList.remove('coach-target');r.bubble?.remove();
  doc.removeEventListener('click',r.onClick,true);doc.removeEventListener('keydown',r.onKey,true);
 }
 function start(steps){
  stop();if(!steps?.length)return;
  const r=run={steps,index:-1,target:null,bubble:null,host:null,frame:0,timer:0,waitUntil:0};
  r.onKey=event=>{if(event.key==='Escape')stop();};
  // The farmer tapped the button: on to the next step once the window it opens is there.
  // Only from the step that was tapped: a tab that already passed itself on must not move the coach on twice.
  r.onClick=event=>{if(run!==r||!r.target||!event.target.closest)return;const at=r.index;if(r.target.contains(event.target))setTimeout(()=>{if(run===r&&r.index===at)advance();},60);};
  doc.addEventListener('click',r.onClick,true);doc.addEventListener('keydown',r.onKey,true);
  advance();
 }
 function advance(){
  const r=run;if(!r)return;
  r.target?.classList.remove('coach-target');r.bubble?.remove();r.target=null;r.bubble=null;
  r.index++;if(r.index>=r.steps.length){stop();return;}
  r.waitUntil=Date.now()+4000;clearTimeout(r.timer);r.timer=setTimeout(stop,timeout);
  r.frame=requestAnimationFrame(tick);
 }
 // Every frame: find the step's button (a window may still be opening, or may draw its list again), then keep the bubble beside it.
 function tick(){
  const r=run;if(!r)return;
  const step=r.steps[r.index],found=step.find();
  // A step that is already done (the right tab is open) passes straight on.
  if(found?.skip){advance();return;}
  const el=found?.el??found,text=found?.text??step.text;
  if(!el||!visible(el)){
   if(r.target){r.target.classList.remove('coach-target');r.bubble?.remove();r.target=null;r.bubble=null;}
   // The window this step was in has closed, or the button never came: the coach ends quietly.
   if(Date.now()>r.waitUntil){stop();return;}
   r.frame=requestAnimationFrame(tick);return;
  }
  r.waitUntil=Date.now()+1500;
  const host=el.closest('dialog[open]')??doc.body;
  if(el!==r.target||host!==r.host||r.bubble?.dataset.text!==text){
   r.target?.classList.remove('coach-target');r.bubble?.remove();
   r.target=el;r.host=host;el.classList.add('coach-target');r.scrolledAt=0;
   const bubble=doc.createElement('div');bubble.className='coach-bubble';bubble.setAttribute('role','status');bubble.dataset.text=text;bubble.textContent=text;
   host.append(bubble);r.bubble=bubble;
  }
  // A button in a window is brought to the middle of the screen, with room for the bubble (on a phone on its side it sat on the
  // edge); again if the window's content moves it off, or a sticky part of the window lies over it (covered). Buttons on the farm
  // and in the bars never scroll the game.
  const seen=el.getBoundingClientRect();
  if(host!==doc.body&&(seen.top<0||seen.bottom>win.innerHeight||seen.left<0||seen.right>win.innerWidth||covered(el,host,doc))&&Date.now()-r.scrolledAt>600){r.scrolledAt=Date.now();el.scrollIntoView?.({block:'center',inline:'nearest'});}
  const t=el.getBoundingClientRect(),b=r.bubble.getBoundingClientRect();
  const place=bubblePlace(t,b,{width:win.innerWidth,height:win.innerHeight});
  // Inside a window the bubble may be placed relative to that window: correct for where it actually landed.
  const nowLeft=parseFloat(r.bubble.style.left)||0,nowTop=parseFloat(r.bubble.style.top)||0;
  r.bubble.style.left=`${nowLeft+place.left-b.left}px`;r.bubble.style.top=`${nowTop+place.top-b.top}px`;
  r.bubble.style.setProperty('--coach-arrow',`${place.arrow}px`);r.bubble.classList.toggle('is-below',!place.above);
  r.frame=requestAnimationFrame(tick);
 }
 return {start,stop,get active(){return Boolean(run);}};
}
