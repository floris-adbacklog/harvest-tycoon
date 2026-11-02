// farm-api asks the database less in a row (26 Oct 2026, the owner: "chores take long after the tap"): the session, and for the
// operations that open the farm the profile and the farm row, go out beside the account check, for the player the token names. Nothing
// read early is used before the account is verified and is that same player. One action in 20 logs how long each step took.
// farm-api itself is run here, as in crazygames-auth.test.mjs, against a database that notes when each question goes out.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync} from 'node:fs';
import * as rules from '../game/farm-state.js';
import * as invites from '../supabase/functions/farm-api/invite-service.js';
import * as playerLog from '../supabase/functions/farm-api/player-log.js';
import {welcomeSummary} from '../supabase/functions/farm-api/welcome-service.js';
import {savePlayerAvatar} from '../supabase/functions/farm-api/avatar-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const SOURCE=read('supabase/functions/farm-api/index.ts');
const NOW=Date.UTC(2026,9,26,12);
const A='00000000-0000-4000-8000-0000000000a1',B='00000000-0000-4000-8000-0000000000b2';
const part=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const tokenFor=(sub,session_id='s-1')=>`${part({alg:'HS256'})}.${part({sub,role:'authenticated',session_id})}.sig`;
const user=id=>({id,email:`${id.slice(-2)}@example.com`,app_metadata:{provider:'google'},user_metadata:{}});
const tick=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function farmApi({verified=user(A),authError=null,sessionActive=true,timing=false,consoleLog=true,donations=[],emailChecked=false}={}){
 const farms=new Map(),profiles=new Map(),events=[],logs=[],commits=[];let handler;
 for(const [id,coins,revision] of [[A,500,3],[B,9999,40]]){
  const state=rules.createFarm(NOW);state.coins=coins;
  farms.set(id,{player_id:id,state,revision,receipts:[],updated_at:new Date(NOW).toISOString()});
  profiles.set(id,{player_id:id,username:id===A?'Anna':'Bram',currency:coins,level:rules.levelOf(state),avatar_id:'default',events_finished:0,look:{}});
 }
 const admin={
  auth:{async getUser(){events.push('getUser asked');await tick(15);events.push('getUser answered');return authError?{data:{user:null},error:authError}:{data:{user:structuredClone(verified)},error:null};},admin:{async updateUserById(){return {};}}},
  from(table){
   let player=null;
   // A list query (the staff's gifts, the invited friends) answers when awaited, a little later, and notes when it went out.
   const list=async()=>{events.push(`${table} asked`);await tick(10);events.push(`${table} answered`);return {data:table==='staff_donations'?structuredClone(donations):[],error:null};};
   const api={select(){return api;},update(){return api;},eq(key,value){if(key==='player_id')player=value;return api;},gt(){return api;},or(){return api;},order(){return api;},not(){return api;},in(){return api;},limit:list,then:(resolve,reject)=>list().then(resolve,reject),
    insert:async()=>({}),upsert:async()=>({}),
    async maybeSingle(){events.push(`${table} ${player===A?'A':player===B?'B':player}`);await tick(5);
     return {data:table==='player_farms'?structuredClone(farms.get(player)??null):table==='player_stats'?structuredClone(profiles.get(player)??null):null,error:null};}};
   return api;
  },
  async rpc(name,args){
   if(name==='harvest_session_active'){events.push(`session ${args.p_player===A?'A':'B'}`);await tick(5);return {data:sessionActive,error:null};}
   if(name==='harvest_email_checked'){events.push('email asked');await tick(10);events.push('email answered');return {data:emailChecked,error:null};}
   if(name==='harvest_commit_farm'){
    const row=farms.get(args.p_player);commits.push({player:args.p_player,expected:args.p_expected});
    if(!row||row.revision!==args.p_expected)return {data:false,error:null};
    farms.set(args.p_player,{...row,state:structuredClone(args.p_state),receipts:args.p_receipts,revision:row.revision+1});return {data:true,error:null};
   }
   return {data:null,error:null};
  }
 };
 const source=stripTypeScriptTypes(SOURCE.replace(/^import .*;\n/gm,'')).replace('const TIMING_SHARE=0.05;',`const TIMING_SHARE=${timing?1:0};`);
 vm.runInNewContext(source,{...rules,...invites,...playerLog,welcomeSummary,savePlayerAvatar,isSuperadmin:()=>false,isAdminAccount:()=>false,readReloadAfter:async()=>null,readXpWeekend:async()=>null,createClient:()=>admin,
  Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response,atob,crypto,Uint32Array,console:consoleLog?{error(){},log:(...a)=>logs.push(a.join(' '))}:{error(){}},
  handleFamily:()=>{throw new Error('unexpected');},handlePlayerDirectory:()=>{throw new Error('unexpected');}});
 return {farms,events,logs,commits,
  async send(body,{token=tokenFor(A),raw}={}){
   const r=await handler(new Request('https://test.invalid/farm-api',{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{},body:raw??JSON.stringify(body)}));
   return {status:r.status,data:await r.json()};
  }};
}
const harvest={operation:'action',requestId:'11111111-1111-4111-8111-111111111111',action:{type:'field',id:0,action:'harvest'}};

test('a tap: the session, the profile and the farm are asked beside the account check, each once; the answer is that farmer\'s farm',async()=>{
 const api=farmApi(),r=await api.send(harvest);
 assert.equal(r.status,200,JSON.stringify(r.data));
 const answered=api.events.indexOf('getUser answered');
 for(const asked of ['session A','player_stats A','player_farms A'])assert.ok(api.events.indexOf(asked)>-1&&api.events.indexOf(asked)<answered,`${asked} went out before the account check came back: ${api.events.join(', ')}`);
 assert.deepEqual(api.events.filter(e=>e!=='getUser asked'&&e!=='getUser answered').sort(),['player_farms A','player_stats A','session A'],'nothing asked twice');
 assert.deepEqual(api.commits,[{player:A,expected:3}]);
 assert.equal(r.data.profile.player_id,A);assert.equal(r.data.revision,4);assert.ok(r.data.result,'the harvest itself');
 assert.equal(api.farms.get(A).revision,4,'saved');assert.equal(api.farms.get(B).revision,40,'nobody else touched');
});

test('the farm loads the same way: one read of each, beside the account check',async()=>{
 const api=farmApi(),r=await api.send({operation:'load'});
 assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.profile.player_id,A);
 const answered=api.events.indexOf('getUser answered');
 assert.ok(api.events.indexOf('player_farms A')<answered&&api.events.indexOf('player_stats A')<answered);
 assert.equal(api.events.filter(e=>e==='player_farms A').length,1);assert.equal(api.events.filter(e=>e==='player_stats A').length,1);
});

test('a token that names another farmer than the verified account: nothing read early is used, all is asked again for the account',async()=>{
 const api=farmApi({verified:user(A)}),r=await api.send(harvest,{token:tokenFor(B)});
 assert.equal(r.status,200,JSON.stringify(r.data));
 assert.ok(api.events.includes('player_farms B'),'B was read early');
 const answered=api.events.indexOf('getUser answered');
 for(const again of ['session A','player_stats A','player_farms A'])assert.ok(api.events.indexOf(again)>answered,`${again} asked after the account check`);
 assert.deepEqual(api.commits,[{player:A,expected:3}],'A\'s own farm and revision, never B\'s');
 assert.equal(r.data.profile.player_id,A);assert.equal(r.data.profile.username,'Anna');
 assert.equal(api.farms.get(B).revision,40);assert.ok(!JSON.stringify(r.data).includes('Bram'),'nothing of B in the answer');
});

test('an account that does not verify, or a session that ended: refused as before, nothing read early in the answer, nothing saved',async()=>{
 const bad=farmApi({authError:{message:'invalid JWT'}}),r=await bad.send(harvest);
 assert.deepEqual([r.status,r.data],[401,{error:'Please sign in with your account.'}]);assert.deepEqual(bad.commits,[]);
 const anonymous=farmApi({verified:{...user(A),is_anonymous:true}}),a=await anonymous.send(harvest);
 assert.deepEqual([a.status,a.data],[401,{error:'Please sign in with your account.'}]);assert.deepEqual(anonymous.commits,[]);
 const ended=farmApi({sessionActive:false}),e=await ended.send(harvest);
 assert.deepEqual([e.status,e.data],[401,{error:'Your session has ended. Please sign in again.'}]);assert.deepEqual(ended.commits,[]);
 const noSession=farmApi(),n=await noSession.send(harvest,{token:tokenFor(A,'')});
 assert.deepEqual([n.status,n.data],[401,{error:'Your session has ended. Please sign in again.'}]);
 assert.ok(!noSession.events.some(e=>e.startsWith('player_')),'no session in the token: nothing is read early');
 const none=farmApi(),x=await none.send(harvest,{token:''});
 assert.deepEqual([x.status,x.data],[401,{error:'Please sign in.'}]);assert.deepEqual(none.events,[]);
 const garbage=farmApi(),g=await garbage.send(harvest,{token:'not-a-token'});
 assert.equal(g.status,401,'a token that cannot be read is refused by the account check, not a server error');assert.ok(!garbage.events.some(e=>e.startsWith('player_')));
});

test('a body that is too large, no JSON or no known request is refused after the account check, as before; other operations read no farm early',async()=>{
 const big=farmApi(),b=await big.send(null,{raw:JSON.stringify({operation:'load',pad:'x'.repeat(5000)})});
 assert.deepEqual([b.status,b.data],[413,{error:'Request is too large.'}]);assert.ok(!big.events.some(e=>e.startsWith('player_')),'nothing read for a request that is refused');
 const notJson=farmApi(),j=await notJson.send(null,{raw:'{not json'});
 assert.deepEqual([j.status,j.data],[400,{error:'Invalid request.'}]);assert.ok(!notJson.events.some(e=>e.startsWith('player_')));
 for(const raw of ['null','"load"','7','{}','{"operation":"nonsense"}']){
  const bad=farmApi(),r=await bad.send(null,{raw});
  assert.deepEqual([r.status,r.data],[400,{error:'Unknown request.'}],raw);assert.ok(!bad.events.some(e=>e.startsWith('player_')),raw);
 }
 const unauthorised=farmApi({authError:{message:'invalid JWT'}}),u=await unauthorised.send(null,{raw:'{not json'});
 assert.equal(u.status,401,'the account check still answers first');
 const rename=farmApi(),n=await rename.send({operation:'rename',username:'x'});
 assert.equal(n.status,400);assert.equal(rename.events.filter(e=>e.startsWith('player_farms')).length,0,'a rename opens no farm');
 assert.equal(rename.events.filter(e=>e==='player_stats A').length,1,'and reads the profile once, after the account check');
 assert.ok(rename.events.indexOf('player_stats A')>rename.events.indexOf('getUser answered'));
});

test('opening the game: the staff\'s gifts, the invited friends and the email check go out together; the gift and the bonus as before',async()=>{
 const gift={id:'00000000-0000-4000-8000-00000000d001',coins:150,diamonds:2,message:'Thanks for playing!',per_level:false};
 const api=farmApi({donations:[gift],emailChecked:true}),r=await api.send({operation:'load'});
 assert.equal(r.status,200,JSON.stringify(r.data));
 const asked=['staff_donations asked','referrals asked','email asked'].map(e=>api.events.indexOf(e)),firstAnswer=Math.min(...['staff_donations answered','referrals answered','email answered'].map(e=>api.events.indexOf(e)));
 assert.ok(asked.every(i=>i>=0&&i<firstAnswer),`all three out before the first answer: ${api.events.join(', ')}`);
 assert.equal(r.data.gift.coins,150);assert.equal(r.data.gift.diamonds,2,'a Google account gets the email bonus quietly: only the staff\'s diamonds');assert.equal(r.data.gift.message,'Thanks for playing!');
 assert.ok(r.data.state.emailBonus,'the email bonus paid');
 // A farm that has its bonus asks no more.
 const again=farmApi();again.farms.get(A).state.emailBonus=NOW;await again.send({operation:'load'});assert.ok(!again.events.includes('email asked'));
});
test('one load in 20 logs its steps too: account, profile, farm and the extras read beside it',async()=>{
 const timed=farmApi({timing:true});await timed.send({operation:'load'});
 const line=JSON.parse(timed.logs.find(l=>l.includes('"timing":"load"')));
 assert.deepEqual(Object.keys(line).filter(k=>['auth','profile','farm','extras'].includes(k)),['auth','profile','farm','extras']);
 assert.ok(line.extras>=line.farm&&line.farm>=line.auth);assert.doesNotMatch(JSON.stringify(line),/[0-9a-f]{8}-[0-9a-f]{4}-/);
});
test('one action in 20 logs its steps in order, in ms from the start, with no player in it; the others log nothing',async()=>{
 const timed=farmApi({timing:true});await timed.send(harvest);
 assert.equal(timed.logs.length,1,timed.logs.join('\n'));
 const line=JSON.parse(timed.logs[0]);
 assert.equal(line.timing,'action');assert.equal(line.type,'field');assert.equal(line.attempt,0);
 const steps=['auth','profile','farm','apply','commit','reply'];
 assert.deepEqual(Object.keys(line).filter(k=>steps.includes(k)),steps);
 for(let i=1;i<steps.length;i++)assert.ok(line[steps[i]]>=line[steps[i-1]],`${steps[i]} after ${steps[i-1]}`);
 assert.doesNotMatch(timed.logs[0],/[0-9a-f]{8}-[0-9a-f]{4}-/,'no player id');
 const quiet=farmApi();await quiet.send(harvest);assert.deepEqual(quiet.logs,[]);
 // A log that cannot be written never costs the tap (a run without console.log once turned it into a 503).
 const mute=farmApi({timing:true,consoleLog:false}),m=await mute.send(harvest);assert.equal(m.status,200);assert.equal(mute.farms.get(A).revision,4);
 assert.match(SOURCE,/const TIMING_SHARE=0\.05;/,'one in 20 live');
});

test('the account check itself is unchanged: the verified account, the admin\'s sign-in methods only after it',()=>{
 assert.ok(SOURCE.indexOf('.signInMethods=')>SOURCE.indexOf('await admin.auth.getUser(token)'));
 assert.match(SOURCE,/const mine=early&&user\.id===named\?early:null;/,'early answers only for that same player');
 assert.match(SOURCE,/const active=await \(mine\?\.session\?\?admin\.rpc\('harvest_session_active',\{p_player:user\.id,p_session:claims\.session_id\}\)\);/);
 assert.match(SOURCE,/const FARM_OPERATIONS=new Set\(\['load','action','family','family_profile','invite'\]\);/);
});
// 30 Oct 2026: an own family emblem (a 100 KB picture as base64) is the one request past 4 KB that gets in; a load that big still does not.
test('an own emblem upload of a full 100 KB picture gets past the size check; other requests keep 4 KB',async()=>{
 const api=farmApi(),r=await api.send(null,{raw:JSON.stringify({operation:'action',requestId:'3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b',action:{type:'family_emblem_upload',image:'A'.repeat(136536)}})});
 assert.notEqual(r.status,413,JSON.stringify(r.data).slice(0,120));
 const load=farmApi(),l=await load.send(null,{raw:JSON.stringify({operation:'load',pad:'x'.repeat(136536)})});
 assert.deepEqual([l.status,l.data],[413,{error:'Request is too large.'}]);
});
// 30 Oct 2026: reporting an own emblem answered "Unknown request.": the two new operations were missing from the list farm-api knows.
test('the emblem report and the staff emblem list are requests farm-api knows',async()=>{
 for(const body of [{operation:'family_emblem_report',familyId:'707c9d10-78be-4f9a-8d3b-a25f25477278'},{operation:'admin_family_emblems'}]){
  const api=farmApi(),r=await api.send(body);
  assert.notDeepEqual(r.data,{error:'Unknown request.'},body.operation);
 }
});
