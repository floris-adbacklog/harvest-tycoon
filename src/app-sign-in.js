// Every sign-in in the iPhone app (16 Oct 2026, the owner): from the app 1.3 the sign-in card offers Google, Facebook, Apple and Discord
// as on the website. Google and Facebook refuse a sign-in inside the app's own browser (a WKWebView), so the page asks the app, which
// signs in with the iPhone's own sheets: Apple with Sign in with Apple (the Face ID sheet), the others with the system's secure sign-in
// sheet (ASWebAuthenticationSession), which Google accepts. The app says it can with " AppSignIn/1" in its user agent, after its own
// token (ios-app HarvestApp.swift userAgentToken; public/android-app.js marks the page <html data-app-sign-in>, public/android.js
// appSignIn). Older iPhone apps, the app 1.3 below iOS 17.4 (it does not send the token there) and the Android apps: email and password
// only, as before (src/social-login.js usableProviders).
// The contract, "AppSignIn/1" (the iPhone app does exactly this on its side):
// - Google, Facebook, Discord: supabase-js makes the authorize address (signInWithOAuth with skipBrowserRedirect; the implicit flow, so
//   the session comes back in the address's #fragment), back to the website's own return page: https://www.harvesttycoon.com/play.html
//   with the query a sign-in in a browser carries (src/main.js redirectUrl(true)), always on www (APP_SIGN_IN_ORIGIN), never the page's
//   own origin, so a page on harvesttycoon.com or a test server also comes back where the app can catch it. The page around the game goes
//   to appsignin://oauth?provider=<provider>&url=<that address, encoded in full>. The app opens the address in the system's sign-in sheet
//   (ASWebAuthenticationSession) with Apple's claimed https callback (iOS 17.4 and later: .https(host:"www.harvesttycoon.com",
//   path:"/play.html")), which only an app associated with the domain can catch (webcredentials in
//   public/.well-known/apple-app-site-association), and loads the address the sheet ends on, query and #fragment as they are, so
//   supabase-js finds the session there as after a sign-in in a browser (detectSessionInUrl). No answer on success: the page loads.
//   Below iOS 17.4 the app 1.3 does not say " AppSignIn/1": email and password only there, as in the app 1.2.
//   No custom URL scheme (16 Oct 2026, the owner, after a review): with harvesttycoon://auth-callback on Supabase's redirect allow list,
//   any app that registers harvesttycoon:// could catch a session (a sign-in someone else started, a reset mail sent with that address),
//   so it is off the list and the app has no scheme for it. The website's return page was on the list already.
// - Apple: the page makes a random nonce, keeps it, and goes to appsignin://apple?nonce=<SHA-256 of it, 64 small hex characters>. The app
//   asks Apple with that hash and answers {type:'apple',provider:'apple',token:<Apple's identity token>,name,code}; the page signs in with
//   signInWithIdToken and the nonce itself, which Supabase hashes to check Apple's token. The name is not kept: the farmer name is
//   chosen in the game, and the privacy policy promises nothing more. code: Apple's one-time authorization code (valid 5 minutes, good
//   once), sent from the app 1.3 on so that Apple's tokens can be revoked on account deletion without a new app build (16 Oct 2026,
//   review). After the sign-in the page sends it to farm-api once (src/main.js keepAppleToken), which exchanges it at Apple for the
//   token it revokes when the account is deleted (supabase/functions/farm-api/apple-sign-in-service.js).
// - Answers come as window.harvestAppSignIn({...}): {type:'cancelled',provider} when the farmer closes the sheet, {type:'error',provider,
//   reason:'error'|'busy'|'invalid',code} otherwise. One sign-in at a time (busy); the app ignores an address from a frame or a page
//   that is not the game. iOS ends the Google, Facebook or Discord sheet as a cancel when it refuses it outright (no association with
//   www.harvesttycoon.com: the apple-app-site-association file not on Apple's CDN yet or gone, no Associated Domains in the profile),
//   at once, before the farmer could even read iOS's "wants to use ... to sign in" alert. The app sends that as {type:'error',
//   reason:'error',code:1} (a cancel within 1.5 s, or with iOS's "not associated" words); the page also counts a 'cancelled' within
//   APP_SIGN_IN_REFUSED_MS as "could not open" (src/main.js appSignInFlow), so an app that still says 'cancelled' never leaves a dead
//   button either.
export const APP_SIGN_IN=Object.freeze({oauth:'appsignin://oauth',apple:'appsignin://apple'});
// Where Google, Facebook and Discord send the farmer back: the website's return page on www, the one host the app's sheet answers for.
export const APP_SIGN_IN_ORIGIN='https://www.harvesttycoon.com';
// Our Supabase project: the only authorize address that goes to the app.
export const APP_SIGN_IN_AUTH_HOST='jnmdirvidffzxukbdmij.supabase.co';
// Through the system's sign-in sheet; Apple has its own.
export const APP_OAUTH_PROVIDERS=Object.freeze(['google','facebook','discord']);
const SIGN_IN_PROVIDERS=[...APP_OAUTH_PROVIDERS,'apple'],SIGN_IN_REASONS=new Set(['error','busy','invalid']);
// The farmer may take their time on Google's page (a forgotten password, a code): as long as the App Store's purchase sheet
// (src/app-store.js). After that the form opens again; a sign-in that still finishes in the sheet loads the page as always.
export const APP_SIGN_IN_WAIT_MS=20*60000;
// A 'cancelled' for Google, Facebook or Discord sooner than this after the page asked: iOS refused the sheet, nobody closed it (16 Oct
// 2026, review: in the simulator without the domain association the sheet ends at once as a cancel). A farmer has to read and tap
// iOS's alert first. The same 1.5 s as the app's own check. Apple's own sheet has no such alert and no association, so an Apple
// cancel is always the farmer's.
export const APP_SIGN_IN_REFUSED_MS=1500;

export const appOAuthLink=({provider,url})=>`${APP_SIGN_IN.oauth}?provider=${encodeURIComponent(provider)}&url=${encodeURIComponent(url)}`;
export const appAppleLink=hash=>`${APP_SIGN_IN.apple}?nonce=${encodeURIComponent(hash)}`;
// The authorize address supabase-js made, as the app will accept it: https on our Supabase project's /auth/v1/authorize, with exactly one
// redirect_to, and that one the website's return page on www with or without a query and without a #fragment. Anything else never goes
// to the app (the farmer gets the usual "could not open" line instead of a sheet that says nothing or comes back nowhere).
const APP_RETURN=/^https:\/\/www\.harvesttycoon\.com\/play\.html(?:\?[^#\\\s]*)?$/;
export function appAuthorizeUrl(value){
 try{
  const url=new URL(String(value)),back=url.searchParams.getAll('redirect_to');
  return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&url.hostname===APP_SIGN_IN_AUTH_HOST&&url.pathname==='/auth/v1/authorize'&&
   back.length===1&&APP_RETURN.test(back[0])&&new URL(back[0]).origin===APP_SIGN_IN_ORIGIN;
 }catch{return false;}
}

const toHex=bytes=>Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
// Apple's nonce: 32 random bytes as 64 hex characters, made fresh for every sign-in and never stored.
export function appleNonce(cryptoImpl=globalThis.crypto){const bytes=new Uint8Array(32);cryptoImpl.getRandomValues(bytes);return toHex(bytes);}
// SHA-256 of a text as 64 small hex characters: what goes to Apple (Supabase hashes the nonce the same way to check Apple's token).
export async function sha256Hex(text,cryptoImpl=globalThis.crypto){return toHex(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(String(text)))));}

// What the app says, checked (the app is ours, but the page reads nothing it does not expect). Apple's identity token is a JWT of about
// a kilobyte; anything else is no answer. Apple's authorization code (letters, digits, dot, dash, underscore) only when it looks like
// one; a sign-in without it still signs in.
const ID_TOKEN=/^[\w-]+\.[\w-]+\.[\w-]+$/,APPLE_CODE=/^[\w.-]{8,1024}$/;
export function readAppSignIn(raw){
 const provider=SIGN_IN_PROVIDERS.includes(raw?.provider)?raw.provider:'';
 if(raw?.type==='apple')return provider==='apple'&&typeof raw.token==='string'&&raw.token.length<=16384&&ID_TOKEN.test(raw.token)?{type:'apple',provider,token:raw.token,...(typeof raw.code==='string'&&APPLE_CODE.test(raw.code)?{code:raw.code}:{})}:null;
 if(raw?.type==='cancelled')return {type:'cancelled',provider};
 if(raw?.type==='error')return {type:'error',provider,reason:SIGN_IN_REASONS.has(raw.reason)?raw.reason:'error',code:Number.isSafeInteger(raw.code)?raw.code:null};
 return null;
}
// The page around the game keeps one window.harvestAppSignIn, installed once; each sign-in waits for its own answer.
function signInHub(win){
 let listeners=win.harvestAppSignInHub;
 if(!listeners){
  listeners=new Set();
  try{Object.defineProperty(win,'harvestAppSignInHub',{value:listeners,configurable:true});}catch{win.harvestAppSignInHub=listeners;}
  win.harvestAppSignIn=raw=>{const answer=readAppSignIn(raw);if(!answer)return;for(const listen of [...listeners]){try{listen(answer);}catch{}}};
 }
 return listeners;
}
// The app's answer for this provider (or one that names none: the app could not read the address), or null after ms. Listening starts
// before the page goes to the app's address, so a quick answer is never missed.
export function waitForAppSignIn(provider,{win=globalThis.window,ms=APP_SIGN_IN_WAIT_MS,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 return new Promise(resolve=>{
  const listeners=signInHub(win);let timer;
  const listen=answer=>{if(answer.provider&&answer.provider!==provider)return;listeners.delete(listen);clearTimer(timer);resolve(answer);};
  listeners.add(listen);timer=setTimer(()=>{listeners.delete(listen);resolve(null);},ms);
 });
}
