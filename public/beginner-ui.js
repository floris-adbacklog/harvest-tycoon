import {BEGINNER_QUESTS,BEGINNER_REWARD,BEGINNER_STEP_XP,beginnerProgress} from './farm-state.js';
import {art} from './visual-icons.js';

export function createBeginnerUI({state,runAction,icons,notify,onChange,guide,onFinished}){
 const $=id=>document.getElementById(id),dialog=$('beginner-dialog');
 let busy=false,lastMarkup='',finaleShown=false;
 function refresh(){
  const steps=beginnerProgress(state),current=steps.find(q=>q.current),done=steps.filter(q=>q.done).length,complete=done===steps.length;
  const finished=complete&&state.onboarding?.rewardClaimed===true;
  document.querySelector('.beginner-card').hidden=finished;
  document.querySelectorAll('[data-menu-action="all-quests-mobile"]').forEach(el=>el.hidden=finished);
  if(finished&&dialog.open)dialog.close();
  $('game').classList.toggle('beginner-active',!complete);$('beginner-mobile').hidden=complete;$('beginner-mobile').classList.toggle('is-ready',!!current?.ready);
  $('beginner-mobile-copy').textContent=`Step ${Math.min(done+1,steps.length)} of 10 · ${current?.ready?'Ready to complete':current?.title??'Guide complete'}`;
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
  const markup=steps.map(q=>`<article class="beginner-step ${q.done?'done':q.current?'current':'upcoming'}" ${q.current?'aria-current="step"':''}><span class="beginner-step-number">${q.done?'✓':q.index+1}</span><div><h3>${q.title}</h3>${q.current?`<p>${q.description}</p>`:''}<span class="beginner-status">${q.done?'Completed':q.current?q.ready?'Ready to complete':'Your current step':q.ready?'Done early · finish the steps before it':''}${q.done?'':xp}</span>${q.current?`<div class="beginner-actions"><button class="small-button" data-beginner-help>Show me</button>${q.ready?`<button class="primary-button" data-beginner-claim ${busy?'disabled':''}>${q.index===9?`Claim ${BEGINNER_REWARD} diamonds`:'Complete step'}</button>`:''}</div>`:''}</div></article>`).join('');
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
   notify(`✓ ${title} · +${xp} XP.${current?` Next: ${current.title}.`:''}`);
   for(const el of [$('beginner-mobile'),document.querySelector('.beginner-card')]){if(!el)continue;el.classList.remove('just-done');void el.offsetWidth;el.classList.add('just-done');}
  }
  if(current?.index===BEGINNER_QUESTS.length-1&&current.ready&&!finaleShown){finaleShown=true;open();}
 }
 refresh();return {open,refresh,afterAction};
}
