import {createCloudUI} from './ui.js';
import {renderLeaderboard} from './leaderboard.js';
let bridge;
try{bridge=window.parent!==window?window.parent.harvestBridge:null;}catch{}
if(!bridge){location.replace('/play.html');}else{
 window.harvestInitialFarm=bridge.takeInitial();
 if(!window.harvestInitialFarm){location.replace('/play.html');}else{
  document.body.hidden=false;
  const ui=createCloudUI({onOpen:openBoard,onRetry:openBoard,onName:async username=>{const data=await bridge.request({operation:'rename',username});ui.setProfile(data.profile,{id:bridge.playerId});},onSignOut:()=>bridge.signOut()});
  ui.setProfile(window.harvestInitialFarm.profile,{id:bridge.playerId});ui.status('Your farm is saved to your account');
  async function openBoard(){ui.message('Gathering the latest scores…');try{renderLeaderboard(ui.results,await bridge.leaderboard(),bridge.playerId);}catch(error){ui.message(error.message);}}
  await import(/* @vite-ignore */ '/game.js');
 }
}
