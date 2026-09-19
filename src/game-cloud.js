import {createCloudUI} from './ui.js';
import {renderLeaderboard,updateOnlineIndicators} from './leaderboard.js';
import {showPaymentReturn} from './payment-ui.js';
import {createStarterPackUI} from './starter-pack-ui.js';
let bridge;
try{bridge=window.parent!==window?window.parent.harvestBridge:null;}catch{}
if(!bridge){location.replace('/play.html');}else{
 window.harvestInitialFarm=bridge.takeInitial();
 if(!window.harvestInitialFarm){location.replace('/play.html');}else{
  document.body.hidden=false;
  const ui=createCloudUI({onOpen:openBoard,onRetry:openBoard,onName:async username=>{const data=await bridge.request({operation:'rename',username});ui.setProfile(data.profile,{id:bridge.playerId});},onSignOut:()=>bridge.signOut()});
  ui.setProfile(window.harvestInitialFarm.profile,{id:bridge.playerId});ui.status('Live rankings');
  const stopPresence=bridge.presence?.subscribe(snapshot=>{if(ui.open)updateOnlineIndicators(ui.results,snapshot);});
  const boardRefresh=setInterval(()=>{if(ui.open&&!document.hidden)openBoard(true);},30000);
  window.addEventListener('pagehide',()=>{stopPresence?.();clearInterval(boardRefresh);},{once:true});
  let boardRequest=0;
  async function openBoard(quiet=false){const request=++boardRequest,category=ui.category;if(!quiet)ui.message('Gathering the latest scores…');ui.results.setAttribute('aria-busy','true');try{const result=await bridge.leaderboard(category);if(request!==boardRequest)return;renderLeaderboard(ui.results,result,bridge.playerId);ui.status('Up to date');}catch(error){if(request===boardRequest){if(!quiet)ui.message(error.message);ui.status('Could not refresh');}}finally{if(request===boardRequest)ui.results.setAttribute('aria-busy','false');}}
  const {farmReady}=await import(/* @vite-ignore */ '/game.js');
  if(await farmReady){
   showPaymentReturn(bridge);
   await createStarterPackUI(bridge);
  }
 }
}
