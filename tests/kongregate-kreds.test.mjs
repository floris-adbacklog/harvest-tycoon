// Kreds on Kongregate (15 Oct 2026, the owner: built now, switched on once Kongregate allows the game its Virtual Goods API). The server
// half: Kongregate's server API (game/kongregate-api.js), the row each item instance goes to (game/payments.js kongPlan), diamond-checkout's
// create and kong_claim run for real with stand-ins, both switches, and the SQL as text. The page half: Kongregate's purchase window and
// prices (src/kongregate-link.js), the page's shop (src/kongregate-kreds.js, src/kongregate-page.js), prices and worth in Kreds, the
// shop's marks in the farm, the wiki and the admin's list.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import * as payments from '../game/payments.js';
import * as kongApi from '../game/kongregate-api.js';
import * as checkoutSession from '../supabase/functions/diamond-checkout/checkout-session.js';
import {createKongregateLink,localStandIn,PURCHASE_WAIT} from '../src/kongregate-link.js';
import {createKredsShop,kredsPrices,kredsCatalog,KREDS_TEXT,PRICES_KEPT,CLAIM_GAP} from '../src/kongregate-kreds.js';
import {runKongregatePage,SELLS_KREDS} from '../src/kongregate-page.js';
import {portalOff,portalSells,PORTAL_FEATURES} from '../public/portal.js';
import {shopPrice,shopWorth} from '../public/android.js';
import {passPaidBox,passValueLine} from '../public/pass-ui.js';
import {diamondPackCards} from '../public/boosts-ui.js';
import {wikiArticle,WIKI_TOPICS} from '../public/wiki-content.js';
import {createPortalUI} from '../src/portal-ui.js';
import {handleAdminPurchases} from '../supabase/functions/farm-api/admin-analytics-service.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const FARMER='0000000a-0000-4000-8000-000000000000',OTHER='0000000b-0000-4000-8000-000000000000';
const ROW='3333333a-0000-4000-8000-00000000000a',ROW2='3333333b-0000-4000-8000-00000000000b',THEIRS='3333333c-0000-4000-8000-00000000000c',REQ='2222222a-0000-4000-8000-00000000000b';
const KONG='1480702',TOKEN='tok-lord',KEY='kong-api-key-123';
const KG_USER={id:FARMER,email:'kg-1480702@players.harvesttycoon.com',app_metadata:{provider:'email',portal:'kongregate',guest:false,kongregate_id:KONG}};
const ON={KONG_PAYMENTS_ENABLED:'true',KONGREGATE_API_KEY:KEY};
const quiet={error(){},log(){}};

// ---- Kongregate's server, as its docs and a live check (15 Oct 2026) describe it: a problem is HTTP 200 with success:false ----
function fakeKongregate({inventory=[],prices={diamonds_150:20,diamonds_500:50,diamonds_1250:100,diamonds_3500:250,starter_pack:30,special_offer:50,halloween_pass_2026:50},
 users={[KONG]:TOKEN},down=false,status=null,useFails=false}={}){
 const calls=[],held=inventory.map(i=>({remaining_uses:1,data:null,...i}));
 const reply=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 async function fetchImpl(url,init={}){
  const u=new URL(url),path=u.pathname.replace('/api/','');
  const q=init.method==='POST'?JSON.parse(init.body):Object.fromEntries(u.searchParams);
  calls.push({path,method:init.method,q,signal:init.signal});
  if(down)throw new TypeError('fetch failed');
  if(status)return new Response('<html>busy</html>',{status});
  if(q.api_key!==KEY)return reply(path==='authenticate.json'?{success:false,error:403,error_description:'Invalid credentials'}:{success:false,error:400,error_description:'Required: game_id'});
  if(path==='authenticate.json')return reply(users[q.user_id]===q.game_auth_token?{success:true,username:'LordSmatchington',user_id:Number(q.user_id)}:{success:false,error:403,error_description:'Invalid credentials'});
  if(path==='user_items.json')return reply({success:true,items:String(q.user_id)===KONG?held.filter(i=>i.remaining_uses!==0).map(i=>({...i,name:i.identifier,description:''})):[]});
  if(path==='use_item.json'){
   const found=held.find(i=>i.id===q.id);
   if(useFails||!found||found.remaining_uses===0||users[String(q.user_id)]!==q.game_auth_token)return reply({success:false,error:403,error_description:'Invalid credentials'});
   found.remaining_uses--;return reply({success:true,remaining_uses:found.remaining_uses,usage_record_id:7000+found.id});
  }
  if(path==='items.json')return reply({success:true,items:Object.entries(prices).map(([identifier,price],id)=>({id,identifier,name:identifier,description:'',price,tags:[]}))});
  return new Response('<html>not found</html>',{status:404});
 }
 return {fetchImpl,calls,held,used:()=>calls.filter(c=>c.path==='use_item.json').map(c=>c.q.id)};
}

test('Kongregate\'s server API: inventory, use and prices from our server only, success always checked, a no apart from "try again"',async()=>{
 const k=fakeKongregate({inventory:[{id:501,identifier:'diamonds_500',data:ROW},{id:'502',identifier:'starter_pack',remaining_uses:null},{id:-1,identifier:'x'},{identifier:'no-id'}]});
 const items=await kongApi.kongUserItems({userId:KONG,apiKey:KEY,fetchImpl:k.fetchImpl});
 assert.deepEqual(items,[{id:501,identifier:'diamonds_500',data:ROW,remaining:1},{id:502,identifier:'starter_pack',data:null,remaining:null}],'an instance id is a whole number above 0; null: unlimited');
 assert.deepEqual(k.calls[0].q,{api_key:KEY,user_id:KONG});assert.equal(k.calls[0].method,'GET');assert.ok(k.calls[0].signal,'5 seconds at most');
 assert.deepEqual(await kongApi.kongUseItem({userId:KONG,token:TOKEN,apiKey:KEY,id:501,fetchImpl:k.fetchImpl}),{usage:7501});
 const use=k.calls.at(-1);assert.equal(use.method,'POST');assert.deepEqual(use.q,{api_key:KEY,user_id:1480702,game_auth_token:TOKEN,id:501},'the reference: a JSON body, numbers');
 await assert.rejects(()=>kongApi.kongUseItem({userId:KONG,token:TOKEN,apiKey:KEY,id:501,fetchImpl:k.fetchImpl}),kongApi.KongregateRefused,'used up already: Kongregate says no');
 assert.equal((await kongApi.kongItemPrices({apiKey:KEY,fetchImpl:k.fetchImpl})).diamonds_500,50);
 // HTTP 200 with success:false (a wrong key: 'Required: game_id') is a no; 5xx, 429 and no answer are "try again".
 await assert.rejects(()=>kongApi.kongUserItems({userId:KONG,apiKey:'wrong',fetchImpl:k.fetchImpl}),error=>error instanceof kongApi.KongregateRefused&&error.reason==='status 400');
 for(const options of [{status:503},{status:429},{down:true}])await assert.rejects(()=>kongApi.kongUserItems({userId:KONG,apiKey:KEY,fetchImpl:fakeKongregate(options).fetchImpl}),error=>error.transient===true,JSON.stringify(options));
 await assert.rejects(()=>kongApi.kongUserItems({userId:KONG,apiKey:KEY,fetchImpl:async()=>new Response('{"success":true}')}),error=>error.transient===true,'no items list: not a yes');
 assert.equal(kongApi.REFUSED_TEXT,'Your Kongregate sign-in could not be checked. Please reload the game.');
 for(const [value,id] of [[5,5],['12',12],[0,null],['0',null],[1.5,null],['1e3',null],['9'.repeat(16),null]])assert.equal(kongApi.kongItemId(value),id,String(value));
 // Never from the game: the key and the server API only on the server.
 for(const file of ['src/kongregate-kreds.js','src/kongregate-link.js','src/kongregate-page.js','src/kongregate.js'])assert.doesNotMatch(read(file),/api_key|KONGREGATE_API_KEY|user_items|use_item|api\.kongregate\.com/,file);
});

test('the copies: Kongregate\'s server API synced into kongregate-auth and diamond-checkout, byte for byte; payments.js as before',()=>{
 const sync=read('scripts/sync-game.mjs');
 assert.match(sync,/for\(const name of \['kongregate-auth','diamond-checkout'\]\)copyFileSync\(new URL\('\.\.\/game\/kongregate-api\.js',import\.meta\.url\),new URL\(`\.\.\/supabase\/functions\/\$\{name\}\/kongregate-api\.js`,import\.meta\.url\)\);/);
 for(const fn of ['kongregate-auth','diamond-checkout'])assert.equal(read(`supabase/functions/${fn}/kongregate-api.js`),read('game/kongregate-api.js'),fn);
 for(const fn of ['diamond-checkout','stripe-webhook','play-voided','app-store-notify'])assert.equal(read(`supabase/functions/${fn}/payments.js`),read('game/payments.js'),fn);
 assert.doesNotMatch(read('game/kongregate-api.js'),/\bimport\b/,'no dependencies: Deno and Node alike');
 assert.match(read('supabase/functions/diamond-checkout/index.ts'),/import \{kongId,kongToken,KongregateRefused,REFUSED_TEXT,verifyKongregate,kongUserItems,kongUseItem,kongItemPrices\} from '\.\/kongregate-api\.js';/);
});

// ---- Which row an item instance goes to (game/payments.js kongPlan) ----
const row=(over={})=>({id:ROW,player_id:FARMER,pack:'500',diamonds:500,coins:0,amount_cents:499,price_id:'diamonds_500',store:'kongregate',status:'pending',livemode:true,vip_days:0,
 kong_item_id:null,kong_usage_id:null,created_at:new Date(Date.now()-60000).toISOString(),...over});
test('kongPlan: credited once, the row in the data first, else the oldest; a new row only for a diamond pack; never another farmer\'s',()=>{
 assert.deepEqual(payments.KONG_PRODUCTS,payments.PLAY_PRODUCTS,'the identifiers in Manage Items are the Google Play product ids');
 assert.deepEqual(Object.values(payments.KONG_PRODUCTS),['diamonds_150','diamonds_500','diamonds_1250','diamonds_3500','starter_pack','special_offer','halloween_pass_2026']);
 assert.equal(payments.kongPack('starter_pack'),'starter');assert.equal(payments.kongPack('sword'),null);assert.equal(payments.kongProduct('500'),'diamonds_500');
 const kinds=plan=>plan.map(s=>[s.instance.id,s.kind,s.row?.id??s.pack]);
 const older=row({id:ROW2,created_at:new Date(Date.now()-120000).toISOString()});
 // The data names this farmer's row: that one, even when an older one waits.
 assert.deepEqual(kinds(payments.kongPlan([{id:9,identifier:'diamonds_500',data:ROW.toUpperCase()}],{player:FARMER,rows:[older,row()]})),[[9,'credit',ROW]]);
 // No (or a strange) data: the oldest open row of that product.
 assert.deepEqual(kinds(payments.kongPlan([{id:9,identifier:'diamonds_500',data:'+1str'}],{player:FARMER,rows:[older,row()]})),[[9,'credit',ROW2]]);
 // Two instances, two rows; a third diamond pack gets a new row; a pass with no row is left alone.
 assert.deepEqual(kinds(payments.kongPlan([{id:12,identifier:'diamonds_500'},{id:11,identifier:'diamonds_500'},{id:10,identifier:'diamonds_500'},{id:13,identifier:'halloween_pass_2026'},{id:14,identifier:'sword'},{id:11,identifier:'diamonds_500'}],{player:FARMER,rows:[older,row()]})),
  [[10,'credit',ROW2],[11,'credit',ROW],[12,'new','500'],[13,'leave','pass']],'lowest instance first; not ours and doubles left out');
 // Credited before: only used up again.
 assert.deepEqual(kinds(payments.kongPlan([{id:9,identifier:'diamonds_500',data:ROW}],{player:FARMER,claimed:[row({status:'credited',kong_item_id:9})],rows:[row()]})),[[9,'use',ROW]]);
 // A special offer or pass with no row named (15 Oct 2026 review): the newest open one (an older one may be an offer that has ended);
 // the row named still comes first, and a second one still finds a row, so paid Kreds are never left without one.
 const offerRow=(id,ago,offer)=>row({id,pack:'offer',price_id:'special_offer',offer_id:offer,created_at:new Date(Date.now()-ago).toISOString()});
 const offers=[offerRow(ROW2,120000,'offer-old'),offerRow(ROW,60000,'offer-new')];
 assert.deepEqual(kinds(payments.kongPlan([{id:9,identifier:'special_offer'}],{player:FARMER,rows:offers})),[[9,'credit',ROW]]);
 assert.deepEqual(kinds(payments.kongPlan([{id:9,identifier:'special_offer',data:ROW2}],{player:FARMER,rows:offers})),[[9,'credit',ROW2]]);
 assert.deepEqual(kinds(payments.kongPlan([{id:9,identifier:'special_offer'},{id:10,identifier:'special_offer'}],{player:FARMER,rows:offers})),[[9,'credit',ROW],[10,'credit',ROW2]]);
 const passes=[ROW2,ROW].map((id,i)=>row({id,pack:'pass',price_id:'halloween_pass_2026',diamonds:0,pass_id:payments.PASS.id,created_at:new Date(Date.now()-(2-i)*60000).toISOString()}));
 assert.deepEqual(kinds(payments.kongPlan([{id:9,identifier:'halloween_pass_2026'}],{player:FARMER,rows:passes})),[[9,'credit',ROW]]);
 // Another farmer's row, another product's row, a row with another instance or of another store: never.
 for(const theirs of [row({player_id:OTHER}),row({pack:'150',price_id:'diamonds_150',diamonds:150,amount_cents:199}),row({kong_item_id:8}),row({store:'stripe'}),row({status:'credited'})])
  assert.deepEqual(kinds(payments.kongPlan([{id:9,identifier:'diamonds_500',data:ROW}],{player:FARMER,rows:[theirs]})),[[9,'new','500']],JSON.stringify(theirs));
 assert.deepEqual(kinds(payments.kongPlan([{id:9,identifier:'starter_pack',data:THEIRS}],{player:FARMER,rows:[row({id:THEIRS,player_id:OTHER,pack:'starter',price_id:'starter_pack'})]})),[[9,'leave','starter']]);
 // The row's contents are its pack's, as for Google Play and Apple.
 assert.doesNotThrow(()=>payments.checkKongPurchase(row(),{product:'diamonds_500',player:FARMER}));
 for(const bad of [row({diamonds:5000}),row({player_id:OTHER}),row({store:'app_store'}),row({pack:'pass',price_id:'diamonds_500'})])assert.throws(()=>payments.checkKongPurchase(bad,{product:'diamonds_500',player:FARMER}),/mismatch/,JSON.stringify(bad));
 assert.doesNotThrow(()=>payments.checkKongPurchase(row({pack:'pass',price_id:'halloween_pass_2026',diamonds:0,amount_cents:499,pass_id:payments.PASS.id}),{product:'halloween_pass_2026',player:FARMER}));
 assert.throws(()=>payments.checkKongPurchase(row({pack:'offer',price_id:'special_offer',offer_id:'nope',diamonds:5000}),{product:'special_offer',player:FARMER}),/Offer mismatch/);
 // The switch and the test accounts.
 for(const [flag,on] of [['true',true],[' true\n',true],['TRUE',false],['yes',false],['1',false],['',false],[undefined,false],['false',false]])assert.equal(payments.kongPaymentsEnabled(flag),on,String(flag));
 assert.deepEqual([...payments.kongTestUsers(' 1480702, 42,x,0,,')],['1480702','42']);assert.equal(payments.kongTestUsers(undefined).size,0);
 for(const [value,kreds] of [[50,50],[0,null],[100001,null],[1.5,null],['50',null],[undefined,null]])assert.equal(payments.kongKreds(value),kreds,String(value));
});

// ---- diamond-checkout, run for real with stand-ins for Supabase and Kongregate ----
// A stand-in for Supabase: tables of rows, the queries diamond-checkout makes, and the Kreds functions as the SQL does them (enough for
// the flow; the SQL itself is checked as text below).
function fakeDb(tables,{fail,onRpc}={}){
 const calls=[];
 const from=table=>{
  const q={filters:[],op:'select',sort:null};
  const run=()=>{
   const list=tables[table]??=[];
   if(q.op==='insert'){calls.push([table,'insert',q.value]);if(list.some(r=>r.id===q.value.id||q.value.pack==='starter'&&r.pack==='starter'&&r.player_id===q.value.player_id&&r.livemode===q.value.livemode&&r.status!=='expired'))return {error:{code:'23505'}};
    const added={status:'pending',store:'stripe',created_at:new Date().toISOString(),kong_item_id:null,kong_usage_id:null,...q.value};list.push(added);return {data:[{...added}],error:null};}
   let hit=list.filter(r=>q.filters.every(f=>f(r)));
   if(q.sort)hit=[...hit].sort((a,b)=>(a[q.sort.k]<b[q.sort.k]?-1:a[q.sort.k]>b[q.sort.k]?1:0)*(q.sort.up?1:-1));
   if(q.op==='update'){calls.push([table,'update',q.value]);for(const r of hit)Object.assign(r,q.value);}
   return {data:hit.map(r=>({...r})),error:null};
  };
  Object.assign(q,{select(){return q;},eq(k,v){q.filters.push(r=>r[k]===v);return q;},neq(k,v){q.filters.push(r=>r[k]!==v);return q;},in(k,v){calls.push([table,'in',k,v]);q.filters.push(r=>v.includes(r[k]));return q;},
   is(k,v){q.filters.push(r=>(r[k]??null)===v);return q;},lte(){return q;},gt(){return q;},order(k,{ascending=true}={}){q.sort={k,up:ascending};return q;},limit(){return q;},
   insert(v){q.op='insert';q.value=v;return q;},update(v){q.op='update';q.value=v;return q;},
   async maybeSingle(){const r=run();return r.error?r:{data:r.data[0]??null,error:null};},
   async single(){const r=run();return r.error?r:r.data.length===1?{data:r.data[0],error:null}:{data:null,error:{code:'PGRST116'}};},
   then(resolve,reject){try{resolve(run());}catch(e){reject(e);}}});
  return q;
 };
 async function rpc(name,args){
  calls.push([name,args]);
  if(name==='harvest_session_active')return {data:true,error:null};
  if(name===fail)return {data:null,error:{code:'XX000',message:'database down'}};
  // As supabase/kongregate-kreds.sql harvest_kong_claim_slot: this farmer's own Kongregate user, p_gap_ms apart, p_max an hour.
  if(name==='harvest_kong_claim_slot'){
   const account=(tables.kongregate_accounts??[]).find(a=>String(a.kong_user_id)===String(args.p_user)&&a.player_id===args.p_player);
   if(!account)return {data:'other',error:null};
   const now=Date.now(),fresh=account.kreds_claims_from==null||account.kreds_claims_from<=now-3600000;
   if(account.kreds_claim_at!=null&&account.kreds_claim_at>now-args.p_gap_ms||!fresh&&account.kreds_claims>=args.p_max)return {data:'busy',error:null};
   Object.assign(account,{kreds_claim_at:now,kreds_claims:fresh?1:account.kreds_claims+1,kreds_claims_from:fresh?now:account.kreds_claims_from});
   return {data:'ok',error:null};
  }
  onRpc?.(name,args,tables);
  const rows=tables.harvest_purchases;
  if(name==='harvest_credit_kong_purchase'){
   const r=rows.find(x=>x.id===args.p_purchase);
   if(!r)return {data:null,error:{message:'Unknown purchase'}};
   if(r.kong_item_id!=null&&r.kong_item_id!==args.p_item)return {data:null,error:{message:'Payment mismatch'}};
   if(['credited','test_paid','refunded'].includes(r.status))return {data:{status:r.status,duplicate:true},error:null};
   if(r.store!=='kongregate'||r.price_id!==args.p_product)return {data:null,error:{message:'Payment mismatch'}};
   if(rows.some(x=>x.kong_item_id===args.p_item&&x.id!==r.id))return {data:{status:r.status,duplicate:true,other:true},error:null};
   Object.assign(r,{status:'credited',kong_item_id:args.p_item,kong_user_id:args.p_user,kreds:args.p_kreds,livemode:!args.p_test});
   return {data:{status:'credited',duplicate:false},error:null};
  }
  if(name==='harvest_credit_kong_pack'){
   if(rows.some(x=>x.kong_item_id===args.p_item))return {data:{status:'credited',duplicate:true},error:null};
   const pack=payments.PAYMENT_PACKS[args.p_pack],id=crypto.randomUUID();
   rows.push({id,player_id:args.p_player,pack:args.p_pack,diamonds:pack.diamonds,coins:0,amount_cents:pack.cents,price_id:`diamonds_${args.p_pack}`,livemode:!args.p_test,store:'kongregate',status:'credited',
    kong_item_id:args.p_item,kong_user_id:args.p_user,kreds:args.p_kreds,created_at:new Date().toISOString()});
   return {data:{id,status:'credited',duplicate:false},error:null};
  }
  throw new Error(`unexpected rpc ${name}`);
 }
 return {calls,from,rpc,tables,credits:()=>calls.filter(c=>c[0].startsWith('harvest_credit_kong')).map(c=>[c[0],{...c[1]}])};
}
const sessionToken=`x.${Buffer.from(JSON.stringify({session_id:'s'})).toString('base64url')}.y`;
const mapping=()=>[{kong_user_id:KONG,player_id:FARMER}];
async function checkout(body,{tables={},user=KG_USER,env=ON,kong=fakeKongregate(),fail,onRpc}={}){
 let handler;const db=fakeDb(structuredClone({kongregate_accounts:mapping(),harvest_purchases:[],player_farms:[{player_id:FARMER,offer:{unlockedAt:Date.now()-3600000}}],...tables}),{fail,onRpc}),logs=[];
 const admin={auth:{async getUser(){return {data:{user:structuredClone(user)},error:null};}},from:db.from,rpc:db.rpc};
 const source=stripTypeScriptTypes(read('supabase/functions/diamond-checkout/index.ts').replace(/^import .*;\n/gm,''));
 const via=fn=>options=>fn({...options,fetchImpl:kong.fetchImpl});
 vm.runInNewContext(source,{...payments,...checkoutSession,...kongApi,verifyKongregate:via(kongApi.verifyKongregate),kongUserItems:via(kongApi.kongUserItems),kongUseItem:via(kongApi.kongUseItem),kongItemPrices:via(kongApi.kongItemPrices),
  crypto:globalThis.crypto,serviceAccount:()=>null,getPurchase:async()=>{throw new Error('no Google here');},consumePurchase:async()=>{throw new Error('no Google here');},verifyAppleJws:async()=>{throw new Error('no Apple here');},
  Stripe:class{constructor(){throw new Error('no Stripe for Kreds');}},createClient:()=>admin,Deno:{env:{get:name=>env[name]??''},serve:fn=>handler=fn},Response,JSON,Date,Object,Promise,Error,Boolean,String,atob,
  console:{error:(...a)=>logs.push(a.map(String).join(' ')),log(){}}});
 const r=await handler(new Request('https://test.invalid/diamond-checkout',{method:'POST',headers:{Authorization:`Bearer ${sessionToken}`},body:JSON.stringify(body)}));
 return {status:r.status,data:await r.json(),db,kong,logs,rows:db.from&&(await db.from('harvest_purchases').select('*')).data};
}
const claimBody=(over={})=>({operation:'kong_claim',store:'kongregate',kong_user_id:KONG,game_auth_token:TOKEN,...over});

test('kong_claim: this farmer\'s Kongregate user and token checked with Kongregate, the item credited exactly once, then used up there',async()=>{
 const kong=fakeKongregate({inventory:[{id:501,identifier:'diamonds_500',data:ROW}]});
 const r=await checkout(claimBody(),{tables:{harvest_purchases:[row()]},kong});
 assert.deepEqual([r.status,r.data],[200,{credited:[ROW],waiting:0}]);
 assert.deepEqual(r.db.credits(),[['harvest_credit_kong_purchase',{p_purchase:ROW,p_item:501,p_user:1480702,p_kreds:50,p_product:'diamonds_500',p_test:false}]],'its price in Kreds kept for the books');
 const [paid]=r.rows;assert.deepEqual([paid.status,paid.kong_item_id,paid.livemode,paid.kong_usage_id],['credited',501,true,7501],'credited live, used up at Kongregate, the usage record kept');
 assert.deepEqual(kong.calls.slice(0,2).map(c=>c.path).sort(),['authenticate.json','user_items.json'],'the token and the inventory asked at the same time');
 assert.deepEqual(kong.used(),[501]);assert.equal(kong.held[0].remaining_uses,0);
 // Asked again (the page, a second tab): nothing left at Kongregate, nothing credited twice.
 const again=await checkout(claimBody(),{tables:{harvest_purchases:r.rows},kong});
 assert.deepEqual(again.data,{credited:[],waiting:0});assert.deepEqual(again.db.credits(),[]);
 // Nothing of ours at Kongregate: no database look-up at all.
 const none=await checkout(claimBody(),{kong:fakeKongregate({inventory:[{id:7,identifier:'sword'}]})});
 assert.deepEqual(none.data,{credited:[],waiting:0});assert.ok(!none.db.calls.some(c=>c[0]==='harvest_purchases'));
});

test('kong_claim: an item credited before is only used up again; a use that fails stays for the next claim, never a second credit',async()=>{
 const credited=row({status:'credited',kong_item_id:501});
 const kong=fakeKongregate({inventory:[{id:501,identifier:'diamonds_500',data:ROW}]});
 const r=await checkout(claimBody(),{tables:{harvest_purchases:[credited]},kong});
 assert.deepEqual(r.data,{credited:[],waiting:0});assert.deepEqual(r.db.credits(),[],'no credit');assert.deepEqual(kong.used(),[501],'only use_item retried');
 assert.equal(r.rows[0].kong_usage_id,7501);
 const failing=fakeKongregate({inventory:[{id:501,identifier:'diamonds_500',data:ROW}],useFails:true});
 const first=await checkout(claimBody(),{tables:{harvest_purchases:[row()]},kong:failing});
 assert.deepEqual(first.data,{credited:[ROW],waiting:0},'credited; the use failed');assert.ok(first.logs.some(l=>/not used up 501/.test(l)));
 assert.equal(failing.held[0].remaining_uses,1,'still at Kongregate');
 const second=await checkout(claimBody(),{tables:{harvest_purchases:first.rows},kong:failing});
 assert.deepEqual(second.db.credits(),[],'the next claim: no second credit');assert.deepEqual(failing.used(),[501,501]);
 // A claim at the same moment credited this instance on another row first: the database says duplicate, nothing is counted twice.
 const raceKong=fakeKongregate({inventory:[{id:501,identifier:'diamonds_500',data:ROW}]});
 const raced=await checkout(claimBody(),{tables:{harvest_purchases:[row()]},kong:raceKong,onRpc:(name,args,tables)=>{if(name==='harvest_credit_kong_purchase')tables.harvest_purchases.push(row({id:ROW2,status:'credited',kong_item_id:501}));}});
 assert.deepEqual(raced.data,{credited:[],waiting:0});assert.equal(raced.rows.find(x=>x.id===ROW).status,'pending','its own row stays open');assert.deepEqual(raceKong.used(),[501],'and the instance is used up');
});

test('kong_claim: another farmer\'s Kongregate user, a wrong token, data that names another farmer\'s row: never credited to them',async()=>{
 const inventory=[{id:501,identifier:'diamonds_500',data:THEIRS}];
 // The Kongregate user plays another farm: refused before anything is credited.
 const other=await checkout(claimBody(),{tables:{kongregate_accounts:[{kong_user_id:KONG,player_id:OTHER}],harvest_purchases:[row()]},kong:fakeKongregate({inventory})});
 assert.deepEqual([other.status,other.data],[403,{error:'This Kongregate account plays another farm.'}]);assert.deepEqual(other.db.credits(),[]);
 assert.equal(other.kong.calls.length,0,'our side first: Kongregate is never asked for another farmer\'s user (15 Oct 2026 review)');
 const unknown=await checkout(claimBody(),{tables:{kongregate_accounts:[]},kong:fakeKongregate({inventory})});assert.equal(unknown.status,403);assert.equal(unknown.kong.calls.length,0);
 // A token that is not this user's (Kongregate's success:false with status 200): 401, nothing credited.
 const wrong=await checkout(claimBody({game_auth_token:'stolen'}),{tables:{harvest_purchases:[row()]},kong:fakeKongregate({inventory})});
 assert.deepEqual([wrong.status,wrong.data],[401,{error:kongApi.REFUSED_TEXT}]);assert.deepEqual(wrong.db.credits(),[]);assert.deepEqual(wrong.kong.used(),[]);
 assert.ok(wrong.logs.some(l=>/refused a purchase check: credentials/.test(l)));assert.ok(!wrong.logs.some(l=>l.includes('stolen')||l.includes(KEY)),'never a token or the key in the log');
 // The data names another farmer's pending row: that row is left alone; a diamond pack gets a new row of this farmer's own.
 const theirs=row({id:THEIRS,player_id:OTHER});
 const r=await checkout(claimBody(),{tables:{harvest_purchases:[theirs]},kong:fakeKongregate({inventory})});
 assert.equal(r.status,200);assert.equal(r.data.credited.length,1);assert.notEqual(r.data.credited[0],THEIRS);
 assert.deepEqual(r.db.credits().map(c=>c[0]),['harvest_credit_kong_pack']);assert.deepEqual({...r.db.credits()[0][1]},{p_player:FARMER,p_pack:'500',p_item:501,p_user:1480702,p_kreds:50,p_test:false});
 assert.equal(r.rows.find(x=>x.id===THEIRS).status,'pending','theirs untouched');assert.equal(r.rows.find(x=>x.id===r.data.credited[0]).player_id,FARMER);
 // Bad requests: no Kongregate call at all.
 for(const body of [claimBody({kong_user_id:'0'}),claimBody({kong_user_id:'x'}),claimBody({game_auth_token:'a b'}),claimBody({game_auth_token:42})]){
  const k=fakeKongregate({inventory});const bad=await checkout(body,{kong:k});assert.equal(bad.status,400,JSON.stringify(body));assert.equal(k.calls.length,0);
 }
});

test('kong_claim: a Starter Pack, offer or pass without its row is left at Kongregate, unused and logged; nothing credited',async()=>{
 const kong=fakeKongregate({inventory:[{id:601,identifier:'starter_pack'},{id:602,identifier:'special_offer'},{id:603,identifier:'halloween_pass_2026'}]});
 const r=await checkout(claimBody(),{kong});
 assert.deepEqual(r.data,{credited:[],waiting:3});assert.deepEqual(r.db.credits(),[]);assert.deepEqual(kong.used(),[],'not used up: it can still be credited');
 assert.ok(r.logs.some(l=>/without a purchase row 601 starter_pack/.test(l)));
 // With its row (the page's create made it): the Starter Pack is credited, its window and contents from the row.
 const starter=row({pack:'starter',diamonds:500,coins:10000,amount_cents:299,price_id:'starter_pack',starter_expires_at:new Date(Date.now()+86400000).toISOString()});
 const ok=await checkout(claimBody(),{tables:{harvest_purchases:[starter]},kong:fakeKongregate({inventory:[{id:601,identifier:'starter_pack',data:ROW}]})});
 assert.deepEqual(ok.data,{credited:[ROW],waiting:0});assert.equal(ok.db.credits()[0][1].p_kreds,30);
 // A row whose contents are not its pack's is not credited (and its item stays at Kongregate).
 const odd=await checkout(claimBody(),{tables:{harvest_purchases:[{...starter,coins:99}]},kong:fakeKongregate({inventory:[{id:601,identifier:'starter_pack',data:ROW}]})});
 assert.deepEqual(odd.data,{credited:[],waiting:1});assert.deepEqual(odd.kong.used(),[]);
});

test('kong_claim: Kongregate\'s success:false, a wrong API key, Kongregate away, a database error: nothing credited, the right answer',async()=>{
 const inventory=[{id:501,identifier:'diamonds_500',data:ROW}];
 const key=await checkout(claimBody(),{tables:{harvest_purchases:[row()]},env:{...ON,KONGREGATE_API_KEY:'wrong'},kong:fakeKongregate({inventory})});
 assert.equal(key.status,401,'a wrong key: Kongregate says no to the token too');assert.deepEqual(key.db.credits(),[]);
 const noKey=await checkout(claimBody(),{env:{KONG_PAYMENTS_ENABLED:'true'},kong:fakeKongregate({inventory})});
 assert.deepEqual([noKey.status,noKey.data],[503,{error:'Purchases with Kreds are not available yet.'}]);assert.equal(noKey.kong.calls.length,0);assert.ok(noKey.logs.some(l=>/KONGREGATE_API_KEY is not set/.test(l)));
 for(const options of [{status:503},{down:true}]){
  const away=await checkout(claimBody(),{tables:{harvest_purchases:[row()]},kong:fakeKongregate({inventory,...options})});
  assert.deepEqual([away.status,away.data],[503,{error:'Kongregate could not be reached. Please try again.'}],JSON.stringify(options));assert.deepEqual(away.db.credits(),[]);
 }
 // The inventory refused alone (HTTP 200, success:false): not available, logged.
 const items=fakeKongregate({inventory});const real=items.fetchImpl;items.fetchImpl=async(url,init)=>String(url).includes('user_items')?new Response(JSON.stringify({success:false,error:400,error_description:'Required: game_id'})):real(url,init);
 const refused=await checkout(claimBody(),{tables:{harvest_purchases:[row()]},kong:items});
 assert.deepEqual([refused.status,refused.data],[503,{error:'Purchases with Kreds are not available yet.'}]);assert.ok(refused.logs.some(l=>/refused the inventory/.test(l)));
 // The prices are only for the books: without them the purchase is still credited, kreds null.
 const prices=fakeKongregate({inventory});const real2=prices.fetchImpl;prices.fetchImpl=async(url,init)=>String(url).includes('/items.json')?new Response('{"success":false,"error":500}',{status:500}):real2(url,init);
 const books=await checkout(claimBody(),{tables:{harvest_purchases:[row()]},kong:prices});
 assert.deepEqual(books.data,{credited:[ROW],waiting:0});assert.equal(books.db.credits()[0][1].p_kreds,null);
 // The credit itself fails (the database): that item waits at Kongregate, unused, and the claim still answers; the others go on.
 const broken=await checkout(claimBody(),{tables:{harvest_purchases:[row()]},fail:'harvest_credit_kong_purchase',kong:fakeKongregate({inventory:[...inventory,{id:502,identifier:'diamonds_150'}]})});
 assert.equal(broken.status,200);assert.deepEqual(broken.data.waiting,1);assert.equal(broken.data.credited.length,1,'the diamond pack without a row is still made');
 assert.deepEqual(broken.kong.used(),[502],'only what the farm has is used up');assert.ok(broken.logs.some(l=>/not credited 501 XX000/.test(l)));
});

test('kong_claim: Kongregate\'s test accounts (KONGREGATE_TEST_USERS) are credited as livemode false, like Apple\'s sandbox',async()=>{
 const r=await checkout(claimBody(),{tables:{harvest_purchases:[row()]},env:{...ON,KONGREGATE_TEST_USERS:`42, ${KONG}`},kong:fakeKongregate({inventory:[{id:501,identifier:'diamonds_500',data:ROW}]})});
 assert.deepEqual(r.data,{credited:[ROW],waiting:0});assert.equal(r.db.credits()[0][1].p_test,true);assert.equal(r.rows[0].livemode,false,'no revenue, no partner share');
 const other=await checkout(claimBody(),{tables:{harvest_purchases:[row()]},env:{...ON,KONGREGATE_TEST_USERS:'42'},kong:fakeKongregate({inventory:[{id:501,identifier:'diamonds_500',data:ROW}]})});
 assert.equal(other.rows[0].livemode,true);
 const pack=await checkout(claimBody(),{env:{...ON,KONGREGATE_TEST_USERS:KONG},kong:fakeKongregate({inventory:[{id:501,identifier:'diamonds_1250'}]})});
 assert.equal(pack.db.credits()[0][1].p_test,true);
});

test('kong_claim: our side first, once in 5 seconds and 120 times an hour per Kongregate account; only then is Kongregate asked',async()=>{
 assert.deepEqual({...payments.KONG_CLAIM_LIMIT},{gapMs:5000,perHour:120});
 const inventory=[{id:501,identifier:'diamonds_500',data:ROW}],now=Date.now();
 for(const [account,status] of [[{kreds_claim_at:now-1000},429],[{kreds_claims:120,kreds_claims_from:now-600000},429],
  [{kreds_claim_at:now-6000,kreds_claims:119,kreds_claims_from:now-600000},200],[{kreds_claim_at:now-6000,kreds_claims:120,kreds_claims_from:now-3700000},200]]){
  const k=fakeKongregate({inventory});
  const r=await checkout(claimBody(),{tables:{kongregate_accounts:[{...mapping()[0],...account}],harvest_purchases:[row()]},kong:k});
  assert.equal(r.status,status,JSON.stringify(account));
  if(status===429){assert.deepEqual(r.data,{error:'Too many checks. Please try again in a moment.'});assert.equal(k.calls.length,0,'Kongregate not asked');assert.deepEqual(r.db.credits(),[]);}
  else assert.deepEqual(r.data,{credited:[ROW],waiting:0});
 }
 // The slot is this farmer's and asked first; a claim at once after it is refused, without asking Kongregate.
 const first=await checkout(claimBody(),{tables:{harvest_purchases:[row()]},kong:fakeKongregate({inventory})});
 assert.deepEqual({...first.db.calls.find(c=>c[0]==='harvest_kong_claim_slot')[1]},{p_user:1480702,p_player:FARMER,p_gap_ms:5000,p_max:120});
 assert.equal(first.db.tables.kongregate_accounts[0].kreds_claims,1);
 const k=fakeKongregate({inventory}),again=await checkout(claimBody(),{tables:{kongregate_accounts:first.db.tables.kongregate_accounts,harvest_purchases:first.rows},kong:k});
 assert.equal(again.status,429);assert.equal(k.calls.length,0);
 const src=read('supabase/functions/diamond-checkout/index.ts'),claim=src.slice(src.indexOf('async function kongClaim'),src.indexOf('Deno.serve'));
 assert.ok(claim.indexOf("rpc('harvest_kong_claim_slot'")<claim.indexOf('verifyKongregate('),'our side before Kongregate');
 assert.doesNotMatch(claim,/from\('kongregate_accounts'\)/,'the mapping is checked in the slot itself');
});

test('kong_claim: an item Kongregate gives no price is not for sale: not credited, not used up, logged; without the price list it is',async()=>{
 const priced={diamonds_150:20,diamonds_1250:100,diamonds_3500:250};
 for(const prices of [priced,{...priced,diamonds_500:0}]){
  const kong=fakeKongregate({inventory:[{id:501,identifier:'diamonds_500',data:ROW},{id:502,identifier:'diamonds_150'}],prices});
  const r=await checkout(claimBody(),{tables:{harvest_purchases:[row()]},kong});
  assert.equal(r.data.waiting,1,JSON.stringify(prices));assert.equal(r.data.credited.length,1);assert.deepEqual(r.db.credits().map(c=>c[1].p_item),[502]);
  assert.deepEqual(kong.used(),[502]);assert.equal(r.rows.find(x=>x.id===ROW).status,'pending');assert.ok(r.logs.some(l=>/without a price 501 diamonds_500/.test(l)));
 }
 // Credited before and unpriced since: still used up at Kongregate, never credited again.
 const used=fakeKongregate({inventory:[{id:501,identifier:'diamonds_500',data:ROW}],prices:priced});
 const r=await checkout(claimBody(),{tables:{harvest_purchases:[row({status:'credited',kong_item_id:501})]},kong:used});
 assert.deepEqual(used.used(),[501]);assert.deepEqual(r.db.credits(),[]);
});

test('both switches off (today): a Kongregate account gets the same 403 for every store, Kreds included; nothing is asked of Kongregate',async()=>{
 const create={operation:'create',pack:'500',requestId:REQ};
 for(const env of [{},{KONGREGATE_API_KEY:KEY},{...ON,KONG_PAYMENTS_ENABLED:'TRUE'},{...ON,KONG_PAYMENTS_ENABLED:'yes'},{...ON,KONG_PAYMENTS_ENABLED:'false'}]){
  for(const body of [create,{...create,store:'kongregate'},{...create,store:'google_play'},{...create,store:'app_store'},claimBody()]){
   const k=fakeKongregate({inventory:[{id:501,identifier:'diamonds_500'}]});
   const r=await checkout(body,{env,kong:k});
   assert.deepEqual([r.status,r.data],[403,{error:'Purchases are not available on Kongregate.'}],`${JSON.stringify(env)} ${JSON.stringify(body)}`);
   assert.equal(k.calls.length,0);assert.deepEqual(r.db.credits(),[]);assert.ok(!r.db.calls.some(c=>c[1]==='insert'));
  }
  const catalog=await checkout({operation:'catalog',store:'kongregate'},{env});
  assert.equal(catalog.data.enabled,false,'the catalogue says closed');assert.equal(catalog.data.store,'kongregate');
 }
 // Switched on: Stripe, Google Play and the App Store stay refused for a Kongregate account.
 for(const store of [undefined,'google_play','app_store','stripe']){
  const r=await checkout({...create,...(store?{store}:{})});assert.deepEqual([r.status,r.data],[403,{error:'Purchases are not available on Kongregate.'}],String(store));
 }
});

test('store \'kongregate\' is refused for every other account: the website, CrazyGames, Discord; its catalogue is closed to them',async()=>{
 const create={operation:'create',store:'kongregate',pack:'500',requestId:REQ};
 const site={id:FARMER,email:'farmer@example.com',app_metadata:{provider:'email'}};
 assert.deepEqual((await checkout(create,{user:site})).data,{error:'Purchases with Kreds are only on Kongregate.'});
 assert.deepEqual((await checkout(claimBody(),{user:site})).data,{error:'Purchases are not available on Kongregate.'});
 assert.equal((await checkout({operation:'catalog',store:'kongregate'},{user:site})).data.enabled,false);
 assert.deepEqual((await checkout(create,{user:{...site,app_metadata:{portal:'crazygames'}}})).data,{error:'Purchases are not available on CrazyGames.'});
 assert.deepEqual((await checkout(create,{user:{...site,app_metadata:{portal:'discord'}}})).data,{error:'Purchases are not available on Discord.'});
 for(const user of [{...site,app_metadata:{portal:'crazygames'}},{...site,app_metadata:{portal:'discord'}}])assert.equal((await checkout(claimBody(),{user})).status,403);
});

test('switched on: create makes this farmer\'s pending Kongregate row (the product as its price), reusing the one Starter Pack, offer or pass',async()=>{
 const made=await checkout({operation:'create',store:'kongregate',pack:'500',requestId:REQ});
 assert.deepEqual([made.status,made.data],[200,{purchaseId:REQ,product:'diamonds_500',account:FARMER,store:'kongregate'}]);
 assert.deepEqual([made.rows[0].store,made.rows[0].price_id,made.rows[0].livemode,made.rows[0].status,made.rows[0].amount_cents],['kongregate','diamonds_500',true,'pending',499],'the euro list price, so every check stays');
 const catalog=await checkout({operation:'catalog',store:'kongregate'});
 assert.equal(catalog.data.enabled,true);assert.equal(catalog.data.store,'kongregate');assert.equal(catalog.data.starter.eligible,true);
 const starter=row({id:ROW,pack:'starter',diamonds:500,coins:10000,amount_cents:299,price_id:'starter_pack',starter_expires_at:new Date(Date.now()+86400000).toISOString()});
 const again=await checkout({operation:'create',store:'kongregate',pack:'starter',requestId:REQ},{tables:{harvest_purchases:[starter]}});
 assert.deepEqual(again.data,{purchaseId:ROW,product:'starter_pack',account:FARMER,store:'kongregate'},'the farmer\'s one Starter Pack row');
 // A row of another store never moves to Kongregate (its accounts buy nothing else), nor a Kongregate row away.
 const stripe=await checkout({operation:'create',store:'kongregate',pack:'starter',requestId:REQ},{tables:{harvest_purchases:[{...starter,store:'stripe',price_id:payments.PAYMENT_PACKS.starter.price,stripe_session_id:'cs_old'}]}});
 assert.deepEqual([stripe.status,stripe.data],[409,{error:'Start a new purchase request.'}]);
 const pass=await checkout({operation:'create',store:'kongregate',pack:'pass',requestId:REQ},{tables:{player_stats:[{player_id:FARMER,level:20}]}});
 assert.deepEqual(pass.data,payments.passOnSale()?{purchaseId:REQ,product:'halloween_pass_2026',account:FARMER,store:'kongregate'}:{error:'The Halloween Pass has ended.'});
 // The gates of the apps hold here too: the Starter Pack only in its week, the pass from its level.
 const early=await checkout({operation:'create',store:'kongregate',pack:'starter',requestId:REQ},{tables:{player_farms:[{player_id:FARMER,offer:null}]}});
 assert.equal(early.status,409);
 if(payments.passOnSale()){const low=await checkout({operation:'create',store:'kongregate',pack:'pass',requestId:REQ},{tables:{player_stats:[{player_id:FARMER,level:3}]}});assert.equal(low.status,409);}
 const src=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(src,/const kongEnabled=kongPaymentsEnabled\(Deno\.env\.get\('KONG_PAYMENTS_ENABLED'\)\);/);
 assert.match(src,/if\(kongAccount&&!\(kong&&kongEnabled\)\)return reply\(\{error:'Purchases are not available on Kongregate\.'\},403\);/);
 assert.match(src,/if\(play\|\|apple\|\|kong\)\{const r=await appCreate\(play\?'google_play':apple\?'app_store':'kongregate',user\.id,pack,body\.requestId,starter\);/);
});

// ---- supabase/kongregate-kreds.sql ----
test('kongregate-kreds.sql: guarded like app-store.sql, the store and columns added, each instance once, service role only, re-runnable',()=>{
 // code: without comments and the patch's quoted lines (6. below), which hold the delete function's own text.
 const sql=read('supabase/kongregate-kreds.sql'),code=sql.replace(/^--.*$/gm,'').replace(/\$([abm])\$[^$]*\$\1\$/g,"''");
 // It reads the live store check first and stops on anything it does not expect (a store added live, or app-store.sql not run yet).
 assert.match(sql,/select pg_get_constraintdef\(c\.oid\) into def from pg_constraint c where c\.conname='harvest_purchases_store_check'/);
 assert.match(sql,/if known<>array\['app_store','google_play','stripe'\] and known<>array\['app_store','google_play','kongregate','stripe'\] then\n  raise exception 'harvest_purchases_store_check is not the one this file expects/);
 assert.match(sql,/add constraint harvest_purchases_store_check check \(store in \('stripe','google_play','app_store','kongregate'\)\);/);
 for(const column of ['kong_item_id bigint','kong_user_id bigint','kong_usage_id bigint','kreds integer'])assert.match(sql,new RegExp(`alter table public\\.harvest_purchases add column if not exists ${column};`),column);
 assert.match(sql,/\(kreds is null or kreds between 1 and 100000\)/);assert.match(sql,/kong_user_id between 1 and 2147483647/);
 assert.match(sql,/create unique index if not exists harvest_purchases_kong_item on public\.harvest_purchases\(kong_item_id\) where kong_item_id is not null;/,'one row per item instance');
 assert.match(sql,/raise exception 'Run google-play\.sql first/);assert.match(sql,/raise exception 'Run kongregate\.sql first/);
 for(const fn of ['harvest_credit_kong_purchase(uuid,bigint,bigint,integer,text,boolean)','harvest_credit_kong_pack(uuid,text,bigint,bigint,integer,boolean)','harvest_revoke_kong_purchases(jsonb)','harvest_kong_claim_slot(bigint,uuid,integer,integer)']){
  const name=fn.replace(/\(.*$/,'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),args=fn.replace(/^[^(]*/,'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(sql,new RegExp(`revoke all on function public\\.${name}${args} from public, anon, authenticated;\\ngrant execute on function public\\.${name}${args} to service_role;`),fn);
  assert.match(sql,new RegExp(`position\\('kongregate-kreds\\.sql' in pg_get_functiondef\\(to_regprocedure\\('public\\.${name}${args}'\\)\\)\\)=0`),`${fn}: one this file did not make stops it`);
 }
 assert.equal((sql.match(/-- kongregate-kreds\.sql \(Oct 2026\)/g)??[]).length,4,'each function carries the mark the guard looks for');
 // The credit: the row locked, a duplicate answered, a mismatch refused, the Starter Pack's week, livemode, the grant, then credited.
 const credit=sql.slice(sql.indexOf('create or replace function public.harvest_credit_kong_purchase'),sql.indexOf('revoke all on function public.harvest_credit_kong_purchase'));
 assert.match(credit,/select \* into purchase from public\.harvest_purchases where id=p_purchase for update;/);
 assert.match(credit,/if purchase\.kong_item_id is not null and purchase\.kong_item_id<>p_item then raise exception 'Payment mismatch'; end if;/);
 assert.match(credit,/if purchase\.status in \('credited','test_paid','refunded'\) then\n  if purchase\.kong_item_id is null then raise exception 'Payment mismatch'; end if;\n  return jsonb_build_object\('status',purchase\.status,'duplicate',true\);/);
 assert.match(credit,/if purchase\.store<>'kongregate' or purchase\.price_id<>p_product then raise exception 'Payment mismatch'; end if;/);
 assert.match(credit,/if exists\(select 1 from public\.harvest_purchases where kong_item_id=p_item and id<>p_purchase\) then\n  return jsonb_build_object\('status',purchase\.status,'duplicate',true,'other',true\);/);
 assert.ok(credit.includes(`if purchase.starter_expires_at is null or purchase.created_at<purchase.starter_expires_at-interval '7 days' or purchase.created_at>=purchase.starter_expires_at then raise exception 'Starter offer expired'; end if;`),'the same week as Apple\'s and Google\'s');
 assert.ok(read('supabase/app-store.sql').includes(`if purchase.starter_expires_at is null or purchase.created_at<purchase.starter_expires_at-interval '7 days' or purchase.created_at>=purchase.starter_expires_at then raise exception 'Starter offer expired'; end if;`));
 assert.match(credit,/update public\.harvest_purchases set kong_item_id=p_item,kong_user_id=p_user,kreds=p_kreds,livemode=not p_test where id=p_purchase;\n perform public\.harvest_purchase_grant\(p_purchase\);\n update public\.harvest_purchases set status='credited',credited_at=now\(\) where id=p_purchase;/,'livemode first (the alert and the log), the grant, then credited');
 // A new row: only the four diamond packs, made pending with its instance (the unique index), then credited through the same function.
 const pack=sql.slice(sql.indexOf('create or replace function public.harvest_credit_kong_pack'),sql.indexOf('revoke all on function public.harvest_credit_kong_pack'));
 assert.match(pack,/\(values \('150',150,199\),\('500',500,499\),\('1250',1250,999\),\('3500',3500,2499\)\) v\(pack,diamonds,cents\) where v\.pack=p_pack;\n if not found then raise exception 'Only a diamond pack'; end if;/);
 for(const [id,p] of Object.entries(payments.PAYMENT_PACKS).filter(([id])=>/^\d+$/.test(id)))assert.ok(pack.includes(`('${id}',${p.diamonds},${p.cents})`),id);
 assert.match(pack,/values\(made,p_player,p_pack,d,0,c,'diamonds_'\|\|p_pack,not p_test,'kongregate','pending',p_item,p_user,p_kreds\);\n exception when unique_violation then return jsonb_build_object\('status','credited','duplicate',true\);/);
 assert.match(pack,/return public\.harvest_credit_kong_purchase\(made,p_item,p_user,p_kreds,'diamonds_'\|\|p_pack,p_test\)\|\|jsonb_build_object\('id',made\);/);
 // The refund by hand: by instance, Kongregate's own rows only, taken back as far as the farm still has it.
 assert.match(sql,/select \* into purchase from public\.harvest_purchases where kong_item_id=\(item->>'item'\)::bigint and store='kongregate' for update;/);
 assert.match(sql,/'Refunded by Kongregate: '/);
 // The names diamond-checkout calls with are the SQL's.
 const index=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(index,/rpc\('harvest_credit_kong_purchase',\{p_purchase:step\.row\.id,p_item:item,p_user:Number\(kongUser\),p_kreds:kreds,p_product:step\.instance\.identifier,p_test:test\}\)/);
 assert.match(index,/rpc\('harvest_credit_kong_pack',\{p_player:user\.id,p_pack:step\.pack,p_item:item,p_user:Number\(kongUser\),p_kreds:kreds,p_test:test\}\)/);
 assert.match(sql,/harvest_credit_kong_purchase\(p_purchase uuid, p_item bigint, p_user bigint, p_kreds integer, p_product text, p_test boolean\)/);
 assert.match(sql,/harvest_credit_kong_pack\(p_player uuid, p_pack text, p_item bigint, p_user bigint, p_kreds integer, p_test boolean\)/);
 // How often a farmer's page may make us ask Kongregate (15 Oct 2026 review): the mapping and the limit in one step, under the row's lock.
 const slot=sql.slice(sql.indexOf('create or replace function public.harvest_kong_claim_slot'),sql.indexOf('revoke all on function public.harvest_kong_claim_slot'));
 for(const column of ['kreds_claim_at timestamptz','kreds_claims integer not null default 0','kreds_claims_from timestamptz'])assert.ok(sql.includes(`alter table public.kongregate_accounts add column if not exists ${column};`),column);
 assert.match(slot,/  where kong_user_id=p_user and player_id=p_player\n   and \(kreds_claim_at is null or kreds_claim_at<=now\(\)-greatest\(coalesce\(p_gap_ms,0\),0\)\*interval '1 millisecond'\)\n   and \(kreds_claims_from is null or kreds_claims_from<=now\(\)-interval '1 hour' or kreds_claims<greatest\(coalesce\(p_max,0\),0\)\);\n if found then return 'ok'; end if;/);
 assert.match(slot,/if exists\(select 1 from public\.kongregate_accounts where kong_user_id=p_user and player_id=p_player\) then return 'busy'; end if;\n return 'other';/);
 assert.match(read('supabase/functions/diamond-checkout/index.ts'),/rpc\('harvest_kong_claim_slot',\{p_user:Number\(kongUser\),p_player:user\.id,p_gap_ms:KONG_CLAIM_LIMIT\.gapMs,p_max:KONG_CLAIM_LIMIT\.perHour\}\)/);
 // Delete account: kept purchases no longer name the Kongregate user; a test item keeps its row, so it is never credited twice. Each line
 // patched from the live definition, and only when it is there exactly once (the lines are delete-account.sql's own).
 const del=read('supabase/delete-account.sql');
 for(const [marker,from,to] of [['not livemode and kong_item_id is null','delete from public.harvest_purchases where player_id=p_player and not livemode;','delete from public.harvest_purchases where player_id=p_player and not livemode and kong_item_id is null;'],
  ['account_deleted_at=now(),kong_user_id=null,','update public.harvest_purchases set player_id=null,account_deleted_at=now(),','update public.harvest_purchases set player_id=null,account_deleted_at=now(),kong_user_id=null,']]){
  assert.ok(sql.includes(`select pg_temp.kreds_patch('public.harvest_delete_account(uuid,text)',$m$${marker}$m$,\n $a$${from}$a$,\n $b$${to}$b$);`),marker);
  assert.equal(del.split(from).length-1,1,`delete-account.sql has it once: ${from}`);assert.ok(to.includes(marker)&&!from.includes(marker));
 }
 // The price in Kreds (the owner, 15 Oct 2026): the admins' purchase notice and the farmer's log name a Kongregate purchase's Kreds, every
 // other store its euro price as before; each line patched from the live definition once (the lines are season-pass.sql's own).
 const pass=read('supabase/season-pass.sql'),kreds="case when new.store='kongregate' then coalesce(new.kreds::text||' Kreds','Kreds') else '€'||to_char(new.amount_cents/100.0,'FM999990.00') end";
 for(const [fn,from,to] of [['harvest_purchase_alert()',"price:='€'||to_char(new.amount_cents/100.0,'FM999990.00');",`price:=${kreds};`],
  ['harvest_purchase_log()',"||' for €'||to_char(new.amount_cents/100.0,'FM999990.00'));",`||' for '||${kreds});`]]){
  assert.ok(sql.includes(`select pg_temp.kreds_patch('public.${fn}',$m$' Kreds'$m$,\n $a$${from}$a$,\n $b$${to}$b$);`),fn);
  assert.equal(pass.split(from).length-1,1,`season-pass.sql has it once: ${from}`);assert.ok(to.includes("' Kreds'")&&!from.includes("' Kreds'"),'patched once, then left alone');
 }
 assert.ok(sql.indexOf("kreds=p_kreds,livemode=not p_test where id=p_purchase")<sql.indexOf("set status='credited',credited_at=now() where id=p_purchase"),'kreds is on the row before the status triggers run');
 assert.match(sql,/if position\(p_from in def\)=0 or \(length\(def\)-length\(replace\(def,p_from,''\)\)\)\/length\(p_from\)<>1 then\n  raise exception/);
 assert.match(sql,/revoke all on function public\.harvest_delete_account\(uuid,text\) from public, anon, authenticated;\ngrant execute on function public\.harvest_delete_account\(uuid,text\) to service_role;/);
 // It removes nothing, replaces no existing function (the delete function only gets its two lines), and ends with a commented dry run.
 assert.doesNotMatch(code,/drop table|drop function|truncate |delete from /i);
 assert.deepEqual([...code.matchAll(/create or replace function public\.(\w+)/g)].map(m=>m[1]),['harvest_credit_kong_purchase','harvest_credit_kong_pack','harvest_revoke_kong_purchases','harvest_kong_claim_slot']);
 assert.doesNotMatch(sql,/\{\d*,(25[6-9]|2[6-9]\d|[3-9]\d\d|\d{4,})\}/,'Postgres allows at most 255 repeats in a regular expression');
 const tail=sql.trimEnd().split('\n').slice(-5);assert.ok(tail.every(line=>line.startsWith('-- ')),'ends with a commented dry run');assert.match(tail.join('\n'),/rollback;/);
 for(const text of ['Only a diamond pack','Purchase without a farmer'])assert.ok(JSON.parse(read('i18n/ignore.json')).includes(text),'never shown to a player: the server logs it');
});

// ---- The page: Kongregate's purchase window and prices (src/kongregate-link.js) ----
function mtxWindow({items=[{identifier:'diamonds_500',price:50}],answer={success:true},answers=true}={}){
 const calls={list:[],buy:[]};let pending=null;
 const api={services:{getUserId:()=>1480702,getUsername:()=>'LordSmatchington',getGameAuthToken:()=>TOKEN,addEventListener(){}},
  mtx:{requestItemList:(tags,cb)=>{calls.list.push(tags);if(answers)cb({success:true,data:items});},purchaseItems:(list,cb)=>{calls.buy.push(list);pending=()=>cb(answer);if(answers)pending();}}};
 const win={location:{search:''},kongregateAPI:{loadAPI(fn){fn();},getAPI:()=>api,flashVarsObject:()=>({})}};
 const timers={list:[],setTimeout(fn,ms){this.list.push({fn,ms});return this.list.length;},clearTimeout(){},setInterval(){return 1;},clearInterval(){}};
 return {win,calls,timers,close:()=>pending?.()};
}
test('the link: Kongregate\'s prices for our items and its purchase window with the row id as data; nothing without the API',async()=>{
 const k=mtxWindow({items:[{identifier:'diamonds_500',price:50},{identifier:'starter_pack',price:30},{identifier:'odd',price:'5'},{price:3}]});
 const link=createKongregateLink({win:k.win,timers:k.timers});await link.hello();
 assert.deepEqual(await link.items(),{diamonds_500:50,starter_pack:30});assert.deepEqual(k.calls.list,[[]],'all items: an empty tag list');
 assert.deepEqual(await link.purchase('diamonds_500',ROW),{success:true});assert.deepEqual(k.calls.buy,[[{identifier:'diamonds_500',data:ROW}]]);
 const no=mtxWindow({answer:{success:false}}),l2=createKongregateLink({win:no.win,timers:no.timers});await l2.hello();assert.deepEqual(await l2.purchase('diamonds_500',ROW),{success:false});
 // A window that never answers: given up after 20 minutes (the page then asks our server anyway).
 const slow=mtxWindow({answers:false}),l3=createKongregateLink({win:slow.win,timers:slow.timers});await l3.hello();
 const waiting=l3.purchase('diamonds_500',ROW);const timer=slow.timers.list.at(-1);assert.equal(timer.ms,PURCHASE_WAIT);assert.equal(PURCHASE_WAIT,1200000);timer.fn();assert.deepEqual(await waiting,{success:false});
 const list=l3.items();slow.timers.list.at(-1).fn();assert.deepEqual(await list,{},'no price list in time: nothing for sale');
 const none=createKongregateLink({win:{location:{search:''}},timers:k.timers});await none.hello();
 assert.deepEqual(await none.items(),{});assert.deepEqual(await none.purchase('diamonds_500',ROW),{success:false});
 const stand=localStandIn({search:''});assert.deepEqual(await stand.items(),{});assert.deepEqual(await stand.purchase('x','y'),{success:false});
});

// ---- The page's shop (src/kongregate-kreds.js) with a fake link and server ----
function shopRig({user={id:KONG,username:'LordSmatchington',token:TOKEN},items={diamonds_150:20,diamonds_500:50,diamonds_1250:100,diamonds_3500:250,starter_pack:30,special_offer:50,halloween_pass_2026:50},
 window={success:true},claims=[],create=null,current=KONG,clock={t:Date.UTC(2026,9,15,12)}}={}){
 const sent=[],done=[],registered=[],buys=[],now={user,current};let held=null,alive=true;
 const link={user:()=>({...now.user}),items:async()=>{sent.push(['items']);return items;},register(){registered.push(1);return true;},
  purchase(product,data){buys.push([product,data]);return window==='hold'?new Promise(resolve=>{held=resolve;}):Promise.resolve(window);}};
 const pay=async body=>{sent.push(body);
  if(body.operation==='catalog')return {enabled:true,mode:'live',store:'kongregate',starter:{eligible:true,expiresAt:clock.t+86400000},offer:{id:'offer-1',cents:499,valueCents:4999},pass:{id:'halloween-2026',ready:true},packs:[]};
  if(body.operation==='create')return create??{purchaseId:ROW,product:payments.KONG_PRODUCTS[body.pack],account:FARMER,store:'kongregate'};
  if(body.operation==='kong_claim'){const next=claims.shift();if(next instanceof Error)throw next;return next??{credited:[],waiting:0};}
  if(body.operation==='status')return {id:body.purchaseId,status:'credited'};
  throw new Error('unexpected');};
 const shop=createKredsShop({link,pay,current:()=>now.current,now:()=>clock.t,uuid:()=>REQ});
 const bridge={purchaseDone:id=>done.push(id)};shop.attach(bridge,{alive:()=>alive,user:{id:FARMER}});
 return {bridge,sent,done,registered,buys,clock,release:answer=>held?.(answer),end(){alive=false;},switchTo(next){now.user=next;now.current=next.id;}};
}
test('the shop\'s catalogue: Kongregate\'s own prices in Kreds; a pack Kongregate gives no price is not for sale',async()=>{
 const s=shopRig();
 const catalog=await s.bridge.payments({operation:'catalog'});
 assert.deepEqual(s.sent.find(b=>b.operation==='catalog'),{operation:'catalog',store:'kongregate'});
 assert.equal(catalog.enabled,true);assert.deepEqual(catalog.prices['500'],{price:'50 Kreds',kreds:50});assert.deepEqual(catalog.prices.starter,{price:'30 Kreds',kreds:30});
 assert.equal(shopPrice(catalog,'500',499),'50 Kreds');assert.equal(shopPrice(catalog,'starter',299),'30 Kreds');
 assert.equal(shopWorth(catalog,'offer',499,4999),'500 Kreds','the offer\'s worth at its own rate, a round ten');
 assert.equal(shopWorth({prices:{offer:{price:'7 Kreds',kreds:7}}},'offer',499,4999),'70 Kreds');assert.equal(shopWorth(null,'offer',499,4999),'€49.99','the website as before');
 // Kept 10 minutes: one price list for the shop's several asks.
 await s.bridge.payments({operation:'catalog'});assert.equal(s.sent.filter(b=>b[0]==='items').length,1);
 s.clock.t+=PRICES_KEPT;await s.bridge.payments({operation:'catalog'});assert.equal(s.sent.filter(b=>b[0]==='items').length,2);
 // Only some priced: those for sale; an unpriced Starter Pack, offer or pass not.
 const part=kredsCatalog({enabled:true,starter:{eligible:true},offer:{id:'o'},pass:{ready:true}},kredsPrices({diamonds_500:50,starter_pack:0,special_offer:'50'}));
 assert.deepEqual(Object.keys(part.prices),['500']);assert.equal(part.starter.eligible,false);assert.equal(part.offer,null);assert.equal(part.pass.ready,false);assert.equal(part.enabled,true);
 assert.equal(kredsCatalog({enabled:true},kredsPrices({})).enabled,false,'no price at all: closed');assert.equal(kredsCatalog({enabled:false},kredsPrices({diamonds_500:50})).enabled,false,'the server\'s switch off: closed');
});
test('a purchase: our row first, Kongregate\'s window with that row, then our server credits it; the result window shows it once',async()=>{
 const s=shopRig({claims:[{credited:[ROW],waiting:0}]});
 const result=await s.bridge.checkout('500','ignored-request');
 assert.deepEqual(result,{store:'kongregate',id:ROW,status:'purchased'});
 assert.deepEqual(s.sent.filter(b=>b.operation),[{operation:'create',pack:'500',requestId:REQ,store:'kongregate'},{operation:'kong_claim',kong_user_id:KONG,game_auth_token:TOKEN,store:'kongregate'}],'a new request each time, as in the apps');
 assert.deepEqual(s.buys,[['diamonds_500',ROW]]);assert.deepEqual(s.done,[ROW]);
 // The offer carries its id; the pass and the Starter Pack their products.
 const o=shopRig({claims:[{credited:[ROW],waiting:0}]});await o.bridge.checkout('offer',null,'offer-1');assert.equal(o.sent.find(b=>b.operation==='create').offerId,'offer-1');assert.deepEqual(o.buys,[['special_offer',ROW]]);
 // Closed without buying: nothing credited, nothing shown, the button free again.
 const closed=shopRig({window:{success:false}});assert.deepEqual(await closed.bridge.checkout('500'),{store:'kongregate',id:ROW,status:'cancelled'});
 assert.deepEqual(closed.done,[]);assert.ok(closed.sent.some(b=>b.operation==='kong_claim'),'asked anyway: a "no" may still have been paid');
 // Paid, but the claim failed (or the item is not there yet): its window waits for it.
 const later=shopRig({claims:[new Error('down')]});assert.equal((await later.bridge.checkout('500')).status,'purchased');assert.deepEqual(later.done,[ROW]);
 // A server answer that is not this farmer's Kongregate row for this pack: no window opens.
 for(const create of [{purchaseId:ROW,product:'diamonds_150',account:FARMER,store:'kongregate'},{purchaseId:ROW,product:'diamonds_500',account:'someone-else',store:'kongregate'},{purchaseId:'x',product:'diamonds_500',account:FARMER,store:'kongregate'},{purchaseId:ROW,product:'diamonds_500',account:FARMER,store:'google_play'},{error:'x'}]){
  const bad=shopRig({create});await assert.rejects(()=>bad.bridge.checkout('500'),{message:KREDS_TEXT.failed});assert.deepEqual(bad.buys,[],JSON.stringify(create));
 }
});
test('one Kongregate window at a time; a guest gets Kongregate\'s sign-in; another user than the farm\'s, or a closed farm, buys nothing',async()=>{
 const s=shopRig({window:'hold',claims:[{credited:[ROW],waiting:0}]});
 const first=s.bridge.checkout('500');await settle();
 await assert.rejects(()=>s.bridge.checkout('1250'),{message:KREDS_TEXT.busy});assert.equal(s.buys.length,1,'Kongregate keeps one answer: never a second window');
 s.release({success:true});assert.equal((await first).status,'purchased');
 const second=s.bridge.checkout('150');await settle();assert.equal(s.buys.length,2,'free again once the window closed');s.release({success:false});assert.equal((await second).status,'cancelled');
 const guest=shopRig({user:{id:'0',username:'Guest1',token:''}});
 await assert.rejects(()=>guest.bridge.checkout('500'),{message:KREDS_TEXT.guest});assert.deepEqual(guest.registered,[1]);assert.deepEqual(guest.sent,[],'nothing asked of our server');
 assert.equal(KREDS_TEXT.guest,'Register or sign in on Kongregate to buy with Kreds.');
 const switched=shopRig({current:'555'});await assert.rejects(()=>switched.bridge.checkout('500'),{message:KREDS_TEXT.failed});assert.deepEqual(switched.sent,[]);
 const gone=shopRig();gone.end();await assert.rejects(()=>gone.bridge.payments({operation:'catalog'}),/Your session has ended\./);
});
test('recovery: the farm opening claims what Kongregate still holds and shows each in the result window; the window\'s checks claim too',async()=>{
 const s=shopRig({claims:[{credited:[ROW,ROW2],waiting:1},{credited:[],waiting:0}]});
 await s.bridge.playRecover();assert.deepEqual(s.done,[ROW,ROW2]);assert.equal(s.bridge.kreds,true,'src/game-cloud.js runs it on Kongregate');
 // The purchase window checks every 3 seconds: a claim first, at most every 10 seconds.
 assert.deepEqual(await s.bridge.payments({operation:'status',purchaseId:ROW}),{id:ROW,status:'credited'});
 assert.equal(s.sent.filter(b=>b.operation==='kong_claim').length,1,'claimed a moment ago: not again');
 s.clock.t+=CLAIM_GAP;await s.bridge.payments({operation:'status',purchaseId:ROW});assert.equal(s.sent.filter(b=>b.operation==='kong_claim').length,2);
 assert.deepEqual(s.sent.filter(b=>b.operation==='status').map(b=>b.store),['kongregate','kongregate']);
 // The farm opened again within 10 seconds (a trip to the Village and back; 15 Oct 2026 review): not asked again; after them, or for
 // another Kongregate user (a log-in change), at once.
 const claims=rig=>rig.sent.filter(b=>b.operation==='kong_claim');
 const trips=shopRig();await trips.bridge.playRecover();await trips.bridge.playRecover();assert.equal(claims(trips).length,1);
 trips.clock.t+=CLAIM_GAP-1;await trips.bridge.playRecover();assert.equal(claims(trips).length,1);
 trips.clock.t+=1;await trips.bridge.playRecover();assert.equal(claims(trips).length,2);
 trips.switchTo({id:'555',username:'Other',token:'tok-other'});await trips.bridge.playRecover();
 assert.deepEqual(claims(trips).map(b=>b.kong_user_id),[KONG,KONG,'555'],'the new user\'s farm is checked at once');
 // The claim after a purchase window always runs, also right after another.
 const bought=shopRig({claims:[{credited:[],waiting:0},{credited:[ROW],waiting:0}]});await bought.bridge.playRecover();await bought.bridge.checkout('500');assert.equal(claims(bought).length,2);
 // A guest or another user than the farm's: nothing claimed.
 const guest=shopRig({user:{id:'0',username:'g',token:''}});await guest.bridge.playRecover();assert.deepEqual(guest.sent,[]);
 const cloud=read('src/game-cloud.js');
 assert.match(cloud,/if\(shop&&\(bridge\.playSettle\|\|bridge\.kreds\)\)void bridge\.playRecover\?\.\(\)\.catch\(\(\)=>\{\}\);/);
 assert.match(cloud,/if\(shop\)bridge\.purchaseDone=\(id,more\)=>showPaymentReturn\(bridge,\{id,cancelled:false,\.\.\.more\}\);/);
});

// ---- The page itself (src/kongregate-page.js): the switch ----
function page({sellsKreds,paymentRequest}={}){
 const els={},el=id=>els[id]??={id,hidden:false,textContent:'',value:0,dataset:{},onclick:null};
 const doc={getElementById:el,documentElement:{classList:{remove(){}}},body:{dataset:{}}};
 const user={id:KONG,username:'LordSmatchington',token:TOKEN};
 const link={hello:async()=>({api:true,language:null,user}),user:()=>user,register:()=>true,submit:()=>true,items:async()=>({diamonds_500:50}),purchase:async()=>({success:true}),onChange:()=>()=>{}};
 const auth={session:null,async getSession(){return {data:{session:this.session}};},async verifyOtp(){this.session={access_token:'at',user:{id:FARMER}};return {error:null};},async signOut(){return {};},startAutoRefresh(){}};
 let config=null;
 const createFarmSession=options=>{config=options;return {open:async()=>{},dispose(){},listen(){}};};
 const run=()=>runKongregatePage({link,doc,win:{location:{reload(){}}},nav:{onLine:true},timers:{setTimeout(){return 1;},clearTimeout(){}},store:{get:()=>null,set(){}},portalClient:()=>({auth}),setClient(){},
  functionsUrl:'https://x.supabase.co/functions/v1',supabaseKey:'anon',isConfigured:true,fetchImpl:async()=>new Response(JSON.stringify({token_hash:'h',player_id:FARMER})),createFarmSession,
  ...(sellsKreds===undefined?{}:{sellsKreds}),...(paymentRequest?{paymentRequest}:{})});
 return {run,get config(){return config;}};
}
test('SELLS_KREDS: on since 15 Oct 2026, the portal sells and the farm\'s bridge buys with Kreds; off, or without diamond-checkout, as before',async()=>{
 assert.equal(SELLS_KREDS,true,'on since Kongregate allowed the Virtual Goods API (15 Oct 2026)');
 const asked=[];const pay=async body=>{asked.push(body);return {enabled:true,store:'kongregate'};};
 for(const options of [{},{sellsKreds:false},{sellsKreds:true},{sellsKreds:false,paymentRequest:pay}]){
  const p=page(options);const {portal}=await p.run();
  assert.ok(Object.values(portal.features).every(on=>on===false),JSON.stringify(Object.keys(options)));assert.equal(portalSells(portal),false);assert.equal(portalOff('payments',portal),true);
  const bridge={payments:'the farm session\'s',checkout:'the farm session\'s'};p.config.extend(bridge,{alive:()=>true,user:{id:FARMER}});
  assert.deepEqual([bridge.payments,bridge.checkout,bridge.kreds,bridge.playRecover],['the farm session\'s','the farm session\'s',undefined,undefined],'no way to buy: the session\'s own refusal');
 }
 assert.deepEqual(asked,[]);
 {const {portal}=await page({paymentRequest:pay}).run();assert.equal(portalSells(portal),true,'the page as it ships: on');}
 asked.length=0;
 const on=page({sellsKreds:true,paymentRequest:pay});const {portal}=await on.run();
 assert.deepEqual(Object.entries(portal.features).filter(([,v])=>v).map(([k])=>k),['payments'],'only payments: no invites, links, email, app or Sign out');
 assert.deepEqual(Object.keys(portal.features),PORTAL_FEATURES);assert.equal(portalSells(portal),true);assert.equal(portalOff('payments',portal),false);
 const bridge={};on.config.extend(bridge,{alive:()=>true,user:{id:FARMER}});
 assert.equal(typeof bridge.checkout,'function');assert.equal(bridge.kreds,true);
 const catalog=await bridge.payments({operation:'catalog'});assert.deepEqual(asked[0],{operation:'catalog',store:'kongregate'});assert.deepEqual(catalog.prices,{'500':{price:'50 Kreds',kreds:50}});
 assert.match(read('src/kongregate.js'),/\n \/\/ Kreds \(15 Oct 2026\)[^\n]*\n paymentRequest\n\}\);/,'diamond-checkout handed to the page, never to the farm session');
 // The privacy policy says what is sold on Kongregate (15 Oct 2026 review): SELLS_KREDS goes on in the same site deploy as its Kreds text
 // (~/Harvest Tycoon/kongregate/kreds-uitrollen.md has the text), never before.
 const privacy=read('public/privacy.html').match(/<h3 id="kongregate">[^]*?<\/ul>/)[0],purchases=read('public/privacy.html').match(/<h3 id="purchases">[^]*?<h3>/)[0];
 if(SELLS_KREDS){assert.doesNotMatch(privacy,/sell nothing/);assert.match(privacy,/Kreds/);assert.match(purchases,/Kongregate/);assert.match(read('public/delete-account.html'),/payment references of Stripe, Google Play[^<]*Kongregate/);}
 else assert.match(privacy,/show no ads of our own, sell nothing,/,'nothing is sold on Kongregate yet');
});

// ---- The farm with a selling portal: the shop's marks, the Starter Pack's price, the wiki, the admin ----
test('the farm on Kongregate with Kreds: the shop stays (html[data-portal-shop]); CrazyGames and Kongregate without Kreds as before',()=>{
 const make=()=>({tag:'p',className:'',textContent:'',innerHTML:'',children:[],append(c){this.children.push(c);},prepend(){},remove(){}});
 const docFor=()=>({documentElement:{dataset:{}},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,createElement:make,addEventListener(){}});
 const kong=name=>({name,guest:false,userAvailable:true,features:Object.fromEntries(PORTAL_FEATURES.map(f=>[f,false]))});
 const selling={...kong('kongregate'),features:{...kong('kongregate').features,payments:true}};
 const d1=docFor();createPortalUI({portal:selling,doc:d1});assert.deepEqual(d1.documentElement.dataset,{portal:'kongregate',portalShop:''});
 // The real CrazyGames and Discord portals (their pages build them in src/crazygames.js and src/discord-page.js): never selling.
 const real=file=>{const line=read(file).match(/\n  name:'(\w+)',features:(Object\.freeze\(Object\.fromEntries\(PORTAL_FEATURES\.map\(feature=>\[feature,false\]\)\)\)),/);
  assert.ok(line,file);return {name:line[1],guest:false,userAvailable:true,features:vm.runInNewContext(line[2],{Object,PORTAL_FEATURES})};};
 for(const portal of [kong('kongregate'),real('src/crazygames.js'),real('src/discord-page.js')]){
  assert.equal(portalSells(portal),false,portal.name);const d=docFor();createPortalUI({portal,doc:d});assert.equal('portalShop' in d.documentElement.dataset,false,portal.name);
 }
 assert.deepEqual([real('src/crazygames.js').name,real('src/discord-page.js').name],['crazygames','discord']);
 assert.equal(portalSells(null),false,'the website: no portal');
 assert.match(read('src/game-cloud.js'),/if\(portal\)\{document\.documentElement\.dataset\.portal=portal\.name;if\(portalSells\(portal\)\)document\.documentElement\.dataset\.portalShop='';\}/,'marked before anything shows');
 // portal.css: our purchases hidden only without the mark; nothing else of a portal comes back.
 const css=read('public/portal.css');
 assert.match(css,/html\[data-portal\]:not\(\[data-portal-shop\]\) #diamond-store,/);
 assert.match(css,/html\[data-portal\]:not\(\[data-portal-shop\]\) \.pass-heads,html\[data-portal\]:not\(\[data-portal-shop\]\) \.pass-row\{grid-template-columns:34px minmax\(0,1fr\)\}/);
 assert.match(css,/html\[data-portal\] #invite-button,/);assert.match(css,/html\[data-portal\] #logout-player,/);
 assert.doesNotMatch(css,/data-portal-shop\][^{]*(#invite|#logout|#email|#app-settings|cookie)/,'only the purchases depend on it');
 // The Starter Pack's tile and chip: Kongregate's price in Kreds there, the euro price everywhere else (run below).
 const starter=read('src/starter-pack-ui.js');
 assert.match(starter,/const price=catalog\?\.store==='kongregate'\?shopPrice\(catalog,'starter',299\):'€2\.99';/);
 assert.match(starter,/checkedAt=0,hudPrice='€2\.99';/,'the website\'s tile is left exactly as it was drawn');
 assert.match(read('public/starter-pack.css'),/#starter-pack-button small\{font-size:12px;font-weight:700;color:#806322;white-space:nowrap\}\n[^]*#starter-pack-button small\.is-long\{letter-spacing:-\.3px\}/,'one line, still 12 px');
 assert.equal(shopPrice(null,'starter',299),'€2.99','the website: as before');
 // No trackers on Kongregate: the shop never reports a purchase anywhere.
 assert.doesNotMatch(read('src/kongregate-kreds.js'),/trackCommerce|trackInvite|trackGame|pushEvent|dataLayer|gtag|fbq|ttq/);
});
// src/starter-pack-ui.js run for real on a stand-in page: its dynamic imports and import.meta handed in, nothing else changed.
async function starterTile(catalog){
 const made=[],farmState=await import('../public/farm-state.js');
 const el=tag=>{const kids={},classes=new Set();const e={tag,id:'',hidden:false,type:'',className:'',textContent:'',title:'',innerHTML:'',dataset:{},attrs:{},classes,disabled:false,
  classList:{toggle:(c,on)=>on?classes.add(c):classes.delete(c),add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},
  setAttribute(k,v){e.attrs[k]=String(v);},getAttribute:k=>e.attrs[k]??null,querySelector:sel=>kids[sel]??=el(sel),querySelectorAll:()=>[],append(){},after(){},showModal(){},close(){}};made.push(e);return e;};
 const document={createElement:el,head:{append(){}},body:{append(){}},getElementById:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},hidden:false};
 const source=read('src/starter-pack-ui.js').replace(/^import .*;\n/gm,'').replace("await import(/* @vite-ignore */ '/farm-state.js')",'farmState').replace("await import(/* @vite-ignore */ '/visual-icons.js')",'icons')
  .replace("import.meta.resolve?.('/starter-pack.css')??'/starter-pack.css'","'/starter-pack.css'").replace('export async function createStarterPackUI','async function createStarterPackUI');
 const context={shopPrice,farmState,icons:{art:()=>'',refreshArt(){}},document,window:{addEventListener(){},removeEventListener(){},dispatchEvent(){}},crypto:globalThis.crypto,
  setInterval:()=>1,clearInterval(){},setTimeout:()=>1,MutationObserver:class{observe(){}disconnect(){}},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},
  bridge:{payments:async()=>({serverNow:Date.now(),...catalog})}};
 vm.runInNewContext(`${source}\nstarted=createStarterPackUI(bridge);`,context);await context.started;
 const tile=made.find(e=>e.id==='starter-pack-button'),chip=made.find(e=>e.id==='starter-pack-chip'),dialog=made.find(e=>e.id==='starter-pack-dialog');
 return {tile,chip,small:tile.querySelector('small'),chipSmall:chip.querySelector('small'),buy:dialog.querySelector('.starter-buy'),value:dialog.querySelector('.starter-value')};
}
test('the Starter Pack tile and chip, run: "30 Kreds" on Kongregate with Kreds; the website and the apps keep €2.99 as today',async()=>{
 const offer={starter:{eligible:true,expiresAt:Date.now()+86400000},packs:[{id:'starter',diamonds:500,coins:10000,cents:299},{id:'500',diamonds:500,coins:0,cents:499}]};
 const kreds=await starterTile({...offer,enabled:true,mode:'live',store:'kongregate',prices:{starter:{price:'30 Kreds',kreds:30},'500':{price:'50 Kreds',kreds:50}}});
 assert.equal(kreds.tile.hidden,false);assert.deepEqual([kreds.small.textContent,kreds.chipSmall.textContent],['30 Kreds','30 Kreds']);
 assert.deepEqual([kreds.tile.attrs['aria-label'],kreds.chip.attrs['aria-label']],['Starter Pack, 30 Kreds','Starter Pack, 30 Kreds']);
 assert.ok(kreds.small.classes.has('is-long'),'a little closer together, so it fits the phone\'s tile');
 assert.equal(kreds.buy.textContent,'Buy for 30 Kreds');assert.equal(kreds.value.textContent,'The 500 diamonds alone cost 50 Kreds in the shop.');
 // The website (no store prices) and the apps (Google's or Apple's price in the window only): the tile and chip as drawn, €2.99.
 for(const catalog of [{...offer,enabled:true,mode:'live',store:'stripe'},{...offer,enabled:true,mode:'live',store:'google_play',prices:{starter:{price:'Rp 49.000'}}},{...offer,enabled:true,mode:'live',store:'app_store',prices:{starter:{price:'US$2.99'}}}]){
  const shown=await starterTile(catalog);
  assert.deepEqual([shown.small.textContent,shown.chipSmall.textContent,shown.small.classes.size],['','',0],`${catalog.store}: never rewritten`);
  assert.deepEqual([shown.tile.attrs['aria-label'],shown.chip.attrs['aria-label']],['Starter Pack, €2.99','Starter Pack, €2.99'],catalog.store);
 }
 assert.equal((await starterTile({...offer,enabled:true,mode:'live',store:'google_play',prices:{starter:{price:'Rp 49.000'}}})).buy.textContent,'Buy for Rp 49.000','the window as before');
});
test('the pass box and the diamond packs on Kongregate with Kreds: Kongregate\'s prices, no euro; an unpriced pack is not for sale',()=>{
 const prices={'150':{price:'20 Kreds',kreds:20},'500':{price:'50 Kreds',kreds:50},'1250':{price:'100 Kreds',kreds:100},'3500':{price:'250 Kreds',kreds:250},pass:{price:'50 Kreds',kreds:50}};
 const kreds={enabled:true,mode:'live',store:'kongregate',pass:{ready:true,cents:499},prices};
 const box=passPaidBox({passPremium:[]},{phase:'open',now:Date.now(),catalog:kreds});
 assert.match(box,/>Buy for 50 Kreds</);assert.match(box,/The 500 diamonds alone cost 50 Kreds in the shop\./);assert.doesNotMatch(box,/€/);
 assert.doesNotMatch(passPaidBox({passPremium:[]},{phase:'open',now:Date.now(),catalog:{...kreds,prices:{pass:prices.pass}}}),/alone cost|€/,'500 unpriced there: no line rather than a euro price');
 assert.equal(passValueLine(),'The 500 diamonds alone cost €4.99 in the shop.','the website as before');
 assert.equal(passValueLine({enabled:true,store:'google_play',prices:{'500':{price:'US$5.49'}}}),'The 500 diamonds alone cost €4.99 in the shop.','the apps as before');
 // The packs: Kongregate's prices, the extra from them; one Kongregate gives no price is Unavailable and cannot be tapped.
 const cards=html=>[...html.matchAll(/data-diamond-pack="(\d+)" data-state="(\w+)" aria-label="([^"]*)" (disabled)?>(?:<span class="pack-ribbon[^"]*">([^<]*)<\/span>)?[^]*?<span class="pack-price">([^<]*)<\/span>/g)].map(m=>[m[1],m[2],m[4]?'disabled':'open',m[5]??'',m[6]]);
 assert.deepEqual(cards(diamondPackCards({catalog:kreds})),[['150','available','open','','20 Kreds'],['500','available','open','+33% extra','50 Kreds'],['1250','available','open','+67% extra','100 Kreds'],['3500','available','open','+87% extra','250 Kreds']]);
 assert.deepEqual(cards(diamondPackCards({catalog:{...kreds,prices:{...prices,'150':{price:'30 Kreds',kreds:30}}}})).map(c=>c[3]),['','+100% extra','+150% extra','+180% extra'],'the tabs follow Kongregate\'s own prices');
 const part=diamondPackCards({catalog:{...kreds,prices:{'500':prices['500']}}});
 assert.deepEqual(cards(part),[['150','unavailable','disabled','','Unavailable'],['500','available','open','+33% extra','50 Kreds'],['1250','unavailable','disabled','+66% extra','Unavailable'],['3500','unavailable','disabled','+86% extra','Unavailable']],'not every pack priced: the euro tabs, as the shop\'s own');
 assert.match(part,/aria-label="150 diamonds" disabled/);assert.doesNotMatch(part,/€/,'no euro price anywhere, not even in a label');
 // The website and the apps: exactly as before (an unpriced pack in an app keeps its euro price and its tap, as today).
 assert.deepEqual(cards(diamondPackCards({catalog:{enabled:true,mode:'live'}})),[['150','available','open','','€1.99'],['500','available','open','+33% extra','€4.99'],['1250','available','open','+66% extra','€9.99'],['3500','available','open','+86% extra','€24.99']]);
 assert.deepEqual(cards(diamondPackCards({catalog:{enabled:true,store:'google_play',prices:{'500':{price:'US$5.49'}}}})).map(c=>[c[1],c[4]]),[['available','€1.99'],['available','US$5.49'],['available','€9.99'],['available','€24.99']]);
 assert.deepEqual(cards(diamondPackCards({catalog:{enabled:false}})).map(c=>[c[1],c[2],c[4]]),Array(4).fill(['unavailable','disabled','Unavailable']),'the shop closed: as before');
});
test('the wiki on Kongregate with Kreds: buying with Kreds at Kongregate\'s prices, no card, Stripe or euro table; without Kreds as before',()=>{
 const features=on=>Object.fromEntries(PORTAL_FEATURES.map(f=>[f,f==='payments'&&on]));
 const ctx=on=>({level:120,portal:{name:'kongregate',guest:false,features:features(on),privacyContact:'info@harvesttycoon.com'},href:id=>`#wiki-${id}`,now:Date.UTC(2026,9,25)});
 const html=on=>WIKI_TOPICS.map(t=>wikiArticle(t.id,ctx(on)).html).join('\n');
 const sells=html(true),off=html(false);
 assert.match(sells,/<p>One-time purchases with Kreds, Kongregate’s own currency, added to your farm right after payment\. The diamond shop shows each price in Kreds\. From level 14 there is also a Starter Pack for 7 days\.<\/p>/);
 assert.doesNotMatch(sells,/\bStripe\b|Google Play;|the App Store;|we never see your card|per euro|€/,'no other way to pay, no euro');
 assert.match(sells,/<span>Starter Pack<\/span>/,'What opens when has the Starter Pack again');assert.match(sells,/With Kreds the paid rewards open too: 500 diamonds/);assert.doesNotMatch(sells,/For Kreds/);
 assert.doesNotMatch(off,/Buying diamonds|Starter Pack|Kreds/,'without Kreds: as before');
 assert.match(sells,/Your farm on Kongregate/);
 assert.doesNotMatch(wikiArticle('diamonds',{level:120,portal:'kongregate'}).html,/Buying diamonds/,'a portal named only: as before');
 assert.match(wikiArticle('diamonds',{}).html,/Payments go through Stripe;/,'the website as before');
});
test('the admin\'s purchase list says Kongregate for a Kreds purchase; a test account\'s is no revenue',async()=>{
 const owner={id:'22222222-2222-4222-8222-222222222222',email:'floris@millstone.nl',email_confirmed_at:'2026-09-16T21:12:00Z',signInMethods:['oauth']};
 const rows=[{id:'k1',player_id:FARMER,pack:'500',diamonds:500,coins:0,amount_cents:499,livemode:true,status:'credited',store:'kongregate',created_at:'2026-10-15T10:00:00Z',credited_at:'2026-10-15T10:00:05Z'},
  {id:'k2',player_id:FARMER,pack:'150',diamonds:150,coins:0,amount_cents:199,livemode:false,status:'credited',store:'kongregate',created_at:'2026-10-15T09:00:00Z',credited_at:'2026-10-15T09:00:05Z'}];
 const db={from(table){let list=table==='harvest_purchases'?rows:[{player_id:FARMER,username:'Anna',level:20}];const q={select(){return q;},order(){return q;},limit(){return q;},in(k,v){list=list.filter(r=>v.includes(r[k]));return q;},then(r){return Promise.resolve({data:list,error:null}).then(r);}};return q;}};
 const {data}=await handleAdminPurchases({admin:db,user:owner});
 assert.deepEqual(data.purchases.map(p=>p.store),['kongregate','kongregate']);assert.equal(data.totals.revenueCents,499,'the test account\'s purchase is no revenue');
});
test('the new words are in the catalogue and translated; "Kreds" itself stays "Kreds"',()=>{
 const catalog=JSON.parse(read('i18n/catalog.json')),ignore=JSON.parse(read('i18n/ignore.json'));
 const passLine='Free: coins that grow with your level, pumpkins, pumpkin pies and {0}-minute boosts. With Kreds the paid rewards open too: {1} diamonds, {2} days of VIP, {3} boosts, pies and more coins. Tiers you already reached open at once.';
 for(const text of [KREDS_TEXT.guest,'Starter Pack, {0}','One-time purchases with Kreds, Kongregate’s own currency, added to your farm right after payment. The diamond shop shows each price in Kreds. From level {0} there is also a Starter Pack for {1} days.',KREDS_TEXT.busy,KREDS_TEXT.failed,passLine])assert.ok(text in catalog,text);
 for(const text of ['Kreds','{0} Kreds'])assert.ok(ignore.includes(text),text);
 for(const code of ['ar','cs','de','es','fr','hi','hu','id','ja','nl','pt','ru','tr','uk','zh']){
  const done=JSON.parse(read(`public/i18n/${code}.json`));assert.ok(done[KREDS_TEXT.guest]?.includes('Kreds'),code);assert.ok(done['Starter Pack, {0}']?.includes('{0}'),code);
  assert.ok(['Kreds','{0}','{1}','{2}','{3}'].every(part=>done[passLine]?.includes(part)),`${code}: the pass line with Kreds`);
 }
 assert.doesNotMatch(read('src/kongregate-kreds.js')+read('public/android.js'),/ · /,'no middle dots');
});
