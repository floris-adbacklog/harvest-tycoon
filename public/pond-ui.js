import {art,refreshArt} from './visual-icons.js';
import {FISH,POND_MAX_CASTS,POND_REFILL_MS,POND_BOOK_DIAMONDS,POND_PERFECT,pondCasts,pondFish,pondBookDone,todaysFish,featureUnlocked,featureUnlockHint,formatDuration} from './farm-state.js';
import {createReel} from './pond-reel.js';
import {createPondScene} from './pond-scene.js';
import {fitText} from './fit-text.js';
// The Fishing pond (11 Oct 2026, part C): a mode of the farm screen, not a window. The camera glides to the pier, the farm's buttons
// fold away and one button does everything: tap to cast, tap again when the float dips, hold to reel (also a tap or a hold anywhere on
// the water, Space or Enter). The rule is on this screen: in the Fish book's "How fishing works" and in the line above the button.
// It is a <dialog> that is open but not modal, so every card that waits for no open window (a level-up, the admin's pop-ups, the
// offers, Welcome back) waits until "Back to my farm"; a gift (game.js giftPopup) is held here (hold) and shown then.
// Farm only, never in the village (game.js loads this module only on the farm, and only once POND_OPEN is on).
const say={cast:'Tap to cast.',wait:'Wait for the float to dip…',soon:'Too soon! Wait for the big dip.',now:'Now! Tap!',reel:'Hold to reel in. Let go to give it line. Keep the fish in the green.',
 missed:'Missed it. The fish is still there: cast again.',slipped:'The fish slipped off. It’s still in the pond: cast again.',tired:'It’s getting tired.',paused:'Paused. Tap to go on.',
 letGo:'You let the fish go.',empty:'No casts left. A new cast comes every 20 minutes.'};
const NAME='Fishing pond';
const kg=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const number=n=>n.toLocaleString('en-US');
export function createPond({state,scene,game,labels,runAction,now,play=()=>{},haptic=()=>{},toast=()=>{},resize=()=>{},reducedMotion=false,focusFarm=()=>{}}){
 // The pond's own cue: now and then a fish jumps while casts are waiting and nothing on the farm is ripe (a ripe crop comes first).
 const pond3d=createPondScene({scene,reducedMotion,cue:()=>!isOpen&&featureUnlocked(state,'fishing')&&pondCasts(state,now()).casts>0&&!state.plots.some(p=>p.crop&&p.readyAt<=now())});
 const dialog=document.createElement('dialog');dialog.id='pond-view';dialog.className='pond-view';dialog.setAttribute('aria-labelledby','pond-title');
 dialog.innerHTML=`<div class="pond-water" data-pond-water></div>
 <div class="pond-top"><button type="button" class="pond-back" data-pond-back><span aria-hidden="true">‹</span><span>My farm</span></button>
  <h2 id="pond-title" class="pond-title">${art('fishingpond')}<span>Fishing pond</span></h2>
  <div class="pond-top-right"><span class="pond-casts" data-pond-casts><b></b><small></small></span><button type="button" class="pond-book-open" data-pond-book>${art('fishingpond')}<span>Fish book</span></button></div></div>
 <p class="pond-today" data-pond-today></p>
 <button type="button" class="pond-chip" data-pond-chip hidden></button>
 <div class="pond-play"><p class="pond-say" data-pond-say aria-live="polite"></p><p class="pond-say-more" data-pond-more hidden></p>
  <div class="pond-controls"><button type="button" class="pond-act" data-pond-act><svg class="pond-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><circle class="pond-ring-fill" cx="50" cy="50" r="46" pathLength="100"/></svg><span data-pond-label>Cast</span></button>
   <div class="pond-bar" data-pond-bar hidden aria-hidden="true"><div class="pond-zone" data-pond-zone></div><span class="pond-mark" data-pond-mark></span></div></div>
  <button type="button" class="pond-letgo" data-pond-letgo hidden>Let it go (uses this cast)</button></div>
 <section class="pond-card" data-pond-card hidden aria-live="polite"></section>
 <section class="pond-book" data-pond-bookpanel hidden aria-labelledby="pond-book-title"></section>`;
 game.append(dialog);
 const $=name=>dialog.querySelector(`[data-pond-${name}]`);
 const act=$('act'),label=$('label'),sayLine=$('say'),more=$('more'),bar=$('bar'),zone=$('zone'),mark=$('mark'),card=$('card'),book=$('bookpanel'),letGo=$('letgo'),chip=$('chip');
 const ringFill=dialog.querySelector('.pond-ring-fill');
 // Where to find it: a pin over the pier (with the casts waiting), a tile in the More menu (phones) and in Buildings › Around the farm.
 const pin=document.createElement('button');pin.type='button';pin.className='pond-label';pin.setAttribute('aria-label',`Open ${NAME}`);pin.title=NAME;pin.hidden=true;
 pin.innerHTML=`${art('fishingpond')}<em class="pond-badge"></em>`;pin.onclick=()=>open();labels.append(pin);
 const menuGrid=document.querySelector('#more-dialog .mobile-menu-grid'),farmHeading=menuGrid?.querySelector('[data-section-heading="farm"]');
 const tile=document.createElement('button');tile.dataset.menuUtility='fishing';tile.innerHTML=`${art('fishingpond')}<span><strong>Fishing pond</strong><small class="menu-hint">Fish while your crops grow</small></span>`;
 tile.onclick=()=>{document.getElementById('more-dialog')?.close();open();};if(farmHeading)farmHeading.after(tile);
 const shortcut=document.createElement('button');shortcut.type='button';shortcut.className='pond-shortcut';shortcut.innerHTML=`${art('fishingpond')}<span>Fishing pond</span>`;shortcut.hidden=true;
 shortcut.onclick=()=>{document.getElementById('buildings-dialog')?.close();open();};document.querySelector('#buildings-dialog .utility-shortcuts')?.append(shortcut);
 let isOpen=false,phase='idle',clock=0,phaseAt=0,reel=null,holding=false,fishN=-1,tries=0,escapes=0,waitEnd=0,nibbles=[],paused=false,sending=false,loop=0,last=0,held=[];
 let glide={from:0,to:0,at:0,ms:600};
 const mix=()=>{const k=glide.ms>0?Math.min(1,(performance.now()-glide.at)/glide.ms):1,e=k<.5?2*k*k:1-(-2*k+2)**2/2;return glide.from+(glide.to-glide.from)*e;};
 const gliding=()=>performance.now()-glide.at<glide.ms;
 const unlocked=()=>featureUnlocked(state,'fishing');
 const casts=()=>pondCasts(state,now());
 const current=()=>state.pond?.n??0;
 function setPhase(next){phase=next;phaseAt=clock;dialog.dataset.phase=next;}
 // The button's word, on one line: a long one (Binnenhalen, Підтягнути) is made smaller once its language has put it there.
 function word(text){label.textContent=text;requestAnimationFrame(()=>fitText(label,10));}
 function tell(text,extra=''){sayLine.textContent=text;more.textContent=extra;more.hidden=!extra;}
 // Back to a fresh cast: the same fish is still on the hook after a miss or an escape (fishN, tries), a new one after a catch.
 function idle(text){
  if(fishN!==current()){fishN=current();tries=0;escapes=0;}
  reel=null;holding=false;bar.hidden=true;setPhase('idle');pond3d.ready();
  const c=casts().casts;act.disabled=c<1;word('Cast');ringFill.style.strokeDashoffset='100';
  letGo.hidden=!(escapes>=2&&c>0);tell(text??(c<1?say.empty:say.cast));top();
 }
 // The wait for a bite: the first fish bites without fake nibbles, the second after one; then 1.5 to 4.5 seconds with up to two.
 function planWait(){
  const n=current(),wait=n===0?2.2:n===1?3:1.5+Math.random()*3,count=n===0?0:n===1?1:Math.floor(Math.random()*3);
  waitEnd=clock+wait;nibbles=Array.from({length:count},(_,i)=>clock+wait*(i+1)/(count+1.4)+Math.random()*.2).sort((a,b)=>a-b);
 }
 function cast(){
  if(casts().casts<1||sending){idle();return;}
  card.hidden=true;letGo.hidden=true;setPhase('cast');pond3d.cast();play('cast');word('Wait');tell(say.wait);planWait();waitEnd+=.7;nibbles=nibbles.map(t=>t+.7);
 }
 function bite(){setPhase('bite');pond3d.bite();play('bite');haptic('bite');word('Strike!');tell(say.now);}
 function strike(){
  const fish=pondFish(state,fishN);
  reel=createReel(fish.species,{tries,first:fishN===0});setPhase('reel');pond3d.fight(fish.species);
  bar.hidden=false;mark.innerHTML=art(`fish-${fish.species}`,'pond-mark-art');word('Reel');tell(say.reel);draw();
 }
 async function landed(){
  const fish=pondFish(state,fishN),perfect=reel.perfect;setPhase('landing');bar.hidden=true;pond3d.land(fish.species);play('catch');haptic('reward');
  sending=true;let result;
  try{result=await runAction({type:'fish',n:fishN,landed:true,perfect});}catch(error){sending=false;toast(error.message);idle();return;}
  sending=false;if(!isOpen)return;showCard(result);
 }
 function slipped(){
  tries++;escapes++;pond3d.escape();play('escape');haptic('escape');idle();tell(say.slipped,say.tired);
 }
 async function release(){
  if(sending||casts().casts<1)return;sending=true;
  try{await runAction({type:'fish',n:fishN,landed:false,perfect:false});}catch(error){sending=false;toast(error.message);idle();return;}
  sending=false;pond3d.escape();idle(say.letGo);
 }
 // The catch: the painted fish, its weight, what was special and what it paid; the main button casts again while casts are left.
 function showCard(r){
  const f=FISH[r.species],left=r.casts.casts,tags=[];
  // Each tag a text of its own (plain strings, so the languages find them).
  if(r.first)tags.push(['is-new','New fish for your book!']);else if(r.record)tags.push(['is-record','New record!']);
  if(r.perfect)tags.push(['',`Perfect catch! +${Math.round(POND_PERFECT*100)}% coins`]);
  if(r.today)tags.push(['','Today’s fish: double coins']);
  if(r.diamonds)tags.push(['is-book','Fish book complete!']);
  card.innerHTML=`<div class="pond-card-fish">${art(`fish-${r.species}`,'pond-card-art')}<div><span class="eyebrow">YOU CAUGHT</span><h3>${f.name}</h3><p class="pond-kg">${kg(r.kg)} kg</p></div></div>
   ${tags.length?`<div class="pond-tags">${tags.map(([cls,text])=>`<b class="pond-tag ${cls}">${text}</b>`).join('')}</div>`:''}
   <div class="pond-rewards"><strong class="reward-coins">${art('coins')}+${number(r.coins)} coins</strong><strong class="reward-xp">${art('xp')}+${number(r.xp)} XP</strong>${r.diamonds?`<strong class="reward-diamonds">${art('diamonds')}+${r.diamonds} diamonds</strong>`:''}</div>
   ${left<1?`<p class="pond-card-note">That was your last cast. A new one comes every ${POND_REFILL_MS/60000} minutes (up to ${POND_MAX_CASTS}).</p>`:''}
   <div class="pond-card-actions">${left>0?`<button type="button" class="primary-button" data-card-again>Cast again (${left} left)</button><button type="button" class="secondary-button" data-card-farm>Back to my farm</button>`:'<button type="button" class="primary-button" data-card-farm>Back to my farm</button>'}</div>`;
  card.querySelector('[data-card-again]')?.addEventListener('click',()=>{card.hidden=true;fishN=current();tries=0;escapes=0;cast();});
  card.querySelector('[data-card-farm]').addEventListener('click',()=>close());
  setPhase('result');card.hidden=false;tell('');refreshArt();top();
  (card.querySelector('[data-card-again]')??card.querySelector('[data-card-farm]')).focus({preventScroll:true});
 }
 // The Fish book: the eight kinds with their best weight (a shadow until caught), the reward for all eight and how fishing works.
 function openBook(){
  const best=state.pond?.best??{},caught=Object.keys(FISH).filter(k=>best[k]>0).length,done=pondBookDone(state);
  book.innerHTML=`<div class="pond-book-head"><div><h3 id="pond-book-title">Fish book</h3><p>${caught} of ${Object.keys(FISH).length} caught</p></div><button type="button" class="icon-button" data-book-close aria-label="Close">×</button></div>
   <ul class="pond-book-list">${Object.entries(FISH).map(([key,f])=>{const have=best[key]>0,secret=key==='whiskers'&&!have;
    return `<li class="${have?'is-caught':'is-missing'}">${art(`fish-${key}`,'pond-book-art')}<div><strong>${secret?'?':f.name}</strong><small>${have?`Best: ${kg(best[key])} kg`:secret?'Something big lives in this pond.':'Not caught yet'}</small></div></li>`;}).join('')}</ul>
   <p class="pond-book-reward">${art('diamonds')}<span>${done?`Book complete: ${POND_BOOK_DIAMONDS} diamonds earned.`:`Catch all ${Object.keys(FISH).length} kinds: ${POND_BOOK_DIAMONDS} diamonds, once.`}</span></p>
   <h4>How fishing works</h4><ul class="pond-rules"><li>Tap or press Space to cast. When the float dips, tap again. Hold to reel and keep the fish in the green.</li><li>A fish that gets away stays in the pond: a cast is only used when you land a fish or let it go.</li><li>A new cast every ${POND_REFILL_MS/60000} minutes, up to ${POND_MAX_CASTS}. Today’s fish pays double coins.</li></ul>`;
  book.querySelector('[data-book-close]').onclick=closeBook;book.hidden=false;refreshArt();book.querySelector('[data-book-close]').focus({preventScroll:true});
 }
 function closeBook(){book.hidden=true;act.focus({preventScroll:true});}
 // The top of the screen: casts waiting (and when the next comes), today's fish, and a way back when crops are ripe meanwhile.
 function top(){
  const c=casts(),t=todaysFish(now()),pill=$('casts');
  pill.querySelector('b').textContent=`${c.casts} / ${POND_MAX_CASTS}`;pill.setAttribute('aria-label',`Casts waiting: ${c.casts}`);pill.title=`Casts waiting: ${c.casts}`;
  pill.querySelector('small').textContent=c.nextAt?`Next cast in ${formatDuration(c.nextAt-now())}`:'Casts';
  const today=$('today');if(today.dataset.fish!==t){today.dataset.fish=t;today.innerHTML=`${art(`fish-${t}`)}<span>Today’s fish: ${FISH[t].name}. Pays double.</span>`;refreshArt();}
  const ripe=state.plots.find(p=>p.crop&&p.readyAt<=now());chip.hidden=!ripe;
  if(ripe&&chip.dataset.crop!==ripe.crop){chip.dataset.crop=ripe.crop;chip.innerHTML=`${art(ripe.crop)}<span>Ready to harvest!</span><span aria-hidden="true">›</span>`;refreshArt();}
  if(phase==='idle'){const can=c.casts>0;act.disabled=!can;if(!can&&sayLine.textContent===say.cast)tell(say.empty);if(can&&sayLine.textContent===say.empty)tell(say.cast);}
 }
 function draw(){
  if(!reel)return;
  zone.style.bottom=`${reel.zone}%`;zone.style.height=`${reel.size}%`;mark.style.bottom=`${reel.fish}%`;zone.classList.toggle('is-out',!reel.inside);
  ringFill.style.strokeDashoffset=String(100-reel.progress);pond3d.pull({progress:reel.progress,fishY:reel.fish,inside:reel.inside});
 }
 // The screen's own clock: it only runs while the screen is open and the page is shown, so a hidden tab pauses everything.
 function frame(t){
  loop=isOpen?requestAnimationFrame(frame):0;const dt=Math.min(.1,Math.max(0,(t-(last||t))/1000));last=t;
  if(paused||!isOpen)return;clock+=dt;
  if(phase==='cast'||phase==='wait'){
   if(phase==='cast'&&clock-phaseAt>=.7)setPhase('wait');
   if(nibbles.length&&clock>=nibbles[0]){nibbles.shift();pond3d.nibble();play('nibble');}
   if(clock>=waitEnd)bite();
  }
  else if(phase==='bite'&&clock-phaseAt>FISH[pondFish(state,fishN).species].strike+.15){pond3d.ready();idle(say.missed);}
  else if(phase==='reel'&&reel){
   reel.run(dt,holding);draw();
   if(reel.done==='landed')void landed();else if(reel.done==='escaped')slipped();
  }
  if(gliding())resize();
 }
 function press(){
  if(paused){paused=false;tell(phase==='reel'?say.reel:say.wait);return;}
  if(!book.hidden||!card.hidden&&phase==='result')return;
  if(phase==='idle'){if(casts().casts>0)cast();return;}
  if(phase==='cast'||phase==='wait'){planWait();tell(say.soon);pond3d.nibble();return;}
  if(phase==='bite'){strike();holding=true;return;}
  if(phase==='reel')holding=true;
 }
 const lift=()=>{holding=false;};
 act.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();act.setPointerCapture?.(event.pointerId);press();});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])act.addEventListener(type,lift);
 // A click from the keyboard (Enter, Space on the focused button) is handled by the key listener below; a mouse click by pointerdown.
 act.addEventListener('click',event=>event.preventDefault());
 const water=$('water');water.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();water.setPointerCapture?.(event.pointerId);press();});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])water.addEventListener(type,lift);
 // Closed by something else (another screen that closes every open window first): back to the farm all the same.
 dialog.addEventListener('close',()=>{if(isOpen)close();});
 $('back').onclick=()=>close();$('book').onclick=()=>openBook();letGo.onclick=()=>void release();chip.onclick=()=>{close();focusFarm();};
 function key(event){
  if(!isOpen||event.ctrlKey||event.metaKey||event.altKey)return;
  if(event.key==='Escape'){event.preventDefault();if(!book.hidden)closeBook();else close();return;}
  if(event.key!==' '&&event.key!=='Enter')return;
  const focus=document.activeElement;if(focus&&focus!==act&&focus!==dialog&&focus!==document.body&&focus.closest?.('button,a,input,select,textarea'))return;   // another button: the browser presses it
  event.preventDefault();if(event.type==='keydown'){if(!event.repeat)press();}else lift();
 }
 window.addEventListener('keydown',key,true);window.addEventListener('keyup',key,true);
 document.addEventListener('visibilitychange',()=>{if(!isOpen||!document.hidden)return;holding=false;
  // Back from another tab: a wait or a bite starts over (nothing is lost), a fight waits for a tap.
  if(phase==='cast'||phase==='wait'||phase==='bite'){setPhase('wait');planWait();pond3d.settle();tell(say.wait);word('Wait');}
  if(phase==='reel'){paused=true;tell(say.paused);}});
 function open(){
  if(isOpen)return;
  if(!unlocked()){toast(featureUnlockHint('fishing'));return;}
  for(const d of document.querySelectorAll('dialog[open]'))if(d!==dialog)d.close();
  isOpen=true;dialog.classList.remove('is-closing');dialog.show();document.body.classList.add('fishing');pin.hidden=true;
  glide={from:mix(),to:1,at:performance.now(),ms:reducedMotion?0:600};
  fishN=-1;card.hidden=true;book.hidden=true;paused=false;idle();
  last=0;cancelAnimationFrame(loop);loop=requestAnimationFrame(frame);resize();refreshArt();act.focus({preventScroll:true});
 }
 function close(){
  if(!isOpen)return;
  isOpen=false;holding=false;reel=null;bar.hidden=true;pond3d.off();document.body.classList.remove('fishing');dialog.classList.add('is-closing');
  glide={from:mix(),to:0,at:performance.now(),ms:reducedMotion?0:600};
  const finish=()=>{if(isOpen)return;resize();if(dialog.open)dialog.close();const later=held;held=[];for(const show of later)show();};
  if(reducedMotion)finish();else{const step=()=>{resize();if(gliding())requestAnimationFrame(step);else finish();};requestAnimationFrame(step);}
 }
 // game.js resize(): the fishing view's camera, glided from the farm's own view (focus and frame) by the share still to go.
 function frame3d(camera,focus,aspect){
  const k=mix();if(k<=0)return focus;
  // About 7.6 across the height on a wide screen; on an upright phone about 7 across its width (the pier and the float stack up).
  const span=(aspect<1?7/aspect:7.6)*Math.sqrt(Math.max(1,520/Math.max(300,game.clientHeight)));   // a short frame sees a little more
  // The line sits a little above the middle on a wide screen (clear of the button), a little below it on an upright phone (clear of the top).
  const target=pond3d.focus(),up=span*(aspect<1?-.035:.06)/.874;target.x+=up;target.z+=up;
  const half=span/2,box={left:-half*aspect,right:half*aspect,top:half,bottom:-half};
  for(const side of ['left','right','top','bottom'])camera[side]+=(box[side]-camera[side])*k;
  return focus.clone().lerp(target,k);
 }
 function position(camera,width,height){
  const open=unlocked(),c=open?casts().casts:0;pond3d.show(open);shortcut.hidden=!open;
  if(!open||isOpen){pin.hidden=true;return;}
  const p=pond3d.labelAt().project(camera),x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height;
  pin.style.left=`${x}px`;pin.style.top=`${y}px`;pin.hidden=Math.abs(p.x)>.94||Math.abs(p.y)>.84;
  const badge=pin.querySelector('.pond-badge'),text=String(c);if(badge.textContent!==text)badge.textContent=text;
  pin.classList.toggle('ready',c>=POND_MAX_CASTS);pin.classList.toggle('empty',c<1);pin.title=`Casts waiting: ${c}`;
 }
 let lastTop=0;
 return {
  open,close,viewing:()=>isOpen||mix()>0,frame:frame3d,position,
  // Called by the game's frame: the pond's 3D life, and the top line of the open screen once a second.
  tick(t,dt){pond3d.tick(t,dt);if(isOpen&&t-lastTop>1000){lastTop=t;top();}},
  // A card that would cover the pond waits until the farmer is back on the farm.
  hold(show){if(!isOpen)return false;held.push(show);return true;}
 };
}
