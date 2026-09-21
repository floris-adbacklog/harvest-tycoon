// The parent owns authentication. This disposable frame contains only a view of
// the most recently committed server state; it never persists game data.
let clockOffset=0;
export const farmNow=()=>Date.now()+clockOffset;
export function createFarmClient(state,{onChange,onStatus,onLevelReward,onChapterReward}){
 const bridge=window.parent.harvestBridge;
 if(!bridge)throw new Error('Sign in to open your farm.');
 let busy=false;
 function replace(data){
  for(const key of Object.keys(state))delete state[key];
  Object.assign(state,structuredClone(data.state));
  clockOffset=data.serverNow-Date.now();
  onChange();onStatus('saved');
  if(data.chapterReward?.chapters?.length)onChapterReward?.(data.chapterReward);
  if(data.levelReward?.levels?.length)onLevelReward?.(data.levelReward);
 }
 async function runAction(action){
  if(busy)throw new Error('Your previous action is still saving.');
  busy=true;onStatus('saving');document.body.classList.add('farm-saving');
  try{const data=await bridge.request({operation:'action',action,requestId:crypto.randomUUID()});replace(data);
   const result=data.result;
   if(action.type==='beginner_claim'){bridge.trackGame?.('guide_step',{step:action.id,index:result.completed-1});if(result.diamonds)bridge.trackGame?.('guide_complete');}
   if(action.type==='buy_vip'){bridge.trackCommerce?.('vip_purchase_completed',{plan:result.plan,cost:result.cost});if(result.extended)bridge.trackCommerce?.('vip_extended',{plan:result.plan});}
   else if(['buy_boost','finish_crop','finish_batch','replace_order'].includes(action.type))bridge.trackCommerce?.('diamond_action_completed',{action:action.boost??action.type,cost:result.cost});
   return result;}
  catch(error){onStatus(error.code==='ACTION_REJECTED'?'saved':'error');throw error;}
  finally{busy=false;document.body.classList.remove('farm-saving');}
 }
 async function load(){clockOffset=bridge.serverNow-Date.now();onChange();onStatus('saved');return {state};}
 async function refresh(){if(busy)return;replace(await bridge.request({operation:'load'}));}
 window.harvestRefresh=refresh;
 // The parent reports a connection that is being restored ("Reconnecting…") and tells when it is back.
 bridge.watchConnection?.(status=>{if(status==='reconnecting')onStatus('reconnecting');else if(status==='ok')onStatus('saved');});
 return {load,runAction,retry:refresh,flush:async()=>{},refresh};
}
