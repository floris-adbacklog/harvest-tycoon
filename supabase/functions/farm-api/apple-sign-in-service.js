// Sign in with Apple, let go of when the account is deleted (16 Oct 2026, the owner chose "keep Apple's token at the sign-in"; Apple's
// "Offering account deletion in your app" and TN3194: an app with Sign in with Apple should revoke the farmer's Apple tokens through
// Apple's REST API when the account is deleted, so Harvest Tycoon leaves the "Sign in with Apple" list in their Apple Account).
// - At the sign-in, once (operation 'apple_token', src/main.js keepAppleToken):
//   - iPhone app 1.3 (Apple's own sheet, client com.harvesttycoon.app): the page sends Apple's one-time authorization code (5 minutes,
//     once), which is exchanged here at Apple's /auth/token for Apple's refresh token.
//   - Website (Supabase's Apple sign-in, Services ID com.harvesttycoon.web, the first Apple client ID in Supabase): Supabase exchanged
//     Apple's code itself and hands Apple's refresh token to the page once (the session's provider_refresh_token); the page sends
//     it, and it is checked here with Apple (grant_type refresh_token) before it is kept.
//   Only Apple's refresh token is kept (apple_sign_in_tokens, supabase/apple-sign-in-tokens.sql: one row per farmer and client, the
//   service role only), and only when Apple says it belongs to this account's own Apple ID (the sub in Apple's id_token against the
//   account's Apple identity). Never an error for the farmer: anything else keeps nothing.
// - At the deletion (account-delete-service.js handleDeleteAccount): the farmer's tokens are read before the account goes (the row
//   goes with it: on delete cascade), and each is revoked at Apple's /auth/revoke after the deletion. Best effort, like OneSignal: an
//   account with an Apple identity whose tokens could not all be revoked (none kept, no key, Apple said no) is told so, with where to
//   remove Harvest Tycoon in their Apple Account themselves (TN3194's own fallback).
// The client secret Apple asks for is an ES256 JWT signed with the team's Sign in with Apple key (.p8), made here for each call and good
// for 5 minutes, so it never expires the way Supabase's six-month Apple secret does. The key lives only in the function's secrets
// (APPLE_KEY_ID, APPLE_PRIVATE_KEY: the .p8 file's text), set by the owner; without them nothing is kept or revoked.
export const APPLE_TEAM_ID='QAXWA37ACQ';
export const APPLE_CLIENTS=Object.freeze({web:'com.harvesttycoon.web',app:'com.harvesttycoon.app'});
export const APPLE_ISSUER='https://appleid.apple.com';
const CLIENT_IDS=Object.values(APPLE_CLIENTS);
// Apple's codes and refresh tokens: letters, digits, dot, dash and underscore (e.g. c0a1….0.rrsy.Ab-1…), never more than a few hundred.
const APPLE_VALUE=/^[\w.-]{8,1024}$/;
const APPLE_TIMEOUT_MS=8000;

const toBase64Url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const textBase64Url=text=>toBase64Url(new TextEncoder().encode(text));
// The .p8 file as the owner pasted it into the secret: the PEM with its BEGIN and END lines, its line breaks kept or written as \n,
// or only the base64 between them. A P-256 key in PKCS #8 is well over 64 bytes.
export function appleKeyBytes(pem){
 const body=String(pem??'').replace(/-----(BEGIN|END) PRIVATE KEY-----/g,'').replace(/\\n/g,'').replace(/\s+/g,'');
 let bytes=null;
 try{if(/^[A-Za-z0-9+/]+={0,2}$/.test(body))bytes=Uint8Array.from(atob(body),char=>char.charCodeAt(0));}catch{}
 if(!bytes||bytes.length<64)throw new Error('APPLE_PRIVATE_KEY is not a .p8 key.');
 return bytes;
}
// Apple's client secret for one client ID: header {alg:ES256,kid}, claims {iss:team,iat,exp,aud:Apple,sub:client}. WebCrypto's ECDSA
// signature is r and s side by side (64 bytes), exactly what a JWS wants.
export async function appleClientSecret({clientId,keyId,privateKey,now=Date.now(),cryptoImpl=globalThis.crypto}){
 const key=await cryptoImpl.subtle.importKey('pkcs8',appleKeyBytes(privateKey),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const iat=Math.floor(now/1000);
 const signed=`${textBase64Url(JSON.stringify({alg:'ES256',kid:keyId}))}.${textBase64Url(JSON.stringify({iss:APPLE_TEAM_ID,iat,exp:iat+300,aud:APPLE_ISSUER,sub:clientId}))}`;
 const signature=await cryptoImpl.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,new TextEncoder().encode(signed));
 return `${signed}.${toBase64Url(signature)}`;
}
// Apple's id_token, read without its signature: it comes straight from Apple's own token endpoint over TLS, never from the page.
export function appleIdClaims(idToken){
 try{const part=String(idToken).split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')),char=>char.charCodeAt(0))));}
 catch{return null;}
}
// The Apple ID (sub) behind this account's Apple sign-in, as Supabase keeps it on the identity: none for an account without one.
export function appleSubs(user){
 const subs=new Set();
 for(const identity of Array.isArray(user?.identities)?user.identities:[]){
  if(identity?.provider!=='apple')continue;
  for(const value of [identity.identity_data?.sub,identity.provider_id,identity.id])if(typeof value==='string'&&value)subs.add(value);
 }
 return subs;
}
export const hasAppleSignIn=user=>appleSubs(user).size>0||(Array.isArray(user?.app_metadata?.providers)&&user.app_metadata.providers.includes('apple'));

// One form POST to Apple: {ok, status, data}. A network failure or a timeout is {ok:false}.
async function appleForm(path,fields,fetchImpl){
 try{
  const response=await fetchImpl(`${APPLE_ISSUER}${path}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams(fields).toString(),signal:AbortSignal.timeout(APPLE_TIMEOUT_MS)});
  let data=null;try{data=await response.json();}catch{}
  return {ok:response.ok,status:response.status,data};
 }catch{return {ok:false,status:0,data:null};}
}
// One line in farm-api's logs for every outcome (16 Oct 2026, the first live Apple sign-in kept nothing and nothing said why): the step,
// the client, the outcome and Apple's own status and error word. Never a token, a code, an Apple ID or a player id.
const appleError=data=>typeof data?.error==='string'&&/^[a-z_]{1,40}$/.test(data.error)?data.error:undefined;
export const logApple=entry=>{try{console.log(`apple-sign-in ${JSON.stringify(entry)}`);}catch{}};

// Operation 'apple_token': {code} (the iPhone app's Apple sheet) or {refreshToken} (the website, from Supabase). Answers {kept:true}
// when a token was kept, else {kept:false}; only a missing sign-in is an error.
export async function handleAppleToken({admin,body,user,keyId='',privateKey='',fetchImpl=globalThis.fetch,now=Date.now(),log=logApple}){
 if(!user?.id)return {status:401,data:{error:'Please sign in.'}};
 const code=typeof body?.code==='string'&&APPLE_VALUE.test(body.code)?body.code:'';
 const refreshToken=!code&&typeof body?.refreshToken==='string'&&APPLE_VALUE.test(body.refreshToken)?body.refreshToken:'';
 const clientId=code?APPLE_CLIENTS.app:APPLE_CLIENTS.web,subs=appleSubs(user);
 const skip=outcome=>{log({step:'keep',client:clientId,outcome});return {status:200,data:{kept:false}};};
 if(!(code||refreshToken))return skip(typeof body?.code==='string'||typeof body?.refreshToken==='string'?'not_apple_value':'nothing_sent');
 if(!subs.size)return skip('no_apple_identity');
 if(!keyId||!privateKey||!fetchImpl)return skip('no_key');
 let secret;try{secret=await appleClientSecret({clientId,keyId,privateKey,now});}catch{return skip('bad_key');}
 const answer=await appleForm('/auth/token',code?{client_id:clientId,client_secret:secret,code,grant_type:'authorization_code'}:{client_id:clientId,client_secret:secret,refresh_token:refreshToken,grant_type:'refresh_token'},fetchImpl);
 if(!answer.ok){log({step:'keep',client:clientId,outcome:'apple_refused',status:answer.status,error:appleError(answer.data)});return {status:200,data:{kept:false}};}
 const token=code?answer.data?.refresh_token:refreshToken;
 if(typeof token!=='string'||!APPLE_VALUE.test(token))return skip('no_refresh_token');
 // The code's answer always has an id_token; a refresh's answer may not, and Apple accepting the token for our client is then enough.
 const claims=answer.data?.id_token?appleIdClaims(answer.data.id_token):null;
 if((code||answer.data?.id_token)&&!(claims?.iss===APPLE_ISSUER&&claims?.aud===clientId&&subs.has(claims?.sub))){
  log({step:'keep',client:clientId,outcome:'other_apple_id',iss:claims?.iss===APPLE_ISSUER,aud:claims?.aud===clientId,sub:subs.has(claims?.sub)});return {status:200,data:{kept:false}};
 }
 const saved=await admin.from('apple_sign_in_tokens').upsert({player_id:user.id,client_id:clientId,refresh_token:token,updated_at:new Date(now).toISOString()},{onConflict:'player_id,client_id'});
 if(saved.error){log({step:'keep',client:clientId,outcome:'not_saved'});throw saved.error;}
 log({step:'keep',client:clientId,outcome:'kept',idToken:Boolean(answer.data?.id_token)});
 return {status:200,data:{kept:true}};
}

// The deletion's two halves (account-delete-service.js). Before: this farmer's kept tokens ([] for an account without Apple, or when
// the read fails: the deletion never waits on Apple).
export async function appleTokensOf(admin,user){
 if(!user?.id||!hasAppleSignIn(user))return [];
 try{
  const {data,error}=await admin.from('apple_sign_in_tokens').select('client_id,refresh_token').eq('player_id',user.id);
  if(error||!Array.isArray(data))return [];
  return data.filter(row=>CLIENT_IDS.includes(row?.client_id)&&typeof row?.refresh_token==='string'&&row.refresh_token);
 }catch{return [];}
}
// After: each token revoked at Apple. 'revoked' when every one was (and there was one), 'manual' for an Apple account where that
// failed or nothing was kept, null for an account without Apple.
export async function revokeAppleTokens(user,tokens,{keyId='',privateKey='',fetchImpl=globalThis.fetch,now=Date.now(),log=logApple}={}){
 if(!hasAppleSignIn(user))return null;
 if(!tokens.length||!keyId||!privateKey||!fetchImpl){log({step:'revoke',outcome:tokens.length?'no_key':'nothing_kept'});return 'manual';}
 const results=await Promise.all(tokens.map(async({client_id:clientId,refresh_token:token})=>{
  let secret;try{secret=await appleClientSecret({clientId,keyId,privateKey,now});}catch{log({step:'revoke',client:clientId,outcome:'bad_key'});return false;}
  const answer=await appleForm('/auth/revoke',{client_id:clientId,client_secret:secret,token,token_type_hint:'refresh_token'},fetchImpl);
  log({step:'revoke',client:clientId,outcome:answer.ok?'revoked':'apple_refused',...(answer.ok?{}:{status:answer.status,error:appleError(answer.data)})});
  return answer.ok;
 }));
 return results.every(Boolean)?'revoked':'manual';
}
