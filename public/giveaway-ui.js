// The giveaway (25 Oct 2026, the owner, for the Twitch stream: "iedereen die deelneemt doe ik erin en dan rolt die 10 sec en komt er
// een winnaar uit"): paste the names from the chat, one per line, and Draw a winner rolls through them for ten seconds, slowing down,
// and stops on the winner with confetti. Only for the stream's own account (game.js GIVEAWAY_EMAILS loads this file), in English like
// the staff screens (i18n/ignore.json). It gives nothing itself: the owner gives the winner's diamonds in Admin, as a gift.
import {refreshArt} from './visual-icons.js';
import {confettiFrom} from './confetti.js';

export const GIVEAWAY_KEY='harvest-tycoon:giveaway-names';
export const ROLL_MS=10000,ROLL_TICKS=55,ROLL_CURVE=2.6,ROLL_MIN_GAP=45;

// The names as typed in the chat: one per line (or comma), without a leading @ or !join, each once (case does not matter).
export function giveawayNames(text){
 const seen=new Set(),names=[];
 for(const raw of String(text??'').split(/[\n,]+/)){
  const name=raw.replace(/^\s*!join\b/i,'').replace(/^\s*@/,'').trim().slice(0,40);
  if(name&&!seen.has(name.toLowerCase())){seen.add(name.toLowerCase());names.push(name);}
 }
 return names;
}
// A fair pick: the browser's crypto random, never Math.random.
export function pickIndex(count,crypto=globalThis.crypto){
 if(!(count>0))return -1;
 const limit=Math.floor(0x100000000/count)*count,buffer=new Uint32Array(1);
 do crypto.getRandomValues(buffer);while(buffer[0]>=limit);
 return buffer[0]%count;
}
// When each name shows: quick at first, slower and slower, the last one (the winner) at ROLL_MS. Ticks closer than ROLL_MIN_GAP drop out.
export function rollTimes(total=ROLL_MS,ticks=ROLL_TICKS,curve=ROLL_CURVE,minGap=ROLL_MIN_GAP){
 const times=[];
 for(let k=1;k<=ticks;k++){const t=Math.round(total*(k/ticks)**curve);if(k===ticks||!times.length||t-times.at(-1)>=minGap)times.push(t);}
 times[times.length-1]=total;
 return times;
}
// The names shown on the way: a random one each tick, never the same twice in a row, and the winner last.
export function rollSequence(names,winner,steps,random=Math.random){
 // Built back from the winner: each name differs from the one after it, so no name shows twice in a row.
 const seq=new Array(steps);seq[steps-1]=winner;
 for(let i=steps-2;i>=0;i--){
  let pick=Math.floor(random()*names.length);
  if(names.length>1&&names[pick]===seq[i+1])pick=(pick+1)%names.length;
  seq[i]=names[pick];
 }
 return seq;
}

const read=()=>{try{return localStorage.getItem(GIVEAWAY_KEY)??'';}catch{return '';}};
const write=text=>{try{localStorage.setItem(GIVEAWAY_KEY,text);}catch{}};
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// The countdown (25 Oct 2026, the owner: "in-game wat ik kan instellen als mijn speler", "ook voor de volgende x"): set the minutes in
// the Giveaway window and a big clock lies over the farm ("Starting soon", then "We're live!"), for the stream's picture. The end time
// is kept on this device, so a reload keeps counting; a tap on the clock hides it.
export const COUNTDOWN_KEY='harvest-tycoon:stream-countdown';
export function countdownText(ms){const left=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(left/3600),m=Math.floor(left%3600/60),s=left%60,two=n=>String(n).padStart(2,'0');return h?`${h}:${two(m)}:${two(s)}`:`${two(m)}:${two(s)}`;}
let countdownTimer=0;
export function showCountdown(endAt,doc=document){
 hideCountdown(doc);
 try{localStorage.setItem(COUNTDOWN_KEY,String(endAt));}catch{}
 const layer=doc.createElement('div');layer.id='stream-countdown';layer.className='stream-countdown';layer.setAttribute('role','timer');
 layer.innerHTML='<div class="stream-countdown-card"><img src="/assets/harvest-tycoon-logo.webp?v=20261023" alt="Harvest Tycoon"><p class="stream-countdown-title">Starting soon</p><p class="stream-countdown-clock">--:--</p><p class="stream-countdown-note">Win diamonds in the chat 💎</p></div>';
 layer.onclick=()=>hideCountdown(doc);
 doc.body.append(layer);
 const clock=layer.querySelector('.stream-countdown-clock'),title=layer.querySelector('.stream-countdown-title');
 const tick=()=>{const left=endAt-Date.now();clock.textContent=countdownText(left);
  if(left<=0){title.textContent="We're live!";layer.classList.add('is-live');clearInterval(countdownTimer);countdownTimer=setTimeout(()=>hideCountdown(doc),8000);}};
 tick();countdownTimer=setInterval(tick,250);
}
export function hideCountdown(doc=document){
 clearInterval(countdownTimer);clearTimeout(countdownTimer);
 doc.getElementById('stream-countdown')?.remove();
 try{localStorage.removeItem(COUNTDOWN_KEY);}catch{}
}

let mounted=false;
export function mountGiveaway(doc=document){
 if(mounted)return;mounted=true;
 const dialog=doc.createElement('dialog');
 dialog.id='giveaway-dialog';dialog.className='game-dialog is-sheet is-m';dialog.setAttribute('aria-labelledby','giveaway-title');
 dialog.innerHTML=`<div class="dialog-heading"><i class="dialog-badge" data-game-art="diamonds" aria-hidden="true"></i><div class="dialog-titles"><h2 id="giveaway-title">Giveaway</h2></div><button class="icon-button close-dialog" aria-label="Close" data-giveaway-close><i data-lucide="x"></i></button></div>`
  +`<div class="giveaway"><div class="giveaway-reel" aria-live="polite"><span class="giveaway-side" data-giveaway-prev></span><strong data-giveaway-name>Ready</strong><span class="giveaway-side" data-giveaway-next></span></div>`
  +`<p class="giveaway-result" data-giveaway-result hidden></p>`
  +`<div class="giveaway-actions"><button type="button" class="primary-button" data-giveaway-draw>Draw a winner</button><button type="button" class="secondary-button" data-giveaway-remove hidden>Take out the winner</button></div>`
  +`<label class="giveaway-label" for="giveaway-names">Everyone who joins, one name per line <small data-giveaway-count></small></label>`
  +`<textarea id="giveaway-names" class="giveaway-names" rows="8" spellcheck="false" placeholder="Paste the farm names from the chat"></textarea>`
  +`<button type="button" class="secondary-button giveaway-clear" data-giveaway-clear>Clear the list</button>`
  +`<h3 class="giveaway-subhead">Countdown</h3><div class="giveaway-countdown"><label class="giveaway-label" for="giveaway-minutes">Minutes</label><input id="giveaway-minutes" class="giveaway-minutes" type="number" min="1" max="600" step="1" value="30" inputmode="numeric"><button type="button" class="primary-button" data-countdown-show>Show countdown</button></div>`
  +`<p class="giveaway-hint">A big clock over the farm for the stream. Tap the clock to hide it.</p></div>`;
 doc.body.append(dialog);
 const $=selector=>dialog.querySelector(selector),box=$('#giveaway-names'),draw=$('[data-giveaway-draw]'),remove=$('[data-giveaway-remove]');
 const name=$('[data-giveaway-name]'),prev=$('[data-giveaway-prev]'),next=$('[data-giveaway-next]'),result=$('[data-giveaway-result]'),count=$('[data-giveaway-count]');
 let rolling=false,winner=null;
 box.value=read();
 const update=()=>{const n=giveawayNames(box.value).length;count.textContent=n===1?'(1 name)':`(${n} names)`;draw.disabled=rolling||n<2;box.disabled=rolling;remove.hidden=rolling||!winner;};
 box.addEventListener('input',()=>{write(box.value);winner=null;result.hidden=true;update();});
 $('[data-giveaway-clear]').onclick=()=>{if(rolling)return;box.value='';write('');winner=null;result.hidden=true;name.textContent='Ready';prev.textContent=next.textContent='';update();};
 remove.onclick=()=>{
  if(!winner||rolling)return;
  const keep=giveawayNames(box.value).filter(n=>n!==winner);box.value=keep.join('\n');write(box.value);
  winner=null;result.hidden=true;update();
 };
 draw.onclick=()=>{
  const names=giveawayNames(box.value);if(rolling||names.length<2)return;
  rolling=true;winner=null;result.hidden=true;dialog.classList.remove('has-winner');update();
  const pick=names[pickIndex(names.length)],times=rollTimes(),seq=rollSequence(names,pick,times.length);
  const show=i=>{name.textContent=seq[i];const at=names.indexOf(seq[i]);prev.textContent=names[(at-1+names.length)%names.length];next.textContent=names[(at+1)%names.length];};
  const start=performance.now();let i=0;
  const tick=()=>{
   const now=performance.now()-start;
   while(i<times.length-1&&times[i+1]<=now)i++;
   show(i);
   if(i<times.length-1){requestAnimationFrame(tick);return;}
   rolling=false;winner=pick;dialog.classList.add('has-winner');
   result.innerHTML=`The winner is <strong>${escape(pick)}</strong>!`;result.hidden=false;
   update();confettiFrom($('.giveaway-reel').getBoundingClientRect(),{count:60});
  };
  requestAnimationFrame(tick);
 };
 for(const close of dialog.querySelectorAll('[data-giveaway-close]'))close.onclick=()=>dialog.close();
 update();

 $('[data-countdown-show]').onclick=()=>{const minutes=Math.max(1,Math.min(600,Math.round(Number($('#giveaway-minutes').value)||30)));dialog.close();showCountdown(Date.now()+minutes*60000,doc);};
 // A countdown that was running before a reload goes on.
 try{const kept=Number(localStorage.getItem(COUNTDOWN_KEY));if(kept>Date.now())showCountdown(kept,doc);else if(kept)localStorage.removeItem(COUNTDOWN_KEY);}catch{}

 // The entry: one row in More, under Friends, after Invite a friend.
 const menu=doc.getElementById('more-dialog'),after=menu?.querySelector('[data-menu-action="invite-button"]');
 if(after){
  const entry=doc.createElement('button');entry.id='giveaway-menu-entry';
  entry.innerHTML='<i data-game-art="diamonds"></i><span><strong>Giveaway</strong><small>Draw a winner for the stream</small></span>';
  entry.onclick=()=>{menu.close();openGiveaway(doc);};
  after.after(entry);
 }
 refreshArt();
}
export function openGiveaway(doc=document){
 const dialog=doc.getElementById('giveaway-dialog');if(!dialog)return;
 doc.querySelectorAll('dialog[open]').forEach(d=>d.close());
 dialog.showModal();refreshArt();
}
