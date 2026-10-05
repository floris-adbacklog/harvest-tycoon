// Purchases in the iPhone app through the App Store (Oct 2026), the server half: Apple's signature check (game/app-store.js), a
// purchase against its row (game/payments.js checkApplePurchase), diamond-checkout's create and apple_confirm, app-store-notify, the
// SQL, the synced copies and the admin label. Signatures come from a test CA shaped like Apple's (tests/fixtures/app-store/make.sh);
// each test signs its own JWS with the test leaf's key, so the fixtures never run out.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {X509Certificate,createHash,createPrivateKey,generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import * as payments from '../game/payments.js';
import * as appStore from '../game/app-store.js';
import {handleAdminPurchases} from '../supabase/functions/farm-api/admin-analytics-service.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const fixture=name=>read(`tests/fixtures/app-store/${name}`);
const der=name=>new X509Certificate(fixture(`${name}.pem`)).raw;
const b64=name=>der(name).toString('base64');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const ROOT=der('root'),TEST={rootDer:ROOT,rootSha256:sha(ROOT)},LEAF_KEY=createPrivateKey(fixture('leaf.key'));
const NOW=Date.UTC(2026,9,5,12),TX='2000000123456789';
const FARMER='0000000a-0000-4000-8000-000000000000',OTHER='0000000b-0000-4000-8000-000000000000',ROW='1111111a-0000-4000-8000-00000000000a',REQ='2222222a-0000-4000-8000-00000000000b';
const part=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function jws(payload,{chain=['leaf','intermediate','root'],key=LEAF_KEY,header={}}={}){
 const signed=`${part({alg:'ES256',x5c:chain.map(b64),...header})}.${part(payload)}`;
 return `${signed}.${sign('sha256',Buffer.from(signed),{key,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
}
// A transaction as StoreKit's jwsRepresentation carries it (Apple may write the appAccountToken in capitals).
const tx=(over={})=>({transactionId:TX,originalTransactionId:TX,bundleId:'com.harvesttycoon.app',productId:'diamonds_500',type:'Consumable',purchaseDate:NOW-5000,
 originalPurchaseDate:NOW-5000,quantity:1,inAppOwnershipType:'PURCHASED',signedDate:NOW,environment:'Production',transactionReason:'PURCHASE',storefront:'NLD',
 storefrontId:'143452',price:4990,currency:'EUR',appAccountToken:ROW.toUpperCase(),...over});
const row=(over={})=>({id:ROW,player_id:FARMER,pack:'500',diamonds:500,coins:0,amount_cents:499,price_id:'diamonds_500',store:'app_store',status:'pending',livemode:true,
 vip_days:0,stripe_session_id:null,apple_transaction_id:null,created_at:new Date(Date.now()-60000).toISOString(),...over});
const verify=(token,options={})=>appStore.verifyAppleJws(token,{...TEST,...options});

test('Apple Root CA - G3 is bundled and pinned by the fingerprint of Apple\'s own file',()=>{
 const root=Buffer.from(appStore.APPLE_ROOT_G3,'base64'),cert=new X509Certificate(root);
 assert.equal(sha(root),appStore.APPLE_ROOT_G3_SHA256);
 assert.equal(appStore.APPLE_ROOT_G3_SHA256,'63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179');
 assert.match(cert.subject,/CN=Apple Root CA - G3/);assert.equal(cert.ca,true);assert.equal(cert.checkIssued(cert),true);assert.match(cert.validTo,/2039/);
});

test('verifyAppleJws: signed by a leaf under the pinned root it is read; changed, or under another root, it is refused',async()=>{
 const good=jws(tx()),[h,p,s]=good.split('.');
 assert.deepEqual(await verify(good),tx());
 assert.deepEqual(appStore.decodeJwsPayload(good),tx(),'the payload of one checked already');
 await assert.rejects(verify(`${h}.${part(tx({productId:'diamonds_3500'}))}.${s}`),/the JWS signature does not match/,'payload changed after signing');
 const flipped=Buffer.from(s,'base64url');flipped[10]^=1;
 await assert.rejects(verify(`${h}.${p}.${flipped.toString('base64url')}`),/the JWS signature does not match/,'signature changed');
 await assert.rejects(verify(`${part({alg:'ES256',x5c:['leaf','intermediate','other-root'].map(b64)})}.${p}.${s}`),/the JWS signature does not match/,'header changed');
 await assert.rejects(verify(jws(tx(),{key:generateKeyPairSync('ec',{namedCurve:'P-256'}).privateKey})),/the JWS signature does not match/,'not the leaf\'s key');
 assert.equal((await verify(jws(tx(),{chain:['leaf','intermediate','other-root']}))).transactionId,TX,'x5c[2] is ignored: the pinned root decides');
 const other=der('other-root');
 await assert.rejects(verify(good,{rootDer:other,rootSha256:sha(other)}),/the certificate chain does not lead to the root/,'another root with the same name');
 await assert.rejects(verify(good,{rootSha256:appStore.APPLE_ROOT_G3_SHA256}),/the pinned root does not match/,'a root that is not the pinned one');
 await assert.rejects(appStore.verifyAppleJws(good),/the certificate chain does not lead to the root/,'by default only Apple\'s root counts');
 await assert.rejects(verify(jws(tx(),{chain:['intermediate','leaf','root']})),/Not a valid App Store signature/,'the chain in the wrong order');
});

test('verifyAppleJws: both of Apple\'s markers are needed, and the intermediate must be a CA',async()=>{
 // The twins have the same key and name, so their signatures still match: only the marker refuses them.
 const leaf=new X509Certificate(fixture('leaf.pem')),inter=new X509Certificate(fixture('intermediate.pem'));
 assert.equal(new X509Certificate(fixture('leaf-no-oid.pem')).verify(inter.publicKey),true);
 for(const twin of ['intermediate-no-oid','intermediate-not-ca'])assert.equal(leaf.verify(new X509Certificate(fixture(`${twin}.pem`)).publicKey),true,twin);
 await assert.rejects(verify(jws(tx(),{chain:['leaf','intermediate-no-oid','root']})),/the intermediate is not Apple's WWDR CA/);
 await assert.rejects(verify(jws(tx(),{chain:['leaf','intermediate-not-ca','root']})),/the intermediate is not Apple's WWDR CA/);
 await assert.rejects(verify(jws(tx(),{chain:['leaf-no-oid','intermediate','root']})),/the leaf is not an App Store signing certificate/);
});

test('verifyAppleJws: every certificate must be valid at the JWS\'s signedDate (a minute of leeway), not now; checked every time',async()=>{
 // The test leaf: 1 Jan 2025 to 1 Jan 2027.
 assert.ok(await verify(jws(tx({signedDate:Date.UTC(2025,0,1)}))));
 assert.ok(await verify(jws(tx({signedDate:Date.UTC(2027,0,1,0,0,30)}))),'within the minute');
 await assert.rejects(verify(jws(tx({signedDate:Date.UTC(2027,0,1,0,2)}))),/a certificate was not valid at signedDate/,'signed after the leaf ran out');
 await assert.rejects(verify(jws(tx({signedDate:Date.UTC(2024,11,31,23,58)}))),/a certificate was not valid at signedDate/,'signed before the leaf began');
 await assert.rejects(verify(jws(tx({signedDate:Date.UTC(2050,0,1)}))),/a certificate was not valid at signedDate/,'after the root ran out');
 assert.ok(await verify(jws(tx({signedDate:Date.UTC(2026,5,1)})),{now:Date.UTC(2031,0,1)}),'an old signature stays good after its leaf rotated');
 assert.ok(await verify(jws(tx({signedDate:undefined})),{now:NOW}),'no signedDate: checked at now');
 await assert.rejects(verify(jws(tx({signedDate:undefined})),{now:Date.UTC(2028,0,1)}),/a certificate was not valid at signedDate/);
 await assert.rejects(verify(jws(tx({signedDate:'2026-10-05'})),{now:Date.UTC(2028,0,1)}),/a certificate was not valid at signedDate/,'only a number counts as signedDate');
});

test('verifyAppleJws: malformed input is refused every time, quickly, never read past its end',async()=>{
 const good=jws(tx()),[h,p,s]=good.split('.'),x5c=['leaf','intermediate','root'].map(b64);
 const header=over=>part({alg:'ES256',x5c,...over});
 const cases=[undefined,null,42,{},[],'','a','a.b','a.b.c','a.b.c.d','..',`${h}.${p}`,`${h}.${p}.${s}.`,`${h}.${p}.${s}x`,`${h}.${p}.${s.slice(0,-2)}`,'x'.repeat(70000),
  `${header({alg:'RS256'})}.${p}.${s}`,`${header({alg:'none'})}.${p}.${s}`,`${header({x5c:x5c.slice(0,2)})}.${p}.${s}`,`${header({x5c:[...x5c,x5c[2]]})}.${p}.${s}`,
  `${header({x5c:[1,2,3]})}.${p}.${s}`,`${header({x5c:'abc'})}.${p}.${s}`,`${part([1,2])}.${p}.${s}`,`${part(null)}.${p}.${s}`,`${Buffer.from('not json').toString('base64url')}.${p}.${s}`,
  `${h}.${Buffer.from([0x7b,0xff,0xfe,0x7d]).toString('base64url')}.${s}`,`${h}.${part('a string')}.${s}`,`${h}.${p}.${s.replace(/./,'+')}`,`${h.replace(/./,'=')}.${p}.${s}`,
  `${header({x5c:['!!!!',x5c[1],x5c[2]]})}.${p}.${s}`,`${header({x5c:[x5c[0]+'=',x5c[1],x5c[2]]})}.${p}.${s}`,`${header({x5c:['',x5c[1],x5c[2]]})}.${p}.${s}`,
  `${header({x5c:['QUFB'.repeat(4000),x5c[1],x5c[2]]})}.${p}.${s}`];
 for(const c of cases)await assert.rejects(verify(c),/Not a valid App Store signature/,String(c).slice(0,60));
 // Every cut of the leaf, the leaf with each byte changed, and random bytes: refused, whatever the DER says its lengths are.
 const leaf=der('leaf'),withLeaf=bytes=>`${header({x5c:[Buffer.from(bytes).toString('base64'),x5c[1],x5c[2]]})}.${p}.${s}`;
 const started=Date.now();
 for(let n=0;n<leaf.length;n++)await assert.rejects(verify(withLeaf(leaf.subarray(0,n))),undefined,`cut at ${n}`);
 for(let i=0;i<leaf.length;i++)for(const bit of [0x01,0x80,0xff]){const m=Buffer.from(leaf);m[i]^=bit;await assert.rejects(verify(withLeaf(m)),undefined,`byte ${i} ^ ${bit}`);}
 for(let i=0;i<200;i++)await assert.rejects(verify(withLeaf(randomBytes(1+i*4))));
 for(const bytes of [[0x30,0x83,0xff,0xff,0xff],[0x30,0x84,0,0,0,1,0],[0x30,0x80,0,0],[0x1f,0x01,0],[0x30,0x02,0x30,0x05],Array(4000).fill(0x30)])await assert.rejects(verify(withLeaf(bytes)),undefined,String(bytes.slice(0,6)));
 assert.ok(Date.now()-started<20000,'quick');
 // A chain checked already is kept, but its dates and the JWS's own signature are still checked each time.
 assert.ok(await verify(good));
 const flipped=Buffer.from(s,'base64url');flipped[0]^=1;
 await assert.rejects(verify(`${h}.${p}.${flipped.toString('base64url')}`),/the JWS signature does not match/);
 await assert.rejects(verify(jws(tx({signedDate:Date.UTC(2028,0,1)}))),/not valid at signedDate/);
 assert.throws(()=>appStore.decodeJwsPayload('a.b'));assert.throws(()=>appStore.decodeJwsPayload(`${h}.${part([1])}.${s}`));
});

test('checkApplePurchase: only Apple\'s word for this app, this row and this farmer counts; the sandbox is a test, a refund is revoked',()=>{
 const check=(t,r=row(),product='diamonds_500',player=FARMER)=>payments.checkApplePurchase(t,r,{product,player});
 assert.deepEqual(check(tx()),{state:'purchased',test:false,transaction:TX,original:TX});
 assert.equal(check(tx({appAccountToken:ROW})).state,'purchased','in small letters as well');
 assert.deepEqual(check(tx({environment:'Sandbox'})),{state:'purchased',test:true,transaction:TX,original:TX},'App Review and TestFlight');
 assert.equal(check(tx({revocationDate:NOW,revocationReason:0})).state,'revoked');
 assert.equal(check(tx({originalTransactionId:undefined})).original,TX);
 const refused=[[tx({bundleId:'com.example.other'})],[tx({productId:'diamonds_150'})],[tx(),row(),'diamonds_150'],[tx({type:'Non-Consumable'})],[tx({type:'Auto-Renewable Subscription'})],
  [tx({quantity:2})],[tx({quantity:undefined})],[tx({environment:'Xcode'})],[tx({environment:'LocalTesting'})],[tx({environment:undefined})],
  [tx({appAccountToken:OTHER})],[tx({appAccountToken:undefined})],[tx({appAccountToken:42})],[tx(),row({player_id:OTHER})],[tx(),row(),'diamonds_500',OTHER],
  [tx(),row({diamonds:5000})],[tx(),row({amount_cents:199})],[tx(),row({coins:10})],[tx({transactionId:'abc'})],[tx({transactionId:Number(TX)})],[tx({transactionId:'1'.repeat(21)})],
  [tx({originalTransactionId:'x'})],[tx({productId:'halloween_pass_2026'}),row({pack:'pass',diamonds:0,coins:0,pass_id:'other-pass'}),'halloween_pass_2026'],
  [tx({productId:'special_offer'}),row({pack:'offer',offer_id:ROW,diamonds:1,coins:0}),'special_offer'],[null],['text'],[tx(),null]];
 for(const [t,r=row(),product='diamonds_500',player=FARMER] of refused)assert.throws(()=>payments.checkApplePurchase(t,r,{product,player}),Error,JSON.stringify([t,r,product,player]).slice(0,160));
 assert.throws(()=>payments.checkApplePurchase(tx(),row(),{product:'diamonds_500',player:undefined}),Error,'no farmer');
 const pass=row({pack:'pass',diamonds:0,coins:0,pass_id:payments.PASS.id,price_id:'halloween_pass_2026'});
 assert.equal(check(tx({productId:'halloween_pass_2026'}),pass,'halloween_pass_2026').state,'purchased');
 assert.equal(check(tx({productId:'starter_pack'}),row({pack:'starter',diamonds:500,coins:10000,amount_cents:299}),'starter_pack').state,'purchased');
 // A deleted account's row has no farmer: only app-store-notify (no farmer either) may record it.
 const gone=row({player_id:null,account_deleted_at:'2026-10-04T10:00:00Z'});
 assert.equal(payments.checkApplePurchase(tx(),gone,{product:'diamonds_500',player:null}).state,'purchased');
 assert.throws(()=>payments.checkApplePurchase(tx(),gone,{product:'diamonds_500',player:FARMER}));
 assert.throws(()=>payments.checkApplePurchase(tx(),row({player_id:null}),{product:'diamonds_500',player:null}),Error,'no farmer and not deleted');
 assert.equal(payments.APPLE_PRODUCTS,payments.PLAY_PRODUCTS,'the same product ids as Google Play');assert.equal(payments.appleProduct('__proto__'),null);
});

// A stand-in for Supabase: tables of rows, the queries diamond-checkout and app-store-notify make, and the purchase functions as the SQL
// does them (enough for the flow; the SQL itself is checked as text below).
function fakeDb(tables,{fail}={}){
 const calls=[];
 const unique=(list,v)=>list.some(r=>r.id===v.id||v.pack==='starter'&&r.pack==='starter'&&r.player_id===v.player_id&&r.livemode===v.livemode&&r.status!=='expired');
 const from=table=>{
  const q={filters:[],op:'select'};
  const run=()=>{
   const list=tables[table]??=[];
   if(q.op==='insert'){calls.push([table,'insert',q.value]);if(unique(list,q.value))return {error:{code:'23505'}};list.push({status:'pending',created_at:new Date().toISOString(),stripe_session_id:null,apple_transaction_id:null,...q.value});return {error:null};}
   const hit=list.filter(r=>q.filters.every(f=>f(r)));
   if(q.op==='update'){calls.push([table,'update',q.value]);for(const r of hit)Object.assign(r,q.value);}
   return {data:hit.map(r=>({...r})),error:null};
  };
  Object.assign(q,{select(){return q;},eq(k,v){q.filters.push(r=>r[k]===v);return q;},neq(k,v){q.filters.push(r=>r[k]!==v);return q;},in(k,v){q.filters.push(r=>v.includes(r[k]));return q;},
   is(k,v){q.filters.push(r=>(r[k]??null)===v);return q;},lte(){return q;},gt(){return q;},order(){return q;},limit(){return q;},
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
  const rows=tables.harvest_purchases;
  if(name==='harvest_credit_apple_purchase'){
   const r=rows.find(x=>x.id===args.p_purchase);
   if(['credited','test_paid','refunded'].includes(r.status))return {data:{status:r.status,duplicate:true},error:null};
   Object.assign(r,{status:'credited',store:'app_store',apple_transaction_id:args.p_transaction,apple_original_transaction_id:args.p_original,livemode:!args.p_test});
   return {data:{status:'credited',duplicate:false},error:null};
  }
  if(name==='harvest_revoke_apple_purchases'){let n=0;for(const i of args.p_items){const r=rows.find(x=>x.apple_transaction_id===i.transaction&&['credited','test_paid'].includes(x.status));if(r){r.status='refunded';n++;}}return {data:{revoked:n},error:null};}
  throw new Error(`unexpected rpc ${name}`);
 }
 return {calls,from,rpc,credits:()=>calls.filter(c=>c[0]==='harvest_credit_apple_purchase').map(c=>c[1]),revokes:()=>calls.filter(c=>c[0]==='harvest_revoke_apple_purchases').map(c=>c[1])};
}
function fakeStripe(log,{session='open'}={}){
 const Stripe=class{constructor(){log.push('made');
  this.checkout={sessions:{retrieve:async id=>{log.push(['retrieve',id]);return {id,status:session,url:'https://checkout.stripe.com/c/old'};},expire:async id=>{log.push(['expire',id]);},
   create:async params=>{log.push(['create',params.line_items[0].price]);return {id:'cs_new',url:'https://checkout.stripe.com/c/new',status:'open'};}}};
  this.prices={retrieve:async id=>{const pack=Object.values(payments.PAYMENT_PACKS).find(p=>p.price===id);return {id,active:true,livemode:true,currency:'eur',unit_amount:pack.cents,type:'one_time',product:pack.product??'prod_x'};}};}};
 Stripe.createFetchHttpClient=()=>null;
 return Stripe;
}
const quiet={error(){},log(){}};
const sessionToken=`x.${Buffer.from(JSON.stringify({session_id:'s'})).toString('base64url')}.y`;
// diamond-checkout, run with the stand-ins and the real App Store check against the test CA.
async function checkout(body,{tables={harvest_purchases:[row()]},user={id:FARMER,app_metadata:{provider:'email'}},env={},fail,session}={}){
 let handler;const db=fakeDb(tables,{fail}),stripe=[];
 const admin={auth:{async getUser(){return {data:{user},error:null};}},from:db.from,rpc:db.rpc};
 const source=stripTypeScriptTypes(read('supabase/functions/diamond-checkout/index.ts').replace(/^import .*;\n/gm,''));
 vm.runInNewContext(source,{...payments,serviceAccount:raw=>raw?{client_email:'x'}:null,getPurchase:async()=>{throw new Error('no Google here');},consumePurchase:async()=>{throw new Error('no Google here');},
  verifyAppleJws:(token,options={})=>appStore.verifyAppleJws(token,{...TEST,...options}),Stripe:fakeStripe(stripe,{session}),createClient:()=>admin,
  Deno:{env:{get:name=>env[name]??''},serve:fn=>handler=fn},Response,JSON,Date,Object,Promise,Error,Boolean,String,atob,console:quiet});
 const r=await handler(new Request('https://test.invalid/diamond-checkout',{method:'POST',headers:{Authorization:`Bearer ${sessionToken}`},body:typeof body==='string'?body:JSON.stringify(body)}));
 return {status:r.status,data:await r.json(),db,stripe,rows:tables.harvest_purchases};
}
const confirmBody=(token,over={})=>({operation:'apple_confirm',store:'app_store',product:'diamonds_500',transaction:token,...over});

test('apple_confirm: Apple\'s signature checked here, this farmer\'s row credited once, and only then may the app finish it',async()=>{
 const r=await checkout(confirmBody(jws(tx())));
 assert.equal(r.status,200);assert.equal(r.data.status,'credited');assert.equal(r.data.livemode,true);assert.equal(r.data.id,ROW);
 assert.equal(r.data.duplicate,false);assert.equal(r.data.finish,true);assert.equal(r.data.transaction,TX);
 assert.deepEqual(r.db.credits().map(a=>({...a})),[{p_purchase:ROW,p_transaction:TX,p_original:TX,p_test:false}]);
 assert.equal(r.rows[0].apple_transaction_id,TX);
 const again=await checkout(confirmBody(jws(tx())),{tables:{harvest_purchases:[row({status:'credited',apple_transaction_id:TX})]}});
 assert.equal(again.status,200);assert.equal(again.data.duplicate,true,'sent again by the app: no second window');assert.equal(again.data.finish,true,'and the app may finish it now');
 const sandbox=await checkout(confirmBody(jws(tx({environment:'Sandbox'}))));
 assert.equal(sandbox.data.status,'credited','App Review sees the diamonds');assert.equal(sandbox.data.livemode,false,'but no revenue');assert.equal(sandbox.data.finish,true);
 assert.equal(sandbox.db.credits()[0].p_test,true);
 const big=await checkout(confirmBody(jws(tx({padding:'x'.repeat(9000)}))));assert.equal(big.status,200,'a signed purchase may be far more than 2 KB');
 const off=await checkout(confirmBody(jws(tx())),{env:{APPLE_PAYMENTS_ENABLED:'false'}});
 assert.equal(off.data.status,'credited','the off switch stops new purchases, never the crediting of a paid one');
 const starter=await checkout(confirmBody(jws(tx({productId:'starter_pack'})),{product:'starter_pack'}),{tables:{harvest_purchases:[row({pack:'starter',diamonds:500,coins:10000,amount_cents:299,price_id:'starter_pack'})]}});
 assert.equal(starter.data.status,'credited');
});

test('apple_confirm: a refunded purchase is finished without credit; anything not Apple\'s, not this app\'s or not this farmer\'s is never finished',async()=>{
 const revoked=await checkout(confirmBody(jws(tx({revocationDate:NOW-1000,revocationReason:0}))));
 assert.equal(revoked.status,200);assert.equal(revoked.data.status,'expired');assert.equal(revoked.data.finish,true);assert.deepEqual(revoked.db.credits(),[]);
 assert.equal(revoked.rows[0].status,'expired');
 const later=await checkout(confirmBody(jws(tx({revocationDate:NOW-1000}))),{tables:{harvest_purchases:[row({status:'credited',apple_transaction_id:TX})]}});
 assert.equal(later.data.finish,true);assert.equal(later.data.status,'refunded','credited before, refunded since: taken back');
 assert.deepEqual([...later.db.revokes()[0].p_items].map(i=>({...i})),[{transaction:TX,revokedAt:new Date(NOW-1000).toISOString()}]);
 const no=(r,status)=>{assert.equal(r.status,status,JSON.stringify(r.data));assert.equal(r.data.finish,false);assert.deepEqual(r.db.credits(),[]);assert.deepEqual(r.db.revokes(),[]);};
 no(await checkout(confirmBody(jws(tx())),{tables:{harvest_purchases:[row({player_id:OTHER})]}}),403);
 no(await checkout(confirmBody(jws(tx())),{tables:{harvest_purchases:[]}}),403);
 const [h,p,s]=jws(tx()).split('.'),bad=Buffer.from(s,'base64url');bad[3]^=1;
 const forged=await checkout(confirmBody(`${h}.${p}.${bad.toString('base64url')}`));no(forged,400);
 assert.equal(forged.db.calls.some(c=>c[0]==='harvest_purchases'),false,'not even read');
 no(await checkout(confirmBody(jws(tx(),{key:generateKeyPairSync('ec',{namedCurve:'P-256'}).privateKey}))),400);
 no(await checkout(confirmBody(jws(tx({environment:'Xcode'})))),409);
 no(await checkout(confirmBody(jws(tx({bundleId:'com.example.other'})))),409);
 no(await checkout(confirmBody(jws(tx({appAccountToken:undefined})))),409);
 no(await checkout(confirmBody(jws(tx()),{product:'diamonds_150'})),409);
 no(await checkout(confirmBody(jws(tx({productId:'diamonds_150'})),{product:'diamonds_150'})),409);
 no(await checkout(confirmBody(jws(tx())),{tables:{harvest_purchases:[row({status:'credited',store:'stripe'})]}}),409);
 no(await checkout(confirmBody(jws(tx())),{tables:{harvest_purchases:[row({status:'credited',apple_transaction_id:'999'})]}}),409);
 no(await checkout(confirmBody('short')),400);no(await checkout(confirmBody(42)),400);no(await checkout(confirmBody(jws(tx()),{product:'BAD ID'})),400);
 no(await checkout(confirmBody('a'.repeat(payments.APPLE_JWS_MAX-3)+'.b.c')),400);
 assert.equal((await checkout(confirmBody('a'.repeat(payments.APPLE_JWS_MAX+2000)+'.b.c'))).status,413);
 const down=await checkout(confirmBody(jws(tx())),{fail:'harvest_credit_apple_purchase'});assert.equal(down.status,503);assert.equal(down.data.finish,false);
});

test('the app\'s create: a pending row of the app\'s own store, Stripe and the other app\'s rows moved over; the website takes an App Store row back',async()=>{
 const farms=()=>[{player_id:FARMER,offer:{unlockedAt:Date.now()-3600000}}];
 for(const [store,product] of [['app_store','diamonds_500'],['google_play','diamonds_500']]){
  const made=await checkout({operation:'create',store,pack:'500',requestId:REQ},{tables:{harvest_purchases:[],player_farms:farms()},env:{GOOGLE_PLAY_SERVICE_ACCOUNT:'{}'}});
  assert.deepEqual([made.status,made.data],[200,{purchaseId:REQ,product,account:FARMER,store}]);
  assert.deepEqual([made.rows[0].store,made.rows[0].price_id,made.rows[0].livemode,made.rows[0].status],[store,product,true,'pending']);
  assert.deepEqual(made.stripe,[]);
 }
 const noPlay=await checkout({operation:'create',store:'google_play',pack:'500',requestId:REQ},{tables:{harvest_purchases:[],player_farms:farms()}});
 assert.deepEqual([noPlay.status,noPlay.data],[503,{error:'Purchases through Google Play are not available yet.'}],'Google Play as before: off without its key');
 const starter=over=>row({id:ROW,pack:'starter',diamonds:500,coins:10000,amount_cents:299,starter_expires_at:new Date(Date.now()+86400000).toISOString(),...over});
 const fromStripe=await checkout({operation:'create',store:'app_store',pack:'starter',requestId:REQ},{tables:{harvest_purchases:[starter({store:'stripe',price_id:payments.PAYMENT_PACKS.starter.price,stripe_session_id:'cs_old'})],player_farms:farms()},env:{STRIPE_SECRET_KEY:'sk_live_x'}});
 assert.deepEqual([fromStripe.status,fromStripe.data],[200,{purchaseId:ROW,product:'starter_pack',account:FARMER,store:'app_store'}],'the farmer\'s one Starter Pack row');
 assert.deepEqual(fromStripe.stripe,['made',['retrieve','cs_old'],['expire','cs_old']],'its Stripe page ended first');
 assert.deepEqual([fromStripe.rows[0].store,fromStripe.rows[0].price_id],['app_store','starter_pack']);
 const paid=await checkout({operation:'create',store:'app_store',pack:'starter',requestId:REQ},{tables:{harvest_purchases:[starter({store:'stripe',stripe_session_id:'cs_old'})],player_farms:farms()},env:{STRIPE_SECRET_KEY:'sk_live_x'},session:'complete'});
 assert.deepEqual([paid.status,paid.data],[409,{error:'This purchase has already been processed.'}]);assert.equal(paid.rows[0].store,'stripe');
 const fromPlay=await checkout({operation:'create',store:'app_store',pack:'starter',requestId:REQ},{tables:{harvest_purchases:[starter({store:'google_play',price_id:'starter_pack'})],player_farms:farms()}});
 assert.equal(fromPlay.data.store,'app_store');assert.equal(fromPlay.rows[0].store,'app_store');assert.deepEqual(fromPlay.stripe,[]);
 const back=await checkout({operation:'create',pack:'starter',requestId:REQ},{tables:{harvest_purchases:[starter({store:'app_store',price_id:'starter_pack'})],player_farms:farms()},env:{STRIPE_SECRET_KEY:'sk_live_x',STRIPE_WEBHOOK_SECRET:'whsec_x'}});
 assert.deepEqual([back.status,back.data],[200,{url:'https://checkout.stripe.com/c/new',purchaseId:ROW}],'the website takes the row back for Stripe');
 assert.deepEqual([back.rows[0].store,back.rows[0].price_id,back.rows[0].stripe_session_id],['stripe',payments.PAYMENT_PACKS.starter.price,'cs_new']);
 const off=await checkout({operation:'create',store:'app_store',pack:'500',requestId:REQ},{tables:{harvest_purchases:[],player_farms:farms()},env:{APPLE_PAYMENTS_ENABLED:' False '}});
 assert.deepEqual([off.status,off.data],[503,{error:'Purchases through the App Store are not available yet.'}]);
 const catalog=await checkout({operation:'catalog',store:'app_store'},{tables:{harvest_purchases:[],player_farms:farms()}});
 assert.equal(catalog.data.store,'app_store');assert.equal(catalog.data.enabled,true,'on unless switched off');
 assert.equal((await checkout({operation:'catalog',store:'app_store'},{tables:{harvest_purchases:[],player_farms:farms()},env:{APPLE_PAYMENTS_ENABLED:'false'}})).data.enabled,false);
 assert.equal((await checkout({operation:'catalog',padding:'x'.repeat(3000)})).status,413,'2 KB for everything but apple_confirm');
 const cg=await checkout({operation:'create',store:'app_store',pack:'500',requestId:REQ},{user:{id:FARMER,app_metadata:{provider:'email',portal:'crazygames'}}});
 assert.deepEqual([cg.status,cg.data],[403,{error:'Purchases are not available on CrazyGames.'}]);
});

// app-store-notify, run with the stand-ins and the real App Store check against the test CA.
const note=(type,transaction=tx(),over={})=>jws({notificationType:type,notificationUUID:'6f1c1f1e-0000-4000-8000-000000000001',version:'2.0',signedDate:NOW,
 data:{appAppleId:6700000000,bundleId:'com.harvesttycoon.app',bundleVersion:'3',environment:'Production',...(transaction?{signedTransactionInfo:jws(transaction)}:{})},...over});
async function notify(payload,{tables={harvest_purchases:[row()]},fail,method='POST',raw}={}){
 let handler;const db=fakeDb(tables,{fail});
 const source=stripTypeScriptTypes(read('supabase/functions/app-store-notify/index.ts').replace(/^import .*;\n/gm,''));
 vm.runInNewContext(source,{...payments,verifyAppleJws:(token,options={})=>appStore.verifyAppleJws(token,{...TEST,...options}),createClient:()=>({from:db.from,rpc:db.rpc}),
  Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response,JSON,Date,Object,Promise,Error,Boolean,String,console:quiet});
 const r=await handler(new Request('https://test.invalid/app-store-notify',{method,...(method==='POST'?{body:raw??JSON.stringify({signedPayload:payload})}:{})}));
 return {status:r.status,data:await r.json(),db,rows:tables.harvest_purchases};
}
test('app-store-notify: Apple\'s signed notifications credit a purchase the app could not confirm and take back a refund; the rest is acknowledged',async()=>{
 const charged=await notify(note('ONE_TIME_CHARGE'));
 assert.deepEqual([charged.status,charged.data],[200,{credited:true,duplicate:false}]);
 assert.deepEqual(charged.db.credits().map(a=>({...a})),[{p_purchase:ROW,p_transaction:TX,p_original:TX,p_test:false}]);
 const twice=await notify(note('ONE_TIME_CHARGE'),{tables:{harvest_purchases:[row({status:'credited',apple_transaction_id:TX})]}});
 assert.deepEqual(twice.data,{credited:true,duplicate:true},'confirmed by the app already: nothing twice');
 const sandbox=await notify(note('ONE_TIME_CHARGE',tx({environment:'Sandbox'})));assert.equal(sandbox.db.credits()[0].p_test,true);
 const gone=await notify(note('ONE_TIME_CHARGE'),{tables:{harvest_purchases:[row({player_id:null,account_deleted_at:'2026-10-04T10:00:00Z',status:'expired'})]}});
 assert.equal(gone.db.credits().length,1,'a deleted account\'s purchase is recorded (the SQL gives nothing)');
 const refund=await notify(note('REFUND',tx({revocationDate:NOW-5000,revocationReason:1})),{tables:{harvest_purchases:[row({status:'credited',apple_transaction_id:TX})]}});
 assert.deepEqual([refund.status,refund.data],[200,{revoked:1}]);assert.equal(refund.rows[0].status,'refunded');
 assert.deepEqual([...refund.db.revokes()[0].p_items].map(i=>({...i})),[{transaction:TX,revokedAt:new Date(NOW-5000).toISOString()}]);
 const nothing=r=>{assert.equal(r.status,200,JSON.stringify(r.data));assert.deepEqual(r.db.credits(),[]);assert.deepEqual(r.db.revokes(),[]);};
 for(const type of ['REFUND_REVERSED','CONSUMPTION_REQUEST','REFUND_DECLINED','SOMETHING_NEW'])nothing(await notify(note(type)));
 nothing(await notify(note('TEST',null)));
 nothing(await notify(note('ONE_TIME_CHARGE',tx({bundleId:'com.example.other'}))));
 nothing(await notify(note('ONE_TIME_CHARGE',tx(),{data:{bundleId:'com.example.other',environment:'Production',signedTransactionInfo:jws(tx())}})));
 nothing(await notify(note('ONE_TIME_CHARGE',tx({productId:'diamonds_3500'}))));
 nothing(await notify(note('ONE_TIME_CHARGE',tx({appAccountToken:OTHER}))));
 nothing(await notify(note('ONE_TIME_CHARGE',tx({appAccountToken:undefined}))));
 nothing(await notify(note('ONE_TIME_CHARGE',tx({revocationDate:NOW}))));
 nothing(await notify(note('ONE_TIME_CHARGE'),{tables:{harvest_purchases:[row({status:'credited',store:'stripe'})]}}));
 const [h,p,s]=note('ONE_TIME_CHARGE').split('.'),flipped=Buffer.from(s,'base64url');flipped[7]^=1;
 const forged=await notify(`${h}.${p}.${flipped.toString('base64url')}`);assert.equal(forged.status,401);assert.deepEqual(forged.db.calls,[]);
 const inner=jws(tx()).split('.'),innerForged=`${inner[0]}.${part(tx({productId:'diamonds_3500'}))}.${inner[2]}`;
 const wrapped=jws({notificationType:'ONE_TIME_CHARGE',signedDate:NOW,data:{bundleId:'com.harvesttycoon.app',environment:'Production',signedTransactionInfo:innerForged}});
 const nested=await notify(wrapped);assert.equal(nested.status,401,'the transaction inside is checked too');assert.deepEqual(nested.db.calls,[]);
 assert.equal((await notify(null,{raw:'not json'})).status,401);
 assert.equal((await notify(null,{raw:'{}'})).status,401);
 assert.equal((await notify(null,{raw:'x'.repeat(70000)})).status,413);
 assert.equal((await notify(null,{method:'GET'})).status,405);
 assert.equal((await notify(note('ONE_TIME_CHARGE'),{fail:'harvest_credit_apple_purchase'})).status,500,'a database error: Apple tries again');
 assert.equal((await notify(note('REFUND',tx({revocationDate:NOW})),{fail:'harvest_revoke_apple_purchases'})).status,500);
});

test('app-store.sql: only new things (a store value, two columns, two functions), the sandbox granted as a test, refunds taken back',()=>{
 const sql=read('supabase/app-store.sql');
 assert.deepEqual([...sql.matchAll(/create or replace function public\.(\w+)/g)].map(m=>m[1]),['harvest_credit_apple_purchase','harvest_revoke_apple_purchases'],'no existing function is replaced');
 assert.doesNotMatch(sql,/\b(create( or replace)? (trigger|view)|drop function|drop trigger|drop table|drop index)\b/i);
 assert.match(sql,/add constraint harvest_purchases_store_check check \(store in \('stripe','google_play','app_store'\)\);/);
 assert.match(sql,/m\[1\] not in \('stripe','google_play','app_store'\)/,'a store added live stops the file instead of being dropped');
 assert.match(sql,/add column if not exists apple_transaction_id text;/);assert.match(sql,/add column if not exists apple_original_transaction_id text;/);
 assert.match(sql,/create unique index if not exists harvest_purchases_apple_transaction on public\.harvest_purchases\(apple_transaction_id\) where apple_transaction_id is not null;/);
 assert.match(sql,/apple_transaction_id ~ '\^\[0-9\]\{1,20\}\$'/);
 for(const fn of ['harvest_credit_apple_purchase\\(uuid,text,text,boolean\\)','harvest_revoke_apple_purchases\\(jsonb\\)']){
  assert.match(sql,new RegExp(`revoke all on function public\\.${fn} from public, anon, authenticated;`),fn);
  assert.match(sql,new RegExp(`grant execute on function public\\.${fn} to service_role;`),fn);
 }
 assert.equal((sql.match(/as \$function\$\n-- app-store\.sql \(Oct 2026\)\n/g)??[]).length,2,'each function says it is this file\'s, so a re-run knows it');
 assert.match(sql,/livemode=not p_test where id=p_purchase;\n perform public\.harvest_purchase_grant\(p_purchase\);\n update public\.harvest_purchases set status='credited'/,'granted in the sandbox too, as livemode false');
 assert.match(sql,/if purchase\.apple_transaction_id is null then raise exception 'Payment mismatch'; end if;/,'a row paid another way is never a duplicate');
 assert.match(sql,/'Refunded by the App Store: '/);
 assert.match(sql,/if purchase\.status='credited' and purchase\.player_id is not null then/,'live and sandbox purchases are taken back alike');
 assert.match(sql,/greatest\(0,coalesce\(\(farm_state->>'diamonds'\)::bigint,0\)-purchase\.diamonds\)/,'never below 0');
 assert.match(sql,/to_regprocedure\('public\.harvest_purchase_grant\(uuid\)'\) is null/,'needs google-play.sql');
 assert.doesNotMatch(sql,/\{\d*,(25[6-9]|2[6-9]\d|[3-9]\d\d|\d{4,})\}/,'Postgres allows at most 255 repeats in a regular expression');
 const tail=sql.trimEnd().split('\n').slice(-4);assert.ok(tail.every(line=>line.startsWith('-- ')),'ends with a commented dry run');assert.match(tail.join('\n'),/rollback;/);
 // The names diamond-checkout and app-store-notify call with are the SQL's.
 for(const file of ['supabase/functions/diamond-checkout/index.ts','supabase/functions/app-store-notify/index.ts']){
  const code=read(file);
  assert.match(code,/rpc\('harvest_credit_apple_purchase',\{p_purchase:id,p_transaction:checked\.transaction,p_original:checked\.original,p_test:checked\.test\}\)/,file);
  assert.match(code,/rpc\('harvest_revoke_apple_purchases',\{p_items:\[\{transaction:/,file);
 }
 assert.match(sql,/harvest_credit_apple_purchase\(p_purchase uuid, p_transaction text, p_original text, p_test boolean\)/);
});

test('the App Store code is synced into both functions, byte for byte; app-store-notify runs without a sign-in',()=>{
 const sync=read('scripts/sync-game.mjs');
 assert.match(sync,/for\(const name of \['diamond-checkout','app-store-notify'\]\)copyFileSync\(new URL\('\.\.\/game\/app-store\.js'/);
 assert.match(sync,/for\(const name of \['diamond-checkout','stripe-webhook','play-voided','app-store-notify'\]\)copyFileSync\(new URL\('\.\.\/game\/payments\.js'/);
 for(const fn of ['diamond-checkout','app-store-notify'])assert.equal(read(`supabase/functions/${fn}/app-store.js`),read('game/app-store.js'),fn);
 for(const fn of ['diamond-checkout','stripe-webhook','play-voided','app-store-notify'])assert.equal(read(`supabase/functions/${fn}/payments.js`),read('game/payments.js'),fn);
 assert.equal(read('supabase/functions/app-store-notify/deno.json'),read('supabase/functions/play-voided/deno.json'));
 assert.match(read('supabase/functions/app-store-notify/index.ts'),/deployed with --no-verify-jwt/);
 assert.doesNotMatch(read('game/app-store.js'),/\bimport\b/,'no dependencies: Web Crypto only');
});

test('the admin panel says App Store for an App Store purchase; a sandbox one is not revenue',async()=>{
 const owner={id:'22222222-2222-4222-8222-222222222222',email:'floris@millstone.nl',email_confirmed_at:'2026-09-16T21:12:00Z',signInMethods:['oauth']};
 const rows=[{id:'p1',player_id:FARMER,pack:'500',diamonds:500,coins:0,amount_cents:499,livemode:true,status:'credited',store:'app_store',created_at:'2026-10-05T10:00:00Z',credited_at:'2026-10-05T10:00:05Z'},
  {id:'p2',player_id:FARMER,pack:'150',diamonds:150,coins:0,amount_cents:199,livemode:false,status:'credited',store:'app_store',created_at:'2026-10-05T09:00:00Z',credited_at:'2026-10-05T09:00:05Z'},
  {id:'p3',player_id:FARMER,pack:'150',diamonds:150,coins:0,amount_cents:199,livemode:true,status:'credited',store:'google_play',created_at:'2026-10-05T08:00:00Z',credited_at:null},
  {id:'p4',player_id:FARMER,pack:'150',diamonds:150,coins:0,amount_cents:199,livemode:true,status:'pending',store:'stripe',created_at:'2026-10-05T07:00:00Z',credited_at:null}];
 const db={from(table){let list=table==='harvest_purchases'?rows:[{player_id:FARMER,username:'Anna',level:20}];const q={select(){return q;},order(){return q;},limit(){return q;},in(k,v){list=list.filter(r=>v.includes(r[k]));return q;},then(r){return Promise.resolve({data:list,error:null}).then(r);}};return q;}};
 const {data}=await handleAdminPurchases({admin:db,user:owner});
 assert.deepEqual(data.purchases.map(p=>p.store),['app_store','app_store','google_play','stripe']);
 assert.equal(data.totals.revenueCents,499+199,'the sandbox purchase is no revenue');
 assert.match(read('src/admin-dashboard.js'),/\$\{p\.store==='google_play'\?' · Google Play':p\.store==='app_store'\?' · App Store':''\}/);
});
