import {createAvatarSettings} from '../public/avatar-settings.js';
import {skeleton} from '../public/skeleton.js';
import {WORLD_TWO_LEVEL} from '../public/farm-state.js';
import {createPlayerProfiles} from './player-profiles.js';
import {createAdminDashboard} from './admin-dashboard.js';
import {loadStaff,staffRole} from './staff-badge.js';
import {createChatUI} from './chat-ui.js';
import {createCloudUI} from './ui.js';
import {renderLeaderboard,updateOnlineIndicators} from './leaderboard.js';
import {showPaymentReturn} from './payment-ui.js';
import {createStarterPackUI} from './starter-pack-ui.js';
import {stopPageZoom} from './page-zoom.js';
import {watchLoading} from '../public/loading-screen.js';
import {startTranslation} from '../public/i18n.js';
import {createPopupUI} from './popup-ui.js';
import {createOfferUI} from './offer-ui.js';
import {createPortalUI} from './portal-ui.js';
// The game frame never zooms as a page: only the 3D field does (src/page-zoom.js).
stopPageZoom(document);
let bridge;
try{bridge=window.parent!==window?window.parent.harvestBridge:null;}catch{}
// src/main.js starts this page while the farm is still on its way from the server (1 Oct 2026): wait for it here. When it does not
// come (a new name is needed, the session ended), the parent takes this page away; nothing more happens here.
let waited=false;
if(bridge?.pending){waited=true;bridge=await bridge.ready.catch(()=>null);}
if(!bridge){if(!waited)location.replace('/play.html');}else{
 window.harvestInitialFarm=bridge.takeInitial();
 // CrazyGames (Oct 2026): the page around the game is src/crazygames.js, with a portal on the bridge (public/portal.js). A farm page
 // that opens again by itself (its Try again) asks that page for the farm; the website's sign-in page never opens inside CrazyGames.
 const portal=bridge.portal??null;
 if(!window.harvestInitialFarm){if(portal)portal.reopen();else window.parent.location.reload();}else{
  // Marked before anything shows or loads: portal.css and the farm's loading tips (public/loading-screen.js) read it.
  if(portal)document.documentElement.dataset.portal=portal.name;
  document.body.hidden=false;
  const watch=watchLoading(bridge,portal,{translate:()=>void startTranslation(document)});
  // The game takes the first farm over (and clears harvestInitialFarm); the pop-ups only need its start time (the first half hour).
  const firstState=window.harvestInitialFarm.state;
  const ui=createCloudUI({onOpen:openBoard,onRetry:openBoard,onPlayer:()=>profiles.open(bridge.playerId),onName:async username=>{const data=await bridge.request({operation:'rename',username});ui.setProfile(data.profile,{id:bridge.playerId});},onSignOut:()=>bridge.signOut()});
  const profiles=createPlayerProfiles(bridge,{showBoard:key=>ui.showBoard(key)}),serverOffset=bridge.serverNow-Date.now();
  // The chat (header button, next to Farm Family) and the Admin dashboard, which the moderators may open too.
  const chat=createChatUI({bridge,profiles});
  // Farm Family's chat button (public/family-ui.js) opens it on the family's own tab.
  window.harvestChat=chat;
  createAdminDashboard(bridge,{chat});
  // On CrazyGames the purchases, links and account buttons step aside (portal.css) and the page's own lines come in (src/portal-ui.js).
  if(portal)createPortalUI({portal});
  // The Family Members list opens a farmer's profile too (public/family-ui.js).
  window.harvestProfiles=profiles;
  ui.setProfile(window.harvestInitialFarm.profile,{id:bridge.playerId});ui.status('Live rankings');
  createAvatarSettings(document.getElementById('avatar-settings'),{bridge,profile:window.harvestInitialFarm.profile,state:window.harvestInitialFarm.state,owner:loadStaff(bridge.chat).then(()=>staffRole(bridge.playerId)==='admin'),onSaved:profile=>ui.setProfile(profile,{id:bridge.playerId})});
  const stopPresence=bridge.presence?.subscribe(snapshot=>{if(ui.open)updateOnlineIndicators(ui.results,{...snapshot,now:Date.now()+serverOffset});});
  const boardRefresh=setInterval(()=>{if(ui.open&&!profiles.isOpen&&!document.hidden)openBoard(true);},30000);
  window.addEventListener('pagehide',()=>{stopPresence?.();clearInterval(boardRefresh);},{once:true});
  let boardRequest=0,board=null,boardPage=0;
  // The board keeps its page when it refreshes (every 30 seconds); a new board, or opening it again, starts on page 1.
  const drawBoard=()=>renderLeaderboard(ui.results,{...board,page:boardPage,now:Date.now()+serverOffset},bridge.playerId,id=>profiles.open(id),page=>{boardPage=page;drawBoard();ui.results.scrollIntoView?.({block:'start'});});
  // The last board of each kind shows at once when it opens again (or was read in the background after the farm opened), while
  // the newest loads; a board never seen shows placeholder rows (1 Oct 2026).
  const boardCache=new Map();
  async function openBoard(quiet=false){const request=++boardRequest,category=ui.category,cached=!quiet&&boardCache.get(category);if(cached){board=cached;boardPage=0;drawBoard();}else if(!quiet)ui.results.innerHTML=skeleton('Gathering the latest scores…',{rows:6});ui.results.setAttribute('aria-busy','true');try{const result=await bridge.leaderboard(category);await loadStaff(bridge.chat);if(request!==boardRequest)return;if(result.own)ui.showVillage((result.own.level??0)>=WORLD_TWO_LEVEL);if(!quiet&&!cached||board?.category!==result.category)boardPage=0;board=result;boardCache.set(result.category,result);drawBoard();ui.status('');}catch(error){if(request===boardRequest){if(!quiet)ui.message(error.message);ui.status('Could not refresh');}}finally{if(request===boardRequest)ui.results.setAttribute('aria-busy','false');}}
  let game=null;try{game=await import(/* @vite-ignore */ '/game.js?v=familyhall-model-2');}catch(error){console.error('The game could not load',error);}
  const ready=game?await game.farmReady:false;
  if(!game)watch.failed();else watch.done(ready);
  if(ready){
   // CrazyGames' SDK (src/crazygames.js): the farm is loaded and can be played.
   if(portal){portal.event('loadingStop');portal.event('gameplayStart');}
   // The board the leaderboard opens on, read once in the background, so the first look needs no wait.
   setTimeout(()=>{const category=ui.category;if(!boardCache.has(category))bridge.leaderboard(category).then(result=>{if(!boardCache.has(result.category))boardCache.set(result.category,result);}).catch(()=>{});},8000);
   // No purchases on CrazyGames (their rule): no payment return, special offer or Starter Pack there.
   const shop=!portal;
   if(shop)showPaymentReturn(bridge);
   // A pop-up from the admin (news with a button), once, when nothing else is open. It does not wait for the Starter Pack's catalog.
   void createPopupUI({client:bridge.chat,chat,state:firstState}).start();
   // The special offer listens for the Starter Pack's catalogue, so it starts first.
   if(shop){createOfferUI(bridge);
   await createStarterPackUI(bridge);}
   // One screen from a notification, a shortcut on the app icon or a link (public/app-links.js). src/main.js keeps it until the farm is
   // ready, and hands over what arrives later.
   window.harvestOpen=intent=>{
    if(intent?.open==='chat')void chat.open(intent.channel?{channel:intent.channel}:{});
    else if(intent?.open==='today')window.harvestToday?.();
    else if(intent?.open==='leaderboard')document.getElementById('leaderboard-button')?.click();
   };
   const waiting=window.parent?.harvestTakeOpen?.();if(waiting)window.harvestOpen(waiting);
  }
 }
}
