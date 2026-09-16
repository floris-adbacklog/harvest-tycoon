import {createFarm, normalizeFarm, applyFarmAction} from './farm-state.js';
// A revision protects concurrent tabs; the receipt and save commit together.
export async function readFarm(db,userId,now=Date.now()){
 await db.prepare('INSERT INTO farms (user_id,state_json,revision,updated_at) VALUES (?,?,0,?) ON CONFLICT(user_id) DO NOTHING').bind(userId,JSON.stringify(createFarm(now)),now).run();
 for(let attempt=0;attempt<5;attempt++){
  const row=await db.prepare('SELECT state_json,revision FROM farms WHERE user_id=?').bind(userId).first();
  if(!row)throw new Error('Farm unavailable.');
  const state=normalizeFarm(JSON.parse(row.state_json),now),json=JSON.stringify(state);
  if(json===row.state_json)return {state,revision:row.revision,serverNow:now};
  const saved=await db.prepare('UPDATE farms SET state_json=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?').bind(json,now,userId,row.revision).run();
  if(saved.meta.changes===1)return {state,revision:row.revision+1,serverNow:now};
 }
 throw new Error('Your farm is busy. Please try again.');
}
export async function transactFarm(db,userId,requestId,actions,now=Date.now()){
 for(let attempt=0;attempt<5;attempt++){
  const receipt=await db.prepare('SELECT results_json FROM farm_requests WHERE user_id=? AND request_id=?').bind(userId,requestId).first();
  if(receipt)return {...await readFarm(db,userId,now),results:JSON.parse(receipt.results_json),replayed:true};
  const current=await readFarm(db,userId,now);
  let state=current.state;
  const results=actions.map(action=>{
   const candidate=structuredClone(state);
   try{const result=applyFarmAction(candidate,action,now);state=candidate;return {ok:true,...result};}
   catch(error){return {ok:false,error:error.message};}
  });
  try{
   const batch=await db.batch([
    db.prepare('INSERT INTO farm_requests (user_id,request_id,results_json,created_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM farms WHERE user_id=? AND revision=?)').bind(userId,requestId,JSON.stringify(results),now,userId,current.revision),
    db.prepare('UPDATE farms SET state_json=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?').bind(JSON.stringify(state),now,userId,current.revision),
   ]);
   if(batch[1].meta.changes===1)return {state,revision:current.revision+1,serverNow:now,results};
  }catch(error){
   const duplicate=await db.prepare('SELECT request_id FROM farm_requests WHERE user_id=? AND request_id=?').bind(userId,requestId).first();
   if(!duplicate)throw error;
  }
 }
 throw new Error('Your farm is busy. Please try again.');
}
