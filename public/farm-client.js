import {applyFarmAction,normalizeFarm,levelOf,xpForLevel} from './farm-state.js';
const SAVE_KEY='harvest-tycoon:farm:v1';
export const farmNow=()=>Date.now();
export function createFarmClient(state,{onChange,onStatus,onError}){
 let loaded=false,lastRevision=0,lastStats=null,saveFailed=false;
 const getStats=()=>({currency:state.coins,level:levelOf(state)});
 function replace(incoming){for(const key of Object.keys(state))delete state[key];Object.assign(state,normalizeFarm(incoming,farmNow()));}
 function applyAccountProgress(detail){
  if(!detail||!Number.isFinite(detail.currency)||!Number.isFinite(detail.level))return;
  state.coins=Math.max(0,Math.floor(detail.currency));
  state.xp=Math.max(0,xpForLevel(Math.max(1,Math.floor(detail.level)))-(state.xpOffset??0));
  if(loaded){persist();onChange();announce(true);}
 }
 function read(){const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;const data=JSON.parse(raw);if(!data.state||!Array.isArray(data.state.plots)||!data.state.buildings)throw new Error('Your local save could not be read. It has been kept intact.');return data;}
 function persist(){try{const data={format:1,revision:++lastRevision,savedAt:Date.now(),state};localStorage.setItem(SAVE_KEY,JSON.stringify(data));saveFailed=false;onStatus('saved');return true;}catch{saveFailed=true;onStatus('error');onError('This browser could not save your farm. Keep this tab open and allow browser storage.');return false;}}
 function announce(force=false){const stats=getStats();if(force||!lastStats||stats.currency!==lastStats.currency||stats.level!==lastStats.level){lastStats=stats;window.dispatchEvent(new CustomEvent(force?'farm:ready':'farm:stats',{detail:stats}));}}
 async function load(){
  let local;try{local=read();}catch(error){if(error instanceof SyntaxError||error.message?.includes('kept intact'))throw error;onError('Browser storage is unavailable. This session can still be played.');}
  if(local){lastRevision=local.revision??0;replace(local.state);}
  else if(document.body.dataset.legacyMigration==='true'){
   // A one-time read preserves farms from the earlier Sites version. No farm state is uploaded.
   try{const response=await fetch('/api/farm',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Migration unavailable');const data=await response.json();if(data.state)replace(data.state);}
   catch{state.legacyRecoveryPending=true;onError('Your earlier farm could not be reached. You can play offline and recover it later from Help.');}
  }
  if(window.harvestAccountProgress)applyAccountProgress(window.harvestAccountProgress);
  loaded=true;persist();window.harvestStats=getStats;onChange();announce(true);return {state};
 }
 function runAction(action){
  if(!loaded)throw new Error('Your farm is still opening.');
  if(!saveFailed){try{const current=read();if(current&&current.revision>lastRevision){lastRevision=current.revision;replace(current.state);}}catch{}}
  const candidate=structuredClone(state),result=applyFarmAction(candidate,action,farmNow());replace(candidate);persist();announce();return result;
 }
 async function recoverLegacy(){
  const response=await fetch('/api/farm',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('Your earlier farm could not be reached. Please try again online.');
  const data=await response.json();if(!data.state)throw new Error('There is no earlier farm to recover.');
  if(!confirm('Recover your earlier farm? Your current device save will be kept as a backup in this browser.'))return;
  localStorage.setItem(SAVE_KEY+':backup',JSON.stringify({state,revision:lastRevision}));replace(data.state);delete state.legacyRecoveryPending;persist();onChange();announce();
 }
 window.addEventListener('storage',event=>{if(event.key===SAVE_KEY&&loaded&&!saveFailed){try{const saved=read();if(saved&&saved.revision>lastRevision){lastRevision=saved.revision;replace(saved.state);onChange();announce();}}catch{}}});
 window.addEventListener('account:progress',event=>applyAccountProgress(event.detail));
 window.addEventListener('beforeunload',event=>{if(saveFailed){event.preventDefault();event.returnValue='';}});
 return {load,runAction,retry:persist,flush:async()=>persist(),refresh:()=>onChange(),recoverLegacy};
}
