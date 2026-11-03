// The Super Tournament in the Admin dashboard (3 Nov 2026, the owner: "Maak het instelbaar vanuit admin panel, altijd handmatig", and
// "ook mogelijk om het op automatische piloot te doen, bv elke woensdag om 9:16 uur gametijd"): a card on Money, beside the Sale and
// the Double XP weekend, for the admin only. Start one now (a kind, its crop or good, the hours and the prizes), stop the one running,
// the last ones with their results, and the weekly plans that start one by themselves (supabase/super-tournament.sql, every minute, in
// UTC as everything here). farm-api checks it all again (tournament-service.js, operation admin_tournament). Staff screens stay English.
import {art} from '../public/visual-icons.js';
import {confirmAction} from '../public/confirm-dialog.js';
import {dateTime} from './admin-players.js';
import {CROPS,ITEMS,CROP_LEVELS,RECIPE_LEVELS} from '../game/farm-state.js';
import {TOURNAMENT_KINDS,TOURNAMENT_DEFAULTS,TOURNAMENT_LIMITS,TOURNAMENT_HOURS,TOURNAMENT_PRIZE_MAX,tournamentPrizes} from '../game/tournament.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');
const why=error=>error?.raw??error?.message;
export const WEEKDAYS=Object.freeze(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
export const GOODS=Object.freeze(Object.fromEntries(Object.entries(ITEMS).filter(([key,item])=>!Object.hasOwn(CROPS,key)&&!item.heirloom&&(item.world??1)===1)));
const SETTINGS=[['diamondsPerPlayer','Diamonds per farmer who counts'],['coinsPerPlayer','Coins per farmer who counts'],['maxDiamonds','Pot at most (diamonds)'],['maxCoins','Pot at most (coins)'],['placeStep','One winning place per … farmers (from 80)'],['minScore','Points to count']];
export const clock=minute=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
export const kindLabel=(kind,pick)=>{const k=TOURNAMENT_KINDS[kind];if(!k)return kind;const name=pick?(CROPS[pick]?.name??ITEMS[pick]?.name??pick):'';return name?`${k.title}: ${name}`:k.title;};
// The example the card shows under the prizes: what the top 3 and the last paid place win at a few sizes, with these settings.
export function potExample(settings){
 return [50,300,1000].map(n=>{const p=tournamentPrizes(n,settings),last=p[p.length-1];return `${num(n)} farmers: #1 ${num(p[0]?.diamonds)} diamonds and ${num(p[0]?.coins)} coins, ${num(p.length)} winning places${p.length>3?`, the last ${num(last.diamonds)} diamonds`:''}`;}).join('. ')+'.';
}

export function createTournamentCard({dialog,bridge,ask=confirmAction,doc=globalThis.document}){
 const money=dialog.querySelector('[data-admin-panel="money"]');if(!money)return {show(){}};
 const section=doc.createElement('section');section.className='admin-card';section.id='admin-tournament';section.hidden=true;
 const kinds=Object.entries(TOURNAMENT_KINDS).map(([key,k])=>`<option value="${key}">${esc(k.title)}${k.from>1?` (from level ${k.from})`:''}</option>`).join('');
 const crops=Object.entries(CROPS).map(([key,c])=>`<option value="${key}" data-kind="crop">${esc(c.name)} (level ${CROP_LEVELS[key]??1})</option>`).join('');
 const goods=Object.entries(GOODS).map(([key,g])=>`<option value="${key}" data-kind="good">${esc(g.name)} (level ${RECIPE_LEVELS[key]??1})</option>`).join('');
 section.innerHTML='<h3>'+art('tournament')+'Super Tournament</h3><form id="admin-tour-form" class="admin-news admin-offer">'
  +`<div class="admin-popup-fields"><label>Kind<select id="admin-tour-kind">${kinds}</select></label><label id="admin-tour-pick-label" hidden>Crop or good<select id="admin-tour-pick"></select></label>`
  +`<label>Title<input id="admin-tour-title" maxlength="80" placeholder="${esc(TOURNAMENT_KINDS.harvest.title)}"></label><label>Hours (${TOURNAMENT_HOURS[0]} to ${TOURNAMENT_HOURS[1]})<input id="admin-tour-hours" type="number" min="${TOURNAMENT_HOURS[0]}" max="${TOURNAMENT_HOURS[1]}" step="1" value="24" inputmode="numeric" required></label></div>`
  +'<p class="admin-popup-note" id="admin-tour-rule"></p>'
  +'<details class="admin-tour-prizes"><summary>Prizes</summary><div class="admin-popup-fields">'+SETTINGS.map(([key,label])=>`<label>${label}<input id="admin-tour-${key}" type="number" min="${TOURNAMENT_LIMITS[key][0]}" max="${TOURNAMENT_LIMITS[key][1]}" step="1" value="${TOURNAMENT_DEFAULTS[key]}" inputmode="numeric"></label>`).join('')+'</div>'
  +`<p class="admin-popup-note">One farmer wins at most ${num(TOURNAMENT_PRIZE_MAX.diamonds)} diamonds and ${num(TOURNAMENT_PRIZE_MAX.coins)} coins. Below 80 farmers who count the top 3 win (50, 30 and 20% of the pot); from 80 one more place per the number above, the top 3 25, 15 and 10%, the rest the other half in equal parts.</p><p class="admin-popup-note" id="admin-tour-example"></p></details>`
  +'<div class="admin-popup-fields"><label>Repeat<select id="admin-tour-repeat"><option value="">No, start it now</option>'+WEEKDAYS.map((d,i)=>`<option value="${i}">Every ${d}</option>`).join('')+'</select></label><label id="admin-tour-at-label" hidden>At (UTC)<input id="admin-tour-at" type="time" value="09:16" step="60"></label></div>'
  +'<p class="admin-popup-note">Everyone takes part from level 1, on the website, the apps and the game portals. When it starts, every farmer gets a News message with the finish flag, in their own language. A weekly plan starts it by itself at that time (UTC); a week when another tournament still runs is skipped.</p>'
  +'<div class="admin-offer-actions"><button type="submit" class="primary-button" id="admin-tour-submit">Start tournament</button></div>'
  +'<p class="admin-hint" id="admin-tour-status" role="status"></p></form>'
  +'<h4 class="admin-subtitle">Weekly plans</h4><ul id="admin-tour-plans" class="admin-recent-list"></ul>'
  +'<h4 class="admin-subtitle">Tournaments</h4><ul id="admin-tour-list" class="admin-recent-list"></ul><div id="admin-tour-results" hidden></div>';
 const after=money.querySelector('#admin-xp-weekend');if(after?.after)after.after(section);else money.append(section);
 const $=id=>section.querySelector(`#admin-tour-${id}`);
 const settings=()=>Object.fromEntries(SETTINGS.map(([key])=>[key,Number($(key).value)]));
 function kindChanged(){
  const k=TOURNAMENT_KINDS[$('kind').value];
  $('pick-label').hidden=!k?.pick;$('pick').innerHTML=k?.pick==='crop'?crops:k?.pick==='good'?goods:'';
  $('title').placeholder=k?.title??'';$('rule').textContent=`${k?.rule??''}${k?.from>1?` Only farmers from level ${k.from} can score in it.`:''}`;
 }
 const example=()=>{$('example').textContent=`With these settings: ${potExample({...TOURNAMENT_DEFAULTS,...settings()})}`;};
 function repeatChanged(){const weekly=$('repeat').value!=='';$('at-label').hidden=!weekly;$('submit').textContent=weekly?'Save weekly plan':'Start tournament';}
 $('kind').onchange=kindChanged;$('repeat').onchange=repeatChanged;section.querySelector('.admin-tour-prizes').addEventListener('input',example);
 kindChanged();repeatChanged();example();
 const config=()=>({kind:$('kind').value,pick:$('pick').value||null,title:$('title').value.trim(),hours:Number($('hours').value),settings:settings()});
 const call=body=>bridge.request({operation:'admin_tournament',...body}).then(r=>{if(r?.error)throw Error(r.error);return r;});
 async function show(){
  section.hidden=false;
  try{
   const data=await call({command:'list'});
   $('plans').innerHTML=data.plans.length?data.plans.map(p=>`<li><span class="admin-recent-copy"><strong>${esc(kindLabel(p.kind,p.pick))}${p.title!==TOURNAMENT_KINDS[p.kind]?.title?`: ${esc(p.title)}`:''}</strong><small>Every ${WEEKDAYS[p.weekday]} at ${clock(p.atMinute)} UTC, ${p.hours} hours${p.active?'':', off'}${p.lastStart?`. Last started ${dateTime(p.lastStart)}`:''}</small></span><button type="button" class="secondary-button" data-plan-toggle="${esc(p.id)}" data-on="${p.active?'1':''}">${p.active?'Turn off':'Turn on'}</button><button type="button" class="secondary-button" data-plan-delete="${esc(p.id)}">Remove</button></li>`).join(''):'<li class="admin-empty">No weekly plan yet.</li>';
   $('list').innerHTML=data.tournaments.length?data.tournaments.map(t=>{const state=t.running?'Running':t.settledAt?'Ended':t.stoppedAt?'Stopped':'Ended';
    const counts=t.participants!=null?`, ${num(t.participants)} taking part, ${num(t.counted)} counted`:'';const pot=t.pot?`, pot ${num(t.pot.diamonds)} diamonds and ${num(t.pot.coins)} coins, ${num(t.pot.places)} winning places`:'';
    return `<li><span class="admin-recent-copy"><strong>${esc(state)}: ${esc(t.title)}</strong><small>${esc(kindLabel(t.kind,t.pick))}, ${dateTime(t.startsAt)} until ${dateTime(t.stoppedAt??t.endsAt)} (UTC)${counts}${pot}</small></span>${t.running?`<button type="button" class="secondary-button" data-tour-stop="${esc(t.id)}">Stop</button>`:''}<button type="button" class="secondary-button" data-tour-results="${esc(t.id)}">Results</button></li>`;}).join(''):'<li class="admin-empty">No tournament yet.</li>';
  }catch(error){$('status').textContent=`The tournaments could not be loaded: ${why(error)}`;}
 }
 section.addEventListener('click',async event=>{
  const b=event.target.closest('button');if(!b)return;
  try{
   if(b.dataset.tourStop){if(!await ask({title:'Stop this tournament?',description:'It ends now and the prizes are handed out at once, as at its end.',confirmLabel:'Stop',tone:'danger'}))return;await call({command:'stop',tournamentId:b.dataset.tourStop});$('status').textContent='The tournament has stopped. Its winners can collect their prizes.';}
   else if(b.dataset.tourResults){const r=await call({command:'results',tournamentId:b.dataset.tourResults});const box=$('results');box.hidden=false;
    box.innerHTML=`<h4 class="admin-subtitle">${esc(r.tournament.title)}: the top ${num(r.rows.length)}</h4><ol class="admin-recent-list">${r.rows.map(x=>`<li><span class="admin-recent-copy"><strong>#${x.rank} ${esc(x.username)} (level ${x.level??'?'})</strong><small>${num(x.score)} points${x.place?`, won ${num(x.diamonds)} diamonds and ${num(x.coins)} coins${x.claimed?', collected':''}`:''}</small></span></li>`).join('')}</ol>`;}
   else if(b.dataset.planToggle){await call({command:'plan_toggle',planId:b.dataset.planToggle,active:!b.dataset.on});}
   else if(b.dataset.planDelete){if(!await ask({title:'Remove this weekly plan?',description:'It starts no tournament any more. A tournament it started keeps running.',confirmLabel:'Remove',tone:'danger'}))return;await call({command:'plan_delete',planId:b.dataset.planDelete});}
   else return;
  }catch(error){$('status').textContent=why(error);}
  void show();
 });
 $('form').addEventListener('submit',async event=>{
  event.preventDefault();const c=config(),weekly=$('repeat').value!=='',label=c.title||kindLabel(c.kind,c.pick);
  try{
   if(weekly){
    const [h,m]=String($('at').value||'').split(':').map(Number);if(!Number.isInteger(h)||!Number.isInteger(m)){$('status').textContent='Choose a time.';return;}
    const weekday=Number($('repeat').value),atMinute=h*60+m;
    if(!await ask({title:'Save this weekly plan?',description:`“${label}” starts by itself every ${WEEKDAYS[weekday]} at ${clock(atMinute)} UTC and runs ${c.hours} hours, with a News message for everyone.`,confirmLabel:'Save',cancelLabel:'Cancel',picture:'tournament'}))return;
    await call({command:'plan_save',config:{...c,weekday,atMinute,active:true}});$('status').textContent=`Saved. It starts every ${WEEKDAYS[weekday]} at ${clock(atMinute)} UTC.`;
   }else{
    if(!await ask({title:`Start “${label}”?`,description:`It starts now and runs ${c.hours} hours. Every farmer gets a News message about it.`,confirmLabel:'Start',cancelLabel:'Cancel',picture:'tournament'}))return;
    await call({command:'start',config:c});$('status').textContent='The tournament is running. Farmers see it the next time the game checks (within 5 minutes) or when they open the game.';
   }
  }catch(error){$('status').textContent=why(error);}
  void show();
 });
 return {show};
}
