// Purchases in the iPhone app through the App Store (Oct 2026, the app 1.1), the page's side: the marks (public/android-app.js,
// public/android.js, public/portal.js), the page's talk with the app (src/app-store.js) and the shop's own lines. The bridge itself
// (src/main.js: apple_confirm, finish) is tested in tests/auth-gate.test.mjs, the server's side in its own tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readAppStore,createAppStore,APP_STORE_ERRORS} from '../src/app-store.js';
import {appStoreBilling,appBilling,playBilling,APP_STORE_LINKS,appStorePricesLink,appStoreBuyLink,appStoreFinishLink} from '../public/android.js';
import {portalOff} from '../public/portal.js';
import {APPLE_JWS_MAX,APPLE_PRODUCTS} from '../game/payments.js';
import {wikiArticle} from '../public/wiki-content.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const FARMER='0000000a-0000-4000-8000-000000000000',OTHER='0000000b-0000-4000-8000-000000000000',ROW='1111111a-0000-4000-8000-000000000000',ROW2='2222222a-0000-4000-8000-000000000000';
// An App Store signed transaction has the shape of a JWS: three base64url parts (the server checks Apple's signature, not the page).
const JWS='eyJhbGciOiJFUzI1NiIsIng1YyI6WyJNSUkiXX0.eyJ0cmFuc2FjdGlvbklkIjoiMjAwMDAwMDEyMzQ1Njc4In0.c2lnbmF0dXJlXy0';
const ORDER='2000000123456789';
const bought=(over={})=>({type:'purchase',product:'diamonds_500',token:JWS,order:ORDER,state:'purchased',account:FARMER,purchase:ROW,...over});
const tick=()=>new Promise(r=>setTimeout(r,0));

test('the App Store\'s answers are read strictly: Apple\'s signed transaction, its transaction id, our UUIDs or nothing',()=>{
 assert.equal(readAppStore(null),null);assert.equal(readAppStore({type:'evil'}),null);assert.equal(readAppStore({type:'owned'}),null);
 assert.deepEqual(readAppStore({type:'prices',prices:{diamonds_500:{price:'4,99 €',micros:4990000,currency:'EUR'},'BAD ID':{price:'x'},diamonds_150:{price:'<b>1</b>'},diamonds_1250:{price:'9,99 €',micros:9.99,currency:'eur'},starter_pack:{price:''}}}),
  {type:'prices',prices:{diamonds_500:{price:'4,99 €',micros:4990000,currency:'EUR'},diamonds_1250:{price:'9,99 €',micros:null,currency:null}}});
 assert.deepEqual(readAppStore({type:'prices',prices:null,code:2}),{type:'prices',prices:{}},'a failure: no prices');
 assert.deepEqual({...readAppStore(bought())},{type:'purchase',product:'diamonds_500',token:JWS,order:ORDER,state:'purchased',account:FARMER,purchase:ROW});
 // StoreKit writes the appAccountToken in capitals; the page compares it with our own (small) ids.
 assert.equal(readAppStore(bought({purchase:ROW.toUpperCase(),account:FARMER.toUpperCase()})).purchase,ROW);assert.equal(readAppStore(bought({account:FARMER.toUpperCase()})).account,FARMER);
 assert.equal(readAppStore(bought({account:null})).account,null,'after a new install the app may not know whose it is');
 assert.equal(readAppStore(bought({account:'x',purchase:'1'})).purchase,null);
 assert.equal(readAppStore(bought({state:'pending'})).state,'unknown','the App Store reports only bought ones; anything else is never confirmed');
 for(const token of ['short','a.b','a.b.c.d','a.b.c=','<a>.b.c',`${'a'.repeat(APPLE_JWS_MAX)}.b.c`,null,42])assert.equal(readAppStore(bought({token})),null,`token: ${String(token).slice(0,20)}`);
 assert.equal(readAppStore(bought({token:`${'a'.repeat(APPLE_JWS_MAX-4)}.b.c`})).token.length,APPLE_JWS_MAX,'up to 16,000 characters');
 for(const order of ['','12a','-1','1'.repeat(21),12,null,undefined])assert.equal(readAppStore(bought({order})),null,`order: ${order}`);
 for(const product of ['','BAD','x y','a'.repeat(41),null])assert.equal(readAppStore(bought({product})),null,`product: ${product}`);
 assert.equal(readAppStore({type:'pending',purchases:[bought(),{product:'x y'},bought({order:'x'})]}).purchases.length,1);
 assert.deepEqual(readAppStore({type:'pending'}),{type:'pending',purchases:[]});
 assert.deepEqual(readAppStore({type:'deferred',product:'starter_pack',purchase:ROW.toUpperCase()}),{type:'deferred',product:'starter_pack',purchase:ROW});
 assert.deepEqual(readAppStore({type:'finished',transaction:ORDER,ok:true}),{type:'finished',transaction:ORDER,ok:true});
 assert.deepEqual(readAppStore({type:'finished',transaction:ORDER,ok:'yes'}),{type:'finished',transaction:ORDER,ok:false});
 assert.equal(readAppStore({type:'finished',transaction:'abc',ok:true}),null);
 assert.deepEqual(readAppStore({type:'cancelled',product:'diamonds_500'}),{type:'cancelled',product:'diamonds_500'});
 for(const reason of ['unavailable','not_found','invalid','busy','error'])assert.deepEqual(readAppStore({type:'error',product:'diamonds_500',code:1,reason}),{type:'error',product:'diamonds_500',reason});
 assert.deepEqual(readAppStore({type:'error',product:'<x>',reason:'owned'}),{type:'error',product:null,reason:'error'},'Google Play\'s "owned" is not an App Store answer');
});

test('the addresses to the app: the same products as Google Play, every part encoded, finish with Apple\'s transaction id',()=>{
 assert.deepEqual({...APP_STORE_LINKS},{prices:'appstoreprices://prices',buy:'appstorebuy://buy',pending:'appstorepending://pending',finish:'appstorefinish://finish'});
 assert.ok(Object.isFrozen(APP_STORE_LINKS));
 assert.equal(appStorePricesLink([...new Set(Object.values(APPLE_PRODUCTS))]),'appstoreprices://prices?ids=diamonds_150,diamonds_500,diamonds_1250,diamonds_3500,starter_pack,special_offer,halloween_pass_2026');
 assert.equal(appStoreBuyLink({product:'diamonds_500',account:FARMER,purchase:ROW}),`appstorebuy://buy?product=diamonds_500&account=${FARMER}&purchase=${ROW}`);
 assert.equal(appStoreBuyLink({product:'a&b',account:'c=d',purchase:'e f'}),'appstorebuy://buy?product=a%26b&account=c%3Dd&purchase=e%20f');
 assert.equal(appStoreFinishLink(ORDER),`appstorefinish://finish?transaction=${ORDER}`);assert.equal(appStoreFinishLink('1&x'),'appstorefinish://finish?transaction=1%26x');
});

// A page that records every address it goes to, with a clock that only moves when the store waits.
function page(){
 const links=[],at=[];let clock=1000;const win={};
 Object.defineProperty(win,'location',{value:{set href(link){links.push(link);at.push(clock);}}});
 return {win,links,at,now:()=>clock,sleep:async ms=>{clock+=ms;}};
}
test('the App Store: one address at a time, at least 350 ms apart; each question waits for its own answer; no answer is no prices',async()=>{
 const p=page(),store=createAppStore(p.win,{answerMs:50,now:p.now,sleep:p.sleep});
 assert.equal(typeof p.win.harvestAppStore,'function','the app answers here');
 const prices=store.prices(['diamonds_500','diamonds_150']);await tick();
 p.win.harvestAppStore({type:'purchase',...bought()});p.win.harvestAppStore({type:'evil'});
 p.win.harvestAppStore({type:'prices',prices:{diamonds_500:{price:'$5.49',micros:5490000,currency:'USD'}}});
 assert.deepEqual(await prices,{diamonds_500:{price:'$5.49',micros:5490000,currency:'USD'}});
 assert.deepEqual(await store.prices(['diamonds_500']),{},'no answer: no prices, the shop stays closed');
 const pending=store.pending();await tick();
 p.win.harvestAppStore({type:'pending',purchases:[bought(),bought({token:'bad'})]});
 assert.deepEqual((await pending).map(m=>m.order),[ORDER]);
 assert.deepEqual(await store.pending(),[],'no answer: nothing pending');
 // Three addresses asked at once still go one at a time, each at least 350 ms after the one before.
 void store.prices(['diamonds_150']);void store.pending();void store.finish(ORDER);await tick();await tick();await tick();await tick();
 assert.deepEqual(p.links,['appstoreprices://prices?ids=diamonds_500,diamonds_150','appstoreprices://prices?ids=diamonds_500','appstorepending://pending','appstorepending://pending','appstoreprices://prices?ids=diamonds_150','appstorepending://pending',`appstorefinish://finish?transaction=${ORDER}`]);
 for(let i=1;i<p.at.length;i++)assert.ok(p.at[i]-p.at[i-1]>=350,`address ${i}: ${p.at[i]-p.at[i-1]} ms after the one before`);
});

test('the App Store\'s sheet: one at a time, its own purchase, Ask to Buy as pending, cancelled, errors, nothing after 20 minutes',async()=>{
 const p=page(),store=createAppStore(p.win,{gapMs:0,answerMs:50,sheetMs:200,now:p.now,sleep:p.sleep}),others=[];
 const stop=store.onPurchase(m=>others.push(m));
 const sheet=store.buy({product:'diamonds_500',account:FARMER,purchase:ROW});await tick();
 assert.equal(p.links.at(-1),`appstorebuy://buy?product=diamonds_500&account=${FARMER}&purchase=${ROW}`);
 assert.deepEqual(await store.buy({product:'diamonds_150',account:FARMER,purchase:ROW2}),{kind:'error',reason:'busy'},'one sheet at a time');
 assert.equal(p.links.length,1,'the second sheet never reaches the app');
 // A purchase for another row while the sheet is open (Ask to Buy said yes) is not the sheet's: it goes to onPurchase.
 p.win.harvestAppStore(bought({purchase:ROW2,order:'7',product:'diamonds_150'}));
 p.win.harvestAppStore(bought({purchase:ROW.toUpperCase()}));
 const result=await sheet;assert.equal(result.kind,'purchase');assert.equal(result.token,JWS);assert.equal(result.order,ORDER);assert.equal(result.state,'purchased');
 assert.deepEqual(others.map(m=>m.order),['7'],'the sheet\'s own purchase is the sheet\'s');
 // Ask to Buy (or a bank's check): no transaction yet, the window says it is on its way; the approved one comes later as a purchase.
 const ask=store.buy({product:'starter_pack',account:FARMER,purchase:ROW2});await tick();
 p.win.harvestAppStore({type:'deferred',product:'starter_pack',purchase:ROW});
 p.win.harvestAppStore({type:'deferred',product:'starter_pack',purchase:ROW2});
 assert.deepEqual(await ask,{kind:'purchase',product:'starter_pack',state:'pending',account:FARMER,purchase:ROW2});
 p.win.harvestAppStore(bought({purchase:ROW2,product:'starter_pack',order:'8'}));assert.deepEqual(others.map(m=>m.order),['7','8'],'approved later: onPurchase');
 const closed=store.buy({product:'diamonds_150',account:FARMER,purchase:ROW});await tick();
 p.win.harvestAppStore({type:'cancelled',product:'diamonds_500'});p.win.harvestAppStore({type:'cancelled',product:'diamonds_150'});
 assert.deepEqual(await closed,{kind:'cancelled'});
 const failed=store.buy({product:'diamonds_150',account:FARMER,purchase:ROW});await tick();
 p.win.harvestAppStore({type:'error',product:'diamonds_150',code:0,reason:'not_found'});assert.deepEqual(await failed,{kind:'error',reason:'not_found'});
 const silent=store.buy({product:'diamonds_150',account:FARMER,purchase:ROW});
 assert.equal(await silent,null,'no answer at all: null (src/main.js says the App Store is not available)');
 const again=store.buy({product:'diamonds_150',account:FARMER,purchase:ROW});await tick();
 p.win.harvestAppStore({type:'cancelled'});assert.deepEqual(await again,{kind:'cancelled'},'the sheet is free again after each answer');
 stop();p.win.harvestAppStore(bought({purchase:ROW2,order:'9'}));assert.equal(others.length,2,'a listener can leave');
});

test('finish: only Apple\'s transaction id goes to the app, and only the answer for that transaction counts',async()=>{
 const p=page(),store=createAppStore(p.win,{gapMs:0,answerMs:50,now:p.now,sleep:p.sleep});
 const done=store.finish(ORDER);await tick();
 assert.deepEqual(p.links,[`appstorefinish://finish?transaction=${ORDER}`]);
 p.win.harvestAppStore({type:'finished',transaction:'1',ok:false});p.win.harvestAppStore({type:'finished',transaction:ORDER,ok:true});
 assert.equal(await done,true);
 const refused=store.finish('42');await tick();p.win.harvestAppStore({type:'finished',transaction:'42',ok:false});assert.equal(await refused,false,'the app could not find it');
 assert.equal(await store.finish('43'),null,'no answer: it comes back at the next start, and the server knows it is credited');
 for(const bad of ['',null,'1e5','12 3',`${ORDER}&x=1`])assert.equal(await store.finish(bad),false,String(bad));
 assert.equal(p.links.length,3,'a bad id never reaches the app');
});

test('the shop opens in the iPhone app that sells through the App Store, as in the Android app 1.1; never where nothing is sold',()=>{
 const html=attrs=>({hasAttribute:name=>name in attrs,getAttribute:name=>attrs[name]??null});
 const win=attrs=>({document:{documentElement:html(attrs)}});
 const ios={'data-app':'android','data-app-os':'ios','data-app-store-billing':'','data-app-billing':''},android={'data-app':'android','data-play-billing':'','data-app-billing':''};
 assert.equal(appStoreBilling(win(ios)),true);assert.equal(playBilling(win(ios)),false);assert.equal(appBilling(win(ios)),true);
 assert.equal(appStoreBilling(win(android)),false);assert.equal(appBilling(win(android)),true);
 assert.equal(appBilling(win({'data-app':'android','data-app-os':'ios'})),false,'the iPhone app 1.0');assert.equal(appBilling(win({})),false,'the website');
 const frame={document:{documentElement:html({'data-app':'android'})},parent:win(ios)};
 assert.equal(appStoreBilling(frame),true,'the game frame asks the page around it');
 const blocked={document:{documentElement:html({})},get parent(){throw new Error('cross-origin');}};assert.equal(appBilling(blocked),false);
 assert.equal(portalOff('payments',null,true,appBilling(win(ios))),false,'the iPhone app 1.1');
 assert.equal(portalOff('payments',null,true,appBilling(win({'data-app':'android','data-app-os':'ios'}))),true,'the iPhone app 1.0');
 assert.equal(portalOff('payments',{features:{payments:false}},false,true),true,'CrazyGames never');
 assert.equal(portalOff('payments'),false,'no window: the website');
 // public/android.css: one mark for either store.
 const css=read('public/android.css');assert.match(css,/html\[data-app=android\]:not\(\[data-app-billing\]\) #diamond-store,/);assert.doesNotMatch(css,/:not\(\[data-play-billing\]\)/);
});

test('the shop\'s buttons come back after any app store\'s sheet; its errors and the wiki name the App Store',()=>{
 // Stripe leaves the page; an app store's sheet comes back with {store}, and the button is ready again (a closed sheet buys nothing).
 for(const file of ['public/boosts-ui.js','src/starter-pack-ui.js','src/offer-ui.js','public/pass-ui.js']){
  const src=read(file);assert.match(src,/const done=await bridge(\(\))?\.checkout\([^)]*\);if\(done\?\.store\)\{/,file);assert.doesNotMatch(src,/google_play/,file);
 }
 assert.deepEqual(Object.keys(APP_STORE_ERRORS).sort(),['busy','error','invalid','not_found','unavailable']);
 for(const text of Object.values(APP_STORE_ERRORS))assert.ok(text.length<=90&&!/Google/.test(text),text);
 assert.match(APP_STORE_ERRORS.unavailable,/App Store/);assert.match(APP_STORE_ERRORS.not_found,/App Store/);
 // Every text a player can see is in the catalogue the translations are checked against (node scripts/i18n-extract.mjs).
 const catalog=JSON.parse(read('i18n/catalog.json'));
 for(const text of Object.values(APP_STORE_ERRORS))assert.ok(text in catalog,text);
 const diamonds=ctx=>wikiArticle('diamonds',ctx).html;
 assert.match(diamonds({app:true,appStore:true}),/Payments go through the App Store; we never see your card\./);
 assert.match(diamonds({app:true,play:true}),/Payments go through Google Play;/);assert.match(diamonds({}),/Payments go through Stripe;/);
 assert.doesNotMatch(diamonds({app:true}),/id="sec-buying-diamonds"/,'an app that sells nothing leaves it out');
 assert.doesNotMatch(diamonds({app:true,appStore:true,portal:true}),/id="sec-buying-diamonds"/,'never on CrazyGames');
});
