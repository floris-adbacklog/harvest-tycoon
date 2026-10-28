import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fitsDevice,createPopupUI,POPUP_AUDIENCES} from '../src/popup-ui.js';
import {PORTAL_FEATURES} from '../public/portal.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Pop-ups for CrazyGames players (12 Oct 2026, supabase/popup-crazygames.sql), first for the notice that the game leaves CrazyGames.
// The harness is popup-web.test.mjs's (9 Oct 2026, the website group): harvesttycoon.com in a browser or on the
// home screen, itch.io's frame too; never in our Android, iPhone or Galaxy Store app, never on a game portal: CrazyGames, Kongregate or
// Discord (Oct 2026; no links out there). The user agents the apps send (public/android-app.js).
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
// A portal as src/crazygames.js, src/kongregate-page.js and src/discord-page.js hand it to the farm (bridge.portal): every feature off.
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

const LEAVING={id:'leaving-crazygames',title:'Harvest Tycoon is leaving CrazyGames',body:'Want to keep your farm? Tap Feedback below.',buttonLabel:'Feedback',buttonTarget:'feedback',audience:'crazygames',texts:{}};

test('the CrazyGames group: its name, and only a real crazygames flag shows it; the other groups stay as they were',()=>{
 assert.equal(POPUP_AUDIENCES.crazygames,'CrazyGames players');
 const cg={installed:false,phone:true,web:false,crazygames:true},web={installed:false,phone:true,web:true},app={installed:true,phone:true,playApp:true,web:false},other={installed:false,phone:false,web:false};
 assert.deepEqual([cg,web,app,other].map(d=>fitsDevice('crazygames',d)),[true,false,false,false]);
 assert.equal(fitsDevice('crazygames',{installed:false,phone:false,crazygames:'yes'}),false,'only a real true');
 assert.equal(fitsDevice('crazygames',{installed:false,phone:false}),false,'the special offer passes no crazygames: never there');
 // 26 Oct 2026 (the final Basic Launch): inside CrazyGames only its own group; a pop-up for everyone often points elsewhere.
 assert.deepEqual(['all','browser','phone','desktop','phone_browser','web','android_app','phone_web'].map(a=>fitsDevice(a,cg)),[false,false,false,false,false,false,false,false],'on CrazyGames no other group');
 assert.deepEqual(['all','browser','desktop'].map(a=>fitsDevice(a,other)),[true,true,true],'elsewhere the other groups are as before');
});

test('the leaving notice opens on CrazyGames (phone and computer), once, and nowhere else',async()=>{
 for(const [ua,coarse] of [[CHROME,true],[DESKTOP,false]]){
  const run=await play({ua,coarse,portal:'crazygames',list:[LEAVING]});
  assert.equal(run.shown.length,1,ua);assert.deepEqual(run.seen,['leaving-crazygames'],ua);
  assert.match(run.shown[0],/Harvest Tycoon is leaving CrazyGames/);
 }
 for(const portal of ['kongregate','discord']){const run=await play({portal,list:[LEAVING]});assert.deepEqual([run.shown.length,run.seen],[0,[]],portal);}
 for(const options of [{ua:CHROME},{ua:DESKTOP,coarse:false},{ua:IOS_SAFARI},{ua:CHROME,standalone:true},{ua:DESKTOP,coarse:false,itch:true},{ua:PLAY_12},{ua:GALAXY},{ua:IOS_APP_11}]){
  const run=await play({...options,list:[LEAVING]});assert.deepEqual([run.shown.length,run.seen],[0,[]],JSON.stringify(options));
 }
});

test('a game from before the CrazyGames group never shows it (left unseen until the site is pushed)',()=>{
 const before=new Function('audience','{installed,phone,playApp=false,web=false}',"return audience==='all'||(audience==='browser'&&!installed)||(audience==='phone_browser'&&phone&&!installed)||(audience==='phone'&&phone)||(audience==='desktop'&&!phone)||(audience==='android_app'&&playApp===true)||(audience==='web'&&web===true);");
 for(const device of [{installed:false,phone:true},{installed:false,phone:false},{installed:true,phone:true,playApp:true}])assert.equal(before('crazygames',device),false);
 const today=/export function fitsDevice\(audience,\{installed,phone,playApp=false,web=false,crazygames=false\}\)\{\n if\(crazygames===true\)return audience==='crazygames';\n (return [^\n]+)\n\}/.exec(read('src/popup-ui.js'))[1];
 assert.equal(today.replace("||(audience==='crazygames'&&crazygames===true)",'').replace("||(audience==='phone_web'&&phone&&web===true&&!installed)",''),"return audience==='all'||(audience==='browser'&&!installed)||(audience==='phone_browser'&&phone&&!installed)||(audience==='phone'&&phone)||(audience==='desktop'&&!phone)||(audience==='android_app'&&playApp===true)||(audience==='web'&&web===true);",'today\'s rule is the 9 Oct one plus the CrazyGames group');
 assert.match(read('src/popup-ui.js'),/crazygames:portal\(win\)\?\.name==='crazygames'\}\);/,'decided by the portal around the farm');
});

test('the database: the group in the table\'s check and in popup_post, from its live text after popup-web.sql; a pop-up only; no offer',()=>{
 const sql=read('supabase/popup-crazygames.sql'),before=read('supabase/popup-web.sql');
 assert.match(sql,/add constraint popups_audience_check check \(audience in \('all','browser','phone_browser','phone','desktop','android_app','web','crazygames'\)\);/);
 const old=/old text:=\$o\$(.*?)\$o\$;/.exec(sql)[1];
 assert.equal(/new text:=\$n\$(.*?)\n/.exec(before)[1],old,'the line it replaces is popup_post\'s own after popup-web.sql (as live on 12 Oct 2026)');
 assert.match(sql,/if who='crazygames' and coalesce\(p_news,true\) then raise exception 'Send it to CrazyGames players as a pop-up only/);
 assert.match(sql,/if position\('''crazygames''' in d\)>0 then return; end if;/,'re-runnable');
 assert.match(sql,/<>1 then raise exception 'popup_post is not as expected/,'stops when the live text differs');
 assert.doesNotMatch(read('supabase/special-offer.sql'),/'crazygames'/,'no offer for the group');
 assert.match(read('src/admin-dashboard.js'),/<select id="admin-offer-audience">'\+Object\.entries\(POPUP_AUDIENCES\)\.filter\(\(\[key\]\)=>key!=='android_app'&&key!=='web'&&key!=='crazygames'(&&key!=='phone_web')?\)/,'the offer form leaves it out');
 for(const text of [sql,read('src/popup-ui.js')])assert.doesNotMatch(text,/ · /,'no middle dots');
});
