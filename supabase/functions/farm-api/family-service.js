import {familyMutate,familyPublicView,familyProfile,familyWeek,levelOf,familyRejoinOffer,familyStanding,familyManager,familyShareState} from './farm-state.js';
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
// Reads (the Family window's 30-second refresh, chat's @mention list) and the family profile ask for only the rows the rules use for
// this farmer (13 Oct 2026, supabase/family-read.sql): every family's whole history was 504 KB and 82 ms a read, 97% of all family
// calls. The rules and every answer are the same (tests/family-read.test.mjs). Actions still read everything: harvest_family_context.
// Until family-read.sql has run (no such function yet), a read takes the whole context as before.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function readContext(admin,player,family=null){
 let fetched=await admin.rpc('harvest_family_read',{p_player:player,p_family:family});
 if(fetched.error?.code==='PGRST202')fetched=await admin.rpc('harvest_family_context',{p_player:player,p_request:null});
 if(fetched.error)throw fetched.error;
 return fetched.data;
}
// A family's profile (familyProfile, farm-state.js): read only, so it never settles a week or writes anything.
export async function handleFamilyProfile({admin,body,state,player}){
 if(typeof body.familyId!=='string'||!body.familyId||body.familyId.length>64)return {status:422,data:{error:'Choose a family.',code:'ACTION_REJECTED'}};
 // Every family id is a UUID: anything else is no family, as before, without asking the database (which would refuse it).
 const gone={status:422,data:{error:'This family is no longer around.',code:'ACTION_REJECTED'}};
 if(!UUID.test(body.familyId))return gone;
 const context=await readContext(admin,player,body.familyId),now=context.now;
 context.players=context.players.map(p=>({...p,online:isRecentlyActive(p.last_active_at,now)}));
 const profile=familyProfile(context,body.familyId,player,state,now);
 return profile?{status:200,data:{familyProfile:profile,profile:{player_id:player},serverNow:now}}:gone;
}
// Share in chat (20 Oct 2026, the owner's option 1; farm-state.js familyShareState): the leader or a co-leader posts the family's card in
// the global chat, once an hour per family. The rule is checked here first, for the plain reason ("You can share again in 42m"), and
// then by the database itself, which locks the family, checks who, the global chat's own rules and the hour, and writes the card from
// the family's own row (supabase/family-share.sql, harvest_family_share). From here only the family's id and its level go along (the
// level is the game's own, from the chest tiers of every week); the page sends nothing but the request. The answer is when it was shared.
const SHARE_REFUSALS=new Set(['22023','42501']);
export async function handleFamilyShare({admin,player}){
 const refuse=error=>({status:422,data:{error,code:'ACTION_REJECTED'}});
 const c=await readContext(admin,player),now=Number(c.now)||Date.now();
 const me=(c.members??[]).find(m=>m.player_id===player&&!m.left_at&&m.family_id),family=me?(c.families??[]).find(f=>f.id===me.family_id&&!f.deleted_at):null;
 const rule=familyShareState(family?{manager:familyManager(me.role),sharedAt:family.shared_at}:null,now);
 if(!rule.can)return refuse(rule.reason);
 const saved=await admin.rpc('harvest_family_share',{p_player:player,p_family:family.id,p_level:familyStanding(c,family.id).level});
 if(saved.error){
  // Before supabase/family-share.sql has run there is no such function: nothing is shared.
  if(saved.error.code==='PGRST202')return refuse('Sharing in chat is not open yet. Please try again later.');
  // Shared by another leader a moment ago: the same sentence, from the time the database has.
  if(saved.error.code==='54000')return refuse(familyShareState({manager:true,sharedAt:Number(saved.error.details)||now},now).reason);
  if(SHARE_REFUSALS.has(saved.error.code))return refuse(saved.error.message);
  throw saved.error;
 }
 const sharedAt=Number(saved.data?.sharedAt)||now;
 return {status:200,data:{shared:{familyId:family.id,sharedAt},profile:{player_id:player},serverNow:now}};
}
// Join again in Welcome back (17 Oct 2026, the owner): on a return (farm-api's load, only when Welcome back shows) one small read of the
// farmer's own member row, the family they left for being away too long with the farmers in it now, and the family they are in
// (supabase/family-idle-leave.sql, harvest_family_rejoin). The rule is the Family window's (familyRejoinOffer). inFamily: whether they
// are in a family now, for the flag by their Family Hall. Before that SQL has run, or on any problem: null, and the load goes on.
export async function familyRejoinRead(admin,player){
 const read=await admin.rpc('harvest_family_rejoin',{p_player:player});
 if(read.error||!read.data||typeof read.data!=='object')return null;
 const c={families:read.data.families??[],members:read.data.members??[]},me=c.members.find(m=>m.player_id===player);
 return {offer:familyRejoinOffer(c,player,Number(read.data.now)||Date.now()),inFamily:!!me&&!me.left_at&&!!me.family_id&&c.families.some(f=>f.id===me.family_id&&!f.deleted_at)};
}
// null tells the existing farm-api revision loop to reload and retry.
export async function handleFamily({admin,body,row,state,player,username}){
 const reading=body.operation==='family';
 if(!reading&&body.action.type==='family_read')return {status:422,data:{error:'Use the Family view to refresh.',code:'ACTION_REJECTED'}};
 let before;
 if(reading)before=await readContext(admin,player);
 else{const fetched=await admin.rpc('harvest_family_context',{p_player:player,p_request:body.requestId});if(fetched.error)throw fetched.error;before=fetched.data;}
 const now=before.now;
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
 // A farmer removed from the family shows in the family chat as a card (29 Sep 2026; supabase/family-kick-chat.sql allows the kind).
 // Only farm-api knows a removal from a leave: in family_members both look the same. Beside the reply, and never in its way.
 if(writeFarm&&body.action.type==='family_kick'){
  const target=before.members?.find(m=>m.id===body.action.memberId),name=before.players?.find(p=>p.player_id===target?.player_id)?.username;
  if(target?.family_id){
   const card=admin.from('chat_messages').insert({channel:`family:${target.family_id}`,sender:target.player_id,sender_name:name??'A farmer',body:'Was removed from the family',kind:'kick',meta:{role:target.role,by:username,by_id:player}}).then(()=>{},()=>{});
   globalThis.EdgeRuntime?.waitUntil?.(card);
  }
 }
 // A successful action sets online status through the existing commit function.
 if(writeFarm){const p=context.players.find(p=>p.player_id===player);if(p){p.level=levelOf(state);p.last_active_at=new Date(now).toISOString();}else context.players.push({player_id:player,username,level:levelOf(state),last_active_at:new Date(now).toISOString()});}
 return response(context,result,failed,writeFarm);
}
