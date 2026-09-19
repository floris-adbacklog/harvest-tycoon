import {familyMutate,familyPublicView,familyWeek,levelOf} from './farm-state.js';
import {isRecentlyActive} from './presence.js';
const keys={families:['id'],members:['player_id'],orders:['family_id','week'],contributions:['player_id','week'],results:['week','family_id'],rewards:['id'],attempts:['player_id'],weeks:['week']};
export function familyChanges(before,after){
 const changed={};
 for(const [table,fields] of Object.entries(keys)){
  const key=r=>fields.map(f=>r[f]).join(':'),old=new Map(before[table].map(r=>[key(r),JSON.stringify(r)]));
  const rows=after[table].filter(r=>old.get(key(r))!==JSON.stringify(r));if(rows.length)changed[table]=rows;
 }
 return changed;
}
function publicView(context,player,state,now){
 // Use the exact existing online-status rule, and expose only the boolean.
 context.players=context.players.map(p=>({...p,online:isRecentlyActive(p.last_active_at,now)}));
 return familyPublicView(context,player,state,now);
}
// null tells the existing farm-api revision loop to reload and retry.
export async function handleFamily({admin,body,row,state,player,username}){
 const reading=body.operation==='family';
 if(!reading&&body.action.type==='family_read')return {status:422,data:{error:'Use the Family view to refresh.',code:'ACTION_REJECTED'}};
 const fetched=await admin.rpc('harvest_family_context',{p_player:player,p_request:reading?null:body.requestId});
 if(fetched.error)throw fetched.error;
 const before=fetched.data,now=before.now;
 const response=(context,result,failed,written=false)=>({status:failed?422:200,data:failed?{error:result.error,code:'ACTION_REJECTED'}:reading?{profile:{player_id:player},family:publicView(context,player,state,now),serverNow:now}:{state,profile:{player_id:player,username,currency:state.coins,level:levelOf(state)},result:{...result,family:publicView(context,player,state,now)},revision:row.revision+(written?1:0),serverNow:now}});
 if(before.receipt)return response(before,before.receipt.result,before.receipt.failed);
 let changed;
 try{changed=familyMutate(before,state,player,reading?{type:'family_read'}:body.action,now);}
 catch(error){return {status:422,data:{error:error.message,code:'ACTION_REJECTED'}};}
 const {context,result,settled,failed}=changed,changes=familyChanges(before,context),writeFarm=!reading&&!failed;
 if(reading&&!Object.keys(changes).length)return response(context,result,false);
 const receipts=writeFarm?[...row.receipts,{id:body.requestId,result}].slice(-100):row.receipts;
 const saved=await admin.rpc('harvest_family_commit',{p_player:player,p_expected_family:before.revision,p_expected_farm:row.revision,p_week:familyWeek(now),p_changes:changes,p_settled:settled,p_write_farm:writeFarm,p_state:state,p_receipts:receipts,p_username:username,p_currency:state.coins,p_level:levelOf(state),p_request:reading?null:body.requestId,p_result:result,p_failed:failed});
 if(saved.error)throw saved.error;if(!saved.data)return null;
 // A successful action sets online status through the existing commit function.
 if(writeFarm){const p=context.players.find(p=>p.player_id===player);if(p){p.level=levelOf(state);p.last_active_at=new Date(now).toISOString();}else context.players.push({player_id:player,username,level:levelOf(state),last_active_at:new Date(now).toISOString()});}
 return response(context,result,failed,writeFarm);
}
