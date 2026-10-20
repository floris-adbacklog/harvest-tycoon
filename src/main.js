import {createFarmPresence} from './presence.js';
import {supabase,isConfigured,functionsUrl,verifiedUser,validUsername,farmRequest,paymentRequest,cloudError,socialProviders,openedBy} from './supabase.js';
import {OAUTH_KEY,providerName,oauthStartError,oauthReturnMessage,usableProviders,embeddedBrowser,adVisit} from './social-login.js';
import {scheduleBrowserTip,metaApp,gateApp,gateText,escapeTarget,chromeIntent,safariUrl,appKey,ESCAPE_KEY,BROWSER_TIP_KEY} from './browser-tip.js';
import {fetchLeaderboard} from './leaderboard.js';
import {trackCommerce,trackGame,trackSignUp,isNewRegistration,trackAuth,trackInvite,trackShare} from './analytics.js';
import {MODES,formErrors,describeAuthError,randomPlayerName} from './account-form.js';
import {startPwa} from './pwa.js';
import {openIntent,openIntentOfUrl,withoutOpen,discordTicket,discordAuthorizeUrl,discordBack,reminderSource} from '../public/app-links.js';
import {startUpdateCheck} from './app-update.js';
import {createNotifications} from './notifications.js';
import {createChatClient} from './chat-client.js';
import {startLoadingTips,ACCOUNT_STEPS,farmHandOver,LOAD_FAILED_TEXT} from '../public/loading-screen.js';
import {startPlayerCounts} from './player-counts.js';
import {takeInviteFromUrl,pendingInvite,clearInvite,inviterName,inviteBannerText} from './invite-link.js';
import {takeRefFromUrl,pendingRef,clearRef} from './partner-link.js';
import {readSource,sourceQuery} from './source-link.js';
import {createConnection,connectionMessage,describeFailure,reasonOf,refused,WAKE_GRACE} from './connection.js';
import {stopPageZoom,gameViewport} from './page-zoom.js';
import {startTranslation,chosenLanguage,setOwnText} from '../public/i18n.js';
import {renderLanguageSwitch} from './language-switch.js';
import {playBadge,appStoreBadge} from '../public/languages.js';
import {androidApp,listenAppPush,playBilling,appStoreBilling,webBilling,appSignIn} from '../public/android.js';
import {APP_SIGN_IN_ORIGIN,APP_SIGN_IN_REFUSED_MS,appOAuthLink,appAppleLink,appAuthorizeUrl,appleNonce,sha256Hex,waitForAppSignIn} from './app-sign-in.js';
import {forgetAppPushLink} from './app-push.js';
import {createPlayStore,PLAY_ERRORS} from './play-store.js';
import {createAppStore,APP_STORE_ERRORS} from './app-store.js';
import {signInOf,passwordMail,passwordSession} from './account-sign-in.js';
import {PLAY_PRODUCTS,APPLE_PRODUCTS,APPLE_SELLS_OFFER,appleProduct} from '../game/payments.js';
const $=id=>document.getElementById(id);
// Our Android app (Oct 2026): public/android-app.js marked this page before it was drawn (public/android.js says what changes there).
const inApp=androidApp();
// The iPhone app from 1.3 (16 Oct 2026, the owner): every sign-in, through the app's own sheets (src/app-sign-in.js); older apps email only.
const nativeSignIn=inApp&&appSignIn();
// The game in a frame on another site (itch.io, Oct 2026): Google, Facebook and Stripe refuse to show their pages in a frame, so a
// sign-in with them and a checkout open in a new tab (email and password work in the frame itself).
const framed=(()=>{try{return Boolean(window.top)&&window.top!==window;}catch{return true;}})();
// The app's answers about its notifications (window.harvestAppPush) are kept on this page from the start (src/app-push.js).
if(inApp)listenAppPush(window);
// The app 1.1 (Oct 2026) sells through the app's store (inAppStore): Google Play in the Android app (src/play-store.js), the App Store in
// the iPhone app (appStore, src/app-store.js); an older app sells nothing. A purchase that finishes while no sheet of ours waits for it
// (a payment that was pending, a parent's yes, one the App Store hands back at the start) goes to the farmer's session to be confirmed.
const appStore=inApp&&appStoreBilling()?createAppStore(window):null;
const inAppStore=appStore??(inApp&&playBilling()?createPlayStore(window):null);
// The Galaxy Store app (Oct 2026, " WebBilling/1"): no store of its own, it sells through Stripe like the website. The checkout opens in
// the phone's browser (the app opens every other site there) and the farm waits for the payment in its purchase window.
const webPay=inApp&&!inAppStore&&webBilling();
const storeName=appStore?'app_store':'google_play',storeErrors=appStore?APP_STORE_ERRORS:PLAY_ERRORS,storeProducts=appStore?Object.fromEntries(Object.keys(APPLE_PRODUCTS).filter(pack=>appleProduct(pack)).map(pack=>[pack,appleProduct(pack)])):PLAY_PRODUCTS;
inAppStore?.onPurchase(message=>{void window.harvestBridge?.playSettle?.(message).catch(()=>{});});
let storePrices=null;
// Another language than English: translate the page's texts as they appear (public/i18n.js).
startTranslation();
renderLanguageSwitch();
// The footer's store badges in the farmer's language also on the English page '/' (Oct 2026; the App Store's first since 7 Oct 2026),
// where the texts around them are translated as the page is shown; a language page (/nl/) has its own already
// (scripts/build-languages.mjs).
{const code=chosenLanguage();
 for(const [badge,src] of [[document.querySelector('.play-badge .app-store-badge img'),appStoreBadge(code)],[document.querySelector('.play-badge a:not(.app-store-badge) img'),playBadge(code)]])
  if(badge?.getAttribute&&badge.getAttribute('src')!==src)badge.src=src;}
startPwa();startUpdateCheck();
// A screen to open once the farm is there: from a notification, a shortcut on the app icon or ?open= (public/app-links.js). The farm
// frame takes it when it is ready (harvestTakeOpen); a notification tapped while the game is open arrives from sw.js as a message.
let pendingOpen=openIntent(location.search);
if(pendingOpen)history.replaceState(null,'',withoutOpen(location.href));
// A Discord link's ticket, and Discord's answer after Link on the website (/discord-link/callback, Oct 2026: its code, state or error),
// left the address before Google Tag Manager could read them (the first script in play.html's head keeps them in
// window.harvestDiscordLink), so no page view of the analytics carries them; they come back here. With Discord's answer the intent
// carries no ticket from the address: Discord's code and the state our server gave Link are all the farm needs, in this tab or in the
// new one Discord's app often opens on a phone (public/discord-link-ui.js).
const discordParts=window.harvestDiscordLink;delete window.harvestDiscordLink;
if(pendingOpen?.open==='discord-link'&&discordParts&&typeof discordParts==='object')pendingOpen=openIntent(`?${new URLSearchParams({...discordParts,open:'discord-link'})}`);
// It also survives a sign-in that leaves this page (Google or Facebook; /settings/<part> signed out, 4 Oct 2026): kept in this tab
// for 30 minutes, read back through openIntent, gone once the farm takes it. A Discord link (Oct 2026, /discord-link) for the 10
// minutes its ticket is good for.
const OPEN_KEY='harvest-tycoon:open',keepOpen=intent=>{try{if(intent)sessionStorage.setItem(OPEN_KEY,JSON.stringify({...intent,at:Date.now()}));else sessionStorage.removeItem(OPEN_KEY);}catch{}};
if(pendingOpen)keepOpen(pendingOpen);
else try{const kept=JSON.parse(sessionStorage.getItem(OPEN_KEY)??'null');if(kept&&Date.now()-Number(kept.at)<(kept.open==='discord-link'?600000:1800000))pendingOpen=openIntent(`?${new URLSearchParams(Object.entries(kept).filter(([key])=>key!=='at').map(([key,value])=>[key,String(value)]))}`);else keepOpen(null);}catch{}
window.harvestTakeOpen=()=>{const intent=pendingOpen;pendingOpen=null;keepOpen(null);return intent;};
// The apps' Back button (13 Oct 2026, Android app 1.3): the app asks this page (window.harvestBack), and this page asks the farm, which
// closes its top-most window (public/windows.js). true: a window was open; false: no farm or nothing open, and the app does what Back
// did before (back a page, or leave the game).
window.harvestBack=()=>{try{return frame?.contentWindow?.harvestBack?.()===true;}catch{return false;}};
function openScreen(intent){
 if(!intent)return;
 try{const open=frame?.contentWindow?.harvestOpen;if(typeof open==='function'){open(intent);return;}}catch{}
 pendingOpen=intent;
}
// A reminder that opened the game (13 Oct 2026, the measurement package): notify-hourly's push (?source=push, in a browser and in both
// apps, which open the push's address) or the daily email (?source=email). Said once, with the next farm load, so farm-api's "Opened the
// game" line in the farmer's log says so (src/supabase.js openedBy); a reload or Back to this page is no new open, nor a tab the phone
// put to sleep and loads again later (document.wasDiscarded), still on the push's address. The address keeps it
// (Tag Manager reads it). A push tapped while the game is open (sw.js) counts for the load that follows, when the tab comes back into view.
openedBy((()=>{try{if(document.wasDiscarded)return null;const entry=performance.getEntriesByType?.('navigation')?.[0];if(entry&&entry.type!=='navigate')return null;}catch{}return reminderSource(location.href,location.origin);})());
navigator.serviceWorker?.addEventListener?.('message',event=>{if(event.data?.type!=='open')return;openedBy(reminderSource(String(event.data.url),location.origin));try{openScreen(openIntentOfUrl(String(event.data.url),location.origin));}catch{}});
// A shortcut on the app icon, or a link the app catches (/feedback, /settings/<part>, /discord-link?t=…), while the app is already
// open comes to this window (manifest launch_handler: focus-existing).
window.launchQueue?.setConsumer?.(params=>{try{openScreen(openIntentOfUrl(params.targetURL));}catch{}});
startPlayerCounts({functionsUrl});
let presence=null,notifications=null,chat=null;
let mode='register',generation=0,playerId=null,frame=null,submitting=false,checking=false,reopen=false;
let focusing=false,nameOpen=false,recovering=false,viewTracked=false,confirmKind='signup',pendingEmail='',resendTimer=null,providers=[];
const started={};
// Short connection problems (a laptop waking up, a wifi hand-over, one slow answer) must not close the farm: see connection.js.
const watchers=new Set();
const connection=createConnection({
 isOnline:()=>navigator.onLine,isHidden:()=>document.hidden,track:(event,params)=>trackGame(event,params),probe:probeFarm,
 onStatus:(next,{reason})=>{for(const watch of watchers)watch(next);if(next==='paused')unavailable(connectionMessage(reason,navigator.onLine),{retrying:true});},
 onRecovered:from=>{if(from==='paused')openFarm();else void frame?.contentWindow?.harvestRefresh?.();}
});
const AUTH_KEY='harvest-tycoon:auth',RETURNING_KEY='harvest-tycoon:returning',CONFIRM_KEY='harvest-tycoon:confirm-pending';
const store={get(key){try{return localStorage.getItem(key);}catch{return null;}},set(key,value){try{localStorage.setItem(key,value);}catch{}},remove(key){try{localStorage.removeItem(key);}catch{}}};
const tabStore={get(key){try{return sessionStorage.getItem(key);}catch{return null;}},set(key,value){try{sessionStorage.setItem(key,value);}catch{}},remove(key){try{sessionStorage.removeItem(key);}catch{}}};
// True only when the browser can be read and holds no saved session, so a first-time visitor skips the "Checking your account…" screen.
const brandNewVisitor=()=>{try{return localStorage.getItem(AUTH_KEY)===null&&localStorage.getItem(RETURNING_KEY)===null;}catch{return false;}};
const knownPlayer=()=>store.get(RETURNING_KEY)==='1'||store.get(AUTH_KEY)!==null;
// Invite a friend: remember ?invite=CODE (src/invite-link.js) and show who invited this visitor on the sign-up card.
const localStore=(()=>{try{return localStorage;}catch{return null;}})();
takeInviteFromUrl({location:globalThis.location,history:globalThis.history,storage:localStore,known:knownPlayer()});
// A partner's link (?ref=CODE, src/partner-link.js): the new farm counts for that partner.
takeRefFromUrl({location:globalThis.location,history:globalThis.history,storage:localStore,known:knownPlayer()});
async function showInviter(){
 const code=pendingInvite(localStore),box=document.getElementById('account-invite');if(!code||!box)return;
 const name=await inviterName(functionsUrl,code);if(!name||pendingInvite(localStore)!==code)return;
 // The friend's name as typed (17 Oct 2026).
 const text=inviteBannerText(name);setOwnText(box.querySelector('strong'),text.title,[name]);setOwnText(box.querySelector('span'),text.body,[name]);box.hidden=false;
}
void showInviter();
const linkText=()=>`${globalThis.location?.hash??''}&${globalThis.location?.search??''}`;
const linkKind=()=>/type=(recovery|signup|magiclink|invite|email_change)/.exec(linkText())?.[1]??'';
// This tab opened a reset link (17 Oct 2026, the review of Set a password): read now, before supabase-js clears the address. Only such a
// tab turns into "Choose a new password." on PASSWORD_RECOVERY: supabase-js sends that event to every tab of this site, and Set a
// password starts from an open farm, so a mail link opened in the same browser would otherwise close the farm in the first tab and
// leave a second password form there. passwordSet: the account this page just set a password for (the farm that opens next says so).
let recoveryLink=linkKind()==='recovery',passwordSet='';
// A sign-in that came back with an error: Google, Facebook and Discord say error=access_denied (with error_code), a cancel on Apple's
// page error=user_cancelled_authorize alone (10 Oct 2026), so any error parameter counts.
const linkError=()=>/error_code=|(?:^|[?#&])error=/.test(linkText());
// Where a new farmer came from (src/source-link.js, 2 Oct 2026): read once from this address, in memory only (nothing on the device),
// and sent with the sign-up and the first farm load. Google, Facebook and the email links come back to /play.html with it in their
// address (redirectUrl(true)); the password reset does not need it. origin: the iPhone app's sign-in sheet always comes back to www
// (16 Oct 2026, src/app-sign-in.js APP_SIGN_IN_ORIGIN), with the same query.
let pendingSource=readSource({href:location.href,pathname:location.pathname,referrer:document.referrer,authReturn:Boolean(tabStore.get(OAUTH_KEY)||linkKind()||/access_token=/.test(location.hash??''))});
const redirectUrl=(carry=false,origin=location.origin)=>{const url=new URL('/play.html',origin);if(carry)for(const [key,value] of sourceQuery(location.href,pendingSource))url.searchParams.set(key,value);return url.href;};
// The Discord Activity's sign-in (supabase/functions/discord-auth): the website only asks it about a Discord link. In Frankfurt, next
// to the database, as farm-api (src/supabase.js FARM_API).
const DISCORD_AUTH='discord-auth?forceFunctionRegion=eu-central-1';
const inputId=field=>field==='name'?'player-name':field;
const MESSAGES={register:'Creating your account…',signin:'Opening your farm…',name:'Opening your farm…',forgot:'Sending your link…',recovery:'Saving your password…'};
// The loading screen before the farm: the same layout as the farm's own, and its bar covers the first few percent (the farm goes on
// from there), so checking the account and loading the farm read as one screen.
let stopTips=null;
stopPageZoom(document,()=>document.body.dataset.phase==='authenticated');
// The loading screen stays over the farm until the farm page shows its own (public/loading-screen.js farmHandOver, 6 Oct 2026).
// 11 Oct 2026: a farm page that never gets there opens the whole page again, as the farm page's own watch does; a second time within ten
// minutes the pause card, whose Try again opens the farm.
const handOver=farmHandOver(window,$('loading-screen'),{reload:()=>location.reload(),fail:()=>unavailable(LOAD_FAILED_TEXT),track:(event,params)=>trackGame(event,params)});
function phase(value,message){document.body.dataset.phase=value;gameViewport(value==='authenticated');if(value==='authenticated')handOver.wait();else{handOver.stop();$('loading-screen').hidden=value!=='checking';}$('welcome').hidden=value==='checking'||value==='authenticated';$('farm-host').hidden=value!=='authenticated';if(message){$('loading-copy').textContent=message;const step=ACCOUNT_STEPS[message]??6;$('loading-progress').value=step;$('loading-percent').textContent=`${step}%`;}
 if(value==='checking')stopTips??=startLoadingTips(document);else{stopTips?.();stopTips=null;}}
function dispose(){presence?.dispose();presence=null;chat?.dispose();chat=null;watchers.clear();generation++;frame?.remove();frame=null;playerId=null;delete window.harvestBridge;$('farm-host').replaceChildren();}
// Moving focus from code (opening a mode, pointing at a mistake) must not count as the visitor starting the form.
function focusField(id,options){focusing=true;try{$(id).focus(options);}finally{focusing=false;}}
function fieldError(field,message=''){$(field+'-error').textContent=message;$(inputId(field)).setAttribute('aria-invalid',String(Boolean(message)));}
function clearErrors(){for(const field of ['email','password','name'])fieldError(field);}
function showFieldErrors(errors){clearErrors();for(const [field,message] of Object.entries(errors))fieldError(field,message);const first=Object.keys(errors)[0];if(first)focusField(inputId(first));}
function setPasswordVisible(visible){$('password').type=visible?'text':'password';$('toggle-password').textContent=visible?'Hide':'Show';$('toggle-password').setAttribute('aria-label',visible?'Hide password':'Show password');$('toggle-password').setAttribute('aria-pressed',String(visible));}
function lock(busy){$('account-submit').disabled=busy;document.querySelectorAll('[data-mode],[data-provider]').forEach(b=>b.disabled=busy);}
// Google / Facebook buttons: only on the sign-in and create-account cards, and only for providers that are switched on.
function showSocial(){$('social-login').hidden=!providers.length||!['signin','register'].includes(mode);}
function setMode(next,focus=false){
 mode=next;const m=MODES[mode];if(!['signin','register'].includes(mode))gateOff();if(mode!=='register')nameOpen=false;
 const shows=field=>m.fields.includes(field)||(field==='name'&&mode==='register'&&nameOpen),visible=['email','password','name'].filter(shows);
 for(const field of ['email','password','name']){$(field+'-row').hidden=!shows(field);$(inputId(field)).required=shows(field)&&(field!=='name'||mode==='name');$(inputId(field)).setAttribute('enterkeyhint',field===visible.at(-1)?'go':'next');}
 clearErrors();setPasswordVisible(false);$('password').autocomplete=mode==='signin'?'current-password':'new-password';
 $('form-eyebrow').textContent=m.eyebrow;$('account-title').textContent=m.title;$('account-copy').textContent=m.copy;$('account-copy').hidden=!m.copy;$('account-submit').textContent=m.submit;$('account-message').textContent='';
 $('account-form').hidden=mode==='confirm';$('confirm-panel').hidden=mode!=='confirm';$('connection-actions').hidden=true;document.querySelector('.account-tabs').hidden=!m.tabs;
 $('forgot-link').hidden=mode!=='signin';$('account-back').hidden=mode!=='forgot';$('name-toggle').hidden=!(mode==='register'&&!nameOpen);$('name-optional').hidden=mode==='name';$('name-help').hidden=mode==='name';$('register-promise').hidden=mode!=='register';
 showSocial();
 $('mode-switch-row').hidden=!m.switch;if(m.switch){$('mode-switch-text').textContent=m.switch.text;$('mode-switch').textContent=m.switch.label;$('mode-switch').dataset.mode=m.switch.to;}
 document.querySelectorAll('.account-tabs [data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
 if(focus){document.querySelector('.account-card').scrollIntoView({behavior:'smooth',block:'start'});if(visible.length)focusField(inputId(visible[0]),{preventScroll:true});}
}
// Inside the Facebook, Instagram or TikTok app, the sign-up card first offers the phone's own browser (src/browser-tip.js, 28 Sep 2026);
// never in our own Android app, which is where the farm belongs there. The page ships that step hidden (8 Oct 2026), so a reader that
// skips the styles never takes it for the page's own text: on and off, the card's mark and the step's hidden go together.
let gateTimer=null;
function gateOff(){document.querySelector('.account-card')?.removeAttribute('data-gate');const step=$('browser-gate');if(step)step.hidden=true;}
function browserGate(){
 const card=document.querySelector('.account-card'),ua=navigator.userAgent,on=!inApp&&gateApp(ua)&&store.get(ESCAPE_KEY)!=='stay';
 card.toggleAttribute('data-gate',on);$('browser-gate').hidden=!on;if(!on)return;
 const text=gateText(ua),target=escapeTarget(location,pendingInvite(localStore),pendingRef(localStore),{rd:pendingSource?.ref,via:appKey(ua)}),help=$('gate-help');
 document.querySelectorAll('[data-gate-browser]').forEach(el=>el.textContent=text.browser);document.querySelectorAll('[data-gate-app]').forEach(el=>el.textContent=text.app);$('gate-open').textContent=text.action;
 const leave=()=>{location.href=text.android?chromeIntent(target):safariUrl(target);};
 $('gate-open').onclick=()=>{
  trackAuth('browser_gate',{reason:'open'});leave();clearTimeout(gateTimer);
  // Still here a moment later: the app kept the page. Show where its own "open in browser" is (and copy the link on an iPhone).
  gateTimer=setTimeout(()=>{if(document.hidden)return;help.textContent=text.help;help.hidden=false;if(!text.android)void navigator.clipboard?.writeText(target).catch(()=>{});},1500);
 };
 $('gate-stay').onclick=()=>{store.set(ESCAPE_KEY,'stay');store.set(BROWSER_TIP_KEY,'1');gateOff();trackAuth('browser_gate',{reason:'stay'});};
 if(!store.get(ESCAPE_KEY)){store.set(ESCAPE_KEY,'shown');trackAuth('browser_gate',{reason:'shown'});if(text.android&&metaApp(ua))leave();}
}
// A Discord player who asked to play their farm from here in the Discord Activity (/discord-link, public/discord-link-ui.js) and is
// not signed in on this browser: the sign-in card, with what it is for (they have a farm already).
const DISCORD_SIGN_IN='Sign in to play your farm on Discord.';
// Sign in with Apple, let go of when the account is deleted (16 Oct 2026, the owner; supabase/functions/farm-api/apple-sign-in-service.js):
// right after an Apple sign-in the page sends farm-api what Apple gave for it, once: the iPhone app's one-time authorization code
// ({code}, appSignInFlow) or, on the website, Apple's token that Supabase hands over once after the return from Apple's page
// ({refreshToken}, the session's provider_refresh_token, at boot). farm-api keeps Apple's token only to revoke it when the account
// is deleted. Never waited for, never repeated, and a failure changes nothing for the farmer.
const keepAppleToken=proof=>{farmRequest({operation:'apple_token',...proof},{retry:false}).catch(()=>{});};
const keepWebAppleToken=()=>{supabase?.auth.getSession().then(({data})=>{const token=data?.session?.provider_refresh_token;if(typeof token==='string'&&token)keepAppleToken({refreshToken:token});}).catch(()=>{});};
// The deletion's answer says apple:'manual' when the account signed in with Apple and Apple could not be asked to forget Harvest Tycoon
// (account-delete-service.js): the farmer is told where to remove it themselves.
const DELETED_APPLE_LEFT='Your account has been deleted. Harvest Tycoon may still be listed under Sign in with Apple in your Apple Account, where you can remove it.';
function landing(message=''){connection.stop();dispose();if(inApp)forgetAppPushLink(window);if(!message&&pendingOpen?.open==='discord-link')message=DISCORD_SIGN_IN;setMode(message||knownPlayer()?'signin':'register');phase('unauthenticated');browserGate();$('account-message').textContent=message;if(!viewTracked){viewTracked=true;trackAuth('view',{mode});}}
function unavailable(message='Your farm is safe. Reconnect to continue.',{retrying=false}={}){dispose();phase('error');$('account-title').textContent='A little pause.';$('account-copy').hidden=false;$('account-copy').textContent=message;$('account-message').textContent=retrying?'We are trying again automatically.':'';$('account-form').hidden=true;$('confirm-panel').hidden=true;$('mode-switch-row').hidden=true;document.querySelector('.account-tabs').hidden=true;$('connection-actions').hidden=false;}
async function signOut(){if(!supabase){landing();return;}connection.stop();try{await notifications?.push?.detach();}catch{}notifications?.dispose?.();notifications=null;dispose();phase('checking','Signing you out…');try{const result=await supabase.auth.signOut();if(result.error)throw result.error;}catch{await supabase.auth.signOut({scope:'local'});}finally{landing();$('password').value='';}}
// "Check your inbox": shown after registering, after asking for a reset link, and when an unconfirmed player tries to sign in.
function showConfirmation(email,{kind='signup',fresh=true}={}){
 pendingEmail=email;confirmKind=kind;if(kind==='signup')store.set(CONFIRM_KEY,'1');setMode('confirm');
 $('confirm-copy').textContent=kind==='reset'?`If ${email} has an account, a link to choose a new password is on its way.`:fresh?`We sent a confirmation link to ${email}. Tap it and your farm opens right away.`:`${email} still needs to be confirmed. Use the link we emailed you, or send it again.`;
 $('confirm-message').textContent='';trackAuth(kind==='reset'?'reset_sent':'confirmation_sent');startResendCooldown(45);
}
function startResendCooldown(seconds){
 clearInterval(resendTimer);const button=$('resend-confirmation');let left=seconds;
 const tick=()=>{button.disabled=left>0;button.textContent=left>0?`Send the email again (${left}s)`:'Send the email again';if(left<=0)clearInterval(resendTimer);left--;};
 tick();resendTimer=setInterval(tick,1000);
}
function startRecovery(){recovering=true;connection.stop();dispose();phase('unauthenticated');setMode('recovery');trackAuth('recovery_open');}
// The ways this session signed in (its amr): supabase-js decodes the stored access token, no call. [] when it cannot say.
async function sessionMethods(){try{const {data}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();return data?.currentAuthenticationMethods??[];}catch{return [];}}
async function openFarm(){
 if(checking){reopen=true;return;}checking=true;connection.stop();dispose();const ticket=generation;phase('checking','Checking your account…');
 try{
  if(!isConfigured)throw new Error('Account access is temporarily unavailable. Please try again later.');
  if(!navigator.onLine)throw new Error('Connect to the internet to open your farm.');
  const user=await verifiedUser();if(ticket!==generation)return;
  if(!user){landing();return;}playerId=user.id;phase('checking','Opening your farm…');
  // How this session signed in (17 Oct 2026, How you sign in): its amr, read from the stored session (no call), while the farm is on its way.
  const signedWith=sessionMethods();
  // The game page starts loading now, while the farm is on its way from the server (1 Oct 2026): its page, styles and scripts
  // arrive in the meantime and it picks the farm up the moment it is here (src/game-cloud.js waits for this bridge). One wait at
  // the start instead of the server and then the page. It only counts as the open farm (frame) once the farm is here; a farm that
  // does not come takes the page away again.
  let release,cancel;const ready=new Promise((resolve,reject)=>{release=resolve;cancel=reject;});ready.catch(()=>{});
  window.harvestBridge={pending:true,ready};const page=document.createElement('iframe');page.title='Harvest Tycoon farm';page.src='/farm.html';$('farm-host').append(page);
  const giveUp=error=>{cancel(error);page.remove();if(window.harvestBridge?.ready===ready)delete window.harvestBridge;};
  let initial;try{const inviteCode=pendingInvite(localStore),partnerCode=pendingRef(localStore);initial=await farmRequest({operation:'load',...(inviteCode?{inviteCode}:{}),...(partnerCode?{partnerCode}:{}),...(pendingSource?{source:pendingSource}:{})});clearInvite(localStore);clearRef(localStore);pendingSource=null;}catch(error){if(ticket!==generation)return;giveUp(error);if(error.code==='USERNAME_REQUIRED'){phase('unauthenticated');setMode('name');return;}throw error;}
  if(ticket!==generation)return;if(initial.profile?.player_id!==user.id){giveUp();reopen=true;return;}
  const hasPassword=(Boolean(passwordSet)&&passwordSet===user.id)||passwordSession(await signedWith);if(ticket!==generation)return;
  presence=createFarmPresence(supabase,user.id);
  presence.setClock?.(initial.serverNow);const clock=Number.isFinite(initial.serverNow)?initial.serverNow-Date.now():0;   // the server's clock, for the board's online count
  const bridge={playerId,presence,serverNow:initial.serverNow,serverAt:Date.now(),takeInitial(){const data=initial;initial=null;return data;},signOut,async leaderboard(category='level'){if(ticket!==generation)throw new Error('Your session has ended.');const result=await fetchLeaderboard(supabase,user.id,category,{counts:true,now:Date.now()+clock});if(ticket!==generation)throw new Error('Your session has ended.');presence?.setRows?.(result.rows);return {...result,...presence?.snapshot()};},async request(body){
   if(ticket!==generation||!navigator.onLine)throw new Error('Your session is paused. Reconnect to continue.');
   try{const data=await farmRequest(body);if(ticket!==generation||data.profile?.player_id!==user.id)throw new Error('Your session has ended.');connection.ok();return data;}
   catch(error){
    if(ticket===generation&&error.code!=='ACTION_REJECTED'&&error.status!==400){
     if(error.status===401){await supabase.auth.signOut({scope:'local'});landing('Your session has ended. Please sign in again.');}
     else if(error.status===409)unavailable(error.message);
     // A failed request never closes the farm by itself: the connection shows "Reconnecting…", checks again and only after a minute pauses.
     // A refusal (4xx) is an answer, not a connection problem: the screen shows its reason (29 Sep 2026: a refused Help in daily
     // sharing showed "Reconnecting…" instead of why). 408 and 425 do mean "try again".
     else if(!refused(error.status)&&!['player_search','player_profile','avatar','family_cards'].includes(body.operation))connection.problem(reasonOf(error,navigator.onLine));
    }
    throw error;
   }
  },watchConnection(watch){watchers.add(watch);return()=>watchers.delete(watch);}};
  // The chat window and the notifications (src/chat-client.js): straight to the database, live through Realtime.
  chat?.dispose();chat=bridge.chat=createChatClient(supabase,{playerId:user.id,alive:()=>ticket===generation});
  notifications?.dispose?.();notifications=bridge.notifications=createNotifications(supabase,{configUrl:functionsUrl&&`${functionsUrl}/notify-hourly?config`,playerId:user.id});
  void notifications.ready?.then?.(()=>notifications?.push?.sync?.());
  bridge.trackCommerce=(event,params)=>{if(ticket===generation)trackCommerce(event,params);};
  bridge.trackGame=(event,params)=>{if(ticket===generation)trackGame(event,params);};
  bridge.trackInvite=event=>{if(ticket===generation)trackInvite(event);};
  bridge.trackShare=(event,params)=>{if(ticket===generation)trackShare(event,params);};
  // The admin view's topbar (3 Oct 2026, src/admin-view.js): how many farmers were active in the last 30 minutes, one count straight from
  // the database (the leaderboard's own table and rule), no Edge Function. On the server's clock (the load's serverNow), as the dashboard's
  // Online now counts.
  const skew=Number.isFinite(bridge.serverNow)?bridge.serverNow-Date.now():0;
  bridge.onlineCount=async()=>{if(ticket!==generation)throw new Error('Your session has ended.');const at=Date.now()+skew,{count,error}=await supabase.from('player_stats').select('player_id',{count:'exact',head:true}).gte('last_active_at',new Date(at-30*60000).toISOString()).lte('last_active_at',new Date(at+60000).toISOString());if(error)throw error;return Number.isSafeInteger(count)?count:NaN;};
  // In an app before 1.1 (Oct 2026), Android or iPhone, nothing is sold: the catalogue the shop asks for says off (no Starter
  // Pack, special offer or Halloween Pass for sale, so nothing opens by itself), nothing else about payments is asked and no checkout
  // opens. Earned diamonds are spent as always, and what was bought on the website counts on the same account.
  const appShop=()=>{throw new Error('Purchases are not available here.');};
  bridge.payments=async body=>{if(ticket!==generation)throw new Error('Your session has ended.');if(inApp&&!inAppStore&&!webPay){if(body?.operation==='catalog')return {enabled:false,serverNow:Date.now()};appShop();}
   if(inAppStore&&body?.operation==='catalog')return storeCatalog(body);if(inAppStore&&body?.operation==='status')await storeRecoverSoon();
   const data=await paymentRequest(inAppStore?{...body,store:storeName}:body);if(ticket!==generation)throw new Error('Your session has ended.');return data;};
  // From the app 1.1 (Oct 2026) the shop sells through the app's store (inAppStore; storeName 'google_play' or 'app_store'). The catalogue
  // carries the store's prices in the farmer's currency per pack (catalog.prices; kept 10 minutes); without them (no connection,
  // products not in Play Console or App Store Connect yet) the shop stays closed rather than fail at the store's sheet. A purchase opens
  // the store's sheet with a new purchase row each time, and diamond-checkout checks it (play_confirm with Google; apple_confirm, Apple's
  // signed transaction) before the farm gets anything. The result shows in the window a Stripe payment returns to (bridge.purchaseDone,
  // src/game-cloud.js). One that was never confirmed (the app closed on the way) is confirmed at the next start (bridge.playRecover) or
  // while that window checks; Google refunds one never confirmed after 3 days, the App Store hands it back until the page finishes it.
  const storeCatalog=async body=>{
   const fresh=storePrices&&Date.now()-storePrices.at<600000;
   const [data,found]=await Promise.all([paymentRequest({...body,store:storeName}),fresh?storePrices.found:inAppStore.prices([...new Set(Object.values(storeProducts))])]);
   if(ticket!==generation)throw new Error('Your session has ended.');
   if(!fresh&&Object.keys(found).length)storePrices={at:Date.now(),found};
   const prices=Object.fromEntries(Object.entries(storeProducts).filter(([,id])=>found[id]).map(([pack,id])=>[pack,found[id]]));
   // A pack the store gives no price for is not for sale in the app (Oct 2026: the App Store only sells what Apple approved, and the
   // Starter Pack and the special offer go to Apple's review later): that Starter Pack and offer do not show and the pass cannot be bought.
   // The iPhone app shows no special offer at all until Apple sells special_offer (game/payments.js APPLE_SELLS_OFFER, 13 Oct 2026): Apple's
   // sandbox, where App Review buys, also prices one that is only Ready to Submit, and an offer may now open at level 10.
   return {...data,enabled:Boolean(data?.enabled)&&Object.keys(prices).length>0,prices,
    starter:prices.starter||!data?.starter?data?.starter:{...data.starter,eligible:false},offer:prices.offer&&(!appStore||APPLE_SELLS_OFFER)?data?.offer??null:null,
    pass:data?.pass&&!prices.pass?{...data.pass,ready:false}:data?.pass,
    // The Season Pass (Oct 2026): not for sale where the store gives no price, and never in the iPhone app while Apple does not sell it
    // (game/payments.js APPLE_SELLS_SEASON_PASS: appleProduct gives none, so the App Store is not even asked).
    season:data?.season&&!prices.season?{...data.season,ready:false}:data?.season??null};
  };
  // The App Store's purchase goes as Apple's signed transaction (up to 16 KB); a refusal (not Apple's, another farmer's: a 403) is not
  // asked again.
  const storeConfirm=async message=>{
   const body=appStore?{operation:'apple_confirm',store:'app_store',product:message.product,transaction:message.token}:{operation:'play_confirm',store:'google_play',product:message.product,token:message.token};
   for(let attempt=0;;attempt++){
    try{const data=await paymentRequest(body);if(ticket!==generation)throw new Error('Your session has ended.');return data;}
    catch(error){if(attempt>=2||ticket!==generation||appStore&&refused(error?.status))throw error;await new Promise(r=>setTimeout(r,1500*(attempt+1)));}
   }
  };
  // One purchase from the app's store, this farmer's (another farmer's on this phone waits for them to sign in), confirmed once at a
  // time; the window shows it unless it was confirmed before. The App Store's own copy of a purchase does not always say whose it is (the
  // app installed again): diamond-checkout decides then, and another farmer's is refused (403) and left alone. Only when the server says
  // finish (credited now or before, or refunded) does the App Store hear that this phone is done with it.
  const settling=new Set();
  bridge.playSettle=async message=>{
   if(!inAppStore||ticket!==generation||message?.state!=='purchased'||settling.has(message.token))return null;
   if(appStore?message.account!==null&&message.account!==user.id:message.account!==user.id)return null;
   settling.add(message.token);
   try{
    let data;try{data=await storeConfirm(message);}catch(error){if(appStore&&error?.status===403)return null;throw error;}
    if(appStore&&data?.finish===true)void appStore.finish(message.order);
    if(!data?.duplicate&&['credited','test_paid'].includes(data?.status))bridge.purchaseDone?.(data.id);return data;
   }
   finally{settling.delete(message.token);}
  };
  bridge.playRecover=async()=>{if(!inAppStore||ticket!==generation)return;for(const message of await inAppStore.pending()){try{await bridge.playSettle(message);}catch{}}};
  let recovered=0;
  const storeRecoverSoon=async()=>{if(Date.now()-recovered<10000)return;recovered=Date.now();try{await bridge.playRecover();}catch{}};
  const storeCheckout=async(pack,offerId)=>{
   const made=await bridge.payments({operation:'create',pack,requestId:crypto.randomUUID(),...(offerId?{offerId}:{})});
   if(!made?.purchaseId||!made.product||made.account!==user.id)throw new Error('Checkout is unavailable. Please try again later.');
   const result=await inAppStore.buy({product:made.product,account:made.account,purchase:made.purchaseId});
   if(ticket!==generation)throw new Error('Your session has ended.');
   if(!result)throw new Error(storeErrors.unavailable);
   if(result.kind==='cancelled')return {store:storeName,status:'cancelled'};
   if(result.kind==='error'){if(result.reason==='owned')void bridge.playRecover();throw new Error(storeErrors[result.reason]??storeErrors.error);}
   recovered=Date.now();
   // The window follows the purchase that came back: the App Store may answer with an older, unfinished one of the same product.
   const shown=result.purchase??made.purchaseId;
   if(result.state==='purchased'){try{const data=await bridge.playSettle(result);if(!data)bridge.purchaseDone?.(shown);}catch{bridge.purchaseDone?.(shown);}}
   else bridge.purchaseDone?.(made.purchaseId);
   return {store:storeName,id:made.purchaseId,status:result.state};
  };
  // In a frame (framed) Stripe's page opens in a new tab, made on the tap itself (one opened after waiting for the server is blocked as
  // a pop-up), and the farm waits for the payment in its purchase window (bridge.purchaseDone with tab, src/payment-ui.js). In the
  // Galaxy Store app (webPay) the app opens Stripe's page in the phone's browser, and the farm waits the same way.
  bridge.checkout=async(pack,requestId,offerId)=>{if(inApp&&!inAppStore&&!webPay)appShop();bridge.trackCommerce('diamond_pack_started',{pack});if(inAppStore)return storeCheckout(pack,offerId);
   const tab=framed?window.open('','_blank'):null;if(framed&&!tab)throw new Error('Allow pop-ups for this page to pay in a new tab.');
   try{const data=await bridge.payments({operation:'create',pack,requestId,language:document.documentElement?.lang,...(offerId?{offerId}:{})});const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw new Error('Invalid checkout destination.');
    if(webPay){bridge.purchaseDone?.(data.purchaseId,{tab:true,app:true});location.assign(url.href);return {store:'browser'};}
    if(!tab){location.assign(url.href);return;}
    tab.opener=null;tab.location.href=url.href;bridge.purchaseDone?.(data.purchaseId,{tab:true});return {store:'tab'};}
   catch(error){tab?.close();throw error;}};
  bridge.paymentReturn=()=>{if(inApp&&!webPay)return {id:null,cancelled:false};const params=new URLSearchParams(location.search);return {id:params.get('purchase'),cancelled:params.get('checkout')==='cancelled'};};
  bridge.clearPaymentReturn=()=>{const url=new URL(location.href);url.searchParams.delete('purchase');url.searchParams.delete('checkout');history.replaceState(null,'',url.pathname+url.search+url.hash);};
  // World II (30 Sep 2026): travelling between the farm and the village loads the game frame again, through its loading screen,
  // with the farm as it is now (public/game.js reads ?world=village).
  // 13 Oct 2026 (Android app 1.3, the Back button): the trip takes the frame's own place in the history (location.replace), so Back
  // after trips does what it did before them; frame.src added a step for each trip, and Back then loaded the whole game again.
  // dataset.address says where the frame was sent (public/loading-screen.js farmHandOver watches a trip's page by it).
  bridge.travel=async to=>{if(ticket!==generation)return;const data=await farmRequest({operation:'load'});if(ticket!==generation)return;initial=data;bridge.serverNow=data.serverNow;bridge.serverAt=Date.now();const address=to==='village'?'/farm.html?world=village':'/farm.html';try{frame.dataset.address=address;frame.contentWindow.location.replace(address);}catch{frame.src=address;}};
  // How you sign in (17 Oct 2026, the owner; src/account-sign-in.js): Settings, Your account says it from the user above (verifiedUser:
  // getUser, so its identities are the server's; no extra call). Set a password sends this account's own address the mail of the sign-in
  // card's "Forgot your password?", with the same return address (redirectUrl()): its link opens this page in recovery mode, "Choose a new
  // password.", and the farm. Supabase finds the account by its address whatever it signed in with, and a password set there works
  // with signInWithPassword (supabase/auth: recover, verify, user update, the password grant). A session opened with a password, or the
  // farm right after "Choose a new password.", also says email and password and offers no button (src/account-sign-in.js signInOf).
  bridge.signIn=signInOf(user,{password:hasPassword});
  bridge.setPassword=async()=>{if(ticket!==generation)throw new Error('Your session has ended.');await passwordMail({auth:supabase.auth,email:user.email,redirectTo:redirectUrl(),online:()=>navigator.onLine,track:(step,params)=>trackAuth(step,params)})();};
  // Delete account (3 Oct 2026, Settings › Privacy, src/account-delete.js): farm-api deletes the farm, everything personal and the account
  // itself, for this signed-in farmer only and only with their farmer name typed exactly (account-delete-service.js). Never repeated by
  // itself. Then this device lets go (the app's notifications, the session, which the server no longer knows) and the home page says so;
  // a refusal (a wrong name, an admin account) is thrown back to Settings and the farm stays open. An answer lost on the way (a timeout,
  // the connection) while the server did delete: the sign-in is then gone too (verifiedUser finds none), so it is said as a deletion.
  bridge.deleteAccount=async username=>{
   if(ticket!==generation||!navigator.onLine)throw new Error('Your session is paused. Reconnect to continue.');
   let data;try{data=await farmRequest({operation:'delete_account',username},{retry:false});}
   catch(error){if(!error?.transient||await verifiedUser().catch(()=>user))throw error;data={deleted:user.id};}
   if(ticket!==generation||data?.deleted!==user.id)throw new Error('Your session has ended.');
   connection.stop();try{await notifications?.push?.detach();}catch{}notifications?.dispose?.();notifications=null;dispose();
   try{await supabase.auth.signOut({scope:'local'});}catch{}
   store.remove(RETURNING_KEY);landing();setMode('register');$('account-message').textContent=data?.apple==='manual'?DELETED_APPLE_LEFT:'Your account has been deleted.';
  };
  // Play this farm on Discord? (Oct 2026, public/discord-link-ui.js): who asks ({op:'peek'}), Link's state for the trip to Discord
  // ({op:'begin'}) and the farmer's yes ({op:'confirm'}, with that state and the code Discord gave after Link), to discord-auth with
  // this farmer's own session (supabase-js sends it, with the project's key). The link is named by its ticket (Discord's link) or by
  // its state (back from Discord). Never repeated by itself: a link, a state and a code are good once. A refusal keeps the server's
  // status and its code (discord-auth LINK_ERRORS, as {error:'TICKET_GONE'}), which the dialog turns into the farmer's words; the
  // server's own texts are English only and never shown.
  bridge.discordLink=async(op,{ticket:linkTicket,state,code:discordCode}={})=>{
   if(ticket!==generation||!navigator.onLine)throw new Error('Your session is paused. Reconnect to continue.');
   const {data,error}=await supabase.functions.invoke(DISCORD_AUTH,{body:{op,ticket:linkTicket,state,code:discordCode},timeout:20000});
   if(error){let detail;try{detail=await error.context?.json();}catch{}const {transient,status}=describeFailure(error,detail),code=[detail?.code,detail?.error].find(value=>typeof value==='string'&&/^[A-Z][A-Z_]{2,39}$/.test(value));throw Object.assign(new Error('We could not connect. Please try again.'),{status,code,transient});}
   if(ticket!==generation)throw new Error('Your session has ended.');
   return data;
  };
  // Link (Oct 2026): first Discord says who taps it, so a ticket's link sent to someone else links nothing (discord-auth confirm only
  // links with a code of the ticket's own Discord account). The dialog asked our server for this Link's state ({op:'begin'}), which
  // our server keeps with this farmer's account; this page goes to Discord's own page with it (never the farm's frame: as with a
  // Google sign-in), which comes back to /discord-link/callback with a one-time code and that state. On a phone Discord's app often
  // opens that in a new tab or another browser: code and state are all the farm needs there, so nothing is kept in this tab.
  // again: Discord answered for another account last time, so its page now shows which one and lets the player switch.
  bridge.discordVerify=async(state,{again=false}={})=>{
   if(ticket!==generation||!navigator.onLine)throw new Error('Your session is paused. Reconnect to continue.');
   const valid=discordTicket(state);
   if(!valid)throw new Error('We could not connect. Please try again.');
   location.assign(discordAuthorizeUrl(valid,again===true));
  };
  // Back from Discord while another account is signed in here than the one that tapped Link (discord-auth LINK_OTHER_ACCOUNT): the
  // dialog's Sign out keeps Discord's answer in this tab as a link through a sign-in (OPEN_KEY, 10 minutes), so the sign-in card says
  // what it is for and the account that tapped Link gets the same question back, where Discord's code links.
  bridge.discordSignOut=answer=>{
   if(ticket!==generation)return;
   const back=discordBack(new Map(Object.entries(Object(answer))));
   if(!back.state)return;
   pendingOpen={open:'discord-link',...back};keepOpen(pendingOpen);void signOut();
  };
  window.harvestBridge=bridge;frame=page;release(bridge);phase('authenticated');store.set(RETURNING_KEY,'1');
  scheduleBrowserTip({embedded:embeddedBrowser(navigator.userAgent),doc:document,win:window,storage:store});
 }catch(error){if(ticket===generation){
  if(error.status===401){landing('Your session has ended. Please sign in again.');}
  // The farm could not be reached (a request that was already repeated a few times, or no network at all): the pause screen, which keeps trying by itself.
  else if(error.transient||navigator.onLine===false)connection.pause(reasonOf(error,navigator.onLine));
  else unavailable(cloudError(error));
 }}
 finally{checking=false;if(reopen){reopen=false;queueMicrotask(openFarm);}}
}
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{if(submitting)return;const next=button.dataset.mode;if(next!==mode)trackAuth('mode',{mode:next});setMode(next,true);});
// In the Android apps and the iPhone app before 1.3 there is nothing to ask: no provider can sign in there (src/social-login.js). The
// iPhone app from 1.3 (nativeSignIn) shows the buttons as Safari does, except that Apple always shows there next to the others, also after
// an ad (App Review guideline 4.8, src/social-login.js usableProviders). There Apple also comes first, on a row of its own (16 Oct 2026,
// the owner; Apple's Human Interface Guidelines: never less prominent than another sign-in; its look in public/welcome.css), moved to
// the front so a screen reader meets it first too, and the two-by-two rule (an odd last button takes the whole row) is for the ones
// below it: Google and Facebook side by side, Discord the whole row. The website keeps its order and its two by two.
(inApp&&!nativeSignIn?Promise.resolve([]):socialProviders()).then(list=>{providers=usableProviders(list,navigator.userAgent,undefined,{fromAd:adVisit(pendingSource)});const shown=[...document.querySelectorAll('[data-provider]')].filter(b=>{b.hidden=!providers.includes(b.dataset.provider);b.classList.remove('is-wide');return !b.hidden;});
 const apple=nativeSignIn?shown.find(b=>b.dataset.provider==='apple'):null;if(apple){apple.parentElement?.prepend(apple);apple.classList.add('is-wide');}
 const rest=shown.filter(b=>b!==apple);if(rest.length%2)rest.at(-1).classList.add('is-wide');showSocial();});
// Never in the Android apps or the iPhone app before 1.3 (Oct 2026): Google and Facebook both refuse a WebView, so there the buttons stay
// hidden (src/social-login.js) and a sign-in with them cannot even start. The iPhone app from 1.3 asks the app (appSignInFlow).
document.querySelectorAll('[data-provider]').forEach(button=>button.onclick=async()=>{
 if(submitting||!supabase||inApp&&!nativeSignIn)return;const provider=button.dataset.provider;
 // In a frame (framed) the game opens in a new tab, where the sign-in works.
 if(framed){const tab=window.open(redirectUrl(true),'_blank');if(tab)tab.opener=null;$('account-message').textContent=tab?`Sign in with ${providerName(provider)} in the new tab.`:`To sign in with ${providerName(provider)}, open www.harvesttycoon.com.`;return;}
 trackAuth('submit',{mode,method:provider});submitting=true;lock(true);$('account-message').textContent=`Opening ${providerName(provider)}…`;
 if(nativeSignIn){await appSignInFlow(provider);return;}
 try{tabStore.set(OAUTH_KEY,provider);const {error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:redirectUrl(true)}});if(error)throw error;}
 catch(error){tabStore.remove(OAUTH_KEY);const problem=oauthStartError(error,provider);trackAuth('error',{mode,reason:problem.reason,method:provider});$('account-message').textContent=problem.message;submitting=false;lock(false);}
});
// The iPhone app from 1.3 (16 Oct 2026, the owner; the contract is in src/app-sign-in.js). Apple: Apple's own sheet, checked with a
// random value only this page knows (Apple gets its hash), then the farm opens as after a password, the first farm load taking the invite,
// partner and source along as after any sign-in. Google, Facebook and Discord: the system's sign-in sheet, back to the website's return
// page on www (redirectUrl(true,APP_SIGN_IN_ORIGIN), never this page's origin: the sheet only answers for www); on success the app loads
// that address with the session in it, as a browser comes back, so OAUTH_KEY is kept as there (a failed return says so). Closing
// a sheet opens the form again without a word (counted as a return without a sign-in, as a cancel on Google's page in a browser);
// anything else says that provider could not be opened, as a sign-in that cannot start in a browser. iOS refusing the sheet (no
// association with www) is a cancel at once: the app sends it as error code 1, and a Google, Facebook or Discord 'cancelled' within
// APP_SIGN_IN_REFUSED_MS counts as "could not open" here too (counted as app_cancelled_fast; 16 Oct 2026, review), never a tap that
// only flashes "Opening Google…".
async function appSignInFlow(provider){
 try{
  let answer,asked=0;
  if(provider==='apple'){
   const nonce=appleNonce(),reply=waitForAppSignIn(provider);
   location.href=appAppleLink(await sha256Hex(nonce));answer=await reply;
   if(answer?.type==='apple'){
    const {error}=await supabase.auth.signInWithIdToken({provider:'apple',token:answer.token,nonce});if(error)throw error;
    if(answer.code)keepAppleToken({code:answer.code});
    trackAuth('login',{method:'apple'});$('account-message').textContent='';await openFarm();return;
   }
  }else{
   tabStore.set(OAUTH_KEY,provider);
   const {data,error}=await supabase.auth.signInWithOAuth({provider,options:{redirectTo:redirectUrl(true,APP_SIGN_IN_ORIGIN),skipBrowserRedirect:true}});if(error)throw error;
   if(!appAuthorizeUrl(data?.url))throw new Error('authorize_url');
   const reply=waitForAppSignIn(provider);asked=Date.now();location.href=appOAuthLink({provider,url:data.url});answer=await reply;
  }
  tabStore.remove(OAUTH_KEY);
  if(answer?.type==='cancelled'&&provider!=='apple'&&Date.now()-asked<APP_SIGN_IN_REFUSED_MS)throw Object.assign(new Error('cancelled_fast'),{appReason:'app_cancelled_fast'});
  if(answer?.type==='cancelled'){trackAuth('error',{mode,reason:'oauth_return',method:provider});$('account-message').textContent='';return;}
  // The app's error (error, busy, invalid) or no answer at all: as a sign-in that cannot start, on screen. Counted with the app's own
  // reason and code (app_error_1000, app_busy, app_timeout; 16 Oct 2026, review: all of them were oauth_start, and the code was lost).
  // The iPhone app loads no Tag Manager, so nothing reads it there yet; the app itself logs the same to the iPhone's console.
  const reason=answer?.reason??'timeout',code=Number.isSafeInteger(answer?.code)&&answer.code>=0?`_${answer.code}`:'';
  throw Object.assign(new Error(reason),{appReason:`app_${reason}${code}`});
 }catch(error){tabStore.remove(OAUTH_KEY);const problem=oauthStartError(error,provider);trackAuth('error',{mode,reason:error?.appReason??problem.reason,method:provider});$('account-message').textContent=problem.message;}
 finally{submitting=false;lock(false);}
}
$('forgot-link').onclick=()=>{if(submitting)return;trackAuth('mode',{mode:'forgot'});setMode('forgot',true);};
// "Forgot your password?" has a way back at the top too: to the start of the card, as a first visit shows it.
$('account-back').onclick=()=>{if(submitting)return;setMode(knownPlayer()?'signin':'register',true);};
$('name-toggle').onclick=()=>{nameOpen=true;setMode('register');focusField('player-name');};
$('toggle-password').onclick=()=>setPasswordVisible($('password').type==='password');
for(const id of ['email','password','player-name'])$(id).oninput=()=>fieldError(id==='player-name'?'name':id);
// Funnel: the first field a visitor touches in each mode. On phones, keep the focused field clear of the keyboard.
$('account-form').addEventListener?.('focusin',event=>{
 const id=event.target?.id;if(!id||focusing)return;
 if(!started[mode]){started[mode]=true;trackAuth('field_start',{mode,field:id==='player-name'?'name':id});}
 if(globalThis.innerWidth<720)setTimeout(()=>event.target.scrollIntoView?.({block:'center',behavior:'smooth'}),300);
});
$('account-form').onsubmit=async event=>{
 event.preventDefault();if(submitting)return;
 const email=$('email').value.trim(),password=$('password').value;let name=shownField('name')?$('player-name').value.trim():'';
 const errors=formErrors({mode,name,email,password},validUsername);
 if(Object.keys(errors).length){showFieldErrors(errors);trackAuth('error',{mode,reason:'validation',field:Object.keys(errors)[0]});return;}
 clearErrors();
 if(!isConfigured){unavailable('Account access is temporarily unavailable.');return;}
 trackAuth('submit',{mode});
 submitting=true;lock(true);$('account-message').textContent=MESSAGES[mode];
 try{
  // Farmer names are unique (supabase/unique-farmer-names.sql): a taken one is refused here, before the account is made.
  // If the check itself fails, the name counts as free: the server still gives a new farm the first free "Name 2".
  const free=async value=>{try{const {data,error}=await supabase.rpc('username_available',{p_name:value});return error?true:data!==false;}catch{return true;}};
  if(name&&(mode==='name'||mode==='register')&&!(await free(name))){$('account-message').textContent='';showFieldErrors({name:'That farmer name is taken. Try another one.'});trackAuth('error',{mode,reason:'validation',field:'name'});return;}
  if(mode==='name'){const {error}=await supabase.auth.updateUser({data:{username:name}});if(error)throw error;}
  else if(mode==='register'){
   // The player name is optional: a friendly one is picked here and can be changed in the leaderboard.
   if(!name){name=randomPlayerName();for(let i=0;i<5&&!(await free(name));i++)name=randomPlayerName();}
   const invite=pendingInvite(localStore);if(invite)trackInvite('invite_signup');
   const ref=pendingRef(localStore);
   const {data,error}=await supabase.auth.signUp({email,password,options:{data:{username:name,language:chosenLanguage(),...(invite?{invite}:{}),...(ref?{ref}:{}),...(pendingSource?{source:pendingSource}:{})},emailRedirectTo:redirectUrl(true)}});
   if(error)throw error;
   if(isNewRegistration(data))trackSignUp({confirmationRequired:!data.session});
   store.set(RETURNING_KEY,'1');
   if(!data.session){$('password').value='';showConfirmation(email);return;}
  }else if(mode==='forgot'){
   const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl()});if(error)throw error;
   showConfirmation(email,{kind:'reset'});return;
  }else if(mode==='recovery'){
   const {data,error}=await supabase.auth.updateUser({password});if(error)throw error;
   recovering=false;recoveryLink=false;passwordSet=data?.user?.id??'';trackAuth('password_changed');store.set(RETURNING_KEY,'1');try{history.replaceState(null,'',location.pathname);}catch{}
  }else{
   const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;
   const afterSignup=store.get(CONFIRM_KEY)==='1';store.remove(CONFIRM_KEY);trackAuth('login',{method:'password',after_signup:afterSignup});
  }
  await openFarm();$('password').value='';
 }catch(error){
  const problem=describeAuthError(error,cloudError);trackAuth('error',{mode,reason:problem.reason,field:problem.field});
  if(problem.resend)showConfirmation(email,{fresh:false});
  else if(problem.field&&shownField(problem.field))fieldError(problem.field,problem.message);
  else $('account-message').textContent=problem.message;
 }
 finally{submitting=false;lock(false);}
};
function shownField(field){return !$(field+'-row').hidden;}
$('resend-confirmation').onclick=async()=>{
 if(!pendingEmail||!supabase)return;trackAuth('resend',{mode:confirmKind});$('confirm-message').textContent='Sending…';
 try{
  const {error}=confirmKind==='reset'?await supabase.auth.resetPasswordForEmail(pendingEmail,{redirectTo:redirectUrl()}):await supabase.auth.resend({type:'signup',email:pendingEmail,options:{emailRedirectTo:redirectUrl(true)}});
  if(error)throw error;$('confirm-message').textContent='Sent! It can take a minute to arrive.';startResendCooldown(60);
 }catch(error){const problem=describeAuthError(error,cloudError);$('confirm-message').textContent=problem.message;trackAuth('error',{mode:'confirm',reason:problem.reason});}
};
$('confirm-back').onclick=()=>setMode(confirmKind==='reset'?'forgot':'register',true);
$('retry-connection').onclick=openFarm;$('leave-account').onclick=signOut;
// "offline" flickers (a wifi hand-over, a laptop waking up): only a farm that stays unreachable pauses, see connection.js.
window.addEventListener('offline',()=>{if(frame)connection.offline();});
window.addEventListener('online',()=>{connection.online();if(document.body.dataset.phase==='error'&&connection.status==='ok')setTimeout(openFarm,WAKE_GRACE);});
if(supabase)supabase.auth.onAuthStateChange((event,session)=>{
 if(event==='PASSWORD_RECOVERY'){if(recoveryLink&&!recovering)startRecovery();return;}
 if(event==='SIGNED_OUT'){landing();return;}
 if(recovering)return;
 if(event==='SIGNED_IN'&&!submitting&&checking&&(!playerId||playerId!==session?.user.id)){dispose();phase('checking','Checking your account…');reopen=true;return;}
 if(playerId&&session?.user.id!==playerId){dispose();phase('checking','Checking your account…');}
 if(event==='SIGNED_IN'&&!submitting&&!frame)setTimeout(openFarm,0);
});
// Asking the server for the farm is the check: it verifies the sign-in itself (a 401 ends the session in bridge.request), so no separate account lookup.
// A failure is reported by bridge.request to the connection, which shows "Reconnecting…" and keeps trying; it never closes the farm here.
async function checkSession(){
 if(!frame||checking||document.hidden||connection.status!=='ok')return;
 const ticket=generation;
 try{if(frame.contentWindow.harvestRefresh)await frame.contentWindow.harvestRefresh();else await window.harvestBridge.request({operation:'load'});}
 catch{if(ticket!==generation)return;}
}
// The connection behind a paused or reconnecting farm: ask the server, without opening or refreshing anything yet.
async function probeFarm(){
 if(!frame){
  const user=await verifiedUser();
  if(!user){landing('Please sign in to continue.');throw Object.assign(new Error('Signed out'),{fatal:true});}
 }
 await farmRequest({operation:'load'},{retry:false});
}
// Waking up (a laptop lid, a phone) or switching back to the tab: the network needs a moment, so the check waits a little.
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;if(connection.status==='ok')setTimeout(checkSession,WAKE_GRACE);else connection.wake();});setInterval(checkSession,60000);
// Boot: a reset link opens the new-password form, an expired link explains itself, a first-time visitor sees the sign-up card at once.
const kind=linkKind(),oauthProvider=tabStore.get(OAUTH_KEY);tabStore.remove(OAUTH_KEY);
if(kind==='recovery')startRecovery();
else if(linkError()&&oauthProvider){landing(oauthReturnMessage(oauthProvider));trackAuth('error',{mode:'signin',reason:'oauth_return',method:oauthProvider});}
else if(linkError()){landing('That link has expired or was already used. Sign in, or ask for a new link.');trackAuth('link_error');}
else{
 if(kind==='signup'){trackAuth('email_confirmed');store.remove(CONFIRM_KEY);}
 if(oauthProvider)trackAuth('login',{method:oauthProvider});
 if(oauthProvider==='apple')keepWebAppleToken();
 if(!kind&&!oauthProvider&&brandNewVisitor())landing();else openFarm();
}
