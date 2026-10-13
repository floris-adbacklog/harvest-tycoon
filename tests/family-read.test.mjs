import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createFarm,normalizeFarm,xpForLevel,familyWeek,familyWeekStart,createShowcaseFarm,DAY_MS} from '../supabase/functions/farm-api/farm-state.js';
import {handleFamily,handleFamilyProfile} from '../supabase/functions/farm-api/family-service.js';

// 13 Oct 2026: a family read (the Family window every 30 seconds, chat's @mention list) and the family profile ask the database for
// only the rows the rules use for this farmer (supabase/family-read.sql, harvest_family_read) instead of every family's whole history
// (harvest_family_context, 504 KB and 82 ms a read). These tests keep a small database, give each read once the whole context (as
// before) and once the rows harvest_family_read returns, and require the same answer, the same farm state and the same commit.
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// The database as both SQL functions see it: every row of every table, in table order (the order a full scan gives; the new function
// orders by ctid for the same order). An updated row is a new row version, at the end of its table.
const TABLES=['families','members','invitations','requests','orders','contributions','results','rewards','attempts','weeks','chests','chestPlayers'];
const KEYS={families:['id'],members:['player_id'],invitations:['id'],requests:['id'],orders:['family_id','week'],contributions:['player_id','week'],results:['week','family_id'],rewards:['id'],attempts:['player_id'],weeks:['week']};
const emptyDb=()=>({revision:1,players:[],receipts:[],...Object.fromEntries(TABLES.map(t=>[t,[]]))});
const pending=r=>r.status==='pending';
const PLAYER_FIELDS=['player_id','username','level','last_active_at','vip_expires_at','avatar_id'];
function contextPlayers(db,player){
 const ids=new Set([player,...db.members.filter(m=>m.left_at==null).map(m=>m.player_id),...db.invitations.filter(pending).flatMap(i=>[i.recipient_id,i.invited_by]),...db.requests.filter(pending).map(r=>r.player_id)]);
 return db.players.filter(p=>ids.has(p.player_id)).map(p=>Object.fromEntries(PLAYER_FIELDS.map(k=>[k,p[k]??null])));
}
// harvest_family_context as live on 13 Oct 2026 (supabase/family-chest.sql): every row, chest farmers of this week and last week.
function fullContext(db,player,request,now,narrow=t=>t){
 const week=familyWeek(now),receipt=db.receipts.find(r=>r.player_id===player&&r.request_id===request);
 return JSON.parse(JSON.stringify(narrow({revision:db.revision,now,families:db.families,members:db.members,invitations:db.invitations.filter(pending),requests:db.requests.filter(pending),
  orders:db.orders,contributions:db.contributions,results:db.results,rewards:db.rewards,attempts:db.attempts,weeks:db.weeks,chests:db.chests,
  chestPlayers:db.chestPlayers.filter(r=>r.week>=week-1),players:contextPlayers(db,player),receipt:receipt?{result:receipt.result,failed:receipt.failed}:null})));   // as JSON, the way it travels
}
// harvest_family_read (supabase/family-read.sql), filter for filter; the last test pins the SQL to these lines.
function readContext(db,player,family,now){
 const week=familyWeek(now),mine=db.members.find(m=>m.player_id===player&&m.left_at==null)?.family_id??null;
 const unsettled=new Set(db.contributions.filter(c=>c.week<week&&!db.weeks.some(w=>w.week===c.week)).map(c=>c.week));
 const chest=new Set(db.chestPlayers.filter(c=>c.family_id===mine&&c.week>=week-1).map(c=>c.player_id));
 const is=(a,b)=>a!=null&&a===b;   // in SQL a comparison with null is never true
 return fullContext(db,player,null,now,full=>({...full,
  orders:full.orders.filter(t=>t.week===week||unsettled.has(t.week)||is(t.family_id,family)),
  contributions:full.contributions.filter(t=>t.week===week||unsettled.has(t.week)||t.player_id===player&&t.week===week-1),
  rewards:full.rewards.filter(t=>t.player_id===player||unsettled.has(t.week)||t.week>=week-1&&chest.has(t.player_id)),
  attempts:full.attempts.filter(t=>t.player_id===player),
  chestPlayers:full.chestPlayers.filter(t=>is(t.family_id,mine)||is(t.family_id,family)||t.player_id===player),
  receipt:null}));
}
// farm-api's database client. mode 'before': a read gets the whole context, as every read did before 13 Oct 2026. Commits are kept
// for the caller to compare and apply; player_stats answers an invitation's lookup; notices and chat cards are accepted.
function client(db,now,mode='after'){
 const calls=[],commits=[],sizes={};
 return {calls,commits,sizes,rpc:async(name,args)=>{
  calls.push([name,args]);
  if(name==='harvest_family_context')return {data:fullContext(db,args.p_player,args.p_request,now),error:null};
  if(name==='harvest_family_read'){const data=mode==='before'?fullContext(db,args.p_player,null,now):readContext(db,args.p_player,args.p_family??null,now);sizes.rewards=data.rewards.length;return {data,error:null};}
  if(name==='harvest_family_commit'){commits.push(args);return {data:true,error:null};}
  throw new Error(`unexpected rpc ${name}`);
 },from:()=>({select(){return this;},eq(_,value){this.value=value;return this;},async maybeSingle(){const p=db.players.find(x=>x.player_id===this.value);return {data:p?{player_id:p.player_id,username:p.username,level:p.level}:null,error:null};},insert:async()=>({error:null})})};
}
// What harvest_family_commit does to the rows (the guards that matter here included: a reward is never paid twice, a week is settled once).
function commit(db,args,now){
 assert.equal(args.p_expected_family,db.revision);
 for(const w of args.p_settled??[])assert.ok(!db.weeks.some(x=>x.week===w),`week ${w} is settled once`);
 for(const r of args.p_changes.rewards??[]){const old=db.rewards.find(x=>x.id===r.id);if(old&&(old.player_id!==r.player_id||old.coins!==r.coins||old.xp!==r.xp||old.diamonds!==r.diamonds||old.claimed_at!=null))throw new Error('Immutable reward');}
 for(const [table,rows] of Object.entries(args.p_changes)){
  const key=r=>KEYS[table].map(f=>r[f]).join(':');
  for(const row of rows){
   const i=db[table].findIndex(r=>key(r)===key(row));
   if(i<0)db[table].push(structuredClone(row));else if(table!=='results'&&table!=='weeks'){db[table].splice(i,1);db[table].push(structuredClone(row));}
  }
 }
 if(args.p_request)db.receipts.push({player_id:args.p_player,request_id:args.p_request,result:args.p_result,failed:args.p_failed});
 if(args.p_write_farm){const p=db.players.find(x=>x.player_id===args.p_player);if(p){p.level=args.p_level;p.last_active_at=new Date(now).toISOString();}}
 db.revision++;
}
const farm=(level,now)=>{const s=createFarm(now);s.xp=xpForLevel(level);s.stats.bread=1;s.stats.made_bread=1;s.stats.sold_eggs=1;return normalizeFarm(s,now);};
const nameOf=(db,p)=>db.players.find(x=>x.player_id===p)?.username??'Farmer';

// One read as the game asks it (operation 'family'), with the whole context and with harvest_family_read: the same answer, the same
// farm state (the flag's family and reward count) and the same commit (a settled week, an expired invitation, the week's order, chest
// rewards). Returns the run with the new read, its context and the commit to apply.
async function compareRead(db,player,state,now){
 const runs=[];
 for(const mode of ['before','after']){
  const admin=client(db,now,mode),s=structuredClone(state);
  const response=await handleFamily({admin,body:{operation:'family'},row:{revision:7,receipts:[]},state:s,player,username:nameOf(db,player)});
  runs.push({response,state:s,commits:admin.commits,calls:admin.calls,sizes:admin.sizes});
 }
 const [before,after]=runs;
 assert.deepEqual(after.calls[0],['harvest_family_read',{p_player:player,p_family:null}]);
 assert.deepEqual(after.response,before.response,'the same answer');
 assert.deepEqual(after.state,before.state,'the same farm state');
 assert.deepEqual(after.commits,before.commits,'the same commit');
 return after;
}
async function compareProfile(db,player,familyId,state,now){
 const runs=[];
 for(const mode of ['before','after']){const admin=client(db,now,mode);runs.push({shown:await handleFamilyProfile({admin,body:{familyId},state:structuredClone(state),player}),calls:admin.calls});}
 assert.deepEqual(runs[1].shown,runs[0].shown,'the same profile');
 assert.equal(runs[1].calls.some(([name])=>name==='harvest_family_commit'),false,'a profile never writes');
 return runs[1];
}

// A seeded random source, so a failing run can be replayed.
function rng(seed){return ()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const uuidFrom=random=>()=>{const s=Array.from({length:32},()=>Math.floor(random()*16).toString(16)).join('');return `${s.slice(0,8)}-${s.slice(8,12)}-4${s.slice(13,16)}-a${s.slice(17,20)}-${s.slice(20)}`;};

// Five weeks of families, every four hours: farmers play (the chest trigger), create, join, ask, invite, answer, contribute, claim,
// leave, remove, change ranks and who can join; every step some farmers (also the admin's showcase farm and one below level 10) read
// the Family window and open family profiles, and every read and profile is compared. The first read of each Monday settles the week.
const STEP_HOURS=Number(process.env.FAMILY_SIM_STEP_HOURS??4);
async function simulate(seed){
 const random=rng(seed),pick=list=>list[Math.floor(random()*list.length)],chance=p=>random()<p,uuid=uuidFrom(random);
 const savedUuid=Object.getOwnPropertyDescriptor(crypto,'randomUUID');crypto.randomUUID=uuid;
 const stats={reads:0,profiles:0,settled:0,orders:0,chestRewards:0,expired:0,inFamily:0,noFamily:0,manager:0,joinRequests:0,invitation:0,sentInvitations:0,blocked:0,locked:0,lastWeek:0,rewards:0,deletedProfile:0,ownProfile:0,narrowerRewards:0};
 try{
  const db=emptyDb(),start=familyWeekStart(2955)+4*DAY_MS,states=new Map();
  const ids=Array.from({length:32},()=>uuid()),admin=ids[0],rookie=ids[1];
  ids.forEach((id,i)=>{const level=id===rookie?8:10+Math.floor(random()*60);db.players.push({player_id:id,username:`Farmer ${i}`,level,last_active_at:new Date(start-Math.floor(random()*5)*DAY_MS).toISOString(),vip_expires_at:chance(.2)?new Date(start+30*DAY_MS).toISOString():null,avatar_id:'default',goods_made:{bread:3}});states.set(id,farm(level,start));});
  const players=ids.filter(id=>id!==admin),watch=[];   // farmers an action just changed (removed, invited, answered) read soon after
  const familyOf=p=>{const m=db.members.find(x=>x.player_id===p&&x.left_at==null);return m&&db.families.find(f=>f.id===m.family_id&&f.deleted_at==null);};
  const stateFor=(p,now)=>p===admin?createShowcaseFarm(now,{family:states.get(p).family??null}):states.get(p);
  function action(p,now){
   const week=familyWeek(now),fam=familyOf(p),me=db.members.find(m=>m.player_id===p);
   if(!fam){
    const invite=db.invitations.find(i=>pending(i)&&i.recipient_id===p),live=db.families.filter(f=>f.deleted_at==null),mine=db.requests.find(r=>pending(r)&&r.player_id===p);
    if(invite&&chance(.6))return {type:chance(.8)?'family_accept_invite':'family_decline_invite',invitationId:invite.id};
    if(mine&&chance(.15))return {type:'family_request_cancel',requestId:mine.id};
    const asks=live.filter(f=>f.join_mode==='request'),open=live.filter(f=>f.join_mode==='open');
    if(asks.length&&chance(.35))return {type:'family_request',familyId:pick(asks).id};
    if(open.length&&chance(.6))return {type:'family_join',familyId:pick(open).id};
    return live.length<8&&chance(.5)?{type:'family_create',name:`Family ${uuid().slice(0,8)}`,emblem:'0'}:null;
   }
   const manager=me.role==='leader'||me.role==='coleader',others=db.members.filter(m=>m.family_id===fam.id&&m.left_at==null&&m.player_id!==p),r=random();
   if(r<.4){
    const order=db.orders.find(o=>o.family_id===fam.id&&o.week===week),open=order?Object.entries(order.lines).filter(([k,n])=>(order.filled[k]??0)<n):[];
    if(open.length){const [item,n]=pick(open),left=n-(order.filled[item]??0),count=chance(.5)?left:1+Math.floor(random()*left);states.get(p).inventory[item]=count;return {type:'family_contribute',week,item,count};}
    states.get(p).inventory.wheat=50;return {type:'family_tournament_goods',week,item:'wheat',count:50};
   }
   if(r<.5){const reward=db.rewards.find(x=>x.player_id===p&&x.claimed_at==null&&x.expires_at>now);if(reward&&chance(.5))return {type:'family_claim',rewardId:reward.id};}
   if(manager&&r<.6){const request=db.requests.find(x=>pending(x)&&x.family_id===fam.id);if(request&&chance(.5))return {type:chance(.7)?'family_request_accept':'family_request_decline',requestId:request.id};}
   if(manager&&r<.68){const free=players.filter(x=>!familyOf(x));if(free.length)return {type:'family_invite',playerId:pick(free)};}
   if(manager&&r<.72)return {type:'family_join_mode',mode:pick(['open','open','request','request','invite','closed'])};
   if(manager&&r<.74&&others.length)return {type:'family_kick',memberId:pick(others).id};
   if(me.role==='leader'&&r<.77&&others.length)return {type:'family_rank',memberId:pick(others).id,rank:pick(['coleader','honorary','member'])};
   if(manager&&r<.78)return {type:'family_min_level',level:pick([10,15,20])};
   if(manager&&r<.8){const sent=db.invitations.find(i=>pending(i)&&i.family_id===fam.id);if(sent)return {type:'family_cancel_invite',invitationId:sent.id};}
   if(r<.83)return {type:'family_leave'};
   return null;
  }
  for(let now=start;now<start+5*7*DAY_MS;now+=STEP_HOURS*3600000){
   const week=familyWeek(now);
   // Reads first: on a Monday the first one settles last week.
   for(const p of [pick(ids),pick(ids),pick(players),...(watch.length?[watch.shift()]:[]),...(chance(.2)?[admin,rookie]:[])]){
    const fam=familyOf(p),after=await compareRead(db,p,stateFor(p,now),now);stats.reads++;
    const view=after.response.data.family,args=after.commits[0];
    if(fam)stats.inFamily++;else stats.noFamily++;
    if(view){if(view.family?.manager)stats.manager++;if(view.joinRequests.length)stats.joinRequests++;if(view.invitation)stats.invitation++;if(view.sentInvitations.length)stats.sentInvitations++;if(view.blocked)stats.blocked++;if(view.contributionLocked)stats.locked++;if(view.lastWeek)stats.lastWeek++;if(view.rewards.length)stats.rewards++;}
    if(args){
     if(args.p_settled.length)stats.settled++;if(args.p_changes.orders)stats.orders++;
     if(args.p_changes.rewards?.some(r=>r.kind.startsWith('chest-')))stats.chestRewards++;
     if([...args.p_changes.invitations??[],...args.p_changes.requests??[]].some(r=>r.status!=='pending'))stats.expired++;
     commit(db,args,now);
    }
    if(after.sizes.rewards<db.rewards.length)stats.narrowerRewards++;
   }
   // Profiles: a family in the list, the farmer's own, one that is gone, and an id that never was one.
   if(chance(.6)){
    const p=pick(ids),live=db.families.filter(f=>f.deleted_at==null),gone=db.families.filter(f=>f.deleted_at!=null),own=familyOf(p);
    const r=random(),id=r<.5&&live.length?pick(live).id:r<.7&&gone.length?pick(gone).id:r<.9&&own?own.id:uuid();
    if(gone.some(f=>f.id===id))stats.deletedProfile++;if(own?.id===id)stats.ownProfile++;
    await compareProfile(db,p,id,stateFor(p,now),now);stats.profiles++;
   }
   // Farm play fills the chest (the database trigger: this week's points for the farmer's current family).
   for(const p of players){
    const fam=familyOf(p);if(!fam||!chance(.35))continue;const points=50+Math.floor(random()*900);
    const chest=db.chests.find(c=>c.family_id===fam.id&&c.week===week);if(chest)chest.points+=points;else db.chests.push({family_id:fam.id,week,points});
    const mine=db.chestPlayers.find(c=>c.family_id===fam.id&&c.week===week&&c.player_id===p);if(mine)mine.points+=points;else db.chestPlayers.push({family_id:fam.id,week,player_id:p,points});
    db.players.find(x=>x.player_id===p).last_active_at=new Date(now).toISOString();
   }
   // Actions read the whole context, as before.
   for(let n=0;n<5;n++){
    const p=pick(players),a=action(p,now);if(!a)continue;
    const admin=client(db,now);
    const done=await handleFamily({admin,body:{operation:'action',action:a,requestId:uuid()},row:{revision:7,receipts:[]},state:states.get(p),player:p,username:nameOf(db,p)});
    assert.ok(done);assert.equal(admin.calls[0][0],'harvest_family_context','actions keep the whole context');
    if(admin.commits[0])commit(db,admin.commits[0],now);
    const target=a.memberId?db.members.find(m=>m.id===a.memberId)?.player_id:a.playerId??db.requests.find(r=>r.id===a.requestId)?.player_id;
    if(target&&target!==p)watch.push(target);
   }
  }
  return {db,stats};
 }finally{if(savedUuid)Object.defineProperty(crypto,'randomUUID',savedUuid);else delete crypto.randomUUID;}
}

test('five weeks of families: every read, profile and commit is the same with harvest_family_read as with the whole history',async()=>{
 const total={};
 for(const seed of [11,2026]){
  const {db,stats}=await simulate(seed);
  assert.ok(db.families.length>=4&&db.rewards.length>50&&db.weeks.length>=4,JSON.stringify({families:db.families.length,rewards:db.rewards.length,weeks:db.weeks.length}));
  assert.ok(stats.narrowerRewards>stats.reads/2,'most reads get far fewer rewards');
  for(const [k,n] of Object.entries(stats))total[k]=(total[k]??0)+n;
 }
 // The comparison went through every path that reads the rows the new function leaves out (busyDb below has each of them too).
 for(const [k,n] of Object.entries(total))assert.ok(n>0,`no read with ${k} (${JSON.stringify(total)})`);
});

// Two weeks nobody settled (no read or action since), a partly filled order in each, a whole order already paid, chest tiers this week
// and last week with one chest reward claimed already, a farmer who moved family this week, one removed while their block runs, a
// leader with a request and an invitation out, a farmer whose family is gone, one missing from player_stats and the admin's showcase.
function busyDb(now){
 const week=familyWeek(now),db=emptyDb(),id=n=>`00000000-0000-4000-a000-${String(n).padStart(12,'0')}`;
 const [f1,f2,f3,gone]=[id(901),id(902),id(903),id(904)],P=Array.from({length:14},(_,i)=>id(i+1)),[admin,lost]=[id(99),id(98)];
 [...P,admin].forEach((p,i)=>db.players.push({player_id:p,username:`Farmer ${i}`,level:12+i*3,last_active_at:new Date(now-i*3600000).toISOString(),vip_expires_at:null,avatar_id:'default'}));
 db.families.push({id:f1,name:'Berry Cool',emblem:'5',invite_code:'AAAAAA',is_open:true,join_mode:'open',min_level:null,created_at:now-30*DAY_MS,renamed_at:null,deleted_at:null},
  {id:f2,name:'Hay Makers',emblem:'7',invite_code:'BBBBBB',is_open:false,join_mode:'request',min_level:15,created_at:now-20*DAY_MS,renamed_at:null,deleted_at:null},
  {id:f3,name:'Owl Hill',emblem:'9',invite_code:'CCCCCC',is_open:false,join_mode:'invite',min_level:null,created_at:now-9*DAY_MS,renamed_at:null,deleted_at:null},
  {id:gone,name:'Old Barn',emblem:'1',invite_code:'DDDDDD',is_open:true,join_mode:'open',min_level:null,created_at:now-40*DAY_MS,renamed_at:null,deleted_at:now-10*DAY_MS});
 const member=(p,f,role='member',extra={})=>db.members.push({id:`m-${p}`,player_id:p,family_id:f,role,joined_at:now-25*DAY_MS,left_at:null,cooldown_until:null,blocked_family:null,...extra});
 member(P[0],f1,'leader');member(P[1],f1,'coleader');member(P[2],f1);member(P[3],f1);member(P[4],f2,'leader');member(P[5],f2);member(P[6],f3,'leader');
 member(P[7],null,'member',{left_at:now-DAY_MS,cooldown_until:now+DAY_MS,blocked_family:f1});   // removed from f1, blocked a day longer
 member(P[8],f2,'member',{joined_at:now-3600000});   // moved from f1 to f2 this week
 member(lost,gone);member(admin,f1);   // a member row whose family is gone; the admin in f1
 db.invitations.push({id:id(801),family_id:f3,recipient_id:P[9],invited_by:P[6],created_at:now-DAY_MS,expires_at:now+6*DAY_MS,status:'pending',resolved_at:null},
  {id:id(802),family_id:f1,recipient_id:P[10],invited_by:P[0],created_at:now-8*DAY_MS,expires_at:now-DAY_MS,status:'pending',resolved_at:null},   // runs out at this read
  {id:id(803),family_id:f1,recipient_id:P[11],invited_by:P[1],created_at:now-20*DAY_MS,expires_at:now-13*DAY_MS,status:'accepted',resolved_at:now-19*DAY_MS});
 db.requests.push({id:id(701),family_id:f2,player_id:P[12],status:'pending',created_at:now-3600000,expires_at:now+2*DAY_MS,resolved_at:null,resolved_by:null},
  {id:id(702),family_id:f2,player_id:P[13],status:'pending',created_at:now-4*DAY_MS,expires_at:now-DAY_MS,resolved_at:null,resolved_by:null});
 const order=(f,w,filled,completed=null)=>db.orders.push({family_id:f,week:w,lines:{wheat:300,corn:200,bread:40,eggs:60},filled,member_count:4,value:20000,created_at:familyWeekStart(w)+3600000,completed_at:completed});
 const contribute=(p,f,w,points,order_points)=>db.contributions.push({family_id:f,week:w,player_id:p,points,order_points,extra_points:points-order_points,lines:{},last_at:familyWeekStart(w)+DAY_MS});
 for(const w of [week-6,week-5,week-4,week-3]){   // settled weeks with their results and rewards
  order(f1,w,{wheat:300,corn:200,bread:40,eggs:60},familyWeekStart(w)+3*DAY_MS);order(f2,w,{wheat:10});
  contribute(P[0],f1,w,9000,8000);contribute(P[1],f1,w,4000,4000);contribute(P[4],f2,w,2000,500);
  db.results.push({week:w,family_id:f1,rank:1,points:13000,active_members:2,diamonds_pool:60,name:'Berry Cool',emblem:'5',settled_at:familyWeekStart(w+1)},{week:w,family_id:f2,rank:2,points:2000,active_members:1,diamonds_pool:40,name:'Hay Makers',emblem:'7',settled_at:familyWeekStart(w+1)});
  db.weeks.push({week:w,settled_at:familyWeekStart(w+1),pool:100});
  for(const [p,kind,d] of [[P[0],'order',3],[P[1],'order',2],[P[0],'tournament',40],[P[1],'tournament',20],[P[4],'tournament',40]])db.rewards.push({id:`${w}:${kind}:${p}`,player_id:p,week:w,kind,coins:1000,xp:50,diamonds:d,created_at:familyWeekStart(w+1),expires_at:familyWeekStart(w+1)+8*7*DAY_MS,claimed_at:w<week-4?familyWeekStart(w+1)+DAY_MS:null});
 }
 for(const w of [week-2,week-1]){   // not settled: the first read settles both
  order(f1,w,{wheat:300,corn:120,bread:40});order(f2,w,{wheat:300,corn:200,bread:40,eggs:60},familyWeekStart(w)+2*DAY_MS);
  contribute(P[0],f1,w,7000,6000);contribute(P[1],f1,w,3000,3000);contribute(P[2],f1,w,200,200);contribute(P[4],f2,w,8000,8000);contribute(P[5],f2,w,3000,3000);contribute(P[8],f1,w,900,900);
  for(const p of [P[4],P[5]])db.rewards.push({id:`${w}:order:${p}`,player_id:p,week:w,kind:'order',coins:900,xp:40,diamonds:2,created_at:familyWeekStart(w)+2*DAY_MS,expires_at:familyWeekStart(w+1)+8*7*DAY_MS,claimed_at:null});
 }
 order(f1,week,{wheat:100});contribute(P[8],f1,week,500,500);contribute(P[0],f1,week,1200,1200);   // P[8] delivered for f1 before moving
 for(const [w,points] of [[week-3,26000],[week-1,13000],[week,5200]]){db.chests.push({family_id:f1,week:w,points});db.chests.push({family_id:f2,week:w,points:Math.floor(points/3)});}
 for(const w of [week-3,week-1,week]){for(const [p,pts] of [[P[0],4000],[P[1],2500],[P[2],250],[P[3],900],[admin,400],[P[8],700]])db.chestPlayers.push({family_id:f1,week:w,player_id:p,points:pts});db.chestPlayers.push({family_id:f2,week:w,player_id:P[4],points:3000},{family_id:f2,week:w,player_id:P[8],points:300});}
 // A tournament reward of a week not settled yet: the rules never write one, but settlement checks for it, so it is read (never paid twice).
 db.rewards.push({id:`${week-2}:tournament:${P[0]}`,player_id:P[0],week:week-2,kind:'tournament',coins:0,xp:0,diamonds:30,created_at:familyWeekStart(week-1),expires_at:familyWeekStart(week-1)+8*7*DAY_MS,claimed_at:null});
 db.rewards.push({id:`${week-1}:chest-wood:${P[1]}`,player_id:P[1],week:week-1,kind:'chest-wood',coins:2640,xp:0,diamonds:2,created_at:familyWeekStart(week)-DAY_MS,expires_at:familyWeekStart(week)+8*7*DAY_MS,claimed_at:familyWeekStart(week)-3600000});
 db.attempts.push({player_id:P[0],window_at:now-7200000,count:2},{player_id:P[12],window_at:now-600000,count:1});
 return {db,P,f1,f2,f3,gone,admin,lost};
}
test('a Monday after a week nobody opened: two weeks settle on the first read, chests pay, invitations and requests run out, the same as before',async()=>{
 const now=familyWeekStart(2962)+2*3600000,{db,P,f1,f2,f3,gone,admin,lost}=busyDb(now),week=familyWeek(now);
 const first=await compareRead(db,P[2],farm(20,now),now);
 assert.deepEqual(first.commits[0].p_settled,[week-2,week-1],'both weeks settle');
 assert.ok(first.commits[0].p_changes.rewards.some(r=>r.kind==='tournament')&&first.commits[0].p_changes.rewards.some(r=>r.kind==='chest-iron'));
 assert.deepEqual(first.commits[0].p_changes.invitations.map(i=>i.status),['expired']);assert.deepEqual(first.commits[0].p_changes.requests.map(r=>r.status),['expired']);
 const narrow=readContext(db,P[2],null,now),whole=fullContext(db,P[2],null,now);
 assert.ok(narrow.rewards.length<whole.rewards.length&&narrow.orders.length<whole.orders.length&&narrow.contributions.length<whole.contributions.length);
 // Every farmer and the admin, before and after the settlement is written; every family's profile from each of them.
 for(const settled of [false,true]){
  if(settled)commit(db,first.commits[0],now);
  for(const p of [...P,admin,lost]){
   const state=p===admin?createShowcaseFarm(now,{family:null}):farm(p===P[13]?9:25,now),after=await compareRead(db,p,state,now);
   if(p===P[7])assert.deepEqual(after.response.data.family.blocked,{family:f1,until:now+DAY_MS});
   if(p===P[8])assert.equal(after.response.data.family.contributionLocked,true,'delivered for another family this week');
   if(p===P[4]&&settled)assert.equal(after.response.data.family.joinRequests.length,1);
   if(p===P[9])assert.ok(after.response.data.family.invitation);
   for(const f of [f1,f2,f3,gone,'00000000-0000-4000-a000-000000000777'])await compareProfile(db,p,f,state,now);
  }
 }
});

test('reads and profiles ask harvest_family_read; actions keep the whole context and every rule',async()=>{
 const now=familyWeekStart(2962)+DAY_MS,{db,P,f2}=busyDb(now);
 const reader=client(db,now);await handleFamily({admin:reader,body:{operation:'family'},row:{revision:1,receipts:[]},state:farm(20,now),player:P[0],username:'A'});
 assert.deepEqual(reader.calls.map(c=>c[0]),['harvest_family_read','harvest_family_commit']);assert.deepEqual(reader.calls[0][1],{p_player:P[0],p_family:null});
 const viewer=client(db,now);await handleFamilyProfile({admin:viewer,body:{familyId:f2},state:farm(20,now),player:P[0]});
 assert.deepEqual(viewer.calls,[['harvest_family_read',{p_player:P[0],p_family:f2}]]);
 const actor=client(db,now);await handleFamily({admin:actor,body:{operation:'action',action:{type:'family_leave'},requestId:'r-1'},row:{revision:1,receipts:[]},state:farm(20,now),player:P[3],username:'D'});
 assert.deepEqual(actor.calls[0],['harvest_family_context',{p_player:P[3],p_request:'r-1'}]);
 // Chat's @mention list reads the same answer's members.
 assert.match(read('src/chat-ui.js'),/bridge\.request\(\{operation:'family'\}\);const list=\(data\?\.family\?\.members\?\?\[\]\)/);
});

test('until family-read.sql has run, a read and a profile take the whole context as before',async()=>{
 const now=familyWeekStart(2962)+DAY_MS,{db,P,f1}=busyDb(now),calls=[];
 const admin={rpc:async(name,args)=>{calls.push(name);if(name==='harvest_family_read')return {data:null,error:{code:'PGRST202',message:'Could not find the function public.harvest_family_read(p_family, p_player) in the schema cache'}};if(name==='harvest_family_context')return {data:fullContext(db,args.p_player,args.p_request,now),error:null};return {data:true,error:null};},from:client(db,now).from};
 const shown=await handleFamilyProfile({admin,body:{familyId:f1},state:farm(20,now),player:P[2]});
 assert.equal(shown.status,200);assert.equal(shown.data.familyProfile.name,'Berry Cool');
 assert.deepEqual(calls,['harvest_family_read','harvest_family_context']);
 const answer=await handleFamily({admin,body:{operation:'family'},row:{revision:1,receipts:[]},state:farm(20,now),player:P[2],username:'C'});
 assert.equal(answer.status,200);assert.equal(answer.data.family.family.name,'Berry Cool');
 // Any other database error still stops the request.
 const broken={rpc:async()=>({data:null,error:{code:'57014',message:'canceling statement due to statement timeout'}})};
 await assert.rejects(handleFamily({admin:broken,body:{operation:'family'},row:{revision:1,receipts:[]},state:farm(20,now),player:P[2],username:'C'}),{code:'57014'});
});

test('a profile id that is not a family id is no family, as before, without asking the database',async()=>{
 let asked=0;const admin={rpc:async()=>{asked++;return {data:null,error:null};}};
 for(const familyId of ['abc',"1'; select 1",'{00000000-0000-4000-a000-000000000901}','00000000000040000a000000000000901'])
  assert.deepEqual(await handleFamilyProfile({admin,body:{familyId},state:farm(20,Date.now()),player:'p'}),{status:422,data:{error:'This family is no longer around.',code:'ACTION_REJECTED'}});
 assert.deepEqual(await handleFamilyProfile({admin,body:{familyId:''},state:farm(20,Date.now()),player:'p'}),{status:422,data:{error:'Choose a family.',code:'ACTION_REJECTED'}});
 assert.equal(asked,0);
});

test('the Family window, its tabs, the profile and chat read only fields the answer still has',async()=>{
 const now=familyWeekStart(2962)+DAY_MS,{db,P,f1}=busyDb(now);
 const view=(await compareRead(db,P[0],farm(30,now),now)).response.data.family,profile=(await compareProfile(db,P[2],f1,farm(30,now),now)).shown.data.familyProfile;
 for(const file of readdirSync(new URL('../public',import.meta.url)).filter(f=>/^family.*\.js$/.test(f)))
  for(const [,field] of read(`public/${file}`).matchAll(/\bview\??\.([A-Za-z]+)/g))assert.ok(Object.hasOwn(view,field),`${file} reads view.${field}`);
 for(const [,field] of read('public/family-profile.js').matchAll(/\bp\??\.([A-Za-z]+)/g))assert.ok(Object.hasOwn(profile,field),`family-profile.js reads p.${field}`);
 assert.ok(view.members.length&&view.members.every(m=>m.playerId&&m.username&&m.avatarId&&Number.isInteger(m.level)),'chat @mentions: playerId, username, level, avatarId');
});

test('family-read.sql: a new service-only function, patched from the live context, the same keys, the rows the tests mirror',()=>{
 const sql=read('supabase/family-read.sql'),fn=sql.slice(sql.indexOf('create or replace function public.harvest_family_read'),sql.indexOf('end $function$'));
 assert.match(sql,/if md5\(pg_get_functiondef\('public\.harvest_family_context\(uuid,uuid\)'::regprocedure\)\)<>'7cd8a1177c21f1bad6b40ad4d8487248' then\n  raise exception/,'stops when the live context is not the one it narrows');
 assert.match(fn,/^create or replace function public\.harvest_family_read\(p_player uuid, p_family uuid default null\)\n returns json language plpgsql stable set search_path to '' as \$function\$/);
 assert.doesNotMatch(sql,/security definer|create or replace function public\.harvest_family_context|insert |update |delete /i,'adds one read-only function, changes nothing else');
 assert.match(sql,/revoke all on function public\.harvest_family_read\(uuid,uuid\) from public, anon, authenticated;\ngrant execute on function public\.harvest_family_read\(uuid,uuid\) to service_role;/);
 // The same keys as the context (supabase/family-chest.sql, the live definition), in the same order.
 const old=read('supabase/family-chest.sql'),body=old.slice(old.indexOf('create or replace function public.harvest_family_context'),old.indexOf('$function$;',old.indexOf('create or replace function public.harvest_family_context')));
 const keys=text=>[...text.matchAll(/\n\s*'([A-Za-z]+)',/g)].map(m=>m[1]);
 assert.deepEqual(keys(fn),keys(body));assert.deepEqual(keys(fn),['revision','now','families','members','invitations','requests','orders','contributions','results','rewards','attempts','weeks','chests','chestPlayers','players','receipt']);
 // Table order for every list: json_agg(... order by ctid), the order of the old full scans.
 assert.equal((fn.match(/json_agg\(/g)??[]).length,13);assert.equal((fn.match(/order by t\.ctid\)/g)??[]).length,12);assert.match(fn,/order by p\.ctid\)/);
 // Unchanged lists read whole, as before; the narrowed ones exactly as readContext above.
 for(const table of ['families','family_members','family_week_results','family_weeks','family_chests'])assert.match(fn,new RegExp(`\\(select json_agg\\(t order by t\\.ctid\\) from public\\.${table} t\\),'\\[\\]'::json\\)`));
 for(const table of ['family_invitations','family_requests'])assert.match(fn,new RegExp(`from public\\.${table} t where t\\.status='pending'\\)`));
 const where=table=>fn.slice(fn.indexOf(`from public.${table} t`)).split(`),'[]'::json)`)[0].replace(/\s+/g,' ');
 assert.equal(where('family_orders'),"from public.family_orders t where t.week=k.week or t.week=any(k.unsettled) or t.family_id=p_family");
 assert.equal(where('family_contributions'),"from public.family_contributions t where t.week=k.week or t.week=any(k.unsettled) or (t.player_id=p_player and t.week=k.week-1)");
 assert.equal(where('family_rewards'),"from public.family_rewards t where t.player_id=p_player or t.week=any(k.unsettled) or (t.week>=k.week-1 and t.player_id in (select c.player_id from public.family_chest_players c where c.family_id=k.family and c.week>=k.week-1))");
 assert.equal(where('family_attempts'),'from public.family_attempts t where t.player_id=p_player');
 assert.equal(where('family_chest_players'),'from public.family_chest_players t where t.week>=k.week-1 and (t.family_id=k.family or t.family_id=p_family or t.player_id=p_player)');
 assert.match(fn,/\(select m\.family_id from public\.family_members m where m\.player_id=p_player and m\.left_at is null\) as family/);
 assert.match(fn,/\(select coalesce\(array_agg\(distinct c\.week\),'\{\}'::integer\[\]\) from public\.family_contributions c\n\s+where c\.week<floor\(\(extract\(epoch from statement_timestamp\(\)\)\*1000-345600000\)\/604800000\)::integer\n\s+and not exists\(select 1 from public\.family_weeks w where w\.week=c\.week\)\) as unsettled/);
 // The farmers: the same set as the context's (the farmer, members, both sides of pending invitations, pending requests).
 assert.match(fn,/where p\.player_id in \(select p_player\n\s+union all select m\.player_id from public\.family_members m where m\.left_at is null\n\s+union all select i\.recipient_id from public\.family_invitations i where i\.status='pending'\n\s+union all select i\.invited_by from public\.family_invitations i where i\.status='pending'\n\s+union all select r\.player_id from public\.family_requests r where r\.status='pending'\)\)/);
 assert.match(body,/p\.player_id=p_player or exists\(select 1 from public\.family_members m where m\.player_id=p\.player_id and m\.left_at is null\) or exists\(select 1 from public\.family_invitations i where i\.status='pending' and \(i\.recipient_id=p\.player_id or i\.invited_by=p\.player_id\)\) or exists\(select 1 from public\.family_requests r where r\.status='pending' and r\.player_id=p\.player_id\)/);
 assert.match(fn,/'receipt',null\)/,'a read never has a request');
});
