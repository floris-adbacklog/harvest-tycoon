// The game page's side of Kongregate's own JavaScript API (Oct 2026). Kongregate shows our page,
// https://www.harvesttycoon.com/kongregate.html, in a frame on its game page (their "Iframe" game type: nothing of ours is uploaded,
// a push to the website updates the game), and the page loads Kongregate's API script once (API_SCRIPT, in the page's head, as their
// docs ask). The API says who plays: a user id (0 for a guest), the username and a game auth token. Only our server checks that the
// token is this user's, with Kongregate (kongregate-auth): a user id the page reads is never trusted by itself.
// Kongregate gives the frame its values in one of two ways (seen on their site, Oct 2026): by message to the API script, or as
// kongregate_* parameters in the frame's address. The API is asked first; the address only when the API does not load (blocked).
export const API_SCRIPT='https://cdn1.kongregate.com/javascripts/kongregate_api.js';
export const GUEST='0';
// Who plays, as Kongregate says: {id, username, token}; id '0' for a guest, also when the id or the token is missing or not in
// Kongregate's form (a whole number, a token of visible characters).
export function cleanUser({id,username,token}={}){
 const digits=String(id??'').trim(),auth=typeof token==='string'&&/^[\x21-\x7e]{1,256}$/.test(token)?token:'';
 const registered=/^[1-9]\d{0,9}$/.test(digits)&&Boolean(auth);
 return {id:registered?digits:GUEST,username:typeof username==='string'?username.slice(0,40):'',token:registered?auth:''};
}
export const isGuest=user=>!user||user.id===GUEST;
// The kongregate_* values in the frame's address (only when the API does not load).
export function addressUser(search){
 const q=new URLSearchParams(search||'');
 return cleanUser({id:q.get('kongregate_user_id'),username:q.get('kongregate_username'),token:q.get('kongregate_game_auth_token')});
}
// The player's language on Kongregate's site (kongregate_language, two letters), or null.
export function siteLanguage(values){
 const code=typeof values?.kongregate_language==='string'?values.kongregate_language.trim().slice(0,2).toLowerCase():'';
 return /^[a-z]{2}$/.test(code)?code:null;
}

// The link from this page. hello() loads the API (loadAPI once, then getAPI) and answers {api, language, user}; without the API in
// `wait` ms (blocked, or the page is not on Kongregate) it answers with what the address says. onChange(fn): a guest who signs in
// (Kongregate's "login" event, which comes without a reload) or another user who plays now, also noticed by looking every `poll` ms
// (the docs allow polling), so a sign-in is never missed. Kongregate also reloads the whole frame after a sign-in: then the page simply
// starts again.
export function createKongregateLink({win=globalThis.window,wait=15000,poll=2000,timers=globalThis}={}){
 let api=null,loading=null,pollTimer=0,last='';
 const listeners=new Set();
 const values=()=>{try{const found=win?.kongregateAPI?.flashVarsObject?.();if(found&&typeof found==='object')return found;}catch{}return Object.fromEntries(new URLSearchParams(win?.location?.search||''));};
 function user(){
  const services=api?.services;
  if(services){try{return cleanUser({id:services.getUserId(),username:services.getUsername(),token:services.getGameAuthToken()});}catch{}}
  return addressUser(win?.location?.search);
 }
 const key=found=>`${found.id}:${found.token}`;
 function tell(){const now=user();last=key(now);for(const fn of [...listeners])try{fn(now);}catch{}}
 function hello(){
  return loading??=new Promise(resolve=>{
   let done=false;
   const finish=()=>{if(done)return;done=true;timers.clearTimeout(timer);const now=user();last=key(now);resolve({api:Boolean(api),language:siteLanguage(values()),user:now});};
   const loader=win?.kongregateAPI;
   const timer=loader?.loadAPI?timers.setTimeout(finish,wait):0;
   if(!loader?.loadAPI){finish();return;}
   try{
    loader.loadAPI(()=>{
     try{api=loader.getAPI();if(win)win.kongregate=api;}catch{api=null;}
     try{api?.services?.addEventListener?.('login',tell);}catch{}
     // Loaded after the wait: whoever plays now is told like a sign-in.
     if(done){if(key(user())!==last)tell();}else finish();
    });
   }catch{finish();}
  });
 }
 return {
  hello,
  user,
  get ready(){return Boolean(api);},
  // Kongregate's own sign-in and registration window, only ever from a player's tap. false: the API is not there to open it.
  register(){try{if(typeof api?.services?.showRegistrationBox==='function'){api.services.showRegistrationBox();return true;}}catch{}return false;},
  // A statistic (kongregate.stats.submit); nothing happens when Kongregate does not know it yet. true when it was handed over.
  submit(name,value){try{if(typeof api?.stats?.submit==='function'){api.stats.submit(name,value);return true;}}catch{}return false;},
  onChange(fn){
   listeners.add(fn);
   pollTimer||=timers.setInterval(()=>{if(key(user())!==last)tell();},poll);
   return()=>{listeners.delete(fn);if(!listeners.size){timers.clearInterval(pollTimer);pollTimer=0;}};
  },
  dispose(){listeners.clear();timers.clearInterval(pollTimer);pollTimer=0;}
 };
}
// A stand-in when this page is opened on its own on a computer of our own (http://localhost:…/kongregate.html), to look at the page:
// the user and the language from the address (?kongregate_user_id=…&kongregate_game_auth_token=…&kongregate_language=…), a guest
// without them. Kongregate's own window does not exist here. Only for trying the page out; on our real address the page sends a
// visitor who opens it on its own to the website instead (src/kongregate.js).
export function localStandIn({search=globalThis.location?.search??''}={}){
 const values=Object.fromEntries(new URLSearchParams(search||''));
 return {hello:async()=>({api:false,language:siteLanguage(values),user:addressUser(search)}),user:()=>addressUser(search),ready:false,
  register:()=>false,submit:()=>false,onChange:()=>()=>{},dispose(){}};
}
