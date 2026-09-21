import {BEGINNER_QUESTS,BEGINNER_REWARD,BEGINNER_STEP_XP,beginnerProgress} from './farm-state.js';

export function createBeginnerUI({state,runAction,icons,notify,onChange,guide}){
 const $=id=>document.getElementById(id),dialog=$('beginner-dialog');
 let busy=false,lastMarkup='';
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
  $('quest-description').textContent=current?.description??'You learned the basics and earned 20 diamonds. Find your next goals in Quests and Today.';
  $('quest-progress').max=steps.length;$('quest-progress').value=done;$('quest-count').textContent=`${done} / ${steps.length}`;
  $('claim-reward').disabled=busy||!current?.ready;$('claim-reward').textContent=complete?'Guide complete':done===9?'Claim 20 diamonds':'Complete step';
  $('beginner-help').hidden=complete;$('beginner-help').textContent=current?.ready?'Take a look':'Show me';
  document.querySelector('.beginner-prize').classList.toggle('claimed',complete);
  $('beginner-prize-title').textContent=complete?'20 diamonds earned':'20 diamonds';
  $('beginner-prize-note').textContent=complete?'Well done, farmer!':'After all 10 steps';
  $('all-quests-mobile').textContent=complete?'Review beginner guide':'View all 10 steps';
  if(!dialog.open)return;
  $('beginner-summary').innerHTML=`<span><strong>${done} of ${steps.length}</strong> steps completed</span><span><span aria-hidden="true">◇</span>${BEGINNER_REWARD} diamonds ${complete?'earned':'to earn'}</span>`;
  const markup=steps.map(q=>`<article class="beginner-step ${q.done?'done':q.current?'current':''}" ${q.current?'aria-current="step"':''}><span class="beginner-step-number">${q.done?'✓':q.index+1}</span><div><h3>${q.title}</h3><p>${q.description}</p><span class="beginner-status">${q.done?'Completed':q.current?q.ready?'Ready to complete':'Your current step':q.ready?'Already tried · complete the earlier steps first':'Coming up'}${q.done?'':` · +${BEGINNER_STEP_XP} XP`}</span>${q.current?`<div class="beginner-actions"><button class="small-button" data-beginner-help>Show me</button><button class="primary-button" data-beginner-claim ${!q.ready||busy?'disabled':''}>${q.index===9?'Claim 20 diamonds':'Complete step'}</button></div>`:''}</div></article>`).join('');
  if(markup!==lastMarkup){$('beginner-list').innerHTML=markup;lastMarkup=markup;icons();}
 }
 function open(){if(state.onboarding?.rewardClaimed&&state.onboarding.completed>=BEGINNER_QUESTS.length)return;document.querySelectorAll('dialog[open]').forEach(d=>d.close());dialog.showModal();refresh();dialog.scrollTop=0;dialog.querySelector('.close-dialog').focus({preventScroll:true});}
 async function claim(){
  const current=beginnerProgress(state).find(q=>q.current);if(busy||!current?.ready)return;
  busy=true;refresh();
  try{const result=await runAction({type:'beginner_claim',id:current.id});onChange();notify(result.diamonds?`Beginner guide complete! +${result.xp??BEGINNER_STEP_XP} XP and ${BEGINNER_REWARD} diamonds.`:`Step ${result.completed} complete · +${result.xp??BEGINNER_STEP_XP} XP. Keep growing!`);}
  catch(error){notify(error.message);}
  finally{busy=false;refresh();if(dialog.open)(dialog.querySelector('[data-beginner-claim]:not(:disabled)')??dialog.querySelector('[data-beginner-help]')??dialog.querySelector('.close-dialog')).focus({preventScroll:true});}
 }
 function help(){const current=beginnerProgress(state).find(q=>q.current);if(!current)return;dialog.close();guide(current.guide);}
 $('claim-reward').addEventListener('click',claim);$('beginner-help').addEventListener('click',help);$('all-quests-mobile').addEventListener('click',open);$('beginner-mobile').addEventListener('click',open);
 dialog.addEventListener('click',event=>{if(event.target.closest('[data-beginner-claim]'))claim();if(event.target.closest('[data-beginner-help]'))help();});
 refresh();return {open,refresh};
}
