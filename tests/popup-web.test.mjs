import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fitsDevice,createPopupUI,POPUP_AUDIENCES} from '../src/popup-ui.js';
import {PORTAL_FEATURES} from '../public/portal.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Pop-ups for our website (9 Oct 2026, supabase/popup-web.sql), first for the Trustpilot review: harvesttycoon.com in a browser or on the
// home screen, itch.io's frame too; never in our Android, iPhone or Galaxy Store app, never on CrazyGames or Kongregate (no links out
// there). The user agents the apps send (public/android-app.js).
const WEBVIEW_UA='Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.70 Mobile Safari/537.36';
const PLAY_10=`${WEBVIEW_UA} HarvestTycoonApp/1.0`,PLAY_12=`${WEBVIEW_UA} HarvestTycoonApp/1.2 PlayBilling/1`,GALAXY=`${WEBVIEW_UA} HarvestTycoonApp/1.2 WebBilling/1`;
const IOS_APP='Mozilla/5.0 (iPhone; CPU iPhone OS 26_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HarvestTycoonApp/1.0',IOS_APP_11=IOS_APP.replace('HarvestTycoonApp/1.0','HarvestTycoonApp/1.1 AppStoreBilling/1');
const IPAD_APP='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) HarvestTycoonApp/1.0';
const CHROME='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.70 Mobile Safari/537.36';
const DESKTOP='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const IOS_SAFARI='Mozilla/5.0 (iPhone; CPU iPhone OS 26_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.4 Mobile/15E148 Safari/604.1';
const TRUSTPILOT='https://www.trustpilot.com/evaluate/harvesttycoon.com';
const REVIEW={id:'trustpilot',title:'Help more farmers find us',body:'What do you think of Harvest Tycoon? A short review on Trustpilot helps more farmers discover the game. Thank you!',
 buttonLabel:'Review on Trustpilot',buttonTarget:TRUSTPILOT,audience:'web',texts:{}};

const element=(attrs={})=>({attrs,dataset:{},getAttribute:name=>attrs[name]??null,hasAttribute:name=>name in attrs,setAttribute(name,value){attrs[name]=String(value);}});
const crossOrigin={get document(){throw new Error('cross-origin');},get harvestBridge(){throw new Error('cross-origin');},get harvestPortal(){throw new Error('cross-origin');}};
// public/android-app.js as the browser runs it, for a page (inside another site's frame, as on itch) or the game frame in it.
function marked({ua,own={},parent=null}){
 const html=element({...own}),window={};
 window.parent=parent==='cross-origin'?crossOrigin:parent?{document:{documentElement:parent}}:window;
 vm.runInNewContext(read('public/android-app.js'),{window,document:{documentElement:html},navigator:{userAgent:ua},location:{search:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}});
 return html;
}
// A portal as src/crazygames.js and src/kongregate-page.js hand it to the farm (bridge.portal): every feature off.
const portalOf=name=>({name,features:Object.freeze(Object.fromEntries(PORTAL_FEATURES.map(feature=>[feature,false]))),guest:false,settings:{},userAvailable:true});
// The game itself: the farm frame (farm.html, where src/game-cloud.js starts the pop-ups) in the page around it, as on the website
// (src/main.js), in an app, on a portal (its page marked data-portal, the portal on the bridge) or in itch's frame.
async function play({ua=CHROME,portal=null,itch=false,standalone=false,coarse=true,list=[REVIEW]}){
 const page=marked({ua,own:portal?{'data-portal':portal}:{},parent:itch?'cross-origin':null}),frame=marked({ua,parent:page});
 if(standalone)frame.dataset.appMode='standalone';
 const shown=[],seen=[],opened=[],dialog={setAttribute(){},showModal(){shown.push(this.innerHTML);},close(){}};
 const doc={documentElement:frame,body:{append(){}},createElement:()=>dialog,querySelector:()=>null,getElementById:()=>null};
 const around={document:{documentElement:page},harvestBridge:portal?{portal:portalOf(portal)}:{}};around.parent=itch?crossOrigin:around;
 const win={document:doc,parent:around,matchMedia:()=>({matches:coarse}),setInterval:()=>0,clearInterval(){},open:(...args)=>opened.push(args)};
 const client={popups:async()=>list,popupSeen:async id=>{seen.push(id);}};
 const before={window:globalThis.window,document:globalThis.document};
 globalThis.window=win;globalThis.document={querySelectorAll:()=>[],documentElement:{getAttribute:()=>null}};
 try{await createPopupUI({client,state:{},doc,win}).start();if(shown[0]?.includes('data-popup-go'))dialog.onclick({target:{closest:selector=>selector==='[data-popup-go]'?{}:null}});}
 finally{globalThis.window=before.window;globalThis.document=before.document;}
 return {shown,seen,opened};
}

test('the website group: its name, and only a real web flag shows it; the other groups stay as they were',()=>{
 assert.equal(POPUP_AUDIENCES.web,'Website (not the apps, CrazyGames or Kongregate)');
 const web={installed:false,phone:true,web:true},home={installed:true,phone:true,web:true},app={installed:true,phone:true,playApp:true,web:false},portal={installed:false,phone:false,web:false};
 assert.deepEqual([web,home,app,portal].map(d=>fitsDevice('web',d)),[true,true,false,false]);
 assert.equal(fitsDevice('web',{installed:false,phone:false,web:'yes'}),false,'only a real true');
 assert.equal(fitsDevice('web',{installed:false,phone:false}),false,'the special offer passes no web: never there');
 assert.deepEqual(['all','phone_browser','browser','phone','desktop','android_app'].map(a=>fitsDevice(a,portal)),[true,false,true,false,true,false],'a portal is in the browser group, as before');
});

test('the Trustpilot pop-up opens on the website (a phone, a computer, an iPhone, the home screen, itch), once, with its button',async()=>{
 for(const [name,options] of [['phone browser',{ua:CHROME}],['computer',{ua:DESKTOP,coarse:false}],['iPhone Safari',{ua:IOS_SAFARI}],
  ['added to the home screen',{ua:CHROME,standalone:true}],['itch.io',{ua:DESKTOP,coarse:false,itch:true}]]){
  const run=await play(options);
  assert.equal(run.shown.length,1,name);assert.deepEqual(run.seen,['trustpilot'],`${name}: seen once it is on screen`);
  assert.match(run.shown[0],/data-popup-go><span>Review on Trustpilot<\/span> ↗<\/button><button type="button" class="popup-later" data-popup-close>Not now<\/button>/,name);
  assert.deepEqual(run.opened,[[TRUSTPILOT,'_blank','noopener,noreferrer']],`${name}: Trustpilot in a new tab`);
 }
});

test('never in our apps (Google Play, iPhone, Galaxy Store) or on CrazyGames or Kongregate: not shown and not marked as seen',async()=>{
 for(const ua of [PLAY_10,PLAY_12,GALAXY,IOS_APP,IOS_APP_11,IPAD_APP]){
  const run=await play({ua});assert.deepEqual([run.shown.length,run.seen],[0,[]],ua);
 }
 for(const portal of ['crazygames','kongregate'])for(const ua of [CHROME,DESKTOP]){
  const run=await play({ua,portal,coarse:ua===CHROME});assert.deepEqual([run.shown.length,run.seen],[0,[]],`${portal} ${ua}`);
 }
 // A portal farmer with the review first in the list still gets the next one that is for them.
 const run=await play({portal:'crazygames',list:[REVIEW,{id:'all',title:'Hi',body:'Hello',audience:'all',texts:{}}]});assert.deepEqual(run.seen,['all']);
});

test('why a new group: on a portal "In the browser" shows, without its button (a review ask with no way to it)',async()=>{
 for(const portal of ['crazygames','kongregate']){
  const run=await play({portal,list:[{...REVIEW,audience:'browser'}]});
  assert.equal(run.shown.length,1,portal);assert.doesNotMatch(run.shown[0],/data-popup-go|trustpilot\.com"/,portal);
  assert.match(run.shown[0],/<button type="button" class="primary-button" data-popup-close>Got it<\/button>$/,portal);
 }
});

// The pop-up rule of every game version before the website group, word for word: 26 Sep 2026 (542fe31), 26 Sep to 9 Oct (3f29fc3 to
// cc1f2c8) and 9 Oct 2026 with the Android app group (ad09428 to b822b88).
const OLD=[
 ['{installed,phone}','return audience===\'all\'||(audience===\'no_app\'&&!installed)||(audience===\'phone\'&&phone)||(audience===\'desktop\'&&!phone);'],
 ['{installed,phone}','return audience===\'all\'||(audience===\'browser\'&&!installed)||(audience===\'phone_browser\'&&phone&&!installed)||(audience===\'phone\'&&phone)||(audience===\'desktop\'&&!phone);'],
 ['{installed,phone,playApp=false}','return audience===\'all\'||(audience===\'browser\'&&!installed)||(audience===\'phone_browser\'&&phone&&!installed)||(audience===\'phone\'&&phone)||(audience===\'desktop\'&&!phone)||(audience===\'android_app\'&&playApp===true);']
],OLD_RULES=OLD.map(([device,body])=>new Function('audience',device,body));
test('a game from before the website group (a portal or an app left open) never shows its pop-up, on any device',()=>{
 for(const old of OLD_RULES){
  for(const device of [{installed:true,phone:true,playApp:true},{installed:false,phone:true},{installed:false,phone:false},{installed:true,phone:false}])
   assert.equal(old('web',device),false,JSON.stringify(device));
  assert.equal(old('all',{installed:false,phone:false}),true,'the old rule itself, as it was');
 }
 assert.match(read('src/popup-ui.js'),/const popup=\(list\?\?\[\]\)\.find\(p=>fitsDevice\(p\.audience,device\(\)\)\);if\(!popup\)return;/,'skipped, so never marked as seen: the farmer gets it after the update');
 const today=/export function fitsDevice\(audience,\{installed,phone,playApp=false,web=false\}\)\{\n (return [^\n]+)\n\}/.exec(read('src/popup-ui.js'))[1];
 assert.equal(today.replace("||(audience==='web'&&web===true)",''),OLD[2][1],'the rule of 9 Oct 2026 is today\'s without the website group');
});

test('the database: the group in the table\'s check and in popup_post, changed in place from its live text; a pop-up only; no offer',()=>{
 const sql=read('supabase/popup-web.sql'),before=read('supabase/popup-android-app.sql');
 assert.match(sql,/add constraint popups_audience_check check \(audience in \('all','browser','phone_browser','phone','desktop','android_app','web'\)\);/);
 const old=/old text:=\$o\$(.*?)\$o\$;/.exec(sql)[1];
 assert.equal(/new text:=\$n\$(.*?)\n/.exec(before)[1],old,'the line it replaces is popup_post\'s own after popup-android-app.sql (as live on 9 Oct 2026)');
 assert.match(sql,/new text:=\$n\$ if who not in \('all','browser','phone_browser','phone','desktop','android_app','web'\) then raise exception 'Choose who sees it\.' using errcode='22023'; end if;\n if who='web' and coalesce\(p_news,true\) then raise exception 'Send it to the website as a pop-up only: a notification would reach every farmer\.' using errcode='22023'; end if;\$n\$;/);
 assert.match(sql,/pg_get_functiondef\('public\.popup_post\(text,text,text,text,text,integer,integer,boolean,jsonb\)'::regprocedure\)/,'the live definition');
 assert.match(sql,/if position\('''web''' in d\)>0 then return; end if;/,'re-runnable');
 assert.doesNotMatch(before,/'web'/,'nothing in popup_post said web before');
 assert.match(sql,/<>1 then raise exception 'popup_post is not as expected/,'stops when the live text differs');
 assert.doesNotMatch(read('supabase/special-offer.sql'),/'web'/,'no offer for the group');
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/<select id="admin-offer-audience">'\+Object\.entries\(POPUP_AUDIENCES\)\.filter\(\(\[key\]\)=>key!=='android_app'&&key!=='web'\)/,'the offer form leaves it out');
 assert.match(admin,/<select id="admin-popup-audience">'\+Object\.entries\(POPUP_AUDIENCES\)\.map/,'the pop-up form has it');
 for(const text of [sql,read('src/popup-ui.js'),read('src/admin-dashboard.js').split('admin-popup-note">Every farmer')[1].split('</p>')[0]])assert.doesNotMatch(text,/ · /,'no middle dots');
});
