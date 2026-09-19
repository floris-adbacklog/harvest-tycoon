// The parent owns authentication. This disposable frame contains only a view of
// the most recently committed server state; it never persists game data.
let clockOffset=0;
export const farmNow=()=>Date.now()+clockOffset;
export function createFarmClient(state,{onChange,onStatus,onLevelReward}){
 const bridge=window.parent.harvestBridge;
 if(!bridge)throw new Error('Sign in to open your farm.');
 let busy=false;
 function replace(data){
  for(const key of Object.keys(state))delete state[key];
  Object.assign(state,structuredClone(data.state));
  clockOffset=data.serverNow-Date.now();
  onChange();onStatus('saved');
  if(data.levelReward?.levels?.length)onLevelReward?.(data.levelReward);
 }
 async function runAction(action){
  if(busy)throw new Error('Your previous action is still saving.');
  busy=true;onStatus('saving');document.body.classList.add('farm-saving');
  try{const data=await bridge.request({operation:'action',action,requestId:crypto.randomUUID()});replace(data);return data.result;}
  catch(error){onStatus(error.code==='ACTION_REJECTED'?'saved':'error');throw error;}
  finally{busy=false;document.body.classList.remove('farm-saving');}
 }
 async function load(){clockOffset=bridge.serverNow-Date.now();onChange();onStatus('saved');return {state};}
 async function refresh(){if(busy)return;replace(await bridge.request({operation:'load'}));}
 window.harvestRefresh=refresh;
 return {load,runAction,retry:refresh,flush:async()=>{},refresh};
}
