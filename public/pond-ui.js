import {art,refreshArt} from './visual-icons.js';
import {WATERS,POND_MAX_CASTS,POND_PERFECT,POND_NEW_FISH_COINS,POND_NEW_FISH_XP,waterCasts,waterFish,waterBookDone,waterBook2Done,waterPageTwoOpen,waterRefill,worldTwoBuilding,productionJobs,formatDuration} from './farm-state.js';
import {showCollectionCheer} from './collection-cheer.js';
import {createReel} from './pond-reel.js';
import {createPondScene} from './pond-scene.js';
import {fitText} from './fit-text.js';
import {modalOpen} from './windows.js';
// The Fishing pond (11 Oct 2026, part C): a mode of the farm screen, not a window. The camera glides to the pier, the farm's buttons
// fold away and one button does everything: tap to cast, tap again when the float dips, hold to reel (also a tap or a hold anywhere on
// the water, Space or Enter). The rule is on this screen: in the Fish book's "How fishing works" and in the line above the button.
// It is a <dialog> that is open but not modal, so every card that waits for no open window (a level-up, the admin's pop-ups, the
// offers, Welcome back) waits until "Back to my farm"; a gift (game.js giftPopup) is held here (hold) and shown then.
// The village lake (12 Oct 2026, plan D) is this screen for another water: createPond({water:'lake',place}) fishes the lake from the
// rowboat in its middle (place: village-scene.js VILLAGE_FISHING_SPOT), with the lake's own casts, fish and book (farm-state.js WATERS).
// game.js loads it in the village only, once LAKE_OPEN is on; the pond on the farm only, once POND_OPEN is on. A text that differs per
// water is written out in full for each, so the translations find both.
const say={cast:'Tap to cast.',wait:'Wait for the float to dip…',soon:'Too soon! Wait for the big dip.',now:'Now! Tap!',reel:'Hold to reel in. Let go to give it line. Keep the fish in the green.',
 missed:'Missed it. The fish is still there: cast again.',slipped:'The fish slipped off. It’s still in the pond: cast again.',tired:'It’s getting tired.',paused:'Paused. Tap to go on.',
 letGo:'You let the fish go.'};
const pageDone=page=>`Page ${page} complete!`;
const kg=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const number=n=>n.toLocaleString('en-US');
// Where the pond's pin goes (11 Oct 2026, the review). x, y: the pier's spot on the screen; px, py: the same from -1 to 1 (py -1 is the
// bottom edge). On the home view of a phone and of a computer the pier sits at or just past the bottom edge (on a computer behind the
// bar of tools; a phone on its side does not show the pond at all), so the pin was hidden just as level 4 opened the pond. A pier up to
// half the screen below the edge now has its pin waiting at the edge, pointing down at it (edge); it goes above a bar it would sit under
// (bars: the bar of tools) and beside a button group (sides: the camera buttons, a computer's side tools). A pier further away, or off
// to a side, hides it as before (null).
const overlaps=(x,top,b)=>x+26>b.left&&x-26<b.right&&top>b.top-4&&top-52<b.bottom;
export const pinSpot=(x,y,px,py,height,bars=[],sides=[])=>{
 if(Math.abs(px)>.94||py>.84||py<-2)return null;
 let top=Math.min(y,height-6),left=x;for(const b of bars)if(overlaps(left,top,b))top=b.top-6;
 for(const b of sides)if(overlaps(left,top,b))left=left<(b.left+b.right)/2?b.left-30:b.right+30;
 return {x:left,y:top,edge:top<y-1};
};
// How much more of the world the lake's fishing view shows than the pond's (frame3d).
export const LAKE_VIEW=2.2;
export function createPond({water:which='pond',place=null,state,scene,game,labels,runAction,now,play=()=>{},haptic=()=>{},toast=()=>{},resize=()=>{},reducedMotion=false,focusFarm=()=>{}}){
 const W=WATERS[which],lake=which==='lake',FISH=W.fish,NAME=lake?'Village lake':'Fishing pond',ART=lake?'villagelake':'fishingpond';
 const slipText=lake?'The fish slipped off. It’s still in the lake: cast again.':say.slipped;
 // The minutes to a new cast: 20, and 15 at the pond once its whole book is caught (17 Oct 2026, farm-state.js waterRefill).
 const minutes=()=>waterRefill(W,state)/60000,emptyLine=()=>`No casts left. A new cast comes every ${minutes()} minutes.`;
 // What became ready meanwhile, for the way back (the chip) and the jumping fish: a ripe field on the farm; in the village a finished
 // batch at a village place (its good's picture, and the place, which "Show me" turns the camera to).
 const waiting=()=>{
  if(!lake){const plot=state.plots.find(p=>p.crop&&p.readyAt<=now());return plot?{art:plot.crop}:null;}
  for(const [key,b] of Object.entries(state.buildings)){const job=worldTwoBuilding(key)&&productionJobs(b).find(j=>j.readyAt<=now());if(job)return {art:Object.keys(job.output??{})[0]??key,place:key};}
  return null;
 };
 // The water's own cue: now and then a fish jumps while casts are waiting and nothing is ready meanwhile (a ripe crop, a finished batch).
 const pond3d=createPondScene({scene,reducedMotion,place,cue:()=>!isOpen&&W.open(state)&&waterCasts(W,state,now()).casts>0&&!waiting()});
 const dialog=document.createElement('dialog');dialog.id='pond-view';dialog.className='pond-view is-side';dialog.setAttribute('aria-labelledby','pond-title');
 dialog.innerHTML=`<div class="pond-water" data-pond-water></div>
 <div class="pond-top"><button type="button" class="pond-back back-round" data-pond-back><span aria-hidden="true">‹</span><span class="sr-only">${lake?'Village':'My farm'}</span></button>
  <h2 id="pond-title" class="pond-title">${art(ART)}<span>${NAME}</span></h2>
  <div class="pond-top-right"><span class="pond-casts" data-pond-casts><b></b><small></small></span><button type="button" class="pond-book-open" data-pond-book>${art(ART)}<span>Fish book</span></button></div></div>
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
 // The lake (12 Oct 2026): its pin over the rowboat, a tile in the village's More menu right after My farm, and a card in the village's
 // Buildings list right after the Market square (economy-ui.js: the village has no Around the farm).
 const pin=document.createElement('button');pin.type='button';pin.className='pond-label';pin.setAttribute('aria-label',`Open ${NAME}`);pin.title=NAME;pin.hidden=true;
 pin.innerHTML=`${art(ART)}<em class="pond-badge"></em>`;pin.onclick=()=>open();labels.append(pin);
 const menuGrid=document.querySelector('#more-dialog .mobile-menu-grid'),farmHeading=menuGrid?.querySelector('[data-section-heading="farm"]');
 const tile=document.createElement('button');tile.onclick=()=>{document.getElementById('more-dialog')?.close();open();};
 if(lake){tile.dataset.menuLake='';tile.innerHTML=`${art('villagelake')}<span><strong>Village lake</strong><small class="menu-hint">Fish in the mountain lake</small></span>`;menuGrid?.querySelector('#farm-menu-entry')?.after(tile);}
 else{tile.dataset.menuUtility='fishing';tile.innerHTML=`${art('fishingpond')}<span><strong>Fishing pond</strong><small class="menu-hint">Fish while your crops grow</small></span>`;if(farmHeading)farmHeading.after(tile);}
 const shortcut=document.createElement('button');shortcut.type='button';shortcut.className='pond-shortcut';shortcut.innerHTML=`${art('fishingpond')}<span>Fishing pond</span>`;shortcut.hidden=true;
 shortcut.onclick=()=>{document.getElementById('buildings-dialog')?.close();open();};if(!lake)document.querySelector('#buildings-dialog .utility-shortcuts')?.prepend(shortcut);   // first: it opens at level 4, long before the others
 let bookPage=-1,isOpen=false,phase='idle',clock=0,phaseAt=0,reel=null,holding=false,fishN=-1,tries=0,escapes=0,waitEnd=0,nibbles=[],paused=false,sending=false,loop=0,last=0,held=[],shown=-1,paid=0;
 let glide={from:0,to:0,at:0,ms:600};
 const mix=()=>{const k=glide.ms>0?Math.min(1,(performance.now()-glide.at)/glide.ms):1,e=k<.5?2*k*k:1-(-2*k+2)**2/2;return glide.from+(glide.to-glide.from)*e;};
 const gliding=()=>performance.now()-glide.at<glide.ms;
 const unlocked=()=>W.open(state);
 const casts=()=>waterCasts(W,state,now());
 const current=()=>state[W.key]?.n??0;
 const pageTwo=()=>waterPageTwoOpen(W,state);
 function setPhase(next){phase=next;phaseAt=clock;dialog.dataset.phase=next;}
 // The button's word, on one line: a long one (Binnenhalen, Підтягнути) is made smaller once its language has put it there.
 function word(text){label.textContent=text;requestAnimationFrame(()=>fitText(label,10));}
 function tell(text,extra=''){sayLine.textContent=text;more.textContent=extra;more.hidden=!extra;}
 // Back to a fresh cast: the same fish is still on the hook after a miss or an escape (fishN, tries), a new one after a catch.
 function idle(text){
  if(fishN!==current()){fishN=current();tries=0;escapes=0;}
  reel=null;holding=false;bar.hidden=true;setPhase('idle');pond3d.ready();
  const c=casts().casts;act.disabled=c<1;word('Cast');ringFill.style.strokeDashoffset='100';
  letGo.hidden=!(escapes>=2&&c>0);tell(text??(c<1?emptyLine():say.cast));top();
 }
 // The wait for a bite: the first fish bites without fake nibbles, the second after one; then 1.5 to 4.5 seconds with up to two.
 function planWait(){
  const n=current(),wait=n===0?2.2:n===1?3:1.5+Math.random()*3,count=n===0?0:n===1?1:Math.floor(Math.random()*3);
  waitEnd=clock+wait;nibbles=Array.from({length:count},(_,i)=>clock+wait*(i+1)/(count+1.4)+Math.random()*.2).sort((a,b)=>a-b);
 }
 function cast(){
  if(casts().casts<1||sending){idle();return;}
  if(fishN!==current()){fishN=current();tries=0;escapes=0;}   // the farm refused a fish or a let-go after all: that fish is still there
  card.hidden=true;letGo.hidden=true;setPhase('cast');pond3d.cast();play('cast');word('Wait');tell(say.wait);planWait();waitEnd+=.7;nibbles=nibbles.map(t=>t+.7);
 }
 function bite(){setPhase('bite');pond3d.bite();play('bite');haptic('bite');word('Strike!');tell(say.now);}
 function strike(){
  const fish=waterFish(W,state,fishN);
  reel=createReel(fish.species,{tries,first:fishN===0});setPhase('reel');pond3d.fight(fish.species);
  bar.hidden=false;mark.innerHTML=art(`fish-${fish.species}`,'pond-mark-art');word('Reel');tell(say.reel);draw();
 }
 async function landed(){
  const fish=waterFish(W,state,fishN),perfect=reel.perfect;setPhase('landing');bar.hidden=true;pond3d.land(fish.species);play('catch');haptic('reward');
  sending=true;let result;
  try{result=await runAction({type:W.action,n:fishN,landed:true,perfect});}catch(error){sending=false;toast(error.message);idle();return;}
  sending=false;if(!isOpen)return;showCard(result);
 }
 function slipped(){
  tries++;escapes++;pond3d.escape();play('escape');haptic('escape');idle();tell(slipText,say.tired);
 }
 async function release(){
  if(sending||casts().casts<1)return;sending=true;
  try{await runAction({type:W.action,n:fishN,landed:false,perfect:false});}catch(error){sending=false;toast(error.message);idle();return;}
  sending=false;pond3d.escape();idle(say.letGo);
 }
 // The catch: the painted fish, its weight, what was special and what it paid; the main button casts again while casts are left.
 function showCard(r){
  const f=FISH[r.species],left=r.casts.casts,tags=[];
  // Each tag a text of its own (plain strings, so the languages find them).
  // A new kind says what it paid extra (11 Oct 2026, the review: the next of the same kind paid a third and nothing said why).
  if(r.first)tags.push(['is-new',`New fish for your book: ${POND_NEW_FISH_COINS+1}× coins, +${POND_NEW_FISH_XP} XP`]);else if(r.record)tags.push(['is-record','New record!']);
  if(r.perfect)tags.push(['',`Perfect catch! +${Math.round(POND_PERFECT*100)}% coins`]);
  if(r.today)tags.push(['','Today’s fish: double coins']);
  // The book's diamonds (11 Oct 2026, page two): below level 20 the book is one page, as before; from 20 page one's 25 say which page,
  // and the 50 for all 16 kinds (book2, both pages) say the whole book.
  if(r.diamonds)tags.push(['is-book',r.book2||!pageTwo()?'Fish book complete!':pageDone(1)]);
  card.innerHTML=`<div class="pond-card-fish">${art(`fish-${r.species}`,'pond-card-art')}<div><h3>${f.name}</h3><p class="pond-kg">${kg(r.kg)} kg</p></div></div>
   ${tags.length?`<div class="pond-tags">${tags.map(([cls,text])=>`<b class="pond-tag ${cls}">${text}</b>`).join('')}</div>`:''}
   <div class="pond-rewards"><strong class="reward-coins">${art('coins')}+${number(r.coins)} coins</strong><strong class="reward-xp">${art('xp')}+${number(r.xp)} XP</strong>${r.diamonds?`<strong class="reward-diamonds">${art('diamonds')}+${r.diamonds} diamonds</strong>`:''}</div>
   ${left<1?`<p class="pond-card-note">That was your last cast. A new one comes every ${minutes()} minutes (up to ${POND_MAX_CASTS}).</p>`:''}
   <div class="pond-card-actions">${left>0?`<button type="button" class="primary-button" data-card-again>Cast again (${left} left)</button><button type="button" class="secondary-button" data-card-farm>${lake?'Back to the village':'Back to my farm'}</button>`:`<button type="button" class="primary-button" data-card-farm>${lake?'Back to the village':'Back to my farm'}</button>`}</div>`;
  card.querySelector('[data-card-again]')?.addEventListener('click',()=>{card.hidden=true;fishN=current();tries=0;escapes=0;cast();});
  card.querySelector('[data-card-farm]').addEventListener('click',()=>close());
  shown=r.n;paid=state.stats[W.stats.coins]??0;setPhase('result');card.hidden=false;tell('');refreshArt();top();
  // The whole book (17 Oct 2026, the owner's pick 4a): its card in the middle, over the catch, with what the pond gives from now on.
  if(r.book2)showCollectionCheer({title:'Fish book complete!',pictures:Object.keys(FISH).map(key=>`fish-${key}`),
   line:lake?`You caught all ${Object.keys(FISH).length} kinds of fish in the village lake.`:`You caught all ${Object.keys(FISH).length} kinds of fish in your pond.`,rewards:{diamonds:r.diamonds},
   perk:W.fullRefill?`From now on a new cast comes every ${W.fullRefill/60000} minutes at your pond.`:'',perkArt:ART});
  (card.querySelector('[data-card-again]')??card.querySelector('[data-card-farm]')).focus({preventScroll:true});
 }
 // The Fish book: the eight kinds with their best weight (a shadow until caught), the reward for all eight and how fishing works.
 // From level 20 (11 Oct 2026, the owner's call) it has two pages, as tabs: page 2 holds the 8 kinds that swim in the pond from then,
 // and its reward is for all 16 kinds, both pages. Below level 20 there are no tabs and nothing of page 2: the book is as it was.
 // It opens on the page looked at last; the first time on page 2 once page 1 is full.
 const secrets={whiskers:'Something big lives in this pond.',sturgeon:'Something even bigger swims at the bottom.'};
 // The lake's book (12 Oct 2026): two pages of 10 from level 120 (page one's 10 below it); its two legends a shadow and a hint until landed.
 const lakeSecrets={oldgranite:'Something huge lives in this lake.',glacierghost:'Something pale glides in the deep.'};
 // How fishing works, first lines: a fish that gets away stays in this water; the lake's casts are its own.
 const rules=lake?'<li>Tap or press Space to cast. When the float dips, tap again. Hold to reel and keep the fish in the green.</li><li>A fish that gets away stays in the lake: a cast is only used when you land a fish or let it go.</li><li>The lake’s casts are its own: fishing here never uses your farm pond’s casts.</li>'
  :'<li>Tap or press Space to cast. When the float dips, tap again. Hold to reel and keep the fish in the green.</li><li>A fish that gets away stays in the pond: a cast is only used when you land a fish or let it go.</li>';
 function openBook(page){
  const best=state[W.key]?.best??{},two=pageTwo(),turned=page!==undefined;
  if(!turned)page=bookPage>=0?bookPage:waterBookDone(W,state)?1:0;
  page=two?Math.min(1,Math.max(0,page)):0;if(two)bookPage=page;
  const kinds=W.pages[page],caught=kinds.filter(k=>best[k]>0).length;
  // The pond's whole book also gives a cast every 15 minutes (17 Oct 2026); the lake's pays its diamonds only.
  const reward=page===1?(waterBook2Done(W,state)?(W.fullRefill?`Book complete: ${W.book2} diamonds earned, and a new cast every ${W.fullRefill/60000} minutes.`:`Book complete: ${W.book2} diamonds earned.`)
   :W.fullRefill?`Catch all ${Object.keys(FISH).length} kinds on both pages: ${W.book2} diamonds and a new cast every ${W.fullRefill/60000} minutes.`:`Catch all ${Object.keys(FISH).length} kinds on both pages: ${W.book2} diamonds, once.`)
   :waterBookDone(W,state)?(two?`Page ${page+1} complete: ${W.book} diamonds earned.`:`Book complete: ${W.book} diamonds earned.`):`Catch all ${kinds.length} kinds: ${W.book} diamonds, once.`;
  book.innerHTML=`<div class="pond-book-head"><div><h3 id="pond-book-title">Fish book</h3><p>${caught} of ${kinds.length} caught</p></div><button type="button" class="icon-button" data-book-close aria-label="Close">×</button></div>
   ${two?`<div class="market-tabs pond-book-pages" role="tablist" aria-label="Fish book">${[0,1].map(i=>`<button type="button" role="tab" aria-selected="${i===page}" data-book-page="${i}">Page ${i+1}</button>`).join('')}</div>`:''}
   <ul class="pond-book-list">${kinds.map(key=>{const f=FISH[key],have=best[key]>0,secret=!have&&(secrets[key]??lakeSecrets[key]);
    return `<li class="${have?'is-caught':'is-missing'}">${art(`fish-${key}`,'pond-book-art')}<div><strong>${secret?'?':f.name}</strong><small>${have?`Best: ${kg(best[key])} kg`:secret||'Not caught yet'}</small></div></li>`;}).join('')}</ul>
   <p class="pond-book-reward">${art('diamonds')}<span>${reward}</span></p>
   <h4>How fishing works</h4><ul class="pond-rules">${rules}<li>Every fish pays coins (more for a heavier fish and at a higher level) and XP. The first of each kind pays ${POND_NEW_FISH_COINS+1} times its coins and ${POND_NEW_FISH_XP} XP more.</li><li>A new cast every ${minutes()} minutes, up to ${POND_MAX_CASTS}. Today’s fish pays double coins.</li></ul>`;
  book.querySelector('[data-book-close]').onclick=closeBook;
  for(const tab of book.querySelectorAll('[data-book-page]'))tab.onclick=()=>openBook(Number(tab.dataset.bookPage));
  book.hidden=false;refreshArt();(turned&&book.querySelector(`[data-book-page="${page}"]`)||book.querySelector('[data-book-close]')).focus({preventScroll:true});
 }
 function closeBook(){book.hidden=true;act.focus({preventScroll:true});}
 // The top of the screen: casts waiting (and when the next comes), today's fish, and a way back when crops are ripe meanwhile (in the
 // village: when a batch is ready).
 function top(){
  const c=casts(),t=W.today(now()),pill=$('casts');
  pill.querySelector('b').textContent=`${c.casts} / ${POND_MAX_CASTS}`;pill.setAttribute('aria-label',`Casts waiting: ${c.casts}`);pill.title=`Casts waiting: ${c.casts}`;
  pill.querySelector('small').textContent=c.nextAt?`Next cast in ${formatDuration(c.nextAt-now())}`:'Casts';
  const today=$('today');if(today.dataset.fish!==t){today.dataset.fish=t;today.innerHTML=`${art(`fish-${t}`)}<span>Today’s fish: ${FISH[t].name}. Pays double.</span>`;refreshArt();}
  const ready=waiting(),seen=ready?`${ready.art}:${ready.place??''}`:'';chip.hidden=!ready;
  if(ready&&chip.dataset.seen!==seen){chip.dataset.seen=seen;chip.dataset.place=ready.place??'';chip.innerHTML=`${art(ready.art)}<span>${lake?'Ready to collect!':'Ready to harvest!'}</span><span aria-hidden="true">›</span>`;refreshArt();}
  if(phase==='idle'){const can=c.casts>0;act.disabled=!can;if(!can&&sayLine.textContent===say.cast)tell(emptyLine());if(can&&sayLine.textContent===emptyLine())tell(say.cast);}
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
  else if(phase==='bite'&&clock-phaseAt>FISH[waterFish(W,state,fishN).species].strike+.15){pond3d.ready();idle(say.missed);}
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
 $('back').onclick=()=>close();$('book').onclick=()=>openBook();letGo.onclick=()=>void release();chip.onclick=()=>{close();focusFarm(chip.dataset.place||undefined);};
 function key(event){
  if(!isOpen||event.ctrlKey||event.metaKey||event.altKey)return;
  // A window over the pond (a level-up, a confirmation) is closed first, by the browser or by Back (13 Oct 2026, public/windows.js).
  // Escape acts on its keydown only (13 Oct 2026, review): its keyup then closed the pond as well, so one Escape on a computer shut the
  // fish book and the pond, or the window over the pond and the pond.
  if(event.key==='Escape'){if(event.type!=='keydown'||modalOpen(document))return;event.preventDefault();if(!book.hidden)closeBook();else close();return;}
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
  if(!unlocked()){toast(W.closed());return;}
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
  // The lake (12 Oct 2026, the owner's look): the village is built larger and the boat sits mid-lake, so the pond's span showed only
  // water; LAKE_VIEW widens it so the shore, the pier and the houses frame the boat as the pier and the fields frame the pond.
  const span=(aspect<1?7/aspect:7.6)*(lake?LAKE_VIEW:1)*Math.sqrt(Math.max(1,520/Math.max(300,game.clientHeight)));   // a short frame sees a little more
  // The line sits a little above the middle on a wide screen (clear of the button), a little below it on an upright phone (clear of the top).
  const target=pond3d.focus(),up=span*(aspect<1?-.035:.06)/.874;target.x+=up;target.z+=up;
  const half=span/2,box={left:-half*aspect,right:half*aspect,top:half,bottom:-half};
  for(const side of ['left','right','top','bottom'])camera[side]+=(box[side]-camera[side])*k;
  return focus.clone().lerp(target,k);
 }
 function position(camera,width,height){
  const open=unlocked(),c=open?casts().casts:0;pond3d.show(open);shortcut.hidden=!open;if(lake)tile.hidden=!open;
  if(!open||isOpen){pin.hidden=true;return;}
  const p=pond3d.labelAt().project(camera),{bars,sides}=blocks(),spot=pinSpot((p.x*.5+.5)*width,(-p.y*.5+.5)*height,p.x,p.y,height,bars,sides);
  pin.hidden=!spot;if(!spot)return;pin.style.left=`${spot.x}px`;pin.style.top=`${spot.y}px`;pin.classList.toggle('edge',spot.edge);
  const badge=pin.querySelector('.pond-badge'),text=String(c);if(badge.textContent!==text)badge.textContent=text;
  pin.classList.toggle('ready',c>=POND_MAX_CASTS);pin.classList.toggle('empty',c<1);pin.title=`Casts waiting: ${c}`;
 }
 // The tools over the farm, where the labels are (measured at most once a second: the labels move far more often).
 let blocked={bars:[],sides:[]},measured=-Infinity;
 function blocks(){
  const t=performance.now();if(t-measured<1000)return blocked;measured=t;const box=labels.getBoundingClientRect();
  const find=selector=>[...document.querySelectorAll(selector)].map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height).map(r=>({left:r.left-box.left,right:r.right-box.left,top:r.top-box.top,bottom:r.bottom-box.top}));
  blocked={bars:find('.bottom-hud'),sides:find('.scene-controls,.side-tools')};return blocked;
 }
 let lastTop=0;
 return {
  open,close,viewing:()=>isOpen||mix()>0,frame:frame3d,position,
  // Called by the game's frame: the pond's 3D life, and the top line of the open screen once a second.
  // A catch the farm refused after all (another tab, a fish too soon after two others) is taken back with its coins, so its card goes too:
  // while a card is up the pond's count is the fish after it and the fish coins are what they were with it, unless the farm went back.
  tick(t,dt){pond3d.tick(t,dt);if(isOpen&&phase==='result'&&(current()!==shown+1||(state.stats[W.stats.coins]??0)!==paid)){card.hidden=true;idle();}if(isOpen&&t-lastTop>1000){lastTop=t;top();}},
  // A card that would cover the pond waits until the farmer is back on the farm (or in the village).
  hold(show){if(!isOpen)return false;held.push(show);return true;}
 };
}
