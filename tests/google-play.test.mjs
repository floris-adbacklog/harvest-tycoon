// Purchases in the Android app through Google Play (Oct 2026): the server's check (game/payments.js checkPlayPurchase), Google's API
// (game/google-play.js), the page's talk with the app (src/play-store.js), diamond-checkout's play_confirm and the SQL.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import * as payments from '../game/payments.js';
import * as googlePlay from '../game/google-play.js';
import * as appStore from '../game/app-store.js';
import {readPlay,createPlayStore} from '../src/play-store.js';
import {playBilling,playPricesLink,playBuyLink,shopPrice,shopWorth} from '../public/android.js';
import {portalOff} from '../public/portal.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const FARMER='0000000a-0000-4000-8000-000000000000',OTHER='0000000b-0000-4000-8000-000000000000',ROW='1111111a-0000-4000-8000-000000000000';
const TOKEN='abcdefghijklmnopqrstuvwxyz.ABC_123-x';
const row=(over={})=>({id:ROW,player_id:FARMER,pack:'500',diamonds:500,coins:0,amount_cents:499,price_id:'diamonds_500',store:'google_play',status:'pending',livemode:true,vip_days:0,...over});
const google=(over={})=>({kind:'androidpublisher#productPurchase',purchaseState:0,consumptionState:0,orderId:'GPA.1234-5678',quantity:1,
 obfuscatedExternalAccountId:FARMER,obfuscatedExternalProfileId:ROW,...over});

test('every pack the website sells is a Google Play product of its own, with Play Console\'s id rules',()=>{
 const sold=[...Object.keys(payments.PAYMENT_PACKS),'offer','pass'];
 assert.deepEqual(Object.keys(payments.PLAY_PRODUCTS).sort(),sold.sort());
 for(const id of Object.values(payments.PLAY_PRODUCTS))assert.match(id,payments.PLAY_PRODUCT);
 assert.equal(new Set(Object.values(payments.PLAY_PRODUCTS)).size,sold.length,'one product per pack');
 assert.equal(payments.PLAY_PRODUCTS.pass,'halloween_pass_2026');assert.equal(payments.PASS.id,'halloween-2026','a new pass needs a product of its own');
 assert.equal(payments.playProduct('nope'),null);assert.equal(payments.playProduct('__proto__'),null);
});

test('checkPlayPurchase: only Google\'s word for this farmer and this row counts; pending and cancelled are said as such',()=>{
 const ok=payments.checkPlayPurchase(google(),row(),{product:'diamonds_500',player:FARMER});
 assert.deepEqual(ok,{state:'purchased',test:false,order:'GPA.1234-5678'});
 assert.equal(payments.checkPlayPurchase(google({purchaseState:2}),row(),{product:'diamonds_500',player:FARMER}).state,'pending');
 assert.equal(payments.checkPlayPurchase(google({purchaseState:1}),row(),{product:'diamonds_500',player:FARMER}).state,'cancelled');
 assert.equal(payments.checkPlayPurchase(google({purchaseType:0}),row(),{product:'diamonds_500',player:FARMER}).test,true,'a licence tester\'s purchase');
 assert.equal(payments.checkPlayPurchase(google({purchaseType:1,orderId:undefined}),row(),{product:'diamonds_500',player:FARMER}).order,null,'a promo code has no order');
 const refused=[[google({kind:'x'}),row(),'diamonds_500',FARMER],[google({obfuscatedExternalAccountId:OTHER}),row(),'diamonds_500',FARMER],
  [google(),row({player_id:OTHER}),'diamonds_500',FARMER],[google({obfuscatedExternalProfileId:OTHER}),row(),'diamonds_500',FARMER],
  [google(),row(),'diamonds_150',FARMER],[google({quantity:2}),row(),'diamonds_500',FARMER],[google(),row({diamonds:5000}),'diamonds_500',FARMER],
  [google(),row({amount_cents:199}),'diamonds_500',FARMER],[google(),row({pack:'pass',diamonds:0,amount_cents:499,pass_id:'other-pass'}),'halloween_pass_2026',FARMER],
  [google(),row({pack:'offer',offer_id:ROW,diamonds:1,coins:0}),'special_offer',FARMER],[google(),row(),'diamonds_500',undefined]];
 for(const [g,r,product,player] of refused)assert.throws(()=>payments.checkPlayPurchase(g,r,{product,player}));
 const pass=row({pack:'pass',diamonds:0,coins:0,pass_id:payments.PASS.id});
 assert.equal(payments.checkPlayPurchase(google(),pass,{product:'halloween_pass_2026',player:FARMER}).state,'purchased');
 const starter=row({pack:'starter',diamonds:500,coins:10000,amount_cents:299});
 assert.equal(payments.checkPlayPurchase(google(),starter,{product:'starter_pack',player:FARMER}).state,'purchased');
});

async function testAccount(){
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const der=Buffer.from(await crypto.subtle.exportKey('pkcs8',pair.privateKey)).toString('base64');
 const pem=`-----BEGIN PRIVATE KEY-----\n${der.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
 return {account:{type:'service_account',client_email:'play-purchases@x.iam.gserviceaccount.com',private_key:pem},publicKey:pair.publicKey};
}
test('Google sign-in: a JWT signed with the service account\'s key, for the androidpublisher scope, kept until shortly before it runs out',async()=>{
 assert.equal(googlePlay.serviceAccount(''),null);assert.equal(googlePlay.serviceAccount('{"client_email":"a"}'),null);assert.equal(googlePlay.serviceAccount('not json'),null);
 const {account,publicKey}=await testAccount();
 assert.equal(googlePlay.serviceAccount(JSON.stringify(account)).client_email,account.client_email);
 const jwt=await googlePlay.signedAssertion(account,1_800_000_000_000),[head,body,sig]=jwt.split('.');
 const claims=JSON.parse(Buffer.from(body,'base64url'));
 assert.deepEqual(JSON.parse(Buffer.from(head,'base64url')),{alg:'RS256',typ:'JWT'});
 assert.deepEqual(claims,{iss:account.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:1_800_000_000,exp:1_800_003_600});
 assert.equal(await crypto.subtle.verify('RSASSA-PKCS1-v1_5',publicKey,Buffer.from(sig,'base64url'),new TextEncoder().encode(`${head}.${body}`)),true);
 googlePlay.forgetAccessToken();
 const calls=[];const fetch=async(url,init)=>{calls.push({url,init});
  if(url==='https://oauth2.googleapis.com/token')return new Response(JSON.stringify({access_token:'ya29.x',expires_in:3600}),{status:200});
  if(url.includes('/voidedpurchases?'))return new Response(JSON.stringify(url.includes('token=p2')?{voidedPurchases:[{purchaseToken:'b'}]}:{voidedPurchases:[{purchaseToken:'a'}],tokenPagination:{nextPageToken:'p2'}}),{status:200});
  if(url.endsWith(':consume'))return new Response(null,{status:204});
  if(url.includes('/tokens/bad'))return new Response(JSON.stringify({error:{code:400,errors:[{reason:'invalid'}]}}),{status:400});
  return new Response(JSON.stringify(google()),{status:200});};
 const now=1_800_000_000_000;
 assert.deepEqual(await googlePlay.getPurchase(account,'com.harvesttycoon.app','diamonds_500','tok/en',{fetch,now}),google());
 assert.equal(calls[1].url,'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.harvesttycoon.app/purchases/products/diamonds_500/tokens/tok%2Fen');
 assert.equal(calls[1].init.headers.Authorization,'Bearer ya29.x');
 assert.match(String(calls[0].init.body),/grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=/);
 await googlePlay.consumePurchase(account,'com.harvesttycoon.app','diamonds_500','tok',{fetch,now});
 assert.equal(calls.at(-1).init.method,'POST');assert.match(calls.at(-1).url,/tokens\/tok:consume$/);
 assert.equal(calls.filter(c=>c.url.includes('oauth2')).length,1,'one sign-in for both');
 await assert.rejects(googlePlay.getPurchase(account,'com.harvesttycoon.app','diamonds_500','bad',{fetch,now}),e=>e.status===400&&e.reason==='invalid');
 const voided=await googlePlay.voidedPurchases(account,'com.harvesttycoon.app',{since:0,fetch,now});
 assert.deepEqual(voided.map(v=>v.purchaseToken),['a','b'],'every page');
 const start=Number(new URL(calls.find(c=>c.url.includes('voided')).url).searchParams.get('startTime'));
 assert.ok(start>=now-30*86400000&&start<now-29*86400000,'never further back than Google keeps (30 days)');
 googlePlay.forgetAccessToken();
});

test('the app\'s answers are read strictly; links to the app are encoded',()=>{
 assert.equal(readPlay(null),null);assert.equal(readPlay({type:'evil'}),null);
 assert.deepEqual(readPlay({type:'prices',prices:{diamonds_500:{price:'€ 4,99',micros:4990000,currency:'EUR'},'BAD ID':{price:'x'},diamonds_150:{price:'<b>1</b>'},diamonds_1250:{price:'€9,99',micros:-1,currency:'eur'}}}),
  {type:'prices',prices:{diamonds_500:{price:'€ 4,99',micros:4990000,currency:'EUR'},diamonds_1250:{price:'€9,99',micros:null,currency:null}}});
 const p=readPlay({type:'purchase',product:'diamonds_500',token:TOKEN,state:'purchased',account:FARMER,purchase:ROW,order:'GPA.1'});
 assert.deepEqual({...p},{type:'purchase',product:'diamonds_500',token:TOKEN,state:'purchased',account:FARMER,purchase:ROW,order:'GPA.1'});
 assert.equal(readPlay({type:'purchase',product:'diamonds_500',token:'short',state:'purchased'}),null);
 assert.equal(readPlay({type:'purchase',product:'diamonds_500',token:TOKEN,state:'odd',account:'x',purchase:ROW}).account,null);
 assert.deepEqual(readPlay({type:'pending',purchases:[{product:'diamonds_500',token:TOKEN,state:'purchased',account:FARMER,purchase:ROW},{product:'x y'}]}).purchases.length,1);
 assert.deepEqual(readPlay({type:'error',product:'diamonds_500',reason:'whatever'}),{type:'error',product:'diamonds_500',reason:'error'});
 assert.equal(playPricesLink(['diamonds_150','starter_pack']),'playprices://prices?ids=diamonds_150,starter_pack');
 assert.equal(playBuyLink({product:'diamonds_500',account:FARMER,purchase:ROW}),`playbuy://buy?product=diamonds_500&account=${FARMER}&purchase=${ROW}`);
});

test('the play store: one address at a time to the app, each question answered by the app\'s own answer, a sheet waits for its purchase',async()=>{
 const links=[];let clock=0;
 const win={set location(v){},get location(){return {set href(link){links.push(link);}};}};
 Object.defineProperty(win,'location',{value:{set href(link){links.push(link);}}});
 const store=createPlayStore(win,{gapMs:0,answerMs:50,sheetMs:1000,now:()=>clock,sleep:async()=>{}});
 const prices=store.prices(['diamonds_500']);await new Promise(r=>setTimeout(r,0));
 win.harvestPlay({type:'prices',prices:{diamonds_500:{price:'$5.49',micros:5490000,currency:'USD'}}});
 assert.deepEqual(await prices,{diamonds_500:{price:'$5.49',micros:5490000,currency:'USD'}});
 const quiet=await store.prices(['diamonds_500']);assert.deepEqual(quiet,{},'no answer: no prices');
 const others=[];store.onPurchase(m=>others.push(m));
 const sheet=store.buy({product:'diamonds_500',account:FARMER,purchase:ROW});await new Promise(r=>setTimeout(r,0));
 assert.deepEqual(await store.buy({product:'diamonds_150',account:FARMER,purchase:OTHER}),{kind:'error',reason:'busy'},'one sheet at a time');
 win.harvestPlay({type:'purchase',product:'diamonds_500',token:TOKEN,state:'purchased',account:FARMER,purchase:ROW});
 const bought=await sheet;assert.equal(bought.kind,'purchase');assert.equal(bought.token,TOKEN);
 assert.deepEqual(others,[],'the sheet\'s own purchase is the sheet\'s');
 win.harvestPlay({type:'purchase',product:'diamonds_150',token:TOKEN+'2',state:'purchased',account:FARMER,purchase:OTHER});
 assert.equal(others.length,1,'one that finished later (a pending payment) goes to onPurchase');
 const closed=store.buy({product:'diamonds_150',account:FARMER,purchase:OTHER});await new Promise(r=>setTimeout(r,0));
 win.harvestPlay({type:'cancelled',product:'diamonds_150'});assert.deepEqual(await closed,{kind:'cancelled'});
 const pending=store.pending();await new Promise(r=>setTimeout(r,0));
 win.harvestPlay({type:'pending',purchases:[{product:'diamonds_500',token:TOKEN,state:'purchased',account:FARMER,purchase:ROW}]});
 assert.equal((await pending).length,1);
 assert.deepEqual(links,['playprices://prices?ids=diamonds_500','playprices://prices?ids=diamonds_500',`playbuy://buy?product=diamonds_500&account=${FARMER}&purchase=${ROW}`,
  `playbuy://buy?product=diamonds_150&account=${FARMER}&purchase=${OTHER}`,'playpending://pending']);
});

test('the shop is open in the Android app only where it sells through Google Play; prices are Google\'s there',()=>{
 const page=attrs=>({document:{documentElement:{hasAttribute:name=>name in attrs,getAttribute:name=>attrs[name]??null}}});
 assert.equal(playBilling(page({'data-app':'android','data-play-billing':''})),true);assert.equal(playBilling(page({'data-app':'android'})),false);
 assert.equal(portalOff('payments',null,true,false),true,'an app that sells nothing');assert.equal(portalOff('payments',null,true,true),false,'the app 1.1');
 assert.equal(portalOff('payments',{features:{payments:false}},false,true),true,'CrazyGames never');
 assert.equal(shopPrice(null,'500',499),'€4.99');assert.equal(shopPrice({prices:{'500':{price:'US$5.49'}}},'500',499),'US$5.49');
 assert.equal(shopWorth({prices:{offer:{price:'$5.49',micros:5490000,currency:'USD'}}},'offer',499,4999).replace(/\s/g,''),new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(5.49*4999/499).replace(/\s/g,''),'the worth at the same rate as Google\'s price');
 assert.equal(shopWorth(null,'offer',499,4999),'€49.99');
 // public/android-app.js marks it only for the Android app's own user agent with PlayBilling, never the iPhone app.
 const src=read('public/android-app.js');
 const playApp=new Function(`${src.match(/function iosApp\(ua\)\{[^\n]*\}/)[0]}\n${src.match(/function playApp\(ua\)\{[^\n]*\}/)[0]}\nreturn playApp;`)();
 assert.equal(playApp('Mozilla/5.0 (Linux; Android 14; wv) Chrome/129.0 Mobile Safari/537.36 HarvestTycoonApp/1.1 PlayBilling/1'),true);
 assert.equal(playApp('Mozilla/5.0 (Linux; Android 14; wv) Chrome/129.0 Mobile Safari/537.36 HarvestTycoonApp/1.0'),false,'the app 1.0');
 assert.equal(playApp('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 HarvestTycoonApp/1.0 PlayBilling/1'),false,'never the iPhone app');
 assert.equal(playApp('Mozilla/5.0 (Linux; Android 14) Chrome/129.0 Mobile Safari/537.36 PlayBilling/1'),false,'a browser');
});

// diamond-checkout's play_confirm, run with stand-ins for Supabase and Google.
async function confirm({purchase=google(),stored=row(),body={operation:'play_confirm',product:'diamonds_500',token:TOKEN},credit={status:'credited',duplicate:false},key=true}={}){
 let handler;const calls=[],writes=[];let current={...stored};
 const query=()=>{const q={filters:[],select(){return q;},eq(k,v){q.filters.push([k,v]);return q;},update(v){q.update=v;return q;},
  async maybeSingle(){calls.push(['read',q.filters]);return {data:stored&&q.filters.every(([k,v])=>current[k]===v)?current:null,error:null};},
  async single(){calls.push(['read',q.filters]);return {data:current,error:null};},
  then(resolve){writes.push([q.update,q.filters]);if(q.filters.every(([k,v])=>current[k]===v))current={...current,...q.update};resolve({error:null});}};return q;};
 const admin={auth:{async getUser(){return {data:{user:{id:FARMER,app_metadata:{provider:'email'}}},error:null};}},
  async rpc(name,args){calls.push([name,args]);if(name==='harvest_session_active')return {data:true,error:null};if(name==='harvest_credit_play_purchase'){current={...current,status:credit.status};return {data:credit,error:null};}throw new Error(name);},
  from(table){assert.equal(table,'harvest_purchases');return query();}};
 const google_=[];
 const source=stripTypeScriptTypes(read('supabase/functions/diamond-checkout/index.ts').replace(/^import .*;\n/gm,''));
 vm.runInNewContext(source,{...payments,...appStore,serviceAccount:()=>key?{client_email:'x'}:null,
  getPurchase:async(a,pkg,product,token)=>{google_.push(['get',pkg,product,token]);if(purchase instanceof Error)throw purchase;return purchase;},
  consumePurchase:async(a,pkg,product,token)=>{google_.push(['consume',pkg,product,token]);},
  Stripe:class{constructor(){throw new Error('no Stripe for Google Play');}},createClient:()=>admin,Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response,JSON,Date,Object,Promise,Error,Boolean,String,atob,console:{error(){}}});
 const token=`x.${Buffer.from(JSON.stringify({session_id:'s'})).toString('base64url')}.y`;
 const r=await handler(new Request('https://test.invalid/diamond-checkout',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)}));
 return {status:r.status,data:await r.json(),calls,writes,google:google_};
}
test('play_confirm: Google is asked, the farm credited once for this farmer\'s row, then the purchase consumed',async()=>{
 const r=await confirm();
 assert.equal(r.status,200);assert.equal(r.data.status,'credited');assert.equal(r.data.duplicate,false);assert.equal(r.data.id,ROW);
 assert.deepEqual(r.google,[['get','com.harvesttycoon.app','diamonds_500',TOKEN],['consume','com.harvesttycoon.app','diamonds_500',TOKEN]]);
 assert.deepEqual({...r.calls.find(c=>c[0]==='harvest_credit_play_purchase')[1]},{p_purchase:ROW,p_token:TOKEN,p_order:'GPA.1234-5678',p_test:false});
 const again=await confirm({purchase:google({consumptionState:1}),credit:{status:'credited',duplicate:true}});
 assert.equal(again.data.duplicate,true,'sent again by the app: no second window');assert.deepEqual(again.google.map(g=>g[0]),['get'],'consumed already');
 const test=await confirm({purchase:google({purchaseType:0})});assert.equal(test.calls.find(c=>c[0]==='harvest_credit_play_purchase')[1].p_test,true);
});
test('play_confirm refuses what is not this farmer\'s purchase and credits nothing for pending, cancelled or unknown ones',async()=>{
 const credited=r=>r.calls.some(c=>c[0]==='harvest_credit_play_purchase');
 const other=await confirm({purchase:google({obfuscatedExternalAccountId:OTHER})});assert.equal(other.status,403);assert.equal(credited(other),false);
 const foreign=await confirm({purchase:google({obfuscatedExternalProfileId:undefined})});assert.equal(foreign.status,409);assert.equal(credited(foreign),false);
 const missing=await confirm({stored:null});assert.equal(missing.status,404);
 const product=await confirm({body:{operation:'play_confirm',product:'diamonds_150',token:TOKEN}});assert.equal(product.status,409);assert.equal(credited(product),false);
 const pending=await confirm({purchase:google({purchaseState:2})});assert.equal(pending.data.status,'pending');assert.equal(credited(pending),false);assert.deepEqual(pending.google.map(g=>g[0]),['get']);
 const cancelled=await confirm({purchase:google({purchaseState:1})});assert.equal(cancelled.data.status,'expired');assert.deepEqual({...cancelled.writes[0][0]},{status:'expired'});
 const unknown=await confirm({purchase:Object.assign(new Error('x'),{status:410})});assert.equal(unknown.status,404);
 const bad=await confirm({body:{operation:'play_confirm',product:'diamonds_500',token:'short'}});assert.equal(bad.status,400);assert.deepEqual(bad.google,[]);
 const off=await confirm({key:false});assert.equal(off.status,503);
 // The App Store's confirm (Oct 2026) is a request of its own: it never asks Google, and what Apple did not sign credits nothing.
 for(const transaction of ['a.b.c',TOKEN,`${Buffer.from('{"alg":"ES256","x5c":[]}').toString('base64url')}.e30.${'A'.repeat(86)}`]){
  const apple=await confirm({body:{operation:'apple_confirm',store:'app_store',product:'diamonds_500',transaction}});
  assert.equal(apple.status,400,transaction);assert.equal(apple.data.finish,false);assert.equal(credited(apple),false);assert.deepEqual(apple.google,[],'Google is not asked');
 }
});

test('google-play.sql: Stripe\'s credit replaced only from the definition read live, one grant for both, refunds and the hourly check',()=>{
 const sql=read('supabase/google-play.sql');
 assert.match(sql,/not in \('963c3c96a5a1f1bcd7e0faa77d05e839'\)/);
 assert.match(sql,/if purchase\.livemode then perform public\.harvest_purchase_grant\(p_purchase\); end if;/);
 assert.match(sql,/if not p_test then perform public\.harvest_purchase_grant\(p_purchase\); end if;/);
 assert.match(sql,/check \(status in \('pending','credited','test_paid','expired','refunded'\)\)/);
 assert.match(sql,/create unique index if not exists harvest_purchases_play_token on public\.harvest_purchases\(play_token\) where play_token is not null;/);
 for(const fn of ['harvest_purchase_grant\\(uuid\\)','harvest_credit_play_purchase\\(uuid,text,text,boolean\\)','harvest_revoke_play_purchases\\(jsonb\\)','harvest_job_begin\\(text,integer\\)','harvest_credit_purchase\\(uuid,text,text,text,boolean\\)'])
  assert.match(sql,new RegExp(`revoke all on function public\\.${fn} from public, anon, authenticated;`),fn);
 assert.match(sql,/greatest\(0,coalesce\(\(farm_state->>'diamonds'\)::bigint,0\)-purchase\.diamonds\)/,'never below 0');
 assert.match(sql,/cron\.schedule\('harvest-play-voided','41 \* \* \* \*'/);
 assert.doesNotMatch(sql,/\{20,1024\}/,'Postgres allows at most 255 repeats in a regular expression');
 const voided=read('supabase/functions/play-voided/index.ts');
 assert.match(voided,/harvest_job_begin',\{p_name:'play-voided',p_gap_minutes:20\}/);
 assert.match(read('scripts/sync-game.mjs'),/for\(const name of \['diamond-checkout','play-voided'\]\)copyFileSync\(new URL\('\.\.\/game\/google-play\.js'/);
 for(const fn of ['diamond-checkout','play-voided'])assert.equal(read(`supabase/functions/${fn}/google-play.js`),read('game/google-play.js'),fn);
});
