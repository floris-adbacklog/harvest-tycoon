import {createCloudUI} from './ui.js';
import {renderLeaderboard} from './leaderboard.js';
let bridge;
try{bridge=window.parent!==window?window.parent.harvestBridge:null;}catch{}
if(!bridge){location.replace('/play.html');}else{
 window.harvestInitialFarm=bridge.takeInitial();
 if(!window.harvestInitialFarm){location.replace('/play.html');}else{
  document.body.hidden=false;
  const ui=createCloudUI({onOpen:openBoard,onRetry:openBoard,onName:async username=>{const data=await bridge.request({operation:'rename',username});ui.setProfile(data.profile,{id:bridge.playerId});},onSignOut:()=>bridge.signOut()});
  ui.setProfile(window.harvestInitialFarm.profile,{id:bridge.playerId});ui.status('Live rankings');
  let boardRequest=0;
  async function openBoard(){const request=++boardRequest,category=ui.category;ui.message('Gathering the latest scores…');ui.results.setAttribute('aria-busy','true');try{const result=await bridge.leaderboard(category);if(request!==boardRequest)return;renderLeaderboard(ui.results,result,bridge.playerId);ui.status('Up to date');}catch(error){if(request===boardRequest){ui.message(error.message);ui.status('Could not refresh');}}finally{if(request===boardRequest)ui.results.setAttribute('aria-busy','false');}}
  await import(/* @vite-ignore */ '/game.js');
 }
}
