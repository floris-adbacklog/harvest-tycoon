import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fitsDevice,createPopupUI,POPUP_AUDIENCES} from '../src/popup-ui.js';
import {googlePlayApp} from '../public/android.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Pop-ups for the Android app (9 Oct 2026, supabase/popup-android-app.sql): the group 'android_app' is only our app from Google Play,
// never the iPhone app, a browser, CrazyGames, Kongregate or itch. The user agents the apps send (public/android-app.js).
const WEBVIEW_UA='Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.70 Mobile Safari/537.36';
const PLAY_10=`${WEBVIEW_UA} HarvestTycoonApp/1.0`,PLAY_12=`${WEBVIEW_UA} HarvestTycoonApp/1.2 PlayBilling/1`,GALAXY=`${WEBVIEW_UA} HarvestTycoonApp/1.2 WebBilling/1`;
const IOS_APP='Mozilla/5.0 (iPhone; CPU iPhone OS 26_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HarvestTycoonApp/1.0',IOS_APP_11=IOS_APP.replace('HarvestTycoonApp/1.0','HarvestTycoonApp/1.1 AppStoreBilling/1');
const IPAD_APP='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) HarvestTycoonApp/1.0';
const CHROME='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.70 Mobile Safari/537.36';
const DESKTOP='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const IOS_SAFARI='Mozilla/5.0 (iPhone; CPU iPhone OS 26_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1';

const element=(attrs={})=>({attrs,dataset:{},getAttribute:name=>attrs[name]??null,hasAttribute:name=>name in attrs,setAttribute(name,value){attrs[name]=String(value);}});
// public/android-app.js as the browser runs it: the page's marks for a user agent, inside a page around it (an element), or a frame of
// another site ('cross-origin', as itch's), or on its own.
function marked({ua=CHROME,own={},parent=null,search=''}={}){
 const html=element({...own}),window={},storage={getItem:()=>null,setItem(){},removeItem(){}};
 window.parent=parent==='cross-origin'?{get document(){throw new Error('cross-origin');}}:parent?{document:{documentElement:parent}}:window;
 vm.runInNewContext(read('public/android-app.js'),{window,document:{documentElement:html},navigator:{userAgent:ua},location:{search},localStorage:storage});
 return html;
}
// A window for that page (and the page around it, for the game frame).
const pageWindow=(html,parentHtml=null)=>{const win={document:{documentElement:html}};win.parent=parentHtml?{document:{documentElement:parentHtml}}:win;return win;};

test('the Android app group: our Google Play app (1.0 and 1.2 with Google Play purchases) and the game frame in it',()=>{
 assert.equal(POPUP_AUDIENCES.android_app,'Android app (Google Play)');
 for(const ua of [PLAY_10,PLAY_12]){
  const page=marked({ua}),frame=marked({ua,parent:page});
  assert.equal(page.attrs['data-app'],'android',ua);assert.equal(googlePlayApp(pageWindow(page)),true,ua);
  assert.equal(googlePlayApp(pageWindow(frame,page)),true,'the game frame follows the page around it');
  assert.equal(googlePlayApp(pageWindow(element(),page)),true,'a frame not marked itself reads the page around it');
 }
});
test('never the iPhone app (the same data-app="android", with data-app-os="ios"), the Galaxy Store app, a browser or a portal',()=>{
 for(const ua of [IOS_APP,IOS_APP_11,IPAD_APP]){
  const page=marked({ua}),frame=marked({ua,parent:page});
  assert.equal(page.attrs['data-app'],'android',ua);assert.equal(page.attrs['data-app-os'],'ios',ua);
  assert.equal(googlePlayApp(pageWindow(page)),false,ua);assert.equal(googlePlayApp(pageWindow(frame,page)),false,`${ua} (frame)`);
  assert.equal(googlePlayApp(pageWindow(element(),page)),false,`${ua} (unmarked frame)`);
 }
 const galaxy=marked({ua:GALAXY});assert.equal(galaxy.attrs['data-web-billing'],'');assert.equal(googlePlayApp(pageWindow(galaxy)),false,'not from Google Play');
 for(const ua of [CHROME,DESKTOP,IOS_SAFARI,WEBVIEW_UA])assert.equal(googlePlayApp(pageWindow(marked({ua}))),false,ua);
 // CrazyGames and Kongregate: <html data-portal>, nothing marks their page or the farm frame in it, not even the app's own user agent.
 for(const portal of ['crazygames','kongregate']){
  const page=marked({ua:PLAY_12,own:{'data-portal':portal}}),frame=marked({ua:PLAY_12,parent:page});
  assert.equal(googlePlayApp(pageWindow(page)),false,portal);assert.equal(googlePlayApp(pageWindow(frame,page)),false,`${portal} (frame)`);
  assert.match(read(`public/${portal}.html`),new RegExp(`<html lang="en" data-portal="${portal}"`));
 }
 // itch: our page in itch's frame (another site, unreadable) in a browser.
 assert.equal(googlePlayApp(pageWindow(marked({ua:CHROME,parent:'cross-origin',search:'?src=itch'}))),false,'itch');
 assert.equal(googlePlayApp({get document(){throw new Error('gone');}}),false,'a window that cannot be read');assert.equal(googlePlayApp(undefined),false);
});
test('who sees an Android app pop-up: only playApp; the other groups stay as they were',()=>{
 const play={installed:true,phone:true,playApp:true},ios={installed:true,phone:true,playApp:false},browserPhone={installed:false,phone:true},computer={installed:false,phone:false};
 assert.deepEqual([play,ios,browserPhone,computer].map(d=>fitsDevice('android_app',d)),[true,false,false,false]);
 assert.deepEqual(['all','phone_browser','browser','phone','desktop'].map(a=>fitsDevice(a,play)),[true,false,false,true,false],'the Play app is an installed phone, as before');
 assert.equal(fitsDevice('android_app',{installed:true,phone:true,playApp:'yes'}),false,'only a real true');
 assert.equal(fitsDevice('android_app',{installed:true,phone:true}),false,'the special offer passes no playApp: never there');
 assert.equal(fitsDevice('a_group_from_later',play),false,'a group the game does not know is never shown');
});
// The pop-up rule of every game version before 9 Oct 2026, word for word: 26 Sep 2026 (542fe31) and 26 Sep to 9 Oct (3f29fc3 to cc1f2c8).
const OLD_RULES=[
 'return audience===\'all\'||(audience===\'no_app\'&&!installed)||(audience===\'phone\'&&phone)||(audience===\'desktop\'&&!phone);',
 'return audience===\'all\'||(audience===\'browser\'&&!installed)||(audience===\'phone_browser\'&&phone&&!installed)||(audience===\'phone\'&&phone)||(audience===\'desktop\'&&!phone);'
].map(body=>new Function('audience','{installed,phone}',body));
test('a game from before the Android app group (still open on a phone) never shows its pop-up, on any device',()=>{
 for(const old of OLD_RULES){
  for(const device of [{installed:true,phone:true},{installed:false,phone:true},{installed:false,phone:false},{installed:true,phone:false}])
   assert.equal(old('android_app',device),false,JSON.stringify(device));
  assert.equal(old('all',{installed:false,phone:false}),true,'the old rule itself, as it was');
 }
 assert.match(read('supabase/popups.sql'),/popup_seen\(p_id uuid\)/);
 assert.match(read('src/popup-ui.js'),/const popup=\(list\?\?\[\]\)\.find\(p=>fitsDevice\(p\.audience,device\(\)\)\);if\(!popup\)return;/,'skipped, so never marked as seen: the farmer gets it after the update');
});

// The game itself: createPopupUI with a page as in each app or browser.
function game({html,parentHtml=null,coarse=true,list}){
 const shown=[],seen=[],dialog={setAttribute(){},showModal(){shown.push(this.innerHTML);},close(){}};
 const doc={documentElement:html,body:{append(){}},createElement:()=>dialog,querySelector:()=>null,getElementById:()=>null};
 const win={document:doc,matchMedia:()=>({matches:coarse}),setInterval:()=>0,clearInterval(){},open(){}};win.parent=parentHtml?{document:{documentElement:parentHtml}}:win;
 const client={popups:async()=>list,popupSeen:async id=>{seen.push(id);}};
 return {ui:createPopupUI({client,state:{},doc,win}),shown,seen};
}
const REVIEW={id:'review',title:'Help more farmers find us',body:'Enjoying Harvest Tycoon? A short review on Google Play helps more farmers discover the game. Thank you!',
 buttonLabel:'Write a review',buttonTarget:'https://play.google.com/store/apps/details?id=com.harvesttycoon.app',audience:'android_app',texts:{}};
test('the review pop-up opens in the Android app (once, with its button); the iPhone app, browsers and portals skip it',async()=>{
 const before=globalThis.document;globalThis.document={querySelectorAll:()=>[],documentElement:{getAttribute:()=>null}};
 try{
  for(const ua of [PLAY_10,PLAY_12]){
   const page=marked({ua}),run=game({html:marked({ua,parent:page}),parentHtml:page,list:[REVIEW]});await run.ui.start();
   assert.equal(run.shown.length,1,ua);assert.deepEqual(run.seen,['review'],'seen once it is on screen');
   assert.match(run.shown[0],/data-popup-go><span>Write a review<\/span> ↗<\/button>/,'the button to Google Play');
  }
  const cases=[['iPhone app',IOS_APP_11],['Galaxy Store app',GALAXY],['phone browser',CHROME],['computer',DESKTOP,false],['iPhone Safari',IOS_SAFARI]];
  for(const [name,ua,coarse=true] of cases){
   const page=marked({ua}),run=game({html:marked({ua,parent:page}),parentHtml:page,coarse,list:[REVIEW]});await run.ui.start();
   assert.deepEqual([run.shown.length,run.seen],[0,[]],`${name}: not shown and not marked as seen`);
  }
  for(const portal of ['crazygames','kongregate']){
   const page=marked({ua:PLAY_12,own:{'data-portal':portal}}),run=game({html:marked({ua:PLAY_12,parent:page}),parentHtml:page,list:[REVIEW]});await run.ui.start();
   assert.deepEqual([run.shown.length,run.seen],[0,[]],portal);
  }
  // A browser phone with the review pop-up first in the list still gets the next one that is for it.
  const page=marked({ua:CHROME}),run=game({html:marked({ua:CHROME,parent:page}),parentHtml:page,list:[REVIEW,{id:'web',title:'Hi',body:'Hello',audience:'phone_browser',texts:{}}]});
  await run.ui.start();assert.deepEqual(run.seen,['web']);
 }finally{globalThis.document=before;}
});

test('the database: the group in the table\'s check and in popup_post, changed in place from its live text; a pop-up only',()=>{
 const sql=read('supabase/popup-android-app.sql'),before=read('supabase/admin-texts-languages.sql');
 assert.match(sql,/add constraint popups_audience_check check \(audience in \('all','browser','phone_browser','phone','desktop','android_app'\)\);/);
 const old=/old text:=\$o\$(.*?)\$o\$;/.exec(sql)[1];
 assert.equal(before.split(old).length-1,1,'the line it replaces is popup_post\'s own (as live on 9 Oct 2026)');
 assert.match(sql,/new text:=\$n\$ if who not in \('all','browser','phone_browser','phone','desktop','android_app'\) then raise exception 'Choose who sees it\.' using errcode='22023'; end if;\n if who='android_app' and coalesce\(p_news,true\) then raise exception '[^']+' using errcode='22023'; end if;\$n\$;/);
 assert.match(sql,/pg_get_functiondef\('public\.popup_post\(text,text,text,text,text,integer,integer,boolean,jsonb\)'::regprocedure\)/,'the live definition');
 assert.match(sql,/if position\('''android_app''' in d\)>0 then return; end if;/,'re-runnable');
 assert.match(sql,/<>1 then raise exception 'popup_post is not as expected/,'stops when the live text differs');
 assert.doesNotMatch(read('supabase/special-offer.sql'),/android_app/,'no offer for the group');
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/<select id="admin-offer-audience">'\+Object\.entries\(POPUP_AUDIENCES\)\.filter\(\(\[key\]\)=>key!=='android_app'\)/,'the offer form leaves it out');
 assert.match(admin,/<select id="admin-popup-audience">'\+Object\.entries\(POPUP_AUDIENCES\)\.map/,'the pop-up form has it');
 for(const text of [sql,read('src/popup-ui.js'),read('public/android.js')])assert.doesNotMatch(text,/ · /,'no middle dots');
});
