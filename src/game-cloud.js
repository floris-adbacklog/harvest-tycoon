import {createAvatarSettings} from '../public/avatar-settings.js';
import {createPlayerProfiles} from './player-profiles.js';
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
  const ui=createCloudUI({onOpen:openBoard,onRetry:openBoard,onPlayer:()=>profiles.open(bridge.playerId),onName:async username=>{const data=await bridge.request({operation:'rename',username});ui.setProfile(data.profile,{id:bridge.playerId});},onSignOut:()=>bridge.signOut()});
  const profiles=createPlayerProfiles(bridge),serverOffset=bridge.serverNow-Date.now();
  ui.setProfile(window.harvestInitialFarm.profile,{id:bridge.playerId});ui.status('Live rankings');
  createAvatarSettings(document.getElementById('avatar-settings'),{bridge,profile:window.harvestInitialFarm.profile,onSaved:profile=>ui.setProfile(profile,{id:bridge.playerId})});
  const stopPresence=bridge.presence?.subscribe(snapshot=>{if(ui.open)updateOnlineIndicators(ui.results,{...snapshot,now:Date.now()+serverOffset});});
  const boardRefresh=setInterval(()=>{if(ui.open&&!profiles.isOpen&&!document.hidden)openBoard(true);},30000);
  window.addEventListener('pagehide',()=>{stopPresence?.();clearInterval(boardRefresh);},{once:true});
  let boardRequest=0;
  async function openBoard(quiet=false){const request=++boardRequest,category=ui.category;if(!quiet)ui.message('Gathering the latest scores…');ui.results.setAttribute('aria-busy','true');try{const result=await bridge.leaderboard(category);if(request!==boardRequest)return;renderLeaderboard(ui.results,{...result,now:Date.now()+serverOffset},bridge.playerId,id=>profiles.open(id));ui.status('Up to date');}catch(error){if(request===boardRequest){if(!quiet)ui.message(error.message);ui.status('Could not refresh');}}finally{if(request===boardRequest)ui.results.setAttribute('aria-busy','false');}}
  const {farmReady}=await import(/* @vite-ignore */ '/game.js?v=familyhall-model-2');
  if(await farmReady){
   showPaymentReturn(bridge);
   await createStarterPackUI(bridge);
  }
 }
}
