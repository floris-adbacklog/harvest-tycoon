// Visitors from Meta and TikTok ads play inside that app's own browser: it cannot show reminders, and once it is closed the
// farm is hard to find again. A couple of minutes into the farm, one small tip (once per device) offers the phone's own
// browser. The farm lives on the account, so signing in there with the same account carries on where they left off.
export const BROWSER_TIP_KEY='harvest-tycoon:browser-tip',BROWSER_TIP_DELAY=120000;
export function inAppName(ua=''){
 return /Instagram/i.test(ua)?'Instagram':/Barcelona/i.test(ua)?'Threads':/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)?'Facebook':/musical_ly|BytedanceWebview/i.test(ua)?'TikTok':/Snapchat/i.test(ua)?'Snapchat':/LinkedInApp/i.test(ua)?'LinkedIn':'an app';
}
// Android can hand the page to Chrome; an iPhone cannot be sent to Safari from here, so there the link is copied. (Safari on an
// iPhone only shows reminders for a game added to the Home Screen, so the iPhone text does not promise them.)
export function chromeIntent(href){const url=new URL(href);return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;end`;}
export function browserTipText(ua=''){
 const android=/Android/i.test(ua);
 return {android,action:android?'Open in Chrome':'Copy link',text:`You are playing inside ${inAppName(ua)}. Open Harvest Tycoon in ${android?'Chrome so your farm is easy to find again and you get reminders when your crops are ready':'Safari so your farm is easy to find again'}. Sign in there with the same account.`};
}
let scheduled=false;
export function scheduleBrowserTip({embedded,doc,win,storage,delay=BROWSER_TIP_DELAY}){
 if(!embedded||scheduled||storage.get(BROWSER_TIP_KEY))return false;
 scheduled=true;win.setTimeout(()=>showBrowserTip({doc,win,storage}),delay);return true;
}
function showBrowserTip({doc,win,storage}){
 if(storage.get(BROWSER_TIP_KEY))return;
 const {android,action,text}=browserTipText(win.navigator?.userAgent??''),link=`${win.location.origin}/`;
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
