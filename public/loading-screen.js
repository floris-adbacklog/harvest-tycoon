// One loading screen for the sign-in check (play.html) and the farm (farm.html): the same layout on both pages, so it reads as
// one screen. One bar runs on from the account check (the first few percent) to 100%, the line under it says the real step,
// and a tip with a small painted picture changes every few seconds. "Ready!" only ever shows at 100%.
export const LOADING_TIPS=Object.freeze([
 ['double-harvest','Water and care for a field: up to three crops from one harvest.'],
 ['apples','Apple trees and berry bushes grow back after you pick them.'],
 ['collect-all','Turn crops into goods in your buildings: they sell for more.'],
 ['instant-harvest','Swipe across your fields to harvest many at once.'],
 ['live-events','A new farm event starts every six hours.'],
 ['family-members','Join a Farm family for weekly orders and a tournament.'],
 ['guide','How to play has a wiki with every crop and recipe.']
]);
// The account check on play.html covers the bar up to here; the farm continues from it.
export const FARM_START=12;
export const ACCOUNT_STEPS=Object.freeze({'Checking your account…':4,'Signing you out…':4,'Opening your farm…':10});

// Shows a tip and changes it every few seconds with a short fade. Returns a function that stops it.
export function startLoadingTips(doc,{text='loading-tip-text',icon='loading-tip-icon',interval=4500,timers=globalThis,now=Date.now()}={}){
 const box=doc.getElementById(text)?.parentElement;let index=Math.floor(now/interval)%LOADING_TIPS.length,swap=0;
 const show=()=>{const [picture,tip]=LOADING_TIPS[index];const t=doc.getElementById(text),i=doc.getElementById(icon);if(t)t.textContent=tip;if(i)i.src=`/assets/icons/${picture}.webp`;};
 show();
 const timer=timers.setInterval(()=>{box?.classList?.add('is-changing');swap=timers.setTimeout(()=>{index=(index+1)%LOADING_TIPS.length;show();box?.classList?.remove('is-changing');},350);},interval);
 return ()=>{timers.clearInterval(timer);timers.clearTimeout(swap);};
}

// Progress reflects completed work: model files, account data and the first frame.
export function createLoadingScreen(doc,modelCount){
 const get=id=>doc.getElementById(id);
 let models=0,account=false,finished=false;
 function render(){
  const done=(models+Number(account)+Number(finished))/(modelCount+2);
  const percent=finished?100:Math.min(99,FARM_START+Math.floor(done*(100-FARM_START)));
  get('load-progress').value=percent;
  get('load-percent').textContent=`${percent}%`;
  get('load-text').textContent=finished?'Ready!':models<modelCount?'Loading your farm':!account?'Opening your saved farm':'Planting the fields';
 }
 render();
 return {
  modelsReady(count){if(finished)return;models=Math.max(models,Math.min(modelCount,count));render();},
  accountReady(){if(finished)return;account=true;render();},
  complete(){models=modelCount;account=true;finished=true;render();}
 };
}
