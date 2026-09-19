// Progress reflects completed work: model files, account data and the first frame.
const TIPS=[
 'Water and care for your crops to bring home a bigger harvest.',
 'Visit Today for your daily gift, fresh challenges and delivery orders.',
 'Turn your crops into farm goods. Check today’s prices before selling.',
 'Apple trees and berry bushes grow again after you pick their fruit.',
 'Each building level gives you one more production slot.'
];
export function createLoadingScreen(doc,modelCount){
 const get=id=>doc.getElementById(id);
 let models=0,account=false,finished=false;
 function render(){
  const percent=Math.floor((models+Number(account)+Number(finished))/(modelCount+2)*100);
  get('load-progress').value=percent;
  get('load-percent').textContent=`${percent}%`;
  const heading=finished?'Welcome home, farmer.':'Your farm is taking root.';
  if(get('load-heading').textContent!==heading)get('load-heading').textContent=heading;
  get('load-text').textContent=finished?'Your farm is ready':models<modelCount?`Preparing your farm · ${models} / ${modelCount}`:!account?'Opening your saved farm…':'Adding the finishing touches…';
  get('farm-loading-tip').textContent=TIPS[Math.min(TIPS.length-1,Math.floor(percent/20))];
 }
 render();
 return {
  modelsReady(count){if(finished)return;models=Math.max(models,Math.min(modelCount,count));render();},
  accountReady(){if(finished)return;account=true;render();},
  complete(){models=modelCount;account=true;finished=true;render();}
 };
}
