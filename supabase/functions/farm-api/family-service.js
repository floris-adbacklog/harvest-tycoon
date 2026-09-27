import {familyMutate,familyPublicView,familyProfile,familyWeek,levelOf} from './farm-state.js';
import {isRecentlyActive} from './presence.js';
const keys={families:['id'],members:['player_id'],invitations:['id'],requests:['id'],orders:['family_id','week'],contributions:['player_id','week'],results:['week','family_id'],rewards:['id'],attempts:['player_id'],weeks:['week']};
export function familyChanges(before,after){
 const changed={};
 for(const [table,fields] of Object.entries(keys)){
  const key=r=>fields.map(f=>r[f]).join(':'),old=new Map((before[table]??[]).map(r=>[key(r),JSON.stringify(r)]));
  const rows=(after[table]??[]).filter(r=>old.get(key(r))!==JSON.stringify(r));if(rows.length)changed[table]=rows;
 }
 return changed;
}
function publicView(context,player,state,now){
 // Use the exact existing online-status rule, and expose only the boolean.
 context.players=context.players.map(p=>({...p,online:isRecentlyActive(p.last_active_at,now)}));
 return familyPublicView(context,player,state,now);
}
// Join requests reach the other farmer in Notifications: the leader and the co-leaders hear of a new request (they can all accept it,
// 27 Sep 2026), the farmer hears the answer. A notice that cannot be written never undoes the action itself.
async function requestNotice(admin,action,result,context,player,username,now){
 const family=id=>context.families.find(f=>f.id===id);
 let to=[],body='';
 if(action.type==='family_request'){const f=family(result.requestedFamily);to=context.members.filter(m=>m.family_id===f?.id&&(m.role==='leader'||m.role==='coleader')&&!m.left_at).map(m=>m.player_id);body=`${username} asked to join ${f?.name}. Open Farm Family to accept or decline.`;}
 else if(result.accepted){to=[result.accepted];const f=family(context.members.find(m=>m.player_id===player&&!m.left_at)?.family_id);body=`Welcome! ${f?.name} accepted your request to join.`;}
 else if(result.declined){to=[result.declined];const f=family(context.members.find(m=>m.player_id===player&&!m.left_at)?.family_id);body=`${f?.name} declined your request to join. You can ask another family.`;}
 to=to.filter(id=>id&&id!==player);if(!to.length)return;
 try{await admin.from('player_notices').insert(to.map(id=>({player_id:id,kind:'family',body:body.slice(0,400),expires_at:new Date(now+7*86400000).toISOString()})));}catch{}
}
// A family's profile (familyProfile, farm-state.js): read only, so it never settles a week or writes anything.
export async function handleFamilyProfile({admin,body,state,player}){
 if(typeof body.familyId!=='string'||!body.familyId||body.familyId.length>64)return {status:422,data:{error:'Choose a family.',code:'ACTION_REJECTED'}};
 const fetched=await admin.rpc('harvest_family_context',{p_player:player,p_request:null});
 if(fetched.error)throw fetched.error;
 const context=fetched.data,now=context.now;
 context.players=context.players.map(p=>({...p,online:isRecentlyActive(p.last_active_at,now)}));
 const profile=familyProfile(context,body.familyId,player,state,now);
 return profile?{status:200,data:{familyProfile:profile,profile:{player_id:player},serverNow:now}}:{status:422,data:{error:'This family is no longer around.',code:'ACTION_REJECTED'}};
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
 if(!reading&&body.action.type==='family_invite'){
  const target=body.action.playerId;
  if(typeof target!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target))return {status:422,data:{error:'Choose a valid farmer.',code:'ACTION_REJECTED'}};
  const found=await admin.from('player_stats').select('player_id,username,level').eq('player_id',target).maybeSingle();
  if(found.error)throw found.error;
  if(found.data){before.players=before.players.filter(p=>p.player_id!==target);before.players.push(found.data);}
 }
 let changed;
 try{changed=familyMutate(before,state,player,reading?{type:'family_read'}:body.action,now);}
 catch(error){return {status:422,data:{error:error.message,code:'ACTION_REJECTED'}};}
 const {context,result,settled,failed}=changed,changes=familyChanges(before,context),writeFarm=!reading&&!failed;
 if(reading&&!Object.keys(changes).length)return response(context,result,false);
 const receipts=writeFarm?[...row.receipts,{id:body.requestId,result}].slice(-100):row.receipts;
 const saved=await admin.rpc('harvest_family_commit',{p_player:player,p_expected_family:before.revision,p_expected_farm:row.revision,p_week:familyWeek(now),p_changes:changes,p_settled:settled,p_write_farm:writeFarm,p_state:state,p_receipts:receipts,p_username:username,p_currency:state.coins,p_level:levelOf(state),p_request:reading?null:body.requestId,p_result:result,p_failed:failed});
 if(saved.error)throw saved.error;if(!saved.data)return null;
 if(writeFarm)await requestNotice(admin,body.action,result,context,player,username,now);
 // A successful action sets online status through the existing commit function.
 if(writeFarm){const p=context.players.find(p=>p.player_id===player);if(p){p.level=levelOf(state);p.last_active_at=new Date(now).toISOString();}else context.players.push({player_id:player,username,level:levelOf(state),last_active_at:new Date(now).toISOString()});}
 return response(context,result,failed,writeFarm);
}
