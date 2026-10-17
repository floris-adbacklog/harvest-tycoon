import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {signInOf,canSetPassword,maskEmail,signInSentence,passwordMail,passwordSession,ONE_WAY,RELAY_TEXT,SET_PASSWORD,PASSWORD_SENT,PROVIDER_NAMES} from '../src/account-sign-in.js';
import {createSignInLine,SIGN_IN_MARKS} from '../src/account-sign-in-ui.js';
import {SOCIAL_PROVIDERS} from '../src/social-login.js';
import {createTranslator} from '../public/i18n.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// How you sign in (17 Oct 2026, the owner's pick): Settings, Your account says how the account signs in, its address masked, and
// Set a password for an account without one.
const user=(providers,email='floris.example@gmail.com',more={})=>({id:'A',email,identities:providers.map(provider=>({provider})),app_metadata:{provider:providers[0],providers},...more});

test('the address is masked: the first and last character before the @, the whole domain; short, unicode and missing ones too',()=>{
 for(const [email,masked] of [['floris@gmail.com','f…s@gmail.com'],['floris.example@gmail.com','f…e@gmail.com'],['abc@x.com','a…c@x.com'],
  ['ab@x.com','a…@x.com'],['a@x.com','…@x.com'],['😀@x.com','…@x.com'],[' Sunny@Example.COM ','S…y@Example.COM'],['jörg@web.de','j…g@web.de'],
  ['😀farm🌽@x.com','😀…🌽@x.com'],['éric@x.fr','é…c@x.fr'],['a.b+tag@mail.example.co.uk','a…g@mail.example.co.uk'],
  ['k7x2pq9mzd@privaterelay.appleid.com','k…d@privaterelay.appleid.com']])assert.equal(maskEmail(email),masked,email);
 for(const nothing of ['',null,undefined,42,{},'nobody','@x.com','a@','a b@x.com'])assert.equal(maskEmail(nothing),'',String(nothing));
 // Never the whole part before the @ (a two-letter one keeps only its first letter, a one-letter one none).
 for(const email of ['a@x.com','ab@x.com','abc@x.com','floris@gmail.com'])assert.notEqual(maskEmail(email).split('@')[0].replace('…',''),email.split('@')[0]);
});

test('the ways in come from the identities and app_metadata.providers; a portal, a guest or an unknown way says nothing',()=>{
 assert.deepEqual(signInOf(user(['google'])),{email:'floris.example@gmail.com',methods:['google']});
 assert.deepEqual(signInOf(user(['email'])).methods,['email']);
 // An email sign-up that later used Google with the same address (Supabase links them): both, in the order they are named.
 assert.deepEqual(signInOf(user(['email','google'])).methods,['google','email']);
 assert.deepEqual(signInOf({email:'x@y.com',identities:[{provider:'facebook'}],app_metadata:{provider:'facebook',providers:['facebook','google']}}).methods,['google','facebook']);
 // No identities in the answer: app_metadata.provider.
 assert.deepEqual(signInOf({email:'x@y.com',identities:[],app_metadata:{provider:'apple'}}).methods,['apple']);
 assert.equal(signInOf({...user(['google']),email:null}).email,'','no address: the line without one');
 for(const nothing of [null,undefined,'A',{},user(['email'],'abc123@players.harvesttycoon.com'),user(['email'],'x@y.com',{app_metadata:{portal:'kongregate',provider:'email',providers:['email']}}),
  user(['email'],'x@y.com',{is_anonymous:true}),user(['twitter']),{email:'x@y.com',identities:[],app_metadata:{}}])assert.equal(signInOf(nothing),null,JSON.stringify(nothing));
});

test('one sentence per way, whole; a mix names the providers; it reads the same in every order',()=>{
 for(const [methods,text] of [[['google'],'You sign in with Google.'],[['facebook'],'You sign in with Facebook.'],[['apple'],'You sign in with Apple.'],
  [['discord'],'You sign in with Discord.'],[['email'],'You sign in with your email address and password.'],
  [['email','google'],'You sign in with Google or with your email address and password.'],[['facebook','email'],'You sign in with Facebook or with your email address and password.'],
  [['facebook','google'],'You sign in with Google or Facebook.'],[['apple','google','facebook'],'You sign in with Google, Facebook or Apple.'],
  [['email','facebook','google'],'You sign in with Google, Facebook or with your email address and password.']])assert.equal(signInSentence(methods),text,methods.join('+'));
 for(const nothing of [[],null,undefined,['twitter']])assert.equal(signInSentence(nothing),'');
 assert.deepEqual(Object.values(ONE_WAY),['You sign in with Google.','You sign in with Facebook.','You sign in with Apple.','You sign in with Discord.','You sign in with your email address and password.']);
});

test('Set a password: only an account without a password that can be mailed (not Apple\'s private relay)',()=>{
 for(const ways of [['google'],['facebook'],['discord'],['apple'],['google','facebook']])assert.equal(canSetPassword(signInOf(user(ways))),true,ways.join('+'));
 for(const ways of [['email'],['email','google'],['facebook','email']])assert.equal(canSetPassword(signInOf(user(ways))),false,ways.join('+'));
 assert.equal(canSetPassword(signInOf(user(['apple'],'k7x2pq9mzd@privaterelay.appleid.com'))),false,'Apple drops mail from senders it does not know');
 assert.equal(canSetPassword(signInOf(user(['apple'],'K7X2@PrivateRelay.AppleID.com'))),false);
 assert.equal(canSetPassword(signInOf({...user(['google']),email:''})),false,'no address to mail');
 for(const nothing of [null,undefined,{},{email:'x@y.com'},{email:'x@y.com',methods:[]}])assert.equal(canSetPassword(nothing),false);
});

// 17 Oct 2026 (the review): Supabase adds no email identity when a Google account sets a password, so the session says it: one opened
// with the password (amr 'password': every Google farmer in the Android app), or the farm right after "Choose a new password.".
test('a session opened with a password counts as email and password too: the sentence says so and there is no button',()=>{
 for(const amr of [[{method:'password',timestamp:1}],[{method:'oauth',timestamp:1},{method:'password',timestamp:2}],['password']])assert.equal(passwordSession(amr),true,JSON.stringify(amr));
 for(const amr of [[],[{method:'oauth',timestamp:1}],[{method:'otp',timestamp:1}],[{method:'recovery'}],null,undefined,'password',{method:'password'},[null,42,{}]])assert.equal(passwordSession(amr),false,JSON.stringify(amr));
 const google=user(['google']);
 const withPassword=signInOf(google,{password:true});
 assert.deepEqual(withPassword,{email:'floris.example@gmail.com',methods:['google','email']});
 assert.equal(canSetPassword(withPassword),false,'it has a password: no Set a password');
 assert.equal(signInSentence(withPassword.methods),'You sign in with Google or with your email address and password.');
 assert.deepEqual(signInOf(user(['facebook','discord']),{password:true}).methods,['facebook','discord','email']);
 // Without the flag (a Google session, a token that cannot be read): what the identities say, as before.
 assert.deepEqual(signInOf(google).methods,['google']);assert.deepEqual(signInOf(google,{password:false}).methods,['google']);assert.deepEqual(signInOf(google,{password:'yes'}).methods,['google'],'only true');
 assert.equal(canSetPassword(signInOf(google)),true);
 // An email account stays as it was; a portal's never shows, password or not.
 assert.deepEqual(signInOf(user(['email']),{password:true}).methods,['email']);
 assert.equal(signInOf(user(['email'],'abc123@players.harvesttycoon.com'),{password:true}),null);
 assert.equal(signInOf(user(['email'],'x@y.com',{app_metadata:{portal:'crazygames',provider:'email',providers:['email']}}),{password:true}),null);
});

test('the mail is Supabase\'s reset mail to the account\'s own address with the return address it is given; refusals in the farmer\'s words',async()=>{
 const calls=[],tracked=[],auth={async resetPasswordForEmail(email,options){calls.push([email,options]);return {data:{},error:null};}};
 await passwordMail({auth,email:'floris.example@gmail.com',redirectTo:'https://www.harvesttycoon.com/play.html',track:(...args)=>tracked.push(args)})();
 assert.deepEqual(calls,[['floris.example@gmail.com',{redirectTo:'https://www.harvesttycoon.com/play.html'}]]);
 assert.deepEqual(tracked,[['set_password_sent']]);
 const refusal=async(error,{online=true,thrown=false}={})=>{const asked=[],seen=[];
  const failing={async resetPasswordForEmail(...args){asked.push(args);if(thrown)throw error;return {data:null,error};}};
  await assert.rejects(passwordMail({auth:failing,email:'a@b.com',redirectTo:'r',online:()=>online,track:(...args)=>seen.push(args)})(),caught=>{refusal.message=caught.message;return true;});
  return {message:refusal.message,asked:asked.length,seen};};
 let r=await refusal({code:'over_email_send_rate_limit',status:429,message:'For security purposes, you can only request this after 52 seconds.'});
 assert.equal(r.message,'Too many attempts. Please wait a few minutes and try again.');assert.deepEqual(r.seen,[['error',{mode:'set_password',reason:'rate_limited'}]]);
 r=await refusal(new TypeError('Failed to fetch'),{thrown:true});assert.equal(r.message,'We could not reach the server. Check your connection and try again.');
 r=await refusal({message:'Load failed'});assert.equal(r.message,'We could not reach the server. Check your connection and try again.');
 r=await refusal({code:'unexpected_failure',status:500,message:'Error sending recovery email'});assert.equal(r.message,'Something went wrong. Please try again.','never Supabase\'s own English');
 r=await refusal(null,{online:false});assert.equal(r.message,'We could not reach the server. Check your connection and try again.');assert.equal(r.asked,0,'offline: not even asked');
 const none=[];await assert.rejects(passwordMail({auth:{async resetPasswordForEmail(...args){none.push(args);return {};}},email:'',redirectTo:'r'})(),/Something went wrong/);assert.equal(none.length,0);
});

test('src/main.js: the bridge says how the signed-in user signs in and mails the reset with the "Forgot your password?" return address',()=>{
 const main=read('src/main.js');
 assert.match(main,/import \{signInOf,passwordMail,passwordSession\} from '\.\/account-sign-in\.js';/);
 assert.ok(main.includes("bridge.signIn=signInOf(user,{password:hasPassword});"),'the user verifiedUser gave (getUser): no extra call');
 // The session's amr from the stored session (supabase-js decodes it, no call), read while the farm loads; the password just set counts.
 assert.ok(main.includes("async function sessionMethods(){try{const {data}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();return data?.currentAuthenticationMethods??[];}catch{return [];}}"));
 assert.ok(main.includes("const hasPassword=(Boolean(passwordSet)&&passwordSet===user.id)||passwordSession(await signedWith);if(ticket!==generation)return;"));
 assert.ok(main.indexOf('const signedWith=sessionMethods();')<main.indexOf("initial=await farmRequest({operation:'load'"),'alongside the farm load, not after it');
 assert.ok(main.includes("bridge.setPassword=async()=>{if(ticket!==generation)throw new Error('Your session has ended.');await passwordMail({auth:supabase.auth,email:user.email,redirectTo:redirectUrl(),"));
 assert.ok(main.includes("const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl()});"),'Forgot your password? uses the same return address');
 // Its link comes back in recovery mode: "Choose a new password." and then the farm.
 assert.ok(main.includes("if(kind==='recovery')startRecovery();")&&main.includes("if(event==='PASSWORD_RECOVERY'){if(recoveryLink&&!recovering)startRecovery();return;}"));
 assert.ok(main.includes("const {data,error}=await supabase.auth.updateUser({password});if(error)throw error;"));
 assert.ok(main.includes("recovering=false;recoveryLink=false;passwordSet=data?.user?.id??'';"));
 // Only the tab the reset link opened in turns into the password form (read before supabase-js clears the address).
 assert.ok(main.indexOf("let recoveryLink=linkKind()==='recovery'")<main.indexOf('supabase.auth.onAuthStateChange('));
});

test('the line shows on the website and in both apps, never on a portal or in the admin view',()=>{
 const cloud=read('src/game-cloud.js');
 assert.ok(cloud.includes('if(!portal&&!adminView&&bridge.signIn)createSignInLine({info:bridge.signIn,setPassword:bridge.setPassword});'));
 assert.ok(cloud.includes("import {createSignInLine} from './account-sign-in-ui.js';"));
 assert.ok(cloud.indexOf('const ui=createCloudUI(')<cloud.indexOf('createSignInLine({'),'after Your account is there');
 // The portals' own bridge (CrazyGames, Kongregate, Discord) has neither.
 const session=read('src/farm-session.js');assert.ok(!/\bsignIn\b|setPassword/.test(session));
 for(const page of ['src/crazygames.js','src/kongregate-page.js','src/discord-page.js','src/kongregate.js','src/discord.js'])assert.ok(!read(page).includes('account-sign-in'),page);
 // A changed address (Settings, Email address) reaches the line.
 assert.ok(read('public/game.js').includes("document.dispatchEvent(new CustomEvent('harvest-email-changed',{detail:next}));"));
});

test('the providers\' marks and names are the sign-in card\'s own; the sign-in page loads no pictures for the line',()=>{
 assert.deepEqual(PROVIDER_NAMES,SOCIAL_PROVIDERS);
 assert.ok(!/^import /m.test(read('src/account-sign-in.js').replace("import {describeAuthError} from './account-form.js';\n",'')),'only account-form.js, which the sign-in page has already');
 const play=read('public/play.html');
 for(const [provider,svg] of Object.entries(SIGN_IN_MARKS)){
  const own=play.match(new RegExp(`data-provider="${provider}"[^>]*>(<svg[\\s\\S]*?</svg>)`))?.[1];
  assert.equal(svg,own,provider);
 }
 assert.deepEqual(Object.keys(SIGN_IN_MARKS),['google','facebook','apple','discord']);
});

// A small page for the line: Your account's name card, the name tip under it (#name-nudge) and Settings (the dialog that closes),
// elements that keep their children, attributes, classes and clicks. box: where the line went.
function fakePage({card=true,nudge=true}={}){
 const listeners={},made=[];
 const element=tag=>{const attrs=new Map(),classes=new Set();const el={tagName:tag.toUpperCase(),children:[],hidden:false,disabled:false,textContent:'',innerHTML:'',id:'',type:'',onclick:null,
  get className(){return [...classes].join(' ');},set className(value){classes.clear();for(const c of String(value).split(/\s+/).filter(Boolean))classes.add(c);},
  classList:{add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n)),contains:name=>classes.has(name)},
  setAttribute(name,value){attrs.set(name,String(value));},getAttribute:name=>attrs.has(name)?attrs.get(name):null,removeAttribute(name){attrs.delete(name);},hasAttribute:name=>attrs.has(name),
  append(...nodes){el.children.push(...nodes);},after(node){el.next=node;},
  find(cls){if(classes.has(cls))return el;for(const child of el.children){const hit=child.find?.(cls);if(hit)return hit;}return null;}};made.push(el);return el;};
 const nameCard=card?element('div'):null,tip=card&&nudge?element('div'):null,closing=[];
 const dialog={addEventListener(name,fn){if(name==='close')closing.push(fn);},close(){for(const fn of closing)fn({});}};
 if(nameCard){nameCard.closest=selector=>selector==='dialog'?dialog:null;if(tip)nameCard.parentElement={querySelector:selector=>selector==='#name-nudge'?tip:null};}
 const placed=()=>tip?.next??nameCard?.next;
 const doc={createElement:element,querySelector:selector=>selector==='.settings-account .account-card'?nameCard:null,getElementById:id=>placed()?.id===id?placed():null,
  addEventListener(name,fn){(listeners[name]??=[]).push(fn);},dispatch(name,detail){for(const fn of listeners[name]??[])fn({detail});}};
 return {doc,card:nameCard,nudge:tip,dialog,made,get box(){return placed();}};
}
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};

test('Settings: the sentence and the masked address under the name card; Show reveals it and Hide masks it again',()=>{
 const page=fakePage(),line=createSignInLine({info:signInOf(user(['google'])),setPassword:async()=>{},doc:page.doc});
 const box=page.box;assert.equal(box,line.box);assert.equal(box.id,'account-sign-in');
 const out=box.find('sign-in-email'),show=box.find('sign-in-show');
 assert.equal(box.find('sign-in-how').textContent,'You sign in with Google.');
 assert.equal(out.textContent,'f…e@gmail.com');assert.equal(out.getAttribute('translate'),'no','the farmer\'s own, never translated');
 assert.equal(show.textContent,'Show');assert.equal(show.getAttribute('aria-pressed'),'false');assert.equal(show.getAttribute('aria-label'),'Show email address');
 show.onclick();assert.equal(out.textContent,'floris.example@gmail.com');assert.equal(show.textContent,'Hide');assert.equal(show.getAttribute('aria-pressed'),'true');assert.equal(show.getAttribute('aria-label'),'Hide email address');
 show.onclick();assert.equal(out.textContent,'f…e@gmail.com');
 assert.equal(box.find('sign-in-mark').innerHTML,SIGN_IN_MARKS.google);
 // A second start never adds a second line.
 assert.equal(createSignInLine({info:signInOf(user(['google'])),doc:page.doc}),null);
 // The new address after Settings, Email address: masked again.
 show.onclick();page.doc.dispatch('harvest-email-changed','new.farmer@outlook.com');assert.equal(out.textContent,'n…r@outlook.com');assert.equal(show.textContent,'Show');
});

test('Settings: an email farmer has no button; Apple\'s relay is said in words until Show; no address, no address line',()=>{
 let page=fakePage();createSignInLine({info:signInOf(user(['email'],'sunny.acres@example.com')),setPassword:async()=>{},doc:page.doc});
 let box=page.box;assert.equal(box.find('sign-in-how').textContent,'You sign in with your email address and password.');assert.equal(box.find('sign-in-password'),null);
 assert.equal(box.find('sign-in-email').textContent,'s…s@example.com');
 page=fakePage();createSignInLine({info:signInOf(user(['apple'],'k7x2pq9mzd@privaterelay.appleid.com')),setPassword:async()=>{},doc:page.doc});
 box=page.box;const out=box.find('sign-in-email');
 assert.equal(box.find('sign-in-how').textContent,'You sign in with Apple.');assert.equal(out.textContent,RELAY_TEXT);assert.equal(out.hasAttribute('translate'),false,'words to translate');
 assert.equal(box.find('sign-in-password'),null,'a relay address is not mailed');
 box.find('sign-in-show').onclick();assert.equal(out.textContent,'k7x2pq9mzd@privaterelay.appleid.com');assert.equal(out.getAttribute('translate'),'no');
 page=fakePage();createSignInLine({info:signInOf({...user(['facebook']),email:null}),setPassword:async()=>{},doc:page.doc});
 box=page.box;assert.equal(box.find('sign-in-address').hidden,true);assert.equal(box.find('sign-in-password'),null);
 // Nothing to say, or no Your account (a page without it): nothing at all.
 page=fakePage();assert.equal(createSignInLine({info:null,doc:page.doc}),null);assert.equal(page.box,undefined);
 assert.equal(createSignInLine({info:signInOf(user(['google'])),doc:fakePage({card:false}).doc}),null);
});

test('Set a password: one tap sends it, then says what happens next; a refusal shows under the button, which stays',async()=>{
 let asked=0;const page=fakePage();createSignInLine({info:signInOf(user(['google'])),setPassword:async()=>{asked++;},doc:page.doc});
 const box=page.box,button=box.find('sign-in-password'),message=box.find('sign-in-message');
 assert.equal(button.textContent,SET_PASSWORD);assert.equal(message.hidden,true);assert.equal(message.getAttribute('role'),'status');
 const tap=button.onclick();assert.equal(button.disabled,true);assert.equal(message.textContent,'Sending…');await tap;await settle();
 assert.equal(asked,1);assert.equal(button.hidden,true);assert.equal(message.textContent,PASSWORD_SENT);assert.ok(message.classList.contains('is-done'));
 const failing=fakePage();createSignInLine({info:signInOf(user(['facebook'])),setPassword:async()=>{throw new Error('Too many attempts. Please wait a few minutes and try again.');},doc:failing.doc});
 const again=failing.box.find('sign-in-password'),said=failing.box.find('sign-in-message');
 await again.onclick();await settle();
 assert.equal(said.textContent,'Too many attempts. Please wait a few minutes and try again.');assert.ok(said.classList.contains('is-error'));assert.equal(again.hidden,false);assert.equal(again.disabled,false);
 // No way to send it (a bridge without setPassword): no button.
 const bare=fakePage();createSignInLine({info:signInOf(user(['google'])),doc:bare.doc});assert.equal(bare.box.find('sign-in-password'),null);
});

test('Settings: the line sits below "Make the name your own", so that tip stays with the name; without the tip, under the name card',()=>{
 const page=fakePage(),line=createSignInLine({info:signInOf(user(['google'])),setPassword:async()=>{},doc:page.doc});
 assert.equal(page.nudge.next,line.box,'after #name-nudge');assert.equal(page.card.next,undefined,'not between the name and its tip');
 const bare=fakePage({nudge:false}),alone=createSignInLine({info:signInOf(user(['google'])),doc:bare.doc});
 assert.equal(bare.card.next,alone.box);
});

test('Settings: Show lasts one visit; closing Settings masks the address again (a streamer opens Settings live later)',()=>{
 const page=fakePage();createSignInLine({info:signInOf(user(['google'])),setPassword:async()=>{},doc:page.doc});
 const out=page.box.find('sign-in-email'),show=page.box.find('sign-in-show');
 show.onclick();assert.equal(out.textContent,'floris.example@gmail.com');
 page.dialog.close();
 assert.equal(out.textContent,maskEmail('floris.example@gmail.com'));assert.equal(out.textContent,'f…e@gmail.com');
 assert.equal(show.textContent,'Show');assert.equal(show.getAttribute('aria-pressed'),'false');assert.equal(show.getAttribute('aria-label'),'Show email address');
 // Closing while masked changes nothing; Show works again on the next visit.
 page.dialog.close();assert.equal(out.textContent,'f…e@gmail.com');show.onclick();assert.equal(out.textContent,'floris.example@gmail.com');
 // Apple's relay: back to its words.
 const apple=fakePage();createSignInLine({info:signInOf(user(['apple'],'k7x2pq9mzd@privaterelay.appleid.com')),doc:apple.doc});
 const relay=apple.box.find('sign-in-email');apple.box.find('sign-in-show').onclick();assert.equal(relay.textContent,'k7x2pq9mzd@privaterelay.appleid.com');
 apple.dialog.close();assert.equal(relay.textContent,RELAY_TEXT);assert.equal(relay.hasAttribute('translate'),false);
});

test('every text of the line is translated in every language, the sentences with their parts, and none has a middle dot',()=>{
 const texts=[...Object.values(ONE_WAY),RELAY_TEXT,SET_PASSWORD,PASSWORD_SENT,'Show email address','Hide email address','You sign in with {0} or with your email address and password.','You sign in with {0} or {1}.'];
 const catalog=JSON.parse(read('i18n/catalog.json'));
 for(const text of texts){assert.ok(Object.hasOwn(catalog,text),text);assert.ok(!text.includes(' · '));}
 for(const code of ['nl','de','es','fr','pt','id','hu','cs','tr','ru','uk','hi','ja','ar','zh']){
  const dict=JSON.parse(read(`public/i18n/${code}.json`)),translator=createTranslator(dict,code);
  for(const text of texts){assert.equal(typeof dict[text],'string',`${code}: ${text}`);assert.ok(!dict[text].includes(' · '),`${code}: ${text}`);}
  for(const methods of [['google','email'],['google','facebook'],['google','facebook','apple']]){
   const out=translator.translate(signInSentence(methods));assert.ok(out&&out!==signInSentence(methods),`${code}: ${methods}`);
   for(const brand of methods.map(m=>({google:'Google',facebook:'Facebook',apple:'Apple'})[m]).filter(Boolean))assert.ok(out.includes(brand),`${code}: ${out}`);
  }
 }
 assert.equal(createTranslator(JSON.parse(read('public/i18n/nl.json')),'nl').translate('You sign in with Google or with your email address and password.'),'Je logt in met Google of met je e-mailadres en wachtwoord.');
});

// 17 Oct 2026 (the review): what Settings says after the tap matches the mail that comes (its title, in each language its own) and what
// happens (the link opens in the browser; the new password signs the account out everywhere else, our apps too), and the help texts
// no longer say a Google or Facebook farmer has no password.
test('after Set a password: the mail named by its title, the browser, sign in again elsewhere; the help page and the wiki point to the button',async()=>{
 const {TEMPLATES}=await import('../supabase/functions/auth-email/texts.js');
 assert.ok(PASSWORD_SENT.includes(`“${TEMPLATES['reset-password'].en.title}”`),PASSWORD_SENT);
 assert.match(PASSWORD_SENT,/in your browser/);assert.match(PASSWORD_SENT,/sign in again with your email address and password/);assert.doesNotMatch(PASSWORD_SENT,/Google|Facebook/,'the Android app has no Google button');
 for(const code of ['nl','de','es','fr','pt','id','hu','cs','tr','ru','uk','hi','ja','ar','zh']){
  const dict=JSON.parse(read(`public/i18n/${code}.json`));assert.ok(dict[PASSWORD_SENT]?.includes(TEMPLATES['reset-password'][code].title),`${code}: ${dict[PASSWORD_SENT]}`);
 }
 const support=read('public/support.html');
 assert.ok(support.includes('<span>Use the same button again to sign in. Want to sign in with your email address and a password too, for example in our apps? In the game, open Settings and tap Set a password.</span>'));
 assert.doesNotMatch(support,/no separate password/);
 assert.ok(read('public/wiki-content.js').includes('Your account, at the top, says how you sign in. Signed in with Google or Facebook? Tap Set a password there,'));
 const catalog=JSON.parse(read('i18n/catalog.json'));
 for(const old of ['Use the same button again to sign in. Your farm is linked to that account, so there is no separate password.','We sent you an email to set a password. Then you can also sign in with your email address and password, for example in our apps.'])assert.equal(Object.hasOwn(catalog,old),false,old);
});

test('the line\'s look: one calm row in the Settings rows\' colours, the button under the words on a phone',()=>{
 const css=read('public/retention.css');
 assert.match(css,/#sound-dialog \.account-sign-in\{display:grid;grid-template-columns:auto minmax\(0,1fr\) auto;[^}]*border:1px solid #e2d7cb;border-radius:14px;background:#f3ede7\}/);
 assert.match(css,/@media\(max-width:560px\)\{#sound-dialog \.account-sign-in\{grid-template-columns:auto minmax\(0,1fr\)\}#sound-dialog \.sign-in-password\{grid-column:2;justify-self:start;min-height:44px\}\}/);
 assert.ok(css.includes('#sound-dialog .sign-in-show{')&&css.includes('#sound-dialog .sign-in-message.is-error{color:#b4513f}'));
});
