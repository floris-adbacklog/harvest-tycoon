import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APPLE_TEAM_ID,APPLE_CLIENTS,APPLE_ISSUER,appleKeyBytes,appleClientSecret,appleIdClaims,appleSubs,hasAppleSignIn,handleAppleToken,appleTokensOf,revokeAppleTokens} from '../supabase/functions/farm-api/apple-sign-in-service.js';
import {handleDeleteAccount,DELETE_WRONG_NAME} from '../supabase/functions/farm-api/account-delete-service.js';
import {readAppSignIn} from '../src/app-sign-in.js';
import {READY} from '../scripts/build-languages.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// Sign in with Apple, let go of when the account is deleted (16 Oct 2026, the owner chose option 1: keep Apple's token at the sign-in,
// revoke it at the deletion; Apple's TN3194).
const ME='11111111-1111-4111-8111-111111111111';
const APPLE_SUB='001234.0123456789abcdef0123456789abcdef.0123';
const appleIdentity={provider:'apple',id:APPLE_SUB,identity_data:{sub:APPLE_SUB,email:'abc@privaterelay.appleid.com'}};
const appleFarmer={id:ME,email:'abc@privaterelay.appleid.com',email_confirmed_at:'2026-10-16T10:00:00Z',app_metadata:{provider:'apple',providers:['apple']},identities:[appleIdentity]};
const googleFarmer={id:ME,email:'sunny@example.com',email_confirmed_at:'2026-09-20T10:00:00Z',app_metadata:{provider:'google',providers:['google']},identities:[{provider:'google',id:'1077',identity_data:{sub:'1077'}}]};
const CODE='c0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d.0.rrsy.Ab-1_cD2eF3gH4',REFRESH='r9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c.0.rrsy.Zy-9_xW8vU7';

const b64url=text=>Buffer.from(text).toString('base64url');
const idToken=claims=>`${b64url(JSON.stringify({kid:'W6WcOKB',alg:'RS256'}))}.${b64url(JSON.stringify(claims))}.c2lnbmF0dXJl`;
const appleClaims=(aud,sub=APPLE_SUB)=>({iss:APPLE_ISSUER,aud,sub,iat:1760600000,exp:1760686400});

// A Sign in with Apple key as Apple hands it out (.p8: PKCS #8 PEM, P-256), made here for the test.
async function testKey(){
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const der=Buffer.from(await crypto.subtle.exportKey('pkcs8',pair.privateKey)).toString('base64');
 const pem=`-----BEGIN PRIVATE KEY-----\n${der.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
 return {pem,der,publicKey:pair.publicKey};
}
const KEY=await testKey();
const apple={keyId:'ABC123DEFG',privateKey:KEY.pem};

// What Apple was asked: the form of each call, by path.
function fakeApple(answers={}){
 const calls=[];
 const fetchImpl=async(url,init)=>{
  const form=Object.fromEntries(new URLSearchParams(init.body));calls.push({url,method:init.method,type:init.headers['Content-Type'],form,signal:init.signal});
  const answer=answers[new URL(url).pathname];
  if(answer instanceof Error)throw answer;
  const {status=200,body={}}=typeof answer==='function'?answer(form):answer??{};
  return {ok:status>=200&&status<300,status,json:async()=>body};
 };
 return {calls,fetchImpl};
}
// The database as farm-api uses it here: the kept tokens, an upsert, the deletion's own read and rpc, every call in order.
function fakeAdmin({tokens=[],tokensError=null,tokensThrow=false,upsertError=null,username='Sunny Acres',rpcError=null}={}){
 const calls=[];
 return {calls,
  from(table){
   const filters=[];
   const q={
    select(columns){calls.push(['select',table,columns]);return q;},
    eq(column,value){calls.push(['eq',table,column,value]);filters.push([column,value]);return q;},
    maybeSingle:async()=>({data:username==null?null:{username},error:null}),
    upsert:async(row,options)=>{calls.push(['upsert',table,row,options]);return {error:upsertError};},
    then(resolve,reject){
     if(tokensThrow)return Promise.reject(new Error('connection lost')).then(resolve,reject);
     return Promise.resolve(tokensError?{data:null,error:tokensError}:{data:tokens,error:null}).then(resolve,reject);
    }
   };
   return q;
  },
  rpc:async(name,args)=>{calls.push(['rpc',name,args]);return rpcError?{data:null,error:rpcError}:{data:{player_stats:1,auth_user:1},error:null};}
 };
}
const named=(calls,kind)=>calls.filter(c=>c[0]===kind);
const jwtParts=jwt=>{const [head,body,signature]=jwt.split('.');return {head:JSON.parse(Buffer.from(head,'base64url')),body:JSON.parse(Buffer.from(body,'base64url')),signature:Buffer.from(signature,'base64url'),signed:`${head}.${body}`};};

test('Apple\'s client secret: ES256 with the team\'s key, kid, team, 5 minutes, Apple as audience, the client as subject',async()=>{
 const now=Date.UTC(2026,9,16,12,0,0);
 for(const clientId of Object.values(APPLE_CLIENTS)){
  const secret=await appleClientSecret({clientId,...apple,now}),{head,body,signature,signed}=jwtParts(secret);
  assert.deepEqual(head,{alg:'ES256',kid:'ABC123DEFG'});
  assert.deepEqual(body,{iss:'QAXWA37ACQ',iat:now/1000,exp:now/1000+300,aud:'https://appleid.apple.com',sub:clientId});
  assert.equal(signature.length,64,'r and s side by side, as a JWS wants');
  assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},KEY.publicKey,signature,new TextEncoder().encode(signed)),true,'signed with the key');
 }
 assert.equal(APPLE_TEAM_ID,'QAXWA37ACQ');assert.deepEqual({...APPLE_CLIENTS},{web:'com.harvesttycoon.web',app:'com.harvesttycoon.app'});
 // The .p8 text however the owner pasted it into the secret: with its line breaks, with \n written out, or only the base64.
 const der=Buffer.from(KEY.der,'base64');
 for(const pem of [KEY.pem,KEY.pem.replace(/\n/g,'\\n'),KEY.der,`  ${KEY.pem}\n`,KEY.pem.replace(/\n/g,'\r\n')])assert.deepEqual(Buffer.from(appleKeyBytes(pem)),der);
 for(const bad of ['','not a key','-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----',null,undefined])assert.throws(()=>appleKeyBytes(bad),/APPLE_PRIVATE_KEY is not a \.p8 key\./);
 await assert.rejects(appleClientSecret({clientId:APPLE_CLIENTS.app,keyId:'K',privateKey:'QUJD'}),'base64 that is no key is refused by WebCrypto');
});

test('Apple\'s id_token is read for its claims; the account\'s Apple ID comes from its Apple identity only',()=>{
 assert.deepEqual(appleIdClaims(idToken(appleClaims(APPLE_CLIENTS.app))),appleClaims(APPLE_CLIENTS.app));
 for(const bad of ['',null,'a.b','a.!!!.c','x'])assert.equal(appleIdClaims(bad),null);
 assert.deepEqual([...appleSubs(appleFarmer)],[APPLE_SUB]);
 assert.deepEqual([...appleSubs(googleFarmer)],[]);assert.deepEqual([...appleSubs(null)],[]);assert.deepEqual([...appleSubs({identities:'apple'})],[]);
 assert.deepEqual([...appleSubs({identities:[{provider:'apple',provider_id:'000111.abc.2222'}]})],['000111.abc.2222']);
 assert.equal(hasAppleSignIn(appleFarmer),true);assert.equal(hasAppleSignIn(googleFarmer),false);
 assert.equal(hasAppleSignIn({app_metadata:{providers:['email','apple']}}),true,'an Apple sign-in Supabase names without an identity in the answer still counts for the deletion');
});

test('apple_token from the iPhone app: the one-time code exchanged at Apple for the app\'s client, kept only for this account\'s own Apple ID',async()=>{
 const now=Date.UTC(2026,9,16,12,0,0);
 const ok=fakeApple({'/auth/token':{body:{access_token:'a1',token_type:'Bearer',expires_in:3600,refresh_token:'rNEW.0.rrsy.abc',id_token:idToken(appleClaims(APPLE_CLIENTS.app))}}});
 const admin=fakeAdmin(),r=await handleAppleToken({admin,body:{operation:'apple_token',code:CODE,player:'someone else'},user:appleFarmer,...apple,fetchImpl:ok.fetchImpl,now});
 assert.deepEqual(r,{status:200,data:{kept:true}});
 assert.equal(ok.calls.length,1);const [call]=ok.calls;
 assert.equal(call.url,'https://appleid.apple.com/auth/token');assert.equal(call.method,'POST');assert.equal(call.type,'application/x-www-form-urlencoded');
 assert.ok(call.signal,'never waits on Apple for ever');
 assert.deepEqual(Object.keys(call.form).sort(),['client_id','client_secret','code','grant_type']);
 assert.equal(call.form.client_id,'com.harvesttycoon.app');assert.equal(call.form.grant_type,'authorization_code');assert.equal(call.form.code,CODE);
 assert.equal(jwtParts(call.form.client_secret).body.sub,'com.harvesttycoon.app','the secret is made for the same client');
 assert.deepEqual(named(admin.calls,'upsert'),[['upsert','apple_sign_in_tokens',{player_id:ME,client_id:'com.harvesttycoon.app',refresh_token:'rNEW.0.rrsy.abc',updated_at:'2026-10-16T12:00:00.000Z'},{onConflict:'player_id,client_id'}]],'only Apple\'s refresh token, for the signed-in farmer, never an id from the request');
 // Apple's answer for another Apple ID, another client or another issuer: nothing kept.
 for(const claims of [appleClaims(APPLE_CLIENTS.app,'999999.other.0000'),appleClaims(APPLE_CLIENTS.web),{...appleClaims(APPLE_CLIENTS.app),iss:'https://example.com'}]){
  const other=fakeApple({'/auth/token':{body:{refresh_token:'rNEW.0.rrsy.abc',id_token:idToken(claims)}}}),admin2=fakeAdmin();
  assert.deepEqual(await handleAppleToken({admin:admin2,body:{code:CODE},user:appleFarmer,...apple,fetchImpl:other.fetchImpl}),{status:200,data:{kept:false}});
  assert.equal(named(admin2.calls,'upsert').length,0);
 }
 // A code's answer without an id_token, a refused code, a token that does not look like one, Apple unreachable: nothing kept.
 for(const answer of [{body:{refresh_token:'rNEW.0.rrsy.abc'}},{status:400,body:{error:'invalid_grant'}},{body:{refresh_token:'<x>',id_token:idToken(appleClaims(APPLE_CLIENTS.app))}},new Error('offline')]){
  const failing=fakeApple({'/auth/token':answer}),admin2=fakeAdmin();
  assert.deepEqual(await handleAppleToken({admin:admin2,body:{code:CODE},user:appleFarmer,...apple,fetchImpl:failing.fetchImpl}),{status:200,data:{kept:false}});
  assert.equal(named(admin2.calls,'upsert').length,0);
 }
});

test('apple_token from the website: Supabase\'s Apple token checked with Apple for the web client, then kept as it came',async()=>{
 const ok=fakeApple({'/auth/token':{body:{access_token:'a2',token_type:'Bearer',expires_in:3600,id_token:idToken(appleClaims(APPLE_CLIENTS.web))}}});
 const admin=fakeAdmin(),r=await handleAppleToken({admin,body:{refreshToken:REFRESH},user:appleFarmer,...apple,fetchImpl:ok.fetchImpl});
 assert.deepEqual(r,{status:200,data:{kept:true}});
 assert.deepEqual(Object.keys(ok.calls[0].form).sort(),['client_id','client_secret','grant_type','refresh_token']);
 assert.equal(ok.calls[0].form.client_id,'com.harvesttycoon.web');assert.equal(ok.calls[0].form.grant_type,'refresh_token');assert.equal(ok.calls[0].form.refresh_token,REFRESH);
 assert.equal(named(admin.calls,'upsert')[0][2].client_id,'com.harvesttycoon.web');assert.equal(named(admin.calls,'upsert')[0][2].refresh_token,REFRESH);
 // Apple accepting it without an id_token is enough; one for another Apple ID or client is not; a refusal keeps nothing.
 const bare=fakeApple({'/auth/token':{body:{access_token:'a2',token_type:'Bearer',expires_in:3600}}});
 assert.deepEqual(await handleAppleToken({admin:fakeAdmin(),body:{refreshToken:REFRESH},user:appleFarmer,...apple,fetchImpl:bare.fetchImpl}),{status:200,data:{kept:true}});
 for(const answer of [{body:{id_token:idToken(appleClaims(APPLE_CLIENTS.web,'999999.other.0000'))}},{body:{id_token:idToken(appleClaims(APPLE_CLIENTS.app))}},{status:400,body:{error:'invalid_grant'}}]){
  const admin2=fakeAdmin();
  assert.deepEqual(await handleAppleToken({admin:admin2,body:{refreshToken:REFRESH},user:appleFarmer,...apple,fetchImpl:fakeApple({'/auth/token':answer}).fetchImpl}),{status:200,data:{kept:false}});
  assert.equal(named(admin2.calls,'upsert').length,0);
 }
 // A code wins when both come (the app's sheet); a database failure is a server error (index.ts: 503), as everywhere.
 const both=fakeApple({'/auth/token':{body:{refresh_token:'rNEW.0.rrsy.abc',id_token:idToken(appleClaims(APPLE_CLIENTS.app))}}});
 await handleAppleToken({admin:fakeAdmin(),body:{code:CODE,refreshToken:REFRESH},user:appleFarmer,...apple,fetchImpl:both.fetchImpl});
 assert.equal(both.calls[0].form.grant_type,'authorization_code');
 await assert.rejects(handleAppleToken({admin:fakeAdmin({upsertError:new Error('db down')}),body:{refreshToken:REFRESH},user:appleFarmer,...apple,fetchImpl:ok.fetchImpl}),/db down/);
});

test('apple_token asks Apple nothing without a sign-in, an Apple identity, the key or something that looks like Apple\'s',async()=>{
 const asked=fakeApple();
 assert.equal((await handleAppleToken({admin:fakeAdmin(),body:{code:CODE},user:null,...apple,fetchImpl:asked.fetchImpl})).status,401);
 const quiet=[
  {user:googleFarmer,body:{code:CODE}},{user:googleFarmer,body:{refreshToken:REFRESH}},
  {user:appleFarmer,body:{code:CODE},keyId:''},{user:appleFarmer,body:{code:CODE},privateKey:''},
  {user:appleFarmer,body:{}},{user:appleFarmer,body:{code:'short'}},{user:appleFarmer,body:{code:'x'.repeat(1025)}},{user:appleFarmer,body:{code:'abc def ghi jkl'}},
  {user:appleFarmer,body:{code:42}},{user:appleFarmer,body:{refreshToken:['r.0.abc.def']}},{user:appleFarmer,body:{refreshToken:'r&grant_type=x'}},{user:appleFarmer,body:null}
 ];
 for(const {user,body,...key} of quiet){
  const admin=fakeAdmin(),r=await handleAppleToken({admin,body,user,...apple,...key,fetchImpl:asked.fetchImpl});
  assert.deepEqual(r,{status:200,data:{kept:false}},JSON.stringify(body));assert.equal(admin.calls.length,0);
 }
 assert.equal(asked.calls.length,0);
 // A key that is not a .p8 key: nothing kept, nothing asked, no error for the farmer.
 assert.deepEqual(await handleAppleToken({admin:fakeAdmin(),body:{code:CODE},user:appleFarmer,keyId:'K',privateKey:'not a key',fetchImpl:asked.fetchImpl}),{status:200,data:{kept:false}});
 assert.equal(asked.calls.length,0);
});

test('delete_account with Apple: the tokens read before the account goes, each revoked at Apple after it, and the answer says so',async()=>{
 const tokens=[{client_id:'com.harvesttycoon.web',refresh_token:REFRESH},{client_id:'com.harvesttycoon.app',refresh_token:'rAPP.0.rrsy.abc'}];
 const order=[];
 const appleApi=fakeApple({'/auth/revoke':form=>{order.push(['revoke',form.client_id]);return {status:200};}});
 const admin=fakeAdmin({tokens});const rpc=admin.rpc;admin.rpc=async(...args)=>{order.push(['rpc']);return rpc(...args);};
 const r=await handleDeleteAccount({admin,body:{username:'Sunny Acres'},user:appleFarmer,apple,fetchImpl:appleApi.fetchImpl});
 assert.deepEqual(r,{status:200,data:{deleted:ME,apple:'revoked'}});
 assert.deepEqual(admin.calls.filter(c=>c[1]==='apple_sign_in_tokens'),[['select','apple_sign_in_tokens','client_id,refresh_token'],['eq','apple_sign_in_tokens','player_id',ME]],'only this farmer\'s own tokens');
 assert.ok(admin.calls.findIndex(c=>c[1]==='apple_sign_in_tokens')<admin.calls.findIndex(c=>c[0]==='rpc'),'read before the deletion takes the row with it');
 assert.deepEqual(order[0],['rpc'],'revoked only once the account is gone');
 assert.deepEqual(order.slice(1).map(([,client])=>client).sort(),['com.harvesttycoon.app','com.harvesttycoon.web'],'both clients, side by side');
 for(const call of appleApi.calls.filter(c=>c.url.endsWith('/auth/revoke'))){
  assert.equal(call.url,'https://appleid.apple.com/auth/revoke');assert.equal(call.method,'POST');
  assert.deepEqual(Object.keys(call.form).sort(),['client_id','client_secret','token','token_type_hint']);
  assert.equal(call.form.token_type_hint,'refresh_token');assert.equal(jwtParts(call.form.client_secret).body.sub,call.form.client_id,'each with its own client\'s secret');
 }
 assert.deepEqual(Object.fromEntries(appleApi.calls.map(c=>[c.form.client_id,c.form.token])),{'com.harvesttycoon.web':REFRESH,'com.harvesttycoon.app':'rAPP.0.rrsy.abc'},'each token with its own client');
 // One that Apple refuses, or Apple unreachable: the account is deleted all the same, and the farmer is told to remove it themselves.
 for(const answer of [form=>({status:form.client_id===APPLE_CLIENTS.app?400:200,body:{}}),new Error('offline')]){
  const r2=await handleDeleteAccount({admin:fakeAdmin({tokens}),body:{username:'Sunny Acres'},user:appleFarmer,apple,fetchImpl:fakeApple({'/auth/revoke':answer}).fetchImpl});
  assert.deepEqual(r2,{status:200,data:{deleted:ME,apple:'manual'}});
 }
});

test('delete_account with Apple but nothing to revoke with: deleted all the same, and the farmer is told where to remove it',async()=>{
 const cases=[{admin:fakeAdmin({tokens:[]}),key:apple},{admin:fakeAdmin({tokensError:{message:'permission denied'}}),key:apple},{admin:fakeAdmin({tokensThrow:true}),key:apple},
  {admin:fakeAdmin({tokens:[{client_id:'com.example.other',refresh_token:REFRESH},{client_id:APPLE_CLIENTS.web,refresh_token:''}]}),key:apple},
  {admin:fakeAdmin({tokens:[{client_id:APPLE_CLIENTS.web,refresh_token:REFRESH}]}),key:{}},{admin:fakeAdmin({tokens:[{client_id:APPLE_CLIENTS.web,refresh_token:REFRESH}]}),key:{keyId:'K',privateKey:'not a key'}}];
 for(const {admin,key} of cases){
  const asked=fakeApple(),r=await handleDeleteAccount({admin,body:{username:'Sunny Acres'},user:appleFarmer,apple:key,fetchImpl:asked.fetchImpl});
  assert.deepEqual(r,{status:200,data:{deleted:ME,apple:'manual'}});assert.equal(named(admin.calls,'rpc').length,1,'the deletion never waits on Apple');
  assert.equal(asked.calls.length,0);
 }
 // A refusal deletes nothing and revokes nothing.
 const refusedApple=fakeApple(),refused=await handleDeleteAccount({admin:fakeAdmin({tokens:[{client_id:APPLE_CLIENTS.web,refresh_token:REFRESH}],rpcError:{message:DELETE_WRONG_NAME}}),body:{username:'Sunny Acres'},user:appleFarmer,apple,fetchImpl:refusedApple.fetchImpl});
 assert.equal(refused.status,422);assert.equal(refusedApple.calls.length,0);
 const wrongName=fakeAdmin({tokens:[{client_id:APPLE_CLIENTS.web,refresh_token:REFRESH}]});
 assert.equal((await handleDeleteAccount({admin:wrongName,body:{username:'Someone'},user:appleFarmer,apple,fetchImpl:refusedApple.fetchImpl})).status,422);
 assert.equal(wrongName.calls.filter(c=>c[1]==='apple_sign_in_tokens').length,0,'a wrong name reads no tokens');assert.equal(refusedApple.calls.length,0);
 // An account without Apple: no read of the tokens, no call to Apple and no apple in the answer, as before.
 const google=fakeAdmin({tokens:[{client_id:APPLE_CLIENTS.web,refresh_token:REFRESH}]}),none=fakeApple();
 assert.deepEqual(await handleDeleteAccount({admin:google,body:{username:'Sunny Acres'},user:googleFarmer,apple,fetchImpl:none.fetchImpl}),{status:200,data:{deleted:ME}});
 assert.equal(google.calls.filter(c=>c[1]==='apple_sign_in_tokens').length,0);assert.equal(none.calls.length,0);
 assert.deepEqual(await appleTokensOf(google,googleFarmer),[]);assert.equal(await revokeAppleTokens(googleFarmer,[],apple),null);
});

test('the iPhone app\'s answer keeps Apple\'s code when it looks like one; a sign-in without it still signs in',()=>{
 const token='eyJraWQiOiJXNldjT0tCIiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL2FwcGxlaWQuYXBwbGUuY29tIn0.c2lnbmF0dXJl';
 assert.deepEqual(readAppSignIn({type:'apple',provider:'apple',token,name:'',code:CODE}),{type:'apple',provider:'apple',token,code:CODE});
 for(const code of ['','short','a b c d e f g h',`${CODE}<script>`,'x'.repeat(1025),42,null,undefined])
  assert.deepEqual(readAppSignIn({type:'apple',provider:'apple',token,code}),{type:'apple',provider:'apple',token},String(code));
});

test('the wiring: farm-api knows apple_token, before the farm is read, with the owner\'s Apple key; the page sends it once after an Apple sign-in',()=>{
 const index=read('supabase/functions/farm-api/index.ts'),main=read('src/main.js');
 assert.match(index,/import \{handleAppleToken\} from '\.\/apple-sign-in-service\.js';/);
 assert.match(index,/'load','action','apple_token','rename',/);
 assert.match(index,/const appleKey=\(\)=>\(\{keyId:Deno\.env\.get\('APPLE_KEY_ID'\)\?\?'',privateKey:Deno\.env\.get\('APPLE_PRIVATE_KEY'\)\?\?''\}\);/);
 assert.match(index,/if\(body\.operation==='apple_token'\)\{\n\s+const kept=await handleAppleToken\(\{admin,body,user,\.\.\.appleKey\(\)\}\);return reply\(kept\.data,kept\.status\);\n\s+\}\n\s+const profileResponse=/,'before the farm is read: it never makes a farm');
 assert.ok(index.indexOf("if(!active.data)return reply(")<index.indexOf("if(body.operation==='apple_token')"),'only for a live session');
 assert.match(main,/const keepAppleToken=proof=>\{farmRequest\(\{operation:'apple_token',\.\.\.proof\},\{retry:false\}\)\.catch\(\(\)=>\{\}\);\};/,'never waited for, never repeated');
 assert.match(main,/const \{error\}=await supabase\.auth\.signInWithIdToken\(\{provider:'apple',token:answer\.token,nonce\}\);if\(error\)throw error;\n\s+if\(answer\.code\)keepAppleToken\(\{code:answer\.code\}\);/,'the app\'s code only after the sign-in worked');
 assert.match(main,/const token=data\?\.session\?\.provider_refresh_token;if\(typeof token==='string'&&token\)keepAppleToken\(\{refreshToken:token\}\);/);
 assert.match(main,/ if\(oauthProvider\)trackAuth\('login',\{method:oauthProvider\}\);\n if\(oauthProvider==='apple'\)keepWebAppleToken\(\);\n/,'the website: only back from Apple\'s own page, never after a failed return');
 assert.match(main,/\$\('account-message'\)\.textContent=data\?\.apple==='manual'\?DELETED_APPLE_LEFT:'Your account has been deleted\.';/);
 // The site keeps the implicit flow (supabase-js's default), the one where Supabase hands Apple's token to the page.
 assert.doesNotMatch(read('src/supabase.js'),/flowType/);
});

test('supabase/apple-sign-in-tokens.sql: one row per farmer and Apple client, the service role only, gone with the account',()=>{
 const sql=read('supabase/apple-sign-in-tokens.sql');
 assert.match(sql,/create table if not exists public\.apple_sign_in_tokens \(\n player_id uuid not null references auth\.users\(id\) on delete cascade,\n client_id text not null check \(client_id in \('com\.harvesttycoon\.web','com\.harvesttycoon\.app'\)\),\n refresh_token text not null check \(refresh_token ~ '\^\[A-Za-z0-9_\.-\]\{8,1024\}\$'\),\n updated_at timestamptz not null default now\(\),\n primary key \(player_id, client_id\)\n\);/);
 assert.match(sql,/alter table public\.apple_sign_in_tokens enable row level security;\nrevoke all on table public\.apple_sign_in_tokens from public, anon, authenticated;\ngrant select, insert, update, delete on table public\.apple_sign_in_tokens to service_role;/);
 const statements=sql.replace(/^--.*$/gm,'');
 assert.doesNotMatch(statements,/create policy/,'no policy: never readable from a browser');
 assert.doesNotMatch(statements,/grant [^;]*to (anon|authenticated|public)/);
 // The upsert's conflict target is the primary key.
 assert.match(read('supabase/functions/farm-api/apple-sign-in-service.js'),/\{onConflict:'player_id,client_id'\}/);
});

test('the texts: the privacy policy and the deletion page say what is kept and why, and the game says it in every language',()=>{
 const policy=read('public/privacy.html'),page=read('public/delete-account.html');
 assert.match(policy,/<li>If you choose Apple, we also keep the token Apple gives us for your sign-in \(a refresh token; nothing else from Apple\), only so that we can ask Apple to remove Harvest Tycoon from Sign in with Apple in your Apple Account when you delete your Harvest Tycoon account\. It is deleted together with your account\.<\/li>/);
 assert.match(policy,/If you signed in with Apple, we also ask Apple to remove Harvest Tycoon from Sign in with Apple in your Apple Account\. What is deleted and what is kept/);
 assert.match(page,/<li>If you signed in with Apple: the token Apple gave us for your sign-in\. We first use it to ask Apple to remove Harvest Tycoon from Sign in with Apple in your Apple Account\.<\/li>/);
 assert.match(page,/<p>If you signed in with Apple, deleting your account in the game already removes Harvest Tycoon from Sign in with Apple in your Apple Account\. If the game says it may still be listed there, remove it as described above\.<\/p>/);
 const text='Your account has been deleted. Harvest Tycoon may still be listed under Sign in with Apple in your Apple Account, where you can remove it.';
 assert.ok(read('src/main.js').includes(`const DELETED_APPLE_LEFT='${text}';`));
 assert.ok(JSON.parse(read('i18n/catalog.json'))[text]);
 for(const code of READY)if(code!=='en'){const t=JSON.parse(read(`public/i18n/${code}.json`));assert.ok(t[text]?.includes('Harvest Tycoon'),`${code}: ${text}`);assert.ok(t[text].includes('Apple'),code);}
 assert.ok(JSON.parse(read('i18n/ignore.json')).includes('APPLE_PRIVATE_KEY is not a .p8 key.'),'only in the function\'s own logs');
});
