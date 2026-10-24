import {BEGINNER_QUESTS,BEGINNER_REWARD,BEGINNER_STEP_XP,beginnerProgress,productionJobs,formatDuration,levelOf} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art} from './visual-icons.js';
import {nextGoal,actNow,readyAllAt} from './next-goal.js';
import {questArt} from './quests-ui.js';

// What to do now, in the phone's one-line banner (6 Oct 2026: it said only the step's title, and the instruction was a tap away; only 7
// of 16 farmers on a phone made the first market sale).
const DO_NOW={harvest:'Harvest the ripe corn',sell:'Sell corn in Market',plant:'Plant wheat in an empty field',water:'Plant wheat, then water it',produce:'Start a batch in the Chicken Coop',gift:'Collect your gift in Today',chore:'Do a farm chore',tend:'Give care to a growing crop',wheat:'Harvest a ripe wheat field',collect:'Collect a finished batch',
 // A guided farm sells an egg at step 7 instead of a chore (7 Oct 2026: its banner said only "An egg opens new doors").
 sell_egg:'Collect eggs at the Coop, then sell one in Market',
 // And step 9 is A helping hand (11 Oct 2026).
 hand:'Help at the Greenhouse'};
// What to do now when it depends on the farm (7 Oct 2026: step 7 waited about a minute for eggs and nothing said how long). Step 7: the
// eggs on their way (and how long), waiting at the Coop, or ready to sell; step 10: how long the batch still takes. Short, so the
// phone's one-line banner shows it whole. null: the step's own line (DO_NOW).
export function liveStep(state,id,now){
 if(id==='sell_egg'){
  if(state.inventory?.eggs>0)return 'Sell an egg in Market';
  const jobs=productionJobs(state.buildings?.coop);if(!jobs.length)return null;
  return jobs.some(j=>j.readyAt<=now)?'Collect eggs at the Coop':`Eggs in ${formatDuration(Math.min(...jobs.map(j=>j.readyAt))-now)}, then sell one`;
 }
 const jobs=id==='collect'?Object.values(state.buildings??{}).flatMap(productionJobs):[];
 return jobs.length&&!jobs.some(j=>j.readyAt<=now)?`Batch ready in ${formatDuration(Math.min(...jobs.map(j=>j.readyAt))-now)}`:null;
}
// The guide shows the way to every step by itself, once (11 Oct 2026, Part A A12; until then only step 2 did): 1.8 s after a step, when no
// window is open and the pointer is free, and only when the step can be done now (a ripe crop for the wheat, a batch that is ready, eggs
// or a Coop that can start them); otherwise it waits for that while the step lasts.
export const AUTO_WAIT_MS=1800;
export function canPointNow(state,guideTarget,now){
 const jobs=Object.values(state.buildings??{}).flatMap(productionJobs);
 if(guideTarget==='harvest')return state.plots.some(p=>p.crop&&p.readyAt<=now);
 if(guideTarget==='collect')return jobs.some(j=>j.readyAt<=now);
 if(guideTarget==='tend')return state.plots.some(p=>p.crop&&!p.tended&&p.careAt<=now&&p.readyAt>now);
 if(guideTarget==='eggs'){const coop=productionJobs(state.buildings?.coop);return (state.inventory?.eggs??0)>0||!coop.length||coop.some(j=>j.readyAt<=now);}
 return true;
}
// A calm start (24 Oct 2026, the owner, after players said a new farm overwhelmed them: "Doe alle 4"). Until the guide is done (or
// level CALM_UNTIL_LEVEL, on a farm that never finished it), <html> has .calm-start and data-guide-step (the steps done, 0 to 9), and
// beginner.css shows only what the step needs: each button comes with the step that uses it (CALM_REVEALS: after how many steps), the
// rest once the guide is done; what comes glows for a moment (.calm-new). onStep(step, before) tells the game (the camera, the spotlight).
export const CALM_UNTIL_LEVEL=10;
export const CALM_REVEALS=Object.freeze([[1,'#market-button'],[3,'.tool[data-tool="water"]'],[4,'#buildings-button'],[5,'#today-button'],[7,'.tool[data-tool="tend"]'],[10,'#tasks-button,#events-button,#estate-button']]);
export const CALM_GLOW_MS=6000;
// The steps done for a calm start, or null when the farm screen shows everything.
export function calmStep(state,{village=false}={}){
 const steps=beginnerProgress(state),done=steps.filter(q=>q.done).length;
 return !village&&done<steps.length&&levelOf(state)<CALM_UNTIL_LEVEL?done:null;
}
// What comes on screen between two calm steps (null: the guide is done, everything is there).
export function calmRevealed(before,step){
 if(before===null||before===undefined||before===step)return [];
 const upTo=step===null?Infinity:step;
 return CALM_REVEALS.filter(([at])=>at>before&&at<=upTo).map(([,sel])=>sel);
}
// The next-goal card's place on this device (folded or open), like the guide card's; never needed, so a browser that keeps nothing simply
// shows it open.
const GOAL_FOLDED_KEY='harvest-tycoon:next-goal';
// guide(target,{auto}): Show me (public/game.js showWay); idle(): the pointer is free; claimQuest(id): one quest, as in Quests; openQuest(id):
// Quests at that quest; openToday(id): Today at that daily challenge (Plan F, 13 Oct 2026), where it is claimed.
// village: the game shows the village (World II), which has its own quests: no farm goal there. phone(): the phone layout (the same query as
// mobile-ui.js mobileLayout, which this file cannot import: it asks the browser as it loads).
export function createBeginnerUI({state,runAction,icons,notify,onChange,guide,onFinished,onStep=null,idle=()=>true,claimQuest=null,openQuest=null,openToday=null,village=false,phone=()=>globalThis.matchMedia?.('(max-width: 900px), (max-height: 550px) and (pointer: coarse)')?.matches??false,storage=(()=>{try{return globalThis.localStorage;}catch{return null;}})()}){
 const $=id=>document.getElementById(id),dialog=$('beginner-dialog');
 let busy=false,lastMarkup='',finaleShown=false,lastStep=null,lastBanner='',pending=null,goalKey='',goalBusy=false,goalWait=0,goalDay='',calm;
 // The calm start's step on <html>; what came glows for CALM_GLOW_MS (only after a step during play, never as the farm opens).
 function calmMark(){
  const step=calmStep(state,{village}),root=document.documentElement;if(step===calm||!root?.classList)return;
  const before=calm;calm=step;
  root.classList.toggle('calm-start',step!==null);if(step===null)delete root.dataset.guideStep;else root.dataset.guideStep=String(step);
  if(before===undefined)return;
  for(const sel of calmRevealed(before,step))for(const el of document.querySelectorAll(sel)){el.classList.remove('calm-new');void el.offsetWidth;el.classList.add('calm-new');setTimeout(()=>el.classList.remove('calm-new'),CALM_GLOW_MS);}
  onStep?.(step,before);
 }
 function banner(steps,current,done){
  const text=`Step ${Math.min(done+1,steps.length)} of 10 · ${current?.ready?'Ready to complete':liveStep(state,current?.id,farmNow())??DO_NOW[current?.id]??current?.title??'Guide complete'}`;
  // Only when the English line changed: the page translates it in place, so its text is not compared.
  if(text!==lastBanner){lastBanner=text;$('beginner-mobile-copy').textContent=text;}
 }
 // Twice a second (public/game.js): only the banner, for its batch time, and only while it is on screen (phones). The phone's goal line once the
 // moment it names has come (Plan F, proposal 2): then it shows what is next; and at midnight, when "tomorrow at 07:05" becomes "at 07:05"
 // (review, 13 Oct 2026: it waited for the next farm action).
 function tick(){autoCheck();if(goalWait&&(goalWait<=farmNow()||new Date(farmNow()).toDateString()!==goalDay)){goalKey='';goalCard(true);}if($('beginner-mobile').hidden||!$('beginner-mobile').getClientRects().length)return;const steps=beginnerProgress(state);banner(steps,steps.find(q=>q.current),steps.filter(q=>q.done).length);}
 function refresh(){
  const steps=beginnerProgress(state),current=steps.find(q=>q.current),done=steps.filter(q=>q.done).length,complete=done===steps.length;
  const finished=complete&&state.onboarding?.rewardClaimed===true;
  document.querySelector('.beginner-card').hidden=finished;
  document.querySelectorAll('[data-menu-action="all-quests-mobile"]').forEach(el=>el.hidden=finished);
  if(finished&&dialog.open)dialog.close();
  calmMark();
  $('game').classList.toggle('beginner-active',!complete);$('beginner-mobile').hidden=complete;$('beginner-mobile').classList.toggle('is-ready',!!current?.ready);
  banner(steps,current,done);
  // After every finished step the guide shows the way to the next one by itself, once (A12; since 6 Oct 2026 for step 2 only, when 62% of
  // the farmers who harvested never made the first sale): see autoCheck. Step 7 asks two things, collect the eggs and sell one: once the
  // eggs are in, the way to Market is shown by itself too (its first pointer went to the Coop).
  const phase=current?current.guide==='eggs'&&(state.inventory?.eggs??0)>0?`${current.id}:sell`:current.id:null;
  // Step 2 also when the farm opens on it (13 Oct 2026: a farmer who left before the first sale), from 1.8 s after the farm is on screen:
  // its pointer comes back (repeat, autoCheck).
  if(phase&&phase!==lastStep&&(lastStep||phase==='sell')){pending={id:current.id,phase,guide:current.guide,wait:AUTO_WAIT_MS,quietAt:lastStep&&quiet()?Date.now():0,repeat:phase==='sell'};}
  lastStep=phase;
  // From the first harvest to the first sale the Market stays lit (11 Oct 2026, Part A A11): a steady glow, also after the pointer went.
  // The same while step 7's eggs wait to be sold.
  $('market-button')?.classList.toggle('guide-next',current?.id==='sell'||phase==='sell_egg:sell');
  // Quiet until the first sale (13 Oct 2026): from the start to the first sale only the Market carries a mark. Quests' number and the "!"
  // on Today (on a phone More) wait until then (4 of 12 slow sellers on a phone claimed quests first), and before the first harvest the
  // Market shows no number either (its 32 was starter stock that cannot be sold yet, and read like 32 messages). beginner.css hides them.
  // Coins earned another way count as the first sale too (review fix: 14 farms on step 2 that never sold at Market but delivered orders,
  // up to level 11, would have lost their quest number and daily gift mark for good).
  const firstSale=!village&&(current?.id==='harvest'||current?.id==='sell')&&!state.onboarding?.milestones?.sell&&!(state.stats?.sold>0)&&!(state.stats?.earned>0);
  $('game')?.classList.toggle('first-sale-waits',firstSale);$('game')?.classList.toggle('first-harvest-waits',firstSale&&current.id==='harvest');
  goalCard(finished);
  $('quest-number').textContent=Math.min(done+1,steps.length);$('quest-total').textContent=steps.length;
  $('quest-title').textContent=current?.title??'Ready to grow your own way';
  $('quest-description').textContent=current?.description??`You learned the basics and earned ${BEGINNER_REWARD} diamonds. Find your next goals in Quests and Today.`;
  const questXp=$('quest-xp');if(questXp){questXp.hidden=!current;questXp.innerHTML=current?`${art('xp')}+${BEGINNER_STEP_XP} XP`:'';}
  $('quest-progress').max=steps.length;$('quest-progress').value=done;$('quest-count').textContent=`${done} / ${steps.length}`;
  // Steps 1-9 finish themselves (farm-state.js advanceBeginner); the button is only there when a step waits, which is the last one.
  $('claim-reward').hidden=!current?.ready;$('claim-reward').disabled=busy||!current?.ready;$('claim-reward').textContent=complete?'Guide complete':done===9?`Claim ${BEGINNER_REWARD} diamonds`:'Complete step';
  $('beginner-help').hidden=complete;$('beginner-help').textContent=current?.ready?'Take a look':'Show me';
  document.querySelector('.beginner-prize').classList.toggle('claimed',complete);
  $('beginner-prize-title').textContent=complete?`${BEGINNER_REWARD} diamonds earned`:`${BEGINNER_REWARD} diamonds`;
  $('beginner-prize-note').textContent=complete?'Well done, farmer!':'After all 10 steps';
  $('all-quests-mobile').textContent=complete?'Review beginner guide':'View all 10 steps';
  if(!dialog.open)return;
  // A timeline: finished steps get a check, only the current step shows its explanation, every open step its XP.
  const xp=`<b class="beginner-xp">${art('xp')}+${BEGINNER_STEP_XP} XP</b>`;
  $('beginner-summary').innerHTML=`<div class="beginner-summary-top"><span><strong>${done}</strong> / ${steps.length} steps</span><b class="beginner-reward">${art('diamonds')}${BEGINNER_REWARD} ${complete?'earned':'at the end'}</b></div><progress max="${steps.length}" value="${done}" aria-label="Beginner steps completed"></progress>`;
  const markup=steps.map(q=>`<article class="beginner-step ${q.done?'done':q.current?'current':'upcoming'}" ${q.current?'aria-current="step"':''}><span class="beginner-step-number">${q.done?'✓':q.index+1}</span><div><h3>${q.title}</h3>${q.current?`<p>${q.description}</p>`:''}<span class="beginner-status">${q.done?'Completed':q.current?q.ready?'Ready to complete':'Your current step':q.ready?'Done early · finish the steps before it':''}${q.done?'':xp}</span>${q.current?`<div class="beginner-actions"><button class="${q.ready?'small-button':'primary-button'}" data-beginner-help>Show me</button>${q.ready?`<button class="primary-button" data-beginner-claim ${busy?'disabled':''}>${q.index===9?`Claim ${BEGINNER_REWARD} diamonds`:'Complete step'}</button>`:''}</div>`:''}</div></article>`).join('');
  if(markup!==lastMarkup){$('beginner-list').innerHTML=markup;lastMarkup=markup;icons();}
 }
 function open(){if(state.onboarding?.rewardClaimed&&state.onboarding.completed>=BEGINNER_QUESTS.length)return;document.querySelectorAll('dialog[open]').forEach(d=>d.close());dialog.showModal();refresh();dialog.scrollTop=0;
  // A step that waits (the last one, with the diamonds) is shown right away, its button in reach.
  const waiting=beginnerProgress(state).find(q=>q.current)?.ready&&dialog.querySelector('.beginner-step.current');
  if(waiting){waiting.scrollIntoView?.({block:'center'});dialog.querySelector('[data-beginner-claim]')?.focus({preventScroll:true});}else dialog.querySelector('.close-dialog').focus({preventScroll:true});}
 async function claim(){
  const current=beginnerProgress(state).find(q=>q.current);if(busy||!current?.ready)return;
  busy=true;refresh();
  try{const result=await runAction({type:'beginner_claim',id:current.id});onChange();if(result.diamonds&&onFinished){dialog.close();onFinished(result);}else notify(result.diamonds?`Beginner guide complete! +${result.xp??BEGINNER_STEP_XP} XP and ${BEGINNER_REWARD} diamonds.`:`Step ${result.completed} complete · +${result.xp??BEGINNER_STEP_XP} XP. Keep growing!`);}
  catch(error){notify(error.message);}
  finally{busy=false;refresh();if(dialog.open)(dialog.querySelector('[data-beginner-claim]:not(:disabled)')??dialog.querySelector('[data-beginner-help]')??dialog.querySelector('.close-dialog')).focus({preventScroll:true});}
 }
 function help(){const current=beginnerProgress(state).find(q=>q.current);if(!current)return;dialog.close();guide(current.guide);}
 $('claim-reward').addEventListener('click',claim);$('beginner-help').addEventListener('click',help);$('all-quests-mobile').addEventListener('click',open);$('beginner-mobile').addEventListener('click',open);
 dialog.addEventListener('click',event=>{if(event.target.closest('[data-beginner-claim]'))claim();if(event.target.closest('[data-beginner-help]'))help();});
 // After every farm action: say which steps just finished and what is next (the banner pulses too), and open the guide
 // once when the last step is done, so its diamonds are collected by hand.
 function afterAction(result){
  const steps=result?.guide??[],current=beginnerProgress(state).find(q=>q.current);
  if(steps.length){
   const xp=steps.reduce((sum,step)=>sum+step.xp,0),title=steps.length===1?steps[0].title:`${steps.length} guide steps`;
   // The first basket comes with level 2, whose line says the next step (progression-ui.js, 11 Oct 2026 A11): one message, not two.
   const firstBasket=steps.some(step=>step.step==='harvest')&&current?.id==='sell'&&levelOf(state)===2;
   if(!firstBasket)notify(`✓ ${title} · +${xp} XP.${current?` Next: ${current.title}.`:''}`);
   for(const el of [$('beginner-mobile'),document.querySelector('.beginner-card')]){if(!el)continue;el.classList.remove('just-done');void el.offsetWidth;el.classList.add('just-done');}
  }
  if(current?.index===BEGINNER_QUESTS.length-1&&current.ready&&!finaleShown){finaleShown=true;open();}
 }
 // ---- The pointer by itself (A12) ----
 // Nor while the reminder question's card stands (13 Oct 2026, item 4 review: right after the first gift it came with step 7's pointer to
 // Buildings, which it covers on a phone, and its Not now ended that pointer); the pointer comes 1.8 s after it is answered.
 function quiet(){return !document.querySelector('dialog[open]')&&!document.querySelector('.reminder-nudge')&&idle();}
 // Step 2's pointer comes back (13 Oct 2026, the 11 Oct regression: it showed once and the next tap on a corn ended it; before, it came
 // 1.8 s after the harvest and stood up to 25 s). While step 2 waits it shows again each time nothing has been touched for 1.8 s (no
 // window open, the pointer free), until Market has been opened; inside Market it points at Sell all itself (game.js openDialog). Taps
 // on the farm leave it standing (stay, coach.js).
 let touchedAt=0;for(const type of ['pointerdown','keydown','wheel'])document.addEventListener?.(type,()=>{touchedAt=Date.now();},{capture:true,passive:true});
 function autoCheck(now=Date.now()){
  if(!pending)return;
  const current=beginnerProgress(state).find(q=>q.current);
  if(current?.id!==pending.id){pending=null;return;}
  if(pending.repeat&&$('market-dialog')?.open){pending=null;return;}
  if(!quiet()){pending.quietAt=0;return;}
  pending.quietAt||=now;
  if(now-Math.max(pending.quietAt,pending.repeat?touchedAt:0)<pending.wait||!canPointNow(state,pending.guide,farmNow()))return;
  const {guide:target,repeat}=pending;
  if(repeat)Object.assign(pending,{shown:true,wait:AUTO_WAIT_MS,quietAt:0});else pending=null;
  guide(target,repeat?{auto:true,stay:true}:{auto:true});
 }
 // The harvest landed at the Market (game.js flyToMarket): step 2 points at once, not 1.8 s later (A11); so do step 7's eggs. Only the
 // first time: after that step 2's pointer waits for 1.8 s without a touch.
 function landed(){if(pending?.id!=='sell'&&pending?.phase!=='sell_egg:sell'||pending.shown)return;pending.wait=0;autoCheck();}
 // ---- The next goal, in the guide's place once it is done (11 Oct 2026, Part A A13; public/next-goal.js) ----
 // On a computer a small card where the guide was; on a phone the guide's one-line banner. A quest is claimed on its own with one tap, as in
 // Quests; then the card shows the next goal.
 // Plan F, proposal 2 (13 Oct 2026; the owner's yes, partly undoing 11 Oct, when the line showed only something to claim or build): after
 // the guide a phone always shows one line. What the farmer can do now first (a quest or a daily challenge to claim, a building to build, a
 // field to buy); otherwise, while crops or batches grow, when everything is ready ("Everything is ready at 14:35", in the device's own
 // clock); and when nothing grows the card's own goal, the quest closest to done, as on a computer. The tap hints under the bar make way for
 // it. A computer keeps its card as it was, and a short computer window (desktop-hud.css, the line instead of the card) only the goals to act on.
 let folded=false;try{folded=storage?.getItem(GOAL_FOLDED_KEY)==='folded';}catch{}
 const number=n=>Number(n).toLocaleString('en-US');
 function goalCard(finished){
  const card=$('next-goal-card'),line=$('next-goal-mobile');if(!card||!line)return;
  const now=farmNow(),goal=finished&&!village?nextGoal(state,now):null,onPhone=phone();
  const wait=goal&&!actNow(goal)&&onPhone?readyAllAt(state,now):0;goalWait=wait;goalDay=new Date(now).toDateString();
  card.hidden=!goal;line.hidden=!goal||!actNow(goal)&&!onPhone;
  // A quest that is ready is claimed right from the phone's line too (18 Oct 2026, the window shell): the card's own Claim, one at a time.
  const quick=$('next-goal-claim-mobile');if(quick){quick.hidden=line.hidden||goal?.kind!=='quest';quick.disabled=goalBusy;}$('game')?.classList.toggle('goal-claim',Boolean(quick&&!quick.hidden));
  // The phone's line takes the place of the tap hints under the bar while it shows.
  $('game')?.classList.toggle('goal-line',!line.hidden);
  $('next-goal-body').hidden=folded;const fold=$('next-goal-collapse');fold.setAttribute('aria-expanded',String(!folded));fold.setAttribute('aria-label',folded?'Expand next goal':'Collapse next goal');
  if(!goal){goalKey='';return;}
  // The day too: a time after midnight reads "tomorrow" until the day turns.
  const today=new Date(now).toDateString(),key=JSON.stringify(goal)+goalBusy+wait+today+onPhone;if(key===goalKey)return;goalKey=key;
  const kind={quest:'QUEST READY',daily:'DAILY CHALLENGE READY',build:'READY TO BUILD',field:'NEW FIELD',progress:'QUEST IN PROGRESS',level:'NEXT LEVEL'}[goal.kind];
  const title=goal.kind==='build'?`Build the ${goal.name}`:goal.kind==='field'?`Buy field ${goal.field}`:goal.kind==='level'?(goal.name?`Level ${goal.level}: ${goal.name}`:`Level ${goal.level}`):goal.title;
  $('next-goal-kind').textContent=kind;$('next-goal-title').textContent=title;
  // Under a quest's title what to do for it (16 Oct 2026, the owner: the title alone did not say it), as Quests and Today say it.
  const description=$('next-goal-description');if(description){description.textContent=goal.description??'';description.hidden=!goal.description;}
  $('next-goal-art').innerHTML=goal.kind==='quest'||goal.kind==='daily'||goal.kind==='progress'?questArt(goal.stat):art(goal.kind==='build'?goal.key:goal.kind==='field'?'estate':goal.art)||art('quests');
  // A daily challenge (Plan F, 13 Oct 2026): its coins, diamonds and XP, as in Today.
  $('next-goal-note').innerHTML=goal.kind==='quest'||goal.kind==='daily'?`<b class="reward-coins">${art('coins')}+${number(goal.coins)} coins</b>${goal.diamonds?`<b class="reward-diamonds">${art('diamonds')}+${number(goal.diamonds)} ${goal.diamonds===1?'diamond':'diamonds'}</b>`:''}${goal.xp?`<b class="reward-xp">${art('xp')}+${number(goal.xp)} XP</b>`:''}`:goal.kind==='build'||goal.kind==='field'?`<b class="reward-coins">${art('coins')}${number(goal.cost)} coins</b>`:'';
  $('next-goal-note').hidden=goal.kind==='progress'||goal.kind==='level';
  const meter=goal.kind==='progress'||goal.kind==='level';$('next-goal-meter').hidden=!meter;
  if(meter){const [value,max]=goal.kind==='progress'?[goal.value,goal.target]:[goal.current,goal.target];$('next-goal-progress').max=max;$('next-goal-progress').value=value;$('next-goal-count').textContent=goal.kind==='level'?`${number(value)} / ${number(max)} XP`:`${number(value)} / ${number(max)}`;}
  // A daily challenge is claimed in Today, one at a time: its button opens Today at it.
  const button=$('next-goal-button'),showMe=goal.kind==='build'||goal.kind==='field'||goal.kind==='progress'&&goal.guide;
  button.hidden=!(goal.kind==='quest'||goal.kind==='daily'&&openToday||showMe);button.disabled=goalBusy;
  button.className=goal.kind==='quest'||goal.kind==='daily'?'primary-button':'small-button';button.textContent=goal.kind==='quest'?'Claim':goal.kind==='daily'?'Open Today':'Show me';
  // "Quest ready:" before the quest's own title (11 Oct 2026: "Next: Claim Your first harvest" glued the title into a sentence, capital kept).
  // A field (Plan F, proposal 3) with its coins; the time everything is ready (proposal 2), today or tomorrow (nothing grows longer than a
  // day); and when nothing grows the quest closest to done with its count, or the next level, as the card says them.
  // While the phone's own green Claim sits at the end of the line (18 Oct 2026) it says "ready" itself: the line is the trophy and the
  // quest's name only, so a long name still fits on a 375 px phone.
  const clock=new Date(wait).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const quickClaim=onPhone&&!$('next-goal-claim-mobile')?.hidden;
  $('next-goal-mobile-copy').textContent=goal.kind==='quest'?(quickClaim?goal.title:`Quest ready: ${goal.title}`):goal.kind==='daily'?`Daily challenge ready: ${goal.title}`:goal.kind==='build'?`Next: Build the ${goal.name}`:goal.kind==='field'?`Next: Buy field ${goal.field} for ${number(goal.cost)} coins`
   :wait?(new Date(wait).toDateString()===today?`Everything is ready at ${clock}`:`Everything is ready tomorrow at ${clock}`):goal.kind==='progress'?`Quest: ${goal.title} (${number(goal.value)} / ${number(goal.target)})`:title;
  icons();
 }
 async function goalTap(fromLine=false){
  const goal=nextGoal(state);if(!goal||goalBusy)return;
  if(goal.kind==='quest'){
   // On a phone the banner opens Quests at that quest (its Claim is there); the card claims it right here, that one only.
   if(fromLine&&openQuest){openQuest(goal.id);return;}
   if(!claimQuest)return;goalBusy=true;goalCard(true);try{await claimQuest(goal.id);}finally{goalBusy=false;goalKey='';refresh();}
   return;
  }
  // The card and the phone's line both open Today at the challenge; it is claimed there, one at a time.
  if(goal.kind==='daily'){openToday?.(goal.id);return;}
  // The phone's line while the farm grows, or for a goal without a Show me (the next level): Quests, with the quests in progress.
  if(fromLine&&!actNow(goal)&&(goalWait>farmNow()||!(goal.kind==='progress'&&goal.guide))){openQuest?.(goal.kind==='progress'?goal.id:null);return;}
  if(goal.kind==='build')guide(`build:${goal.key}`);
  else if(goal.kind==='field')guide('field');
  else if(goal.kind==='progress'&&goal.guide)guide(goal.guide);
 }
 $('next-goal-button')?.addEventListener('click',()=>void goalTap());
 $('next-goal-mobile')?.addEventListener('click',()=>void goalTap(true));
 $('next-goal-claim-mobile')?.addEventListener('click',()=>$('next-goal-button')?.click());
 $('next-goal-collapse')?.addEventListener('click',()=>{folded=!folded;try{storage?.setItem(GOAL_FOLDED_KEY,folded?'folded':'open');}catch{}goalKey='';refresh();});
 refresh();return {open,refresh,afterAction,tick,landed,autoCheck};
}
