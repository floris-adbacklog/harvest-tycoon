// A family visit on your farm (21 Oct 2026, the owner, option 2: "Now and then a family member visits your farm: one at a time,
// preferably someone online now, takes a walk by the Farmhouse and leaves after a few minutes. Tap them and their profile opens.").
// Only the timing and who comes: game.js (familyVisits) starts it on the farm in World I where your own farmer walks, and makes the
// visitor (farm-farmer.js FARM_VISIT, createFarmWalker's visit). Nothing is shown in words, nothing saved, counted or earned.
// The times, in seconds: the first visit a minute or three after the farm is on screen, each visit about three minutes, then a break
// of four to six minutes. A moment the visit cannot start (the evening, the tab hidden, your farmer on a trip that way): a short wait.
export const VISIT_FIRST=Object.freeze([60,180]),VISIT_STAY=Object.freeze([150,210]),VISIT_BREAK=Object.freeze([240,360]),VISIT_RETRY=Object.freeze([20,40]);
// Who may come: only the members online now (the owner, 21 Oct 2026: "alleen andere family members die online zijn"), the ones seen
// most lately first; of those the first VISIT_POOL take turns.
export const VISIT_POOL=4;
const between=([a,b],random)=>a+random()*(b-a);
export function visitOrder(members){
 return (Array.isArray(members)?members:[]).filter(m=>m&&typeof m.playerId==='string'&&m.online===true)
  .sort((a,b)=>Number(b.online===true)-Number(a.online===true)||(Number.isFinite(a.daysAway)?a.daysAway:Infinity)-(Number.isFinite(b.daysAway)?b.daysAway:Infinity));
}
// The next visitor: in that order, the one whose last visit is longest ago (never: first), and never the same one twice in a row when
// there is someone else. visited: playerId -> the number of the visit they last made.
export function pickVisitor(members,visited=new Map(),last=null){
 const pool=visitOrder(members).slice(0,VISIT_POOL);if(!pool.length)return null;
 const choices=pool.length>1?pool.filter(m=>m.playerId!==last):pool;
 return choices.reduce((best,m)=>(visited.get(m.playerId)??0)<(visited.get(best.playerId)??0)?m:best);
}
// The visits, one at a time. members(): your family's other members ({playerId, online, daysAway, farmer}), [] without a family;
// arrive(member): the visitor on the farm, a promise of {leave(): promise} or null when they could not come; evening() and busy(): no
// visit now. stop() ends it all (the visitor, if there, leaves at once).
export function createFamilyVisits({members,arrive,evening=()=>false,busy=()=>false,random=Math.random,timers={set:(f,ms)=>setTimeout(f,ms),clear:id=>clearTimeout(id)}}){
 const visited=new Map();let count=0,last=null,visitor=null,coming=false,timer=null,stopped=false;
 const wait=(range,then=tick)=>{if(stopped)return;timers.clear(timer);timer=timers.set(then,between(range,random)*1000);};
 async function tick(){
  timer=null;if(stopped||visitor||coming)return;
  if(evening()||busy())return wait(VISIT_RETRY);
  coming=true;
  try{
   const member=pickVisitor(await members().catch(()=>[]),visited,last);
   if(stopped)return;
   if(!member)return wait(VISIT_BREAK);
   const v=await Promise.resolve(arrive(member)).catch(()=>null);
   if(!v)return wait(VISIT_BREAK);
   if(stopped){await v.leave(true);return;}
   visited.set(member.playerId,++count);last=member.playerId;visitor=v;
   wait(VISIT_STAY,async()=>{timer=null;try{await v.leave();}finally{visitor=null;wait(VISIT_BREAK);}});
  }finally{coming=false;}
 }
 wait(VISIT_FIRST);
 return {
  get visitor(){return visitor;},
  get next(){return timer;},
  // A visit at once (the harness's visit=1): as the first one, without the wait.
  now(){if(visitor||coming||stopped)return Promise.resolve();timers.clear(timer);return tick();},
  stop(){stopped=true;timers.clear(timer);timer=null;const v=visitor;visitor=null;return v?v.leave(true):Promise.resolve();}
 };
}
