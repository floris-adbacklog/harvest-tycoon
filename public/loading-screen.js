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
 // 5 Oct 2026: what the order and events pay a family (tests/wiki.test.mjs keeps them equal to the rules in farm-state.js).
 // 5 Oct 2026, later: an unfinished order pays for its full lines too, so the tip no longer says only a finished one pays.
 ['family-weekly-order','The Family Order pays for every full line, finished or not. A whole order pays a quarter more than the Market’s normal price, plus XP and diamonds.'],
 ['family-members','Finish an event with two or more members of your Farm family: you each get 200 coins and 5 diamonds extra.'],
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

// A farm that does not open opens once more by itself (3 Oct 2026). The game's own code (public/game.js and the files it brings, each on
// its own) can fail to arrive on a weak connection, and the bar then stood still at 12% until a refresh. A load that fails, or a bar that
// does not move for 30 seconds while the page is in view, reloads the whole page once, as a refresh does (on CrazyGames that page asks for
// the farm again); a second time within ten minutes, or without a place to count it, shows "Your farm could not load" with Try again
// instead of a loop (over the loading screen, in the player's language). Try again reloads the whole page too: this page alone would come back without its farm. Each time is counted
// (farm_load_retry, with the player's consent like every other measurement), to see how often it happens.
export const LOAD_STALL_MS=30000,LOAD_RETRY_KEY='harvest-tycoon:farm-retry',LOAD_RETRY_GAP_MS=600000;
export function watchLoading(bridge,portal,{translate=()=>{},doc=document,win=window,storage=(()=>{try{return win.sessionStorage;}catch{return null;}})(),now=()=>Date.now()}={}){
 const reload=()=>{if(portal)portal.reopen();else win.parent.location.reload();};
 const retry=doc.querySelector('#error .primary-button');if(retry)retry.onclick=reload;
 let last=null,still=now(),over=false;
 const stop=()=>{over=true;win.clearInterval(timer);};
 function recover(reason){
  if(over)return;stop();
  let before=null;try{before=Number(storage.getItem(LOAD_RETRY_KEY))||0;}catch{}
  const again=before===null||now()-before<LOAD_RETRY_GAP_MS;
  try{bridge.trackGame?.('farm_load_retry',{reason,again});}catch{}
  if(!again){try{storage.setItem(LOAD_RETRY_KEY,String(now()));}catch{}win.setTimeout(reload,400);return;}
  // Over the loading screen, without its bar: the page under it only holds placeholders (level 1, 180 coins), not this farm. In the
  // player's language, which otherwise comes with the game's code.
  const bar=doc.querySelector('#loading .farm-loading-progress');if(bar)bar.style.visibility='hidden';
  const card=doc.getElementById('error');card.style.zIndex='101';card.hidden=false;try{translate();}catch{}
 }
 const timer=win.setInterval(()=>{
  const value=Number(doc.getElementById('load-progress')?.value??0);
  if(value!==last||doc.hidden){last=value;still=now();}else if(now()-still>=LOAD_STALL_MS)recover('stalled');
 },1000);
 return {failed:()=>recover('failed'),done(ready){if(over)return;stop();if(ready)try{storage.removeItem(LOAD_RETRY_KEY);}catch{}}};
}
