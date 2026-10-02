// Visitors from Meta and TikTok ads play inside that app's own browser: it cannot show reminders, and once it is closed the
// farm is hard to find again. A couple of minutes into the farm, one small tip (once per device) offers the phone's own
// browser. The farm lives on the account, so signing in there with the same account carries on where they left off.
// Never in our own Android app (Oct 2026, public/android.js): its WebView also says "; wv)", but that app is where the farm belongs.
import {androidApp} from '../public/android.js';
export const BROWSER_TIP_KEY='harvest-tycoon:browser-tip',BROWSER_TIP_DELAY=120000;
export function inAppName(ua=''){
 return /Instagram/i.test(ua)?'Instagram':/Barcelona/i.test(ua)?'Threads':/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)?'Facebook':/musical_ly|trill_|BytedanceWebview/i.test(ua)?'TikTok':/Snapchat/i.test(ua)?'Snapchat':/LinkedInApp/i.test(ua)?'LinkedIn':'an app';
}
// The same app as a key for where a new farmer came from (src/source-link.js): it goes along when the page moves to the phone's browser.
export const appKey=(ua='')=>({Facebook:'facebook',Instagram:'instagram',Threads:'threads',TikTok:'tiktok'})[inAppName(ua)]??null;
// Android can hand the page to Chrome; an iPhone cannot be sent to Safari from here, so there the link is copied. (Safari on an
// iPhone only shows reminders for a game added to the Home Screen, so the iPhone text does not promise them.)
export function chromeIntent(href){const url=new URL(href);return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;end`;}
export function browserTipText(ua=''){
 const android=/Android/i.test(ua);
 return {android,action:android?'Open in Chrome':'Copy link',text:`You are playing inside ${inAppName(ua)}. Open Harvest Tycoon in ${android?'Chrome so your farm is easy to find again and you get reminders when your crops are ready':'Safari so your farm is easy to find again'}. Sign in there with the same account.`};
}
let scheduled=false;
export function scheduleBrowserTip({embedded,doc,win,storage,delay=BROWSER_TIP_DELAY}){
 if(!embedded||androidApp(win)||scheduled||storage.get(BROWSER_TIP_KEY))return false;
 scheduled=true;win.setTimeout(()=>showBrowserTip({doc,win,storage}),delay);return true;
}
// The address to open there: the home page, or the language page this is (/es/, Oct 2026; the phone's browser keeps its own storage,
// so it would not know the language otherwise).
export function tipLink(doc,loc){const page=doc?.documentElement?.getAttribute?.('data-page-lang');return `${loc.origin}/${page&&/^[a-z]{2}$/.test(page)?`${page}/`:''}`;}
function showBrowserTip({doc,win,storage}){
 if(storage.get(BROWSER_TIP_KEY))return;
 const {android,action,text}=browserTipText(win.navigator?.userAgent??''),link=tipLink(doc,win.location);
 const box=doc.createElement('div');box.className='browser-tip';box.setAttribute('role','status');
 const note=doc.createElement('p');note.textContent=text;
 const go=doc.createElement('button');go.type='button';go.className='browser-tip-go';go.textContent=action;
 const later=doc.createElement('button');later.type='button';later.className='browser-tip-later';later.textContent='Not now';
 const row=doc.createElement('div');row.append(go,later);box.append(note,row);doc.body.append(box);
 const seen=()=>storage.set(BROWSER_TIP_KEY,'1');
 later.onclick=()=>{seen();box.remove();};
 go.onclick=async()=>{
  seen();
  if(android){win.location.href=chromeIntent(link);return;}
  try{await win.navigator.clipboard.writeText(link);note.textContent='Link copied. Open Safari, paste it in the address bar and sign in with the same account.';}
  catch{note.textContent=`Open Safari and go to ${link}, then sign in with the same account.`;}
  go.remove();later.textContent='Got it';
 };
}

// Before sign-up (28 Sep 2026): of the EU players who stayed in the Facebook or Instagram browser, 2 in 96 came back on a second
// day, against 22 in 92 in a phone's own browser. So the sign-up card first offers Meta's in-app visitors the phone's own browser,
// where they make their account: Android hands the page to Chrome (on the first visit by itself, once), an iPhone tries Safari
// (x-safari-https, iOS 17 and later) and otherwise shows where the app's own "open in browser" is. "Play here instead" stays.
// TikTok's app has the same step since its ads started (30 Sep 2026), but Android only moves to Chrome on a tap there: whether
// TikTok hands an intent:// link on is not known yet, and a first visit must never land on an error page.
export const ESCAPE_KEY='harvest-tycoon:browser-escape';
export const META_APP=/FBAN|FBAV|FB_IAB|FBIOS|Instagram|Barcelona/i;
export const metaApp=(ua='')=>META_APP.test(ua);
export const GATE_APP=/FBAN|FBAV|FB_IAB|FBIOS|Instagram|Barcelona|musical_ly|trill_|BytedanceWebview/i;
export const gateApp=(ua='')=>GATE_APP.test(ua);
export const safariUrl=href=>`x-safari-${href}`;
// The page itself, without an OAuth answer or error in it, and with a friend's invite code put back (invite-link.js keeps it on
// this device only, and the phone's browser is another device as far as storage goes).
export function escapeTarget(loc,invite=null,ref=null,{rd=null,via=null}={}){
 const url=new URL((loc.pathname??'/')+(loc.search??''),loc.origin);
 for(const key of ['code','error','error_code','error_description'])url.searchParams.delete(key);
 if(invite&&!url.searchParams.has('invite'))url.searchParams.set('invite',invite);
 // A partner's code (src/partner-link.js) goes along to the real browser too.
 if(ref&&!url.searchParams.has('ref'))url.searchParams.set('ref',ref);
 // And where the farmer came from (2 Oct 2026, src/source-link.js): the website that linked (the phone's browser gets no referrer)
 // and the app it was in. The campaign tags and click ids are in the address already.
 if(rd&&!url.searchParams.has('rd'))url.searchParams.set('rd',rd);
 if(via&&!url.searchParams.has('via'))url.searchParams.set('via',via);
 return url.href;
}
export function gateText(ua=''){
 const android=/Android/i.test(ua),browser=android?'Chrome':'Safari';
 return {android,app:inAppName(ua),browser,action:`Open in ${browser}`,
  help:android?'Nothing happened? Tap ⋮ at the top of the screen and choose Open in Chrome or Open in browser.':'Tap ••• at the top of the screen and choose Open in browser. The link is copied too, so you can paste it in Safari.'};
}
