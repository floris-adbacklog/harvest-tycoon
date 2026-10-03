// One loading screen for the sign-in check (play.html) and the farm (farm.html): the same layout on both pages, so it reads as
// one screen. One bar runs on from the account check (the first few percent) to 100%, the line under it says the real step,
// and a tip with a small painted picture changes every few seconds. "Ready!" only ever shows at 100%.
export const LOADING_TIPS=Object.freeze([
 ['double-harvest','Water and care for a field: up to three crops from one harvest.'],
 ['apples','Apple trees and berry bushes grow back after you pick them.'],
 ['collect-all','Turn crops into goods in your buildings: they sell for more.'],
 ['instant-harvest','Hold the mouse button on a ripe crop and sweep across your fields to harvest them all. On a phone, hold a field for a moment first.'],
 ['live-events','A new event starts every six hours: finish its goals for coins and diamonds.'],
 ['guide','How to play has a wiki with every crop and recipe.'],
 // More tips (1 Oct 2026); the old Farm family tip (weekly orders) gave way to the Family Chest and the top ten.
 ['double-coins','The Market shows tomorrow’s best price: make it today, sell it tomorrow.'],
 ['offer-coins','Come back every day: your daily gift grows with your streak, and one missed day a week is forgiven.'],
 ['level-up','Every new level brings coins and diamonds, and opens new crops and buildings.'],
 ['invite-friends','Share my farm: send a picture of your farm with your invite link when you level up.'],
 ['squash','Plant a long crop before you go: your farm keeps growing while you are away.'],
 ['chore-weeds','Farm chores pay coins and XP, and sometimes find extra crops.'],
 ['helping-hand','Lend a helping hand at four stops on the farm for coins, goods and XP.'],
 ['family-chest-gold','Fill a Family Chest with your Farm family every week: everything you do on your farm counts.'],
 ['family-sharing','In a Farm family you help each other every day with coins, crops and goods.'],
 ['family-tournament','The top ten families win diamonds in the weekly Family Tournament.'],
 ['invite-friends','Invite a friend: when they reach level 10 within 30 days, you both get 150 diamonds.'],
 ['farmapp','Add Harvest Tycoon to your home screen: one tap away, with a reminder when your crops are ready.'],
 ['valley-market','From level 62 the Valley Market pays 1.5× for a full basket of goods.'],
 ['trade-depot','From level 85 a full export trailer at the Trade Depot pays 1.6× plus diamonds.']
]);
// The Halloween Pass (Oct 2026): a tip of its own among the others, only while lanterns count (public/game.js checks the season, so this
// screen needs none of the game's rules).
export const PASS_LOADING_TIP=Object.freeze(['giant-small','Halloween Pass from level 10: every daily gift, daily challenge and delivery brings lanterns for its rewards.']);
// On the way to the village (World II, 30 Sep 2026) the tips are about the village.
export const VILLAGE_LOADING_TIPS=Object.freeze([
 ['packedlunch','Every trip into the mine or the forest starts with packed lunches from your farm Kitchen.'],
 ['mastertools','Master tools from the Smithy take your farm buildings past level 10.'],
 ['villagemarket','Village goods sell at the Village market, not at the farm Market.'],
 ['farmroad','Your farm keeps growing while you are in the village.']
]);
// The account check on play.html covers the bar up to here; the farm continues from it.
export const FARM_START=12;
export const ACCOUNT_STEPS=Object.freeze({'Checking your account…':4,'Signing you out…':4,'Opening your farm…':10});

// On CrazyGames (Oct 2026: the page is marked html[data-portal], public/portal.js) the tips about inviting, sharing and the app are
// left out: none of those are there.
export const PORTAL_HIDDEN_TIPS=Object.freeze(['invite-friends','farmapp']);
// In our Android app (Oct 2026: html[data-app=android], public/android.js) only the tip about adding the game to the home screen goes:
// the app is on the phone already.
export const APP_HIDDEN_TIPS=Object.freeze(['farmapp']);
export const portalTips=(tips,doc)=>{
 const data=doc?.documentElement?.dataset,hidden=data?.portal?PORTAL_HIDDEN_TIPS:data?.app==='android'?APP_HIDDEN_TIPS:null;
 return hidden?tips.filter(([picture])=>!hidden.includes(picture)):tips;
};
// Shows a tip and changes it every few seconds with a short fade. Returns a function that stops it.
export function startLoadingTips(doc,{tips:all=LOADING_TIPS,text='loading-tip-text',icon='loading-tip-icon',interval=4500,timers=globalThis,now=Date.now()}={}){
 const tips=portalTips(all,doc),box=doc.getElementById(text)?.parentElement;let index=Math.floor(now/interval)%tips.length,swap=0;
 const show=()=>{const [picture,tip]=tips[index];const t=doc.getElementById(text),i=doc.getElementById(icon);if(t)t.textContent=tip;if(i)i.src=`/assets/icons/${picture}.webp`;};
 show();
 const timer=timers.setInterval(()=>{box?.classList?.add('is-changing');swap=timers.setTimeout(()=>{index=(index+1)%tips.length;show();box?.classList?.remove('is-changing');},350);},interval);
 return ()=>{timers.clearInterval(timer);timers.clearTimeout(swap);};
}

// Progress reflects completed work: model files, account data and the first frame. On the way to the village (World II) the first
// step reads 'Travelling to the village'.
export function createLoadingScreen(doc,modelCount,{loading='Loading your farm'}={}){
 const get=id=>doc.getElementById(id);
 let models=0,account=false,finished=false;
 function render(){
  const done=(models+Number(account)+Number(finished))/(modelCount+2);
  const percent=finished?100:Math.min(99,FARM_START+Math.floor(done*(100-FARM_START)));
  get('load-progress').value=percent;
  get('load-percent').textContent=`${percent}%`;
  get('load-text').textContent=finished?'Ready!':models<modelCount?loading:!account?'Opening your saved farm':'Planting the fields';
 }
 render();
 return {
  modelsReady(count){if(finished)return;models=Math.max(models,Math.min(modelCount,count));render();},
  accountReady(){if(finished)return;account=true;render();},
  complete(){models=modelCount;account=true;finished=true;render();}
 };
}
