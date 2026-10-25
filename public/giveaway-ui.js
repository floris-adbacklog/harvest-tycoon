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
 const seq=[];
 for(let i=0;i<steps-1;i++){
  let pick=Math.floor(random()*names.length);
  if(names.length>1&&names[pick]===seq.at(-1))pick=(pick+1)%names.length;
  seq.push(names[pick]);
 }
 if(names.length>1&&seq.at(-1)===winner)seq[seq.length-1]=names[(names.indexOf(winner)+1)%names.length];
 seq.push(winner);
 return seq;
}

const read=()=>{try{return localStorage.getItem(GIVEAWAY_KEY)??'';}catch{return '';}};
const write=text=>{try{localStorage.setItem(GIVEAWAY_KEY,text);}catch{}};
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
  +`<button type="button" class="secondary-button giveaway-clear" data-giveaway-clear>Clear the list</button></div>`;
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
