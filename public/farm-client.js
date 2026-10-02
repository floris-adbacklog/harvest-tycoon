import {BUILDINGS,applyFarmAction,inviteeReward,seedCost} from './farm-state.js';
// The parent owns authentication. This disposable frame contains only a view of
// the most recently committed server state; it never persists game data.
let clockOffset=0;
export const farmNow=()=>Date.now()+clockOffset;
// Taps that show at once (1 Oct 2026, "a harvest took over five seconds"): the frame works the action out with the same rules as
// the server (farm-state.js), shows it straight away and sends it; the server's answer then takes over. The everyday taps (fields,
// selling, batches), and since the same day the claims, building, helping hands and the daily gift (and the comeback chest, Oct 2026:
// it spends nothing and only opens what the server put there). Purchases, the family, chores
// (their lucky bonus is the server's roll) and anything that spends diamonds wait for the server as before. A Halloween Pass reward
// (Oct 2026) shows at once too: a claim like the others, worked out from the farm alone.
export const INSTANT_ACTIONS=Object.freeze(new Set(['field','fields','sell','produce','collect','collect_all','quest','beginner_claim','daily','checkin','comeback','delivery','mastery','activity_start','activity_work','upgrade','construct','expand','tractor','stall_collect','pass_claim']));
// No lucky double batch on the screen before the server has rolled for it (its answer shows it when it comes).
const noLuck=()=>1;
// Whether a tap can show at once: an everyday action that the rules accept. A level-up shows at once too (the rules pay its reward
// themselves, a new farm levels up on its very first harvest), except the one that pays an invited friend's reward: only the server
// adds that. Spending diamonds (an upgrade paid in diamonds) always waits for the server. Returns the worked-out farm and result,
// or null to wait for the server.
export function instantResult(state,action,now){
 if(!INSTANT_ACTIONS.has(action?.type))return null;
 const trial=structuredClone(state);let result;
 // A refused action throws, as the server would; a slip in the rules here (not a refusal) leaves the decision to the server.
 try{result=applyFarmAction(trial,action,now,noLuck);}catch(error){if(error instanceof TypeError||error instanceof RangeError||error instanceof ReferenceError)return null;throw error;}
 if((trial.diamonds??0)<(state.diamonds??0))return null;
 return inviteeReward(structuredClone(trial),now)?null:{trial,result};
}
// What a whole sweep did, as one 'fields' result (the shape the server gives back): the fields in the order they were passed, with the
// coins, XP, guide steps and level rewards of every step added up.
export function sweepTotal(action,results,short=false){
 const total={action,fields:results.flatMap(r=>r.fields),count:0};
 for(const r of results){
  total.count+=r.count;if(r.xp)total.xp=(total.xp??0)+r.xp;
  if(action==='plant'){total.crop=r.crop;total.cost=(total.cost??0)+r.cost;}
  if(r.guide)(total.guide??=[]).push(...r.guide);
  if(r.levelReward){const l=total.levelReward??={coins:0,diamonds:0,levels:[]};l.coins+=r.levelReward.coins;l.diamonds+=r.levelReward.diamonds;l.levels.push(...r.levelReward.levels);}
 }
 if(action==='plant')total.short=short||results.some(r=>r.short);
 return total;
}
export function createFarmClient(state,{onChange,onStatus,onLevelReward,onChapterReward,onGift,onEmailCheck,onError}){
 const bridge=window.parent.harvestBridge;
 if(!bridge)throw new Error('Sign in to open your farm.');
 // base: the farm as the server last saved it. pending: taps shown at once whose answer has not come back yet, in order.
 // line: every action goes to the server one after another, so a quick second tap waits its turn instead of being refused.
 let base=structuredClone(state),pending=[],line=Promise.resolve(),waiting=0;
 const show=next=>{for(const key of Object.keys(state))delete state[key];Object.assign(state,next);};
 // What the screen shows: the saved farm with the taps still on their way on top.
 function rebase(){
  const next=structuredClone(base);
  for(const entry of pending){try{applyFarmAction(next,entry.action,farmNow(),noLuck);}catch{}}
  show(next);
 }
 function replace(data){
  base=structuredClone(data.state);
  // A server that has not learnt about a new building yet must not break the buildings list.
  base.buildings??={};for(const key of Object.keys(BUILDINGS))base.buildings[key]??={level:1,job:null};
  clockOffset=data.serverNow-Date.now();
  rebase();onChange();if(!waiting)onStatus('saved');
  if(data.chapterReward?.chapters?.length)onChapterReward?.(data.chapterReward);
  if(data.levelReward?.levels?.length)onLevelReward?.(data.levelReward);
  if(data.gift)onGift?.(data.gift);
  if(data.emailCheck)onEmailCheck?.(data.emailCheck);
 }
 // One request in the line; the saving status stays on until the line is empty.
 function send(action){
  waiting++;onStatus('saving');document.body.classList.add('farm-saving');
  const run=line.then(()=>bridge.request({operation:'action',action,requestId:crypto.randomUUID()}));
  line=run.catch(()=>{});
  const done=()=>{waiting--;if(!waiting)document.body.classList.remove('farm-saving');};
  run.then(done,done);
  return run;
 }
 function track(action,result){
  if(action.type==='beginner_claim'){bridge.trackGame?.('guide_step',{step:action.id,index:result.completed-1});if(result.diamonds)bridge.trackGame?.('guide_complete');}
  if(action.type==='buy_vip'){bridge.trackCommerce?.('vip_purchase_completed',{plan:result.plan,cost:result.cost});if(result.extended)bridge.trackCommerce?.('vip_extended',{plan:result.plan});}
  else if(['buy_boost','finish_crop','finish_batch','replace_order'].includes(action.type))bridge.trackCommerce?.('diamond_action_completed',{action:action.boost??action.type,length:action.length,cost:result.cost});
 }
 // A pending entry goes to the server; its answer takes over. If the server refuses after all, the farm goes back to what it saved
 // and says why.
 function settle(entry,shown){
  const action=entry.action;
  send(action).then(data=>{pending.splice(pending.indexOf(entry),1);replace(data);track(action,data.result??shown);},error=>{
   pending.splice(pending.indexOf(entry),1);rebase();onChange();
   onStatus(error.code==='ACTION_REJECTED'?'saved':'error');onError?.(error.message);
   if(!pending.length&&!waiting)void refresh().catch(()=>{});
  });
 }
 async function runAction(action){
  const instant=instantResult(state,action,farmNow());
  if(instant){
   // Shown now; the server's answer replaces it.
   const entry={action};pending.push(entry);show(instant.trial);onChange();
   settle(entry,instant.result);
   return instant.result;
  }
  try{const data=await send(action);replace(data);const result=data.result;track(action,result);return result;}
  catch(error){onStatus(error.code==='ACTION_REJECTED'?'saved':'error');throw error;}
 }
 // A sweep across the fields (Oct 2026, "the drag should feel physical"): each field is worked on the screen the moment the pointer
 // passes it, with the server's own rules on top of what is shown (one 'fields' step per field, so a sweep costs and pays exactly
 // what the same fields tapped one by one would), and the whole sweep goes to the server as ONE 'fields' request on release.
 // add(id) gives that field's result, or null when the rules refuse it (out of coins, not ripe): that field is left alone. Nothing
 // here calls onChange, so a drag only redraws what the game asks for. end() sends the sweep and gives the sum of what it did.
 function sweep(action,crop){
  const entry={action:{type:'fields',action,ids:[],crop}},results=[];let open=true,short=false;
  const handle={reason:'',
   add(id){
    if(!open||entry.action.ids.includes(id))return null;
    let instant;
    try{instant=instantResult(state,{type:'fields',action,ids:[id],crop},farmNow());}
    catch(error){if(action==='plant'&&!state.plots?.[id]?.crop)try{short||=state.coins<seedCost(state,crop);}catch{}handle.reason||=error.message;return null;}
    // An invited friend's level-10 reward is only the server's to add: that field waits for a tap of its own.
    if(!instant)return null;
    if(!entry.action.ids.length)pending.push(entry);
    entry.action.ids.push(id);results.push(instant.result);show(instant.trial);return instant.result;
   },
   end(){
    if(!open)return null;open=false;if(!results.length)return null;
    const sum=sweepTotal(action,results,short);settle(entry,sum);onChange();return sum;
   }};
  return handle;
 }
 async function load(){clockOffset=bridge.serverNow-Date.now();base=structuredClone(state);onChange();onStatus('saved');return {state};}
 // Not while taps are on their way: their answers bring the newest farm anyway.
 async function refresh(){if(waiting||pending.length)return;replace(await bridge.request({operation:'load'}));}
 window.harvestRefresh=refresh;
 // The parent reports a connection that is being restored ("Reconnecting…") and tells when it is back.
 bridge.watchConnection?.(status=>{if(status==='reconnecting')onStatus('reconnecting');else if(status==='ok')onStatus('saved');});
 return {load,runAction,sweep,retry:refresh,flush:async()=>{},refresh};
}
