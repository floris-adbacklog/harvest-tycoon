import {createAvatarSettings} from '../public/avatar-settings.js';
import {createPlayerProfiles} from './player-profiles.js';
import {createAdminDashboard} from './admin-dashboard.js';
import {createChatUI} from './chat-ui.js';
import {createCloudUI} from './ui.js';
import {renderLeaderboard,updateOnlineIndicators} from './leaderboard.js';
import {showPaymentReturn} from './payment-ui.js';
import {createStarterPackUI} from './starter-pack-ui.js';
import {stopPageZoom} from './page-zoom.js';
import {createPopupUI} from './popup-ui.js';
// The game frame never zooms as a page: only the 3D field does (src/page-zoom.js).
stopPageZoom(document);
let bridge;
try{bridge=window.parent!==window?window.parent.harvestBridge:null;}catch{}
if(!bridge){location.replace('/play.html');}else{
 window.harvestInitialFarm=bridge.takeInitial();
 if(!window.harvestInitialFarm){location.replace('/play.html');}else{
  document.body.hidden=false;
  // The game takes the first farm over (and clears harvestInitialFarm); the pop-ups only need its start time (the first half hour).
  const firstState=window.harvestInitialFarm.state;
  const ui=createCloudUI({onOpen:openBoard,onRetry:openBoard,onPlayer:()=>profiles.open(bridge.playerId),onName:async username=>{const data=await bridge.request({operation:'rename',username});ui.setProfile(data.profile,{id:bridge.playerId});},onSignOut:()=>bridge.signOut()});
  const profiles=createPlayerProfiles(bridge,{showBoard:key=>ui.showBoard(key)}),serverOffset=bridge.serverNow-Date.now();
  // The chat (header button, next to Farm Family) and the Admin dashboard, which the moderators may open too.
  const chat=createChatUI({bridge,profiles});
  // Farm Family's chat button (public/family-ui.js) opens it on the family's own tab.
  window.harvestChat=chat;
  createAdminDashboard(bridge,{chat});
  // The Family Members list opens a farmer's profile too (public/family-ui.js).
  window.harvestProfiles=profiles;
  ui.setProfile(window.harvestInitialFarm.profile,{id:bridge.playerId});ui.status('Live rankings');
  createAvatarSettings(document.getElementById('avatar-settings'),{bridge,profile:window.harvestInitialFarm.profile,state:window.harvestInitialFarm.state,onSaved:profile=>ui.setProfile(profile,{id:bridge.playerId})});
  const stopPresence=bridge.presence?.subscribe(snapshot=>{if(ui.open)updateOnlineIndicators(ui.results,{...snapshot,now:Date.now()+serverOffset});});
  const boardRefresh=setInterval(()=>{if(ui.open&&!profiles.isOpen&&!document.hidden)openBoard(true);},30000);
  window.addEventListener('pagehide',()=>{stopPresence?.();clearInterval(boardRefresh);},{once:true});
  let boardRequest=0;
  async function openBoard(quiet=false){const request=++boardRequest,category=ui.category;if(!quiet)ui.message('Gathering the latest scores…');ui.results.setAttribute('aria-busy','true');try{const result=await bridge.leaderboard(category);if(request!==boardRequest)return;renderLeaderboard(ui.results,{...result,now:Date.now()+serverOffset},bridge.playerId,id=>profiles.open(id));ui.status('Up to date');}catch(error){if(request===boardRequest){if(!quiet)ui.message(error.message);ui.status('Could not refresh');}}finally{if(request===boardRequest)ui.results.setAttribute('aria-busy','false');}}
  const {farmReady}=await import(/* @vite-ignore */ '/game.js?v=familyhall-model-2');
  if(await farmReady){
   showPaymentReturn(bridge);
   // A pop-up from the admin (news with a button), once, when nothing else is open. It does not wait for the Starter Pack's catalog.
   void createPopupUI({client:bridge.chat,chat,state:firstState}).start();
   await createStarterPackUI(bridge);
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
