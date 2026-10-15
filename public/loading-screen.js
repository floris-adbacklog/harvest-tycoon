// One loading screen for the sign-in check (play.html) and the farm (farm.html): the same layout on both pages, so it reads as
// one screen. One bar runs on from the account check (the first few percent) to 100%, the line under it says the real step,
// and a tip with a small painted picture changes every few seconds. "Ready!" only ever shows at 100%.
// Plan F (13 Oct 2026, proposal 5): a tip about something that opens later says its level, as the Valley Market's does (events and farm
// chores at 15, apple trees at 20 and berry bushes at 23; tests/text-round.test.mjs keeps them equal to the rules).
export const LOADING_TIPS=Object.freeze([
 ['double-harvest','Water and care for a field: up to three crops from one harvest.'],
 ['apples','From level 20 apple trees grow back after you pick them, and from level 23 berry bushes too.'],
 ['collect-all','Turn crops into goods in your buildings: they sell for more.'],
 ['instant-harvest','Hold the mouse button on a ripe crop and sweep across your fields to harvest them all. On a phone, hold a field for a moment first.'],
 ['live-events','From level 15 a new event starts every six hours: finish its goals for coins and diamonds.'],
 ['guide','How to play has a wiki with every crop and recipe.'],
 // More tips (1 Oct 2026); the old Farm family tip (weekly orders) gave way to the Family Chest and the top ten.
 ['double-coins','The Market shows tomorrow’s best price: make it today, sell it tomorrow.'],
 ['offer-coins','Come back every day: your daily gift grows with your streak, and one missed day a week is forgiven.'],
 ['level-up','Every new level brings coins and diamonds, and opens new crops and buildings.'],
 ['invite-friends','Share my farm: send a picture of your farm with your invite link when you level up.'],
 ['squash','Plant a long crop before you go: your farm keeps growing while you are away.'],
 ['chore-weeds','From level 15 farm chores pay coins and XP, and sometimes find extra crops.'],
 ['helping-hand','Lend a helping hand at four stops on the farm for coins, goods and XP.'],
 ['family-chest-gold','Fill a Family Chest with your Farm family every week: everything you do on your farm counts.'],
 ['family-sharing','In a Farm family you help each other every day with coins, crops and goods.'],
 ['family-tournament','The top ten families win diamonds in the weekly Family Tournament.'],
 // 5 Oct 2026: what the order and events pay a family (tests/wiki.test.mjs keeps them equal to the rules in farm-state.js).
 // 5 Oct 2026, later: an unfinished order pays for its full lines too, so the tip no longer says only a finished one pays.
 ['family-weekly-order','The Family Order pays for every full line, finished or not. A whole order pays a quarter more than the Market’s normal price, plus XP and diamonds.'],
 ['family-members','Finish an event with two or more members of your Farm family: you each get 200 coins and 3 diamonds extra.'],   // 5 until 7 Oct 2026
 ['invite-friends','Invite a friend: when they reach level 10 within 30 days, you both get 150 diamonds.'],
 ['farmapp','Add Harvest Tycoon to your home screen: one tap away, with a reminder when your crops are ready.'],
 ['valley-market','From level 62 the Valley Market pays 1.5× for a full basket of goods.'],
 ['trade-depot','From level 85 a full export trailer at the Trade Depot pays 1.6× plus diamonds.']
]);
// The Halloween Pass (Oct 2026): a tip of its own among the others, only while lanterns count (public/game.js checks the season, so this
// screen needs none of the game's rules).
export const PASS_LOADING_TIP=Object.freeze(['giant-small','Halloween Pass from level 10: every daily gift, daily challenge and delivery brings lanterns for its rewards.']);
// The Fishing pond (11 Oct 2026): its tip only once the pond is open (game.js adds it when farm-state.js POND_OPEN is on). The numbers
// are the rules' (POND_LEVEL, POND_START_CASTS, POND_REFILL_MS; tests/fishing.test.mjs keeps them equal).
export const POND_LOADING_TIP=Object.freeze(['fishingpond','Waiting for your crops? From level 4 the fishing pond has 5 casts for you, and a new one every 20 minutes.']);
// The village lake (12 Oct 2026, plan D): a village tip of its own, only once the lake is open (game.js adds it first on the way to the
// village when farm-state.js LAKE_OPEN is on). Its 5 is the rules' POND_START_CASTS (tests/lake-screen.test.mjs keeps them equal).
export const LAKE_LOADING_TIP=Object.freeze(['villagelake','The village lake has its own 5 casts, apart from your farm pond, and its fish pay much more.']);
// On the way to the village (World II, 30 Sep 2026) the tips are about the village.
export const VILLAGE_LOADING_TIPS=Object.freeze([
 ['packedlunch','Every trip into the mine or the forest starts with packed lunches from your farm Kitchen.'],
 // The market square (Oct 2026). "At least half again": 1.6 times once the Great Hall stands.
 ['villagemarket','Villagers at the market square pay at least half again what their goods are worth.'],
 ['village-badge','Each golden brief at the market square builds the next village place or landmark.'],
 // The village's later levels (Oct 2026), each with the level it opens at (this screen reads none of the game's rules:
 // tests/village-square.test.mjs keeps the numbers equal to farm-state.js).
 ['potatoes','From level 110, the Village Fields grow potatoes from natural fertilizer and coins, with no field on the farm.'],
 ['canteen','From level 113, the Miners’ Canteen bakes packed lunches without apples.'],
 // The screen loads /assets/icons/<picture>.webp itself, so a tip's picture is a file there, never a sprite like 'diamonds' (10 Oct 2026,
 // review fix: a broken picture). The crate of diamonds is the market crate.
 ['offer-diamonds','From level 116, help 15 villagers in a week and the market crate gives you 10 diamonds.'],
 ['builderscrate','From level 128, builder’s crates from the Lumber Camp take coins off your farm building upgrades.'],
 ['pier','From level 144, mend the old pier and the town boat buys your finest village goods.'],
 ['landmark-greathall','From level 165, the golden brief builds landmarks, and each one’s bonus lasts for good.'],
 ['mastertools','Master tools from the Smithy take your farm buildings past level 10.'],
 ['villagemarket','Village goods sell at the Village market, not at the farm Market.'],
 ['farmroad','Your farm keeps growing while you are in the village.']
]);
// The account check on play.html covers the bar up to here; the farm continues from it.
export const FARM_START=12;
export const ACCOUNT_STEPS=Object.freeze({'Checking your account…':4,'Signing you out…':4,'Opening your farm…':10});
// One screen from start to farm (6 Oct 2026): the page around the farm (play.html, crazygames.html) keeps its loading screen over the
// farm frame until the farm page shows its own (src/game-cloud.js calls harvestFarmShown once it has drawn it). Before, the frame showed
// empty while the farm page's script was still on its way, and the farm's screen then came as a second one; on CrazyGames two thirds
// of the farmers who opened the game never started playing. If the farm page never says so, the frame shows after `wait` anyway.
// 11 Oct 2026 (the 12% report again): this page now watches the farm page until it shows itself. watchLoading below only starts once the
// farm page's own code runs (src/game-cloud.js), and before that nothing watched: a farm page whose files did not come (a stylesheet or a
// script caught in a stalled transfer, or right after a deploy a part of src/game-cloud.js under its old name, gone from the site) stayed
// hidden, this screen went after 20 seconds and left an empty frame for good; after a trip to the village (no screen here then) at once.
// Now this screen stays until the farm page shows (its word, or its page seen shown), and one that does not get there is opened again by
// watchLoading's own rule and count: 30 seconds in view without a file of it arriving (a slow line keeps them coming, so it is never
// taken for stuck), or 3 seconds once all its files are there and it still has not shown (its code did not run); once, then a second time
// within ten minutes the page's own pause card with Try again (fail). A trip's new farm page is watched the same way, without this
// screen over it. Where no farm frame can be seen, the screen goes after `wait`, as before.
export const FRAME_FAILED_MS=3000;
export const LOAD_FAILED_TEXT='Check your connection and try again.';
export function farmHandOver(win,screen,{wait=20000,frame=()=>win.document?.querySelector?.('#farm-host iframe'),reload=()=>win.location?.reload(),fail=()=>{screen.hidden=true;},track=()=>{},storage=pageStorage(win),now=()=>Date.now(),hidden=()=>Boolean(win.document?.hidden),timers=globalThis}={}){
 let timer=0,tick=0,shownDoc=null,shownSrc=null,seen=null,files=-1,still=0;
 // 11 Oct 2026, review fix: a frame whose page cannot be read (doc null) is the browser's own error page, as when farm.html's own
 // request fails (a network switch, a reset connection): before, that read as no frame at all, and this screen stayed at 10% for good.
 const frameEl=()=>{try{return frame()??null;}catch{return null;}};
 const view=()=>{const el=frameEl();if(!el)return null;try{const doc=el.contentDocument??null;return {el,doc,win:doc?el.contentWindow:null};}catch{return {el,doc:null,win:null};}};
 // Where the frame was sent: a trip sends it with location.replace and says so in dataset.address (13 Oct 2026, src/main.js travel).
 const address=el=>el.dataset?.address||el.src;
 const shown=()=>{timers.clearTimeout(timer);timer=0;screen.hidden=true;const at=view();if(at?.doc){shownDoc=at.doc;shownSrc=address(at.el);}};
 win.harvestFarmShown=shown;
 const stop=()=>{timers.clearTimeout(timer);timers.clearInterval(tick);timer=tick=0;};
 function check(){
  const at=view();if(!at||at.doc&&at.doc===shownDoc)return;
  // An unreadable page counts as a failed load while the farm page is awaited: before it has shown, or after the frame was sent to a
  // new address (a trip). The farm page that has shown and then went to another site itself (never ours: its links open a new tab)
  // is left alone.
  if(!at.doc&&shownDoc&&address(at.el)===shownSrc)return;
  // The farm page (its bar is there: not the frame's first empty page) shows itself in src/game-cloud.js, also when its word never came.
  const {doc}=at,farm=Boolean(doc?.getElementById?.('load-progress'));
  if(farm&&doc.body&&!doc.body.hidden){shown();return;}
  const page=doc??UNREADABLE,count=doc?filesIn(at.win):-1;
  if(page!==seen||count!==files){seen=page;files=count;still=0;return;}
  if(hidden())return;
  const failed=!doc||farm&&doc.readyState==='complete';
  if((still+=1000)<(failed?FRAME_FAILED_MS:LOAD_STALL_MS))return;
  stop();const again=retriedLately(storage,now);
  try{track('farm_load_retry',{reason:failed?'failed':'stalled',again,step:'frame',models:0});}catch{}
  if(again)fail();else timers.setTimeout(reopen,400);
 }
 // The reload is watched too (15 Oct 2026, RELOAD_HUNG_MS below): this page stays until the new one arrives, and still here after 15
 // seconds it shows the pause card with Try again. A portal opens the farm again inside this page and stops this watch at once (its
 // phase 'checking'), and a farm page that shows itself meanwhile clears it too.
 function reopen(){timer=timers.setTimeout(hung,RELOAD_HUNG_MS);reload();}
 function hung(){timer=0;try{track('farm_load_retry',{reason:'reload_hung',again:true,step:'frame',models:0});}catch{}fail();}
 return {wait(){stop();screen.hidden=false;shownDoc=shownSrc=seen=null;files=-1;still=0;if(frameEl())tick=timers.setInterval(check,1000);else timer=timers.setTimeout(shown,wait);},stop};
}
const UNREADABLE={};
const pageStorage=win=>{try{return win.sessionStorage;}catch{return null;}};
// How many files a page has had so far (its resource timing): a load that is slow, not stuck, keeps adding to it.
const filesIn=win=>{try{return win.performance.getEntriesByType('resource').length;}catch{return 0;}};

// On CrazyGames (Oct 2026: the page is marked html[data-portal], public/portal.js) the tips about inviting, sharing and the app are
// left out: none of those are there.
export const PORTAL_HIDDEN_TIPS=Object.freeze(['invite-friends','farmapp']);
// In our Android app (Oct 2026: html[data-app=android], public/android.js) only the tip about adding the game to the home screen goes:
// the app is on the phone already.
export const APP_HIDDEN_TIPS=Object.freeze(['farmapp']);
// Beginners see only the tips about the basics (13 Oct 2026: a level-1 farmer could read about the Family Order while the farm loaded).
// The tips about features that open at level 10 or later (events, Farm chores, Farm families, the Halloween Pass, the Valley Market, the
// Trade Depot) wait until level 10, when Farm families open (farm-state.js FAMILY_MIN_LEVEL; tests/first-sale-quiet.test.mjs keeps them
// equal and checks each level). Crops are no feature: every level opens new ones (the apple tip is also each page's first, in its HTML).
// The farm page knows the farmer's level (game.js level); the page around it (play.html, the portals) does not: there only the basics.
export const BEGINNER_TIP_LEVEL=10;
export const LATER_TIPS=Object.freeze(['live-events','chore-weeds','family-chest-gold','family-sharing','family-tournament','family-weekly-order','family-members','valley-market','trade-depot','giant-small']);
export const portalTips=(tips,doc)=>{
 const data=doc?.documentElement?.dataset,hidden=data?.portal?PORTAL_HIDDEN_TIPS:data?.app==='android'?APP_HIDDEN_TIPS:null;
 return hidden?tips.filter(([picture])=>!hidden.includes(picture)):tips;
};
// Shows a tip and changes it every few seconds with a short fade. Returns a function that stops it. level(): the farmer's level, 0 when
// not known (a later tip is passed over below BEGINNER_TIP_LEVEL).
export function startLoadingTips(doc,{tips:all=LOADING_TIPS,level=()=>0,text='loading-tip-text',icon='loading-tip-icon',interval=4500,timers=globalThis,now=Date.now()}={}){
 const tips=portalTips(all,doc),box=doc.getElementById(text)?.parentElement;let index=Math.floor(now/interval)%tips.length,swap=0;
 const fits=([picture])=>{if(!LATER_TIPS.includes(picture))return true;try{return Number(level())>=BEGINNER_TIP_LEVEL;}catch{return false;}};
 const show=()=>{for(let n=0;n<tips.length&&!fits(tips[index]);n++)index=(index+1)%tips.length;const [picture,tip]=tips[index];const t=doc.getElementById(text),i=doc.getElementById(icon);if(t)t.textContent=tip;if(i)i.src=`/assets/icons/${picture}.webp`;};
 show();
 const timer=timers.setInterval(()=>{box?.classList?.add('is-changing');swap=timers.setTimeout(()=>{index=(index+1)%tips.length;show();box?.classList?.remove('is-changing');},350);},interval);
 return ()=>{timers.clearInterval(timer);timers.clearTimeout(swap);};
}

// Progress reflects completed work: model files, account data and the first frame. On the way to the village (World II) the first
// step reads 'Travelling to the village'.
export function createLoadingScreen(doc,modelCount,{loading='Loading your farm',village=false}={}){
 const get=id=>doc.getElementById(id),view=doc.defaultView;
 let models=0,account=false,finished=false;
 function render(){
  // Where the load is (8 Oct 2026), for watchLoading below when the bar stands still; none at all means public/game.js never ran.
  // 11 Oct 2026: and whether it is the village (its own step in farm_load_retry).
  if(view)view.harvestLoading={models,of:modelCount,account,finished,...(village?{village}:{})};
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
// 8 Oct 2026: only the seconds in view count, and time out of view no longer starts them again: before, a tab in the background or a
// window fully covered by another (a Mac then counts the page as out of view) never got to 30 and stayed at 12%. The event also says
// which step stood still: 'code' (public/game.js never ran), 'models' (with how many had arrived), 'account' or 'scene'.
export const LOAD_STALL_MS=30000,LOAD_RETRY_KEY='harvest-tycoon:farm-retry',LOAD_RETRY_GAP_MS=600000;
// 15 Oct 2026 (the 12% report, a fourth time): the page opened again by itself was not watched. A reload keeps the old page on screen
// until the new one arrives, and a reload that got no answer either (the same weak line, a laptop just awake) left it at 12% until the
// player refreshed. Still here 15 seconds after the reload: "Your farm could not load" with Try again (farmHandOver: the page's own
// pause card), counted as reason 'reload_hung'. Never a second reload by itself: that would only start the waiting one over.
export const RELOAD_HUNG_MS=15000;
// 11 Oct 2026: 'village' is the village's own models step, 'frame' a farm page that never showed (farmHandOver above).
export const loadStep=at=>!at?'code':at.models<at.of?(at.village?'village':'models'):!at.account?'account':'scene';
// The one count of a farm opened again by itself, for this page and the page around it (11 Oct 2026): true when it already was within
// ten minutes, or there is no place to count it (then Try again, never a loop); otherwise the reload about to come is counted.
function retriedLately(storage,now){
 let before=null;try{before=Number(storage.getItem(LOAD_RETRY_KEY))||0;}catch{}
 const again=before===null||now()-before<LOAD_RETRY_GAP_MS;
 if(!again)try{storage.setItem(LOAD_RETRY_KEY,String(now()));}catch{}
 return again;
}
export function watchLoading(bridge,portal,{translate=()=>{},doc=document,win=window,storage=pageStorage(win),now=()=>Date.now()}={}){
 const reload=()=>{if(portal)portal.reopen();else win.parent.location.reload();};
 // Try again's only handler: farm.html has no onclick of its own since Oct 2026 (Discord runs no handler written in the page).
 const retry=doc.querySelector('#error .primary-button');if(retry)retry.onclick=reload;
 let last=null,still=0,over=false;
 const stop=()=>{over=true;win.clearInterval(timer);};
 function recover(reason){
  if(over)return;stop();
  const again=retriedLately(storage,now);
  const at=win.harvestLoading;try{bridge.trackGame?.('farm_load_retry',{reason,again,step:loadStep(at),models:at?.models??0});}catch{}
  if(again)showCard();else win.setTimeout(reopen,400);
 }
 // Over the loading screen, without its bar: the page under it only holds placeholders (level 1, 180 coins), not this farm. In the
 // player's language, which otherwise comes with the game's code.
 function showCard(){
  const bar=doc.querySelector('#loading .farm-loading-progress');if(bar)bar.style.visibility='hidden';
  const card=doc.getElementById('error');card.style.zIndex='101';card.hidden=false;try{translate();}catch{}
 }
 // The reload is watched too (RELOAD_HUNG_MS): this page still here 15 seconds after it, and its farm not on screen, shows the card. A
 // portal's reopen removes this page's frame at once, and its timers with it.
 function reopen(){win.setTimeout(hung,RELOAD_HUNG_MS);reload();}
 function hung(){
  const at=win.harvestLoading;if(at?.finished)return;
  try{bridge.trackGame?.('farm_load_retry',{reason:'reload_hung',again:true,step:loadStep(at),models:at?.models??0});}catch{}
  showCard();
 }
 // Every second in view with the bar where it was counts; a second out of view counts for nothing, and does not start them again.
 // 11 Oct 2026: until public/game.js runs, each file of its code that arrives counts as moving too (about 1 MB packed: on a slow line
 // longer than 30 seconds at 12%, which was taken for a stuck page and opened again halfway), and a finished bar is never stuck (the
 // farm is on screen: opening it again would only lose it).
 const timer=win.setInterval(()=>{
  const at=win.harvestLoading,value=`${Number(doc.getElementById('load-progress')?.value??0)} ${at?'':filesIn(win)}`;
  if(value!==last){last=value;still=0;}else if(!doc.hidden&&!at?.finished&&(still+=1000)>=LOAD_STALL_MS)recover('stalled');
 },1000);
 return {failed:()=>recover('failed'),done(ready){if(over)return;stop();if(ready)try{storage.removeItem(LOAD_RETRY_KEY);}catch{}}};
}
