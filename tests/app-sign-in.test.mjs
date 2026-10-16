import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {appSignIn,androidApp,appStoreBilling} from '../public/android.js';
import {usableProviders} from '../src/social-login.js';
import {APP_SIGN_IN,APP_SIGN_IN_ORIGIN,APP_SIGN_IN_AUTH_HOST,APP_OAUTH_PROVIDERS,APP_SIGN_IN_WAIT_MS,APP_SIGN_IN_REFUSED_MS,appOAuthLink,appAppleLink,appAuthorizeUrl,appleNonce,sha256Hex,readAppSignIn,waitForAppSignIn} from '../src/app-sign-in.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const settle=async()=>{for(let n=0;n<20;n++)await Promise.resolve();};

// Every sign-in in the iPhone app (16 Oct 2026, the owner; contract "AppSignIn/1"): only the iPhone app 1.3 and later says
// " AppSignIn/1" after its own token. The live apps (1.1, 1.2), the Android apps, every browser and every portal stay exactly as they were.
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const UA={
 ios13:`${IPHONE} HarvestTycoonApp/1.3 AppStoreBilling/1 AppSignIn/1`,
 ios13ipad:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) HarvestTycoonApp/1.3 AppStoreBilling/1 AppSignIn/1',
 ios10:`${IPHONE} HarvestTycoonApp/1.0`,
 ios11:`${IPHONE} HarvestTycoonApp/1.1 AppStoreBilling/1`,
 ios12:`${IPHONE} HarvestTycoonApp/1.2 AppStoreBilling/1`,
 android:'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.70 Mobile Safari/537.36 HarvestTycoonApp/1.3 PlayBilling/1',
 androidToken:'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.70 Mobile Safari/537.36 HarvestTycoonApp/1.3 PlayBilling/1 AppSignIn/1',
 galaxy:'Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 HarvestTycoonApp/1.2 WebBilling/1',
 safari:`${IPHONE.replace('Mobile/15E148','Version/18.0 Mobile/15E148')} Safari/604.1`,
 safariToken:`${IPHONE.replace('Mobile/15E148','Version/18.0 Mobile/15E148')} Safari/604.1 AppSignIn/1`,
 desktop:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
 windows:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
 facebookIphone:`${IPHONE} [FBAN/FBIOS;FBAV/470.0.0.40.97;FBBV/620000000;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.0]`,
 facebookToken:`${IPHONE} [FBAN/FBIOS;FBAV/470.0.0.40.97] AppSignIn/1`,
 instagramIphone:`${IPHONE} Instagram 337.0.0.0.0 (iPhone15,2; iOS 18_0; nl_NL)`,
 tiktokAndroid:'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 musical_ly_2023 BytedanceWebview/d8a21c6',
 sloppy:`${IPHONE} HarvestTycoonApp/1.3 AppSignIn`,
 noSpace:`${IPHONE} HarvestTycoonApp/1.3xAppSignIn/1`
};

// public/android-app.js run as the browser runs it (as tests/android-app.test.mjs does): the marks it leaves on <html>.
const element=(attrs={})=>({attrs,getAttribute:name=>attrs[name]??null,hasAttribute:name=>name in attrs,setAttribute(name,value){attrs[name]=String(value);}});
function mark({ua,parent=null,own={}}){
 const html=element({...own}),window={};
 window.parent=parent?{document:{documentElement:parent}}:window;
 vm.runInNewContext(read('public/android-app.js'),{window,document:{documentElement:html},navigator:{userAgent:ua},location:{search:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}});
 return {attrs:html.attrs,rule:window.harvestAppSignInApp};
}

test('the token counts only in our iPhone app: 1.3 with " AppSignIn/1"; the live 1.0 to 1.2, Android, Galaxy, Safari, computers and in-app browsers never',()=>{
 const yes=['ios13','ios13ipad'],no=Object.keys(UA).filter(key=>!yes.includes(key));
 for(const key of yes){const page=mark({ua:UA[key]});assert.equal(page.rule(UA[key]),true,key);assert.equal(page.attrs['data-app-sign-in'],'',key);assert.equal(page.attrs['data-app-os'],'ios',key);}
 for(const key of no){const page=mark({ua:UA[key]});assert.equal(page.rule(UA[key]),false,key);assert.equal(page.attrs['data-app-sign-in'],undefined,key);}
 // The live iPhone app keeps everything else it had: the app, iOS, the App Store's purchases.
 for(const key of ['ios11','ios12','ios13'])assert.equal(mark({ua:UA[key]}).attrs['data-app-store-billing'],'',key);
 assert.equal(mark({ua:UA.ios13}).attrs['data-app'],'android','the same app mark as before');
 // The rule on its own, as the other app rules are read in tests/android-app.test.mjs.
 const src=read('public/android-app.js'),rule=new Function(`${src.match(/function iosApp\(ua\)\{[^\n]*\}/)[0]}\n${src.match(/function appSignInApp\(ua\)\{[^\n]*\}/)[0]}\nreturn appSignInApp;`)();
 for(const [key,ua] of Object.entries(UA))assert.equal(rule(ua),['ios13','ios13ipad'].includes(key),key);
 assert.equal(rule(''),false);assert.equal(rule(undefined),false);
});

test('the mark is the page around the game only: the game frame asks it; never inside a portal\'s page',()=>{
 const top=mark({ua:UA.ios13});assert.equal(top.attrs['data-app-sign-in'],'');
 const frame=mark({ua:UA.ios13,parent:element({...top.attrs})});
 assert.equal(frame.attrs['data-app-os'],'ios','the frame is the app as before');assert.equal(frame.attrs['data-app-sign-in'],undefined,'nobody in the frame reads it');
 assert.equal(mark({ua:UA.ios13,parent:element({'data-portal':'crazygames'})}).attrs['data-app-sign-in'],undefined,'inside CrazyGames');
 assert.equal(mark({ua:UA.ios13,own:{'data-portal':'kongregate'}}).attrs['data-app-sign-in'],undefined,'a portal page itself');
 // appSignIn(): this page or the page around the frame is marked; anything unreadable is not.
 const page=attrs=>({document:{documentElement:element(attrs)}});
 const app={'data-app':'android','data-app-os':'ios','data-app-store-billing':'','data-app-billing':''};
 assert.equal(appSignIn(page({...app,'data-app-sign-in':''})),true);assert.equal(appSignIn(page(app)),false,'the iPhone app 1.2');
 assert.equal(appSignIn(page({'data-app':'android','data-play-billing':''})),false,'the Android app');assert.equal(appSignIn(page({})),false,'a browser');
 assert.equal(appSignIn({parent:page({...app,'data-app-sign-in':''}),document:{documentElement:element({'data-app':'android','data-app-os':'ios'})}}),true,'the game frame');
 assert.equal(appSignIn({get parent(){throw new Error('cross-origin');},document:{documentElement:element({})}}),false);
 assert.equal(appSignIn(undefined),false);assert.equal(androidApp(undefined),false);assert.equal(appStoreBilling(undefined),false);
});

test('the buttons: the iPhone app 1.3 gets the website\'s list with the website\'s rules, Apple always included; every other app none, as before',()=>{
 const all=['google','facebook','apple','discord'];
 assert.deepEqual(usableProviders(all,UA.ios13,true,{nativeSignIn:true}),all,'iPhone app 1.3');
 assert.deepEqual(usableProviders(all,UA.ios13ipad,true,{nativeSignIn:true}),all,'iPad app 1.3 (it says Macintosh)');
 assert.deepEqual(usableProviders(all,UA.ios13,true,{nativeSignIn:true,fromAd:true}),['google','facebook','apple'],'from an ad: no Discord; Apple always next to Google/Facebook (4.8)');
 assert.deepEqual(usableProviders(['google','apple','discord'],UA.ios13,true,{nativeSignIn:true}),['google','apple','discord'],'only what Supabase has on');
 assert.deepEqual(usableProviders(['google','discord'],UA.ios13,true,{nativeSignIn:true}),[],'Apple off in Supabase: no button without Apple\'s, email only (4.8)');
 assert.deepEqual(usableProviders(['google','discord'],UA.safari,false),['google','discord'],'the website keeps its list without Apple');
 // App Review guideline 4.8 (16 Oct 2026, the lead): in the app 1.3 every list that shows Google or Facebook (or Discord) shows Apple,
 // whatever Supabase has on, ad visit or not.
 const subsets=[...Array(16).keys()].map(bits=>all.filter((_,i)=>bits&1<<i));
 for(const fromAd of [false,true])for(const key of ['ios13','ios13ipad'])for(const list of subsets){
  const shown=usableProviders(list,UA[key],true,{nativeSignIn:true,fromAd});
  if(list.includes('apple')&&(list.includes('google')||list.includes('facebook')))assert.ok(shown.includes('apple'),`${key} ${list} fromAd=${fromAd}: ${shown}`);
  assert.ok(!shown.length||shown.includes('apple'),`${key} ${list} fromAd=${fromAd}: never without Apple (${shown})`);
 }
 for(const key of ['ios10','ios11','ios12','android','androidToken','galaxy'])assert.deepEqual(usableProviders(all,UA[key],true,{nativeSignIn:false}),[],key);
 assert.deepEqual(usableProviders(all,UA.ios12,true),[],'without the mark (here: no page at all) the old rule');
 assert.deepEqual(usableProviders(all,UA.safari,false),all,'Safari on an iPhone, unchanged');
 assert.deepEqual(usableProviders(all,UA.windows,false),['google','facebook','discord'],'no Apple off Apple devices, unchanged');
 assert.deepEqual(usableProviders(all,UA.facebookIphone,false),['facebook'],'in Facebook\'s browser, unchanged');
 // The page asks with the mark (src/main.js passes nothing: the default reads <html data-app-sign-in>).
 assert.match(read('src/social-login.js'),/export const usableProviders=\(list,userAgent,app=androidApp\(\),\{fromAd=false,nativeSignIn=appSignIn\(\)\}=\{\}\)=>app&&!nativeSignIn\?\[\]:/);
 assert.match(read('src/main.js'),/\(inApp&&!nativeSignIn\?Promise\.resolve\(\[\]\):socialProviders\(\)\)\.then\(list=>\{providers=usableProviders\(list,navigator\.userAgent,undefined,\{fromAd:adVisit\(pendingSource\)\}\);/);
 // The second lock in the styles lets the iPhone app 1.3's buttons through, and the help page's card about them.
 assert.match(read('public/welcome.css'),/html\[data-app=android\]:not\(\[data-app-sign-in\]\) #social-login,html\[data-app=android\]:not\(\[data-app-sign-in\]\) \.social-button,html\[data-app=android\] \.browser-tip\{display:none!important\}/);
 assert.match(read('public/support.css'),/html\[data-app\]:not\(\[data-app-sign-in\]\) \.support-social\{display:none\}/);
});

// The authorize address as supabase-js 2.116 makes it with skipBrowserRedirect (16 Oct 2026, node, no request): back to the website's
// return page on www with the query a browser sign-in carries.
const AUTHORIZE='https://jnmdirvidffzxukbdmij.supabase.co/auth/v1/authorize?provider=google&redirect_to=https%3A%2F%2Fwww.harvesttycoon.com%2Fplay.html%3Fsrc%3Dios-app%26utm_campaign%3Da%2Bb%26rd%3Dnone';
test('the addresses for the app: provider and the authorize address, each encoded in full; no return address and no custom scheme any more',()=>{
 assert.equal(APP_SIGN_IN.oauth,'appsignin://oauth');assert.equal(APP_SIGN_IN.apple,'appsignin://apple');
 assert.equal(APP_SIGN_IN_ORIGIN,'https://www.harvesttycoon.com');assert.equal(APP_SIGN_IN_AUTH_HOST,'jnmdirvidffzxukbdmij.supabase.co');
 assert.deepEqual([...APP_OAUTH_PROVIDERS],['google','facebook','discord']);
 const link=appOAuthLink({provider:'google',url:AUTHORIZE});
 assert.equal(link,'appsignin://oauth?provider=google&url=https%3A%2F%2Fjnmdirvidffzxukbdmij.supabase.co%2Fauth%2Fv1%2Fauthorize%3Fprovider%3Dgoogle%26redirect_to%3Dhttps%253A%252F%252Fwww.harvesttycoon.com%252Fplay.html%253Fsrc%253Dios-app%2526utm_campaign%253Da%252Bb%2526rd%253Dnone');
 const parsed=new URL(link);assert.deepEqual([...parsed.searchParams.keys()],['provider','url'],'16 Oct 2026: no return=, the sheet ends on the return page itself');
 assert.equal(parsed.searchParams.get('url'),AUTHORIZE,'read back unchanged');
 assert.equal(appOAuthLink({provider:'google',url:AUTHORIZE,back:'https://evil.example/'}),link,'a return address is never sent');
 const hash='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
 assert.equal(appAppleLink(hash),`appsignin://apple?nonce=${hash}`);
 // The custom scheme is gone everywhere on the website (the owner, 16 Oct 2026: any app could register it and catch a session).
 for(const path of ['src/app-sign-in.js','src/main.js','src/social-login.js','public/android.js','public/android-app.js'])assert.doesNotMatch(read(path).replace(/^\/\/.*$/gm,''),/harvesttycoon:\/\//,path);
 assert.doesNotMatch(read('src/app-sign-in.js'),/APP_SIGN_IN_CALLBACK|return=/);
});

test('only our Supabase project\'s authorize address, back to the website\'s return page on www, goes to the app',()=>{
 const back=value=>AUTHORIZE.replace(/redirect_to=[^&]*/,`redirect_to=${encodeURIComponent(value)}`);
 for(const ok of [AUTHORIZE,`${AUTHORIZE}&skip_http_redirect=true`,back('https://www.harvesttycoon.com/play.html'),back('https://www.harvesttycoon.com/play.html?rd=none'),
  AUTHORIZE.replace('provider=google','provider=discord'),`https://${APP_SIGN_IN_AUTH_HOST}/auth/v1/authorize?redirect_to=${encodeURIComponent('https://www.harvesttycoon.com/play.html?a=1&b=2')}&provider=facebook`])
  assert.equal(appAuthorizeUrl(ok),true,ok);
 for(const bad of [AUTHORIZE.replace('https:','http:'),AUTHORIZE.replace('/auth/v1/authorize','/auth/v1/authorizex'),AUTHORIZE.replace('/auth/v1/authorize','/auth/v1/token'),
  AUTHORIZE.replace('jnmdirvidffzxukbdmij.supabase.co','evil.example'),AUTHORIZE.replace('jnmdirvidffzxukbdmij.supabase.co','abcdefghijklmnopqrst.supabase.co'),
  AUTHORIZE.replace('supabase.co','supabase.co.evil.example'),AUTHORIZE.replace('https://','https://user:pw@'),AUTHORIZE.replace('.co/','.co:8443/'),
  // redirect_to: exactly one, and exactly the return page on www.
  AUTHORIZE.replace(/&redirect_to=[^&]*/,''),`${AUTHORIZE}&redirect_to=${encodeURIComponent('https://www.harvesttycoon.com/play.html')}`,
  back('harvesttycoon://auth-callback'),back('HarvestTycoon://auth-callback'),back('appsignin://oauth'),back('javascript:alert(1)'),
  back('http://www.harvesttycoon.com/play.html'),back('https://harvesttycoon.com/play.html'),back('https://www.harvesttycoon.com.evil.example/play.html'),
  back('https://www.harvesttycoon.com:8443/play.html'),back('https://user@www.harvesttycoon.com/play.html'),back('https://www.harvesttycoon.com/'),
  back('https://www.harvesttycoon.com/play.html/x'),back('https://www.harvesttycoon.com/play.htmlx'),back('https://www.harvesttycoon.com/es/play.html'),
  back('https://www.harvesttycoon.com/play.html#'),back('https://www.harvesttycoon.com/play.html#access_token=x'),back('https://www.harvesttycoon.com/play.html?a=1#x'),
  back('https://www.harvesttycoon.com/play.html?a=\\x'),back('https://www.harvesttycoon.com/play.html?a= b'),back('https://WWW.harvesttycoon.com/play.html'),
  back('https://www.harvesttycoon.com\\play.html'),back(''),
  '','not a url',null,undefined,42])assert.equal(appAuthorizeUrl(bad),false,String(bad));
});

test('Apple\'s nonce: 32 random bytes as 64 hex characters, and SHA-256 as Supabase checks it',async()=>{
 const a=appleNonce(),b=appleNonce();
 assert.match(a,/^[0-9a-f]{64}$/);assert.notEqual(a,b,'fresh every time');
 // Known SHA-256 vectors (FIPS 180-2) and node's own for the nonce itself.
 assert.equal(await sha256Hex('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 assert.equal(await sha256Hex(''),'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
 assert.equal(await sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),'248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
 assert.equal(await sha256Hex(a),createHash('sha256').update(a).digest('hex'));assert.match(await sha256Hex(a),/^[0-9a-f]{64}$/,'what the app checks: ^[0-9a-f]{64}$');
 // A crypto that gives all zeros: exactly 64 zeros (the bytes are what the crypto gives).
 assert.equal(appleNonce({getRandomValues:bytes=>bytes}),'0'.repeat(64));
});

test('what the app answers, checked: apple with a token, cancelled, error with a known reason; anything else is no answer',()=>{
 const token='eyJraWQiOiJXNldjT0tCIiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL2FwcGxlaWQuYXBwbGUuY29tIn0.c2lnbmF0dXJl';
 assert.deepEqual(readAppSignIn({type:'apple',provider:'apple',token,name:'Floris'}),{type:'apple',provider:'apple',token},'the name is not kept');
 assert.deepEqual(readAppSignIn({type:'apple',provider:'apple',token,name:'',code:'c0de.0.ABCD'}),{type:'apple',provider:'apple',token,code:'c0de.0.ABCD'},'Apple\'s authorization code (app 1.3) is kept for farm-api, which revokes Apple\'s token when the account is deleted (tests/apple-sign-in-revoke.test.mjs)');
 for(const bad of [{type:'apple',provider:'google',token},{type:'apple',provider:'apple',token:'no-jwt'},{type:'apple',provider:'apple',token:`${token}<script>`},{type:'apple',provider:'apple',token:'a'.repeat(16400)+'.b.c'},{type:'apple',provider:'apple'},{type:'purchase'},{type:'prices'},null,undefined,'apple',42])
  assert.equal(readAppSignIn(bad),null,JSON.stringify(bad));
 assert.deepEqual(readAppSignIn({type:'cancelled',provider:'google'}),{type:'cancelled',provider:'google'});
 assert.deepEqual(readAppSignIn({type:'cancelled',provider:'twitter'}),{type:'cancelled',provider:''},'an unknown provider is none');
 assert.deepEqual(readAppSignIn({type:'error',provider:'facebook',reason:'busy'}),{type:'error',provider:'facebook',reason:'busy',code:null});
 assert.deepEqual(readAppSignIn({type:'error',provider:'apple',reason:'error',code:1001}),{type:'error',provider:'apple',reason:'error',code:1001});
 assert.deepEqual(readAppSignIn({type:'error',provider:'',reason:'invalid'}),{type:'error',provider:'',reason:'invalid',code:null});
 assert.deepEqual(readAppSignIn({type:'error',provider:'discord',reason:'<b>',code:'7'}),{type:'error',provider:'discord',reason:'error',code:null});
});

test('waiting for the answer: this provider\'s (or one that names none), installed once on the page, null after 20 minutes',async()=>{
 const win={},timers=[];const setTimer=(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimer=id=>{if(timers[id-1])timers[id-1].cleared=true;};
 const google=waitForAppSignIn('google',{win,setTimer,clearTimer});
 assert.equal(typeof win.harvestAppSignIn,'function');const answer=win.harvestAppSignIn;
 const apple=waitForAppSignIn('apple',{win,setTimer,clearTimer});assert.equal(win.harvestAppSignIn,answer,'installed once');
 assert.equal(timers[0].ms,APP_SIGN_IN_WAIT_MS);assert.equal(APP_SIGN_IN_WAIT_MS,20*60000);
 assert.equal(APP_SIGN_IN_REFUSED_MS,1500,'a cancel sooner than this is iOS refusing the sheet (src/main.js appSignInFlow)');
 let done=null;void google.then(value=>{done=value;});
 win.harvestAppSignIn({type:'cancelled',provider:'facebook'});win.harvestAppSignIn({type:'nonsense',provider:'google'});await settle();assert.equal(done,null,'not this one');
 win.harvestAppSignIn({type:'cancelled',provider:'google'});await settle();assert.deepEqual(done,{type:'cancelled',provider:'google'});assert.equal(timers[0].cleared,true);
 win.harvestAppSignIn({type:'error',provider:'',reason:'invalid'});assert.deepEqual(await apple,{type:'error',provider:'',reason:'invalid',code:null},'the app could not read the address');
 const late=waitForAppSignIn('discord',{win,setTimer,clearTimer});timers.at(-1).fn();assert.equal(await late,null,'no answer at all');
 win.harvestAppSignIn({type:'cancelled',provider:'discord'});assert.equal(win.harvestAppSignInHub.size,0,'nobody left listening');
 assert.doesNotThrow(()=>win.harvestAppSignIn(undefined));
});

test('texts: no new English on the page, the privacy policy says which iPhone app signs in how, and the comments say the rule',()=>{
 const policy=read('public/privacy.html');
 assert.match(policy,/<li><strong>Signing in:<\/strong> with your email address and password and, from version 1\.3 on iOS 17\.4 or later, also with Google, Facebook, Apple or Discord \(see <a href="#social-sign-in">section 3<\/a>\)\. Earlier versions, and version 1\.3 on older iOS versions, offer only your email address and password\.<\/li>/);
 assert.match(policy,/<p>This is not available in the Android app, in the iPhone app before version 1\.3 or on iOS older than 17\.4; there you sign in with your email address and password\. In the iPhone app from version 1\.3, Apple shows its own Sign in with Apple screen, and Google, Facebook and Discord open in your iPhone’s secure sign-in window, not inside the app\.<\/p>/);
 assert.match(policy,/<h3 id="android-app">[^]*?<li><strong>Signing in:<\/strong> only with your email address and password\. Signing in with Google or Facebook is not available in the app\.<\/li>/,'the Android app unchanged');
 assert.doesNotMatch(policy,/ · /);
 // The page's own words for it are the ones a browser sign-in has (translated already): "Opening {0}…" and oauthStartError's.
 const flow=/async function appSignInFlow\(provider\)\{[^]*?\n\}\n/.exec(read('src/main.js'))?.[0]??'';
 assert.ok(flow,'the flow is there');assert.doesNotMatch(flow,/textContent=['`"][A-Z]/,'no new sentence on screen');
 // A failure is counted with the app's own reason and code (app_error_1000, app_busy, app_timeout), which trackAuth keeps
 // (/^[a-z0-9_]{1,32}$/); what the farmer reads stays oauthStartError's.
 assert.match(flow,/code=Number\.isSafeInteger\(answer\?\.code\)&&answer\.code>=0\?`_\$\{answer\.code\}`:'';\n  throw Object\.assign\(new Error\(reason\),\{appReason:`app_\$\{reason\}\$\{code\}`\}\);/);
 assert.match(flow,/trackAuth\('error',\{mode,reason:error\?\.appReason\?\?problem\.reason,method:provider\}\);\$\('account-message'\)\.textContent=problem\.message;/);
 for(const reason of ['error','busy','invalid','timeout'])assert.match(`app_${reason}_${Number.MAX_SAFE_INTEGER}`,/^[a-z0-9_]{1,32}$/,reason);
 assert.match(read('src/social-login.js'),/Every sign-in in the iPhone app from 1\.3 \(16 Oct 2026, the owner/);
});

// The claimed https callback (16 Oct 2026, the owner): ASWebAuthenticationSession only lets an app catch https://www.harvesttycoon.com/
// play.html when that app is associated with the domain: Apple reads /.well-known/apple-app-site-association (webcredentials, Team ID
// QAXWA37ACQ, bundle com.harvesttycoon.app) over https, from www itself (harvesttycoon.com answers with a redirect, which Apple does not
// follow), as JSON with status 200 and no redirect. Vercel serves public/ as it is (framework null, scripts/build-static.mjs copies
// public/ into dist-static/ whole, dot folders included), so the one thing to add is the type: a file without an extension would go out
// as application/octet-stream.
// Vercel's source patterns as far as vercel.json uses them: :name(a|b), :name, (.*) and \. escapes.
const pattern=source=>new RegExp(`^${source.replace(/:(\w+)(\([^)]*\))?|\(([^)]*)\)|\\(.)|([.+*?^${}|[\]\\/])/g,(_,name,group,bare,escaped,special)=>
 name?(group?`(?:${group.slice(1,-1)})`:'([^/]+)'):bare!==undefined?`(?:${bare})`:escaped!==undefined?`\\${escaped}`:`\\${special}`)}$`);
test('/.well-known/apple-app-site-association: exactly the webcredentials of the iPhone app, served as JSON, never redirected or rewritten',()=>{
 const AASA='/.well-known/apple-app-site-association';
 assert.equal(readFileSync(new URL(`../public${AASA}`,import.meta.url),'utf8'),'{"webcredentials":{"apps":["QAXWA37ACQ.com.harvesttycoon.app"]}}');
 assert.deepEqual(JSON.parse(read(`public${AASA}`)),{webcredentials:{apps:['QAXWA37ACQ.com.harvesttycoon.app']}});
 const vercel=JSON.parse(read('vercel.json'));
 // The patterns as Vercel reads them (checked on the rules themselves first).
 assert.ok(pattern('/:lang(cs|de)/support').test('/de/support')&&!pattern('/:lang(cs|de)/support').test('/xx/support'));assert.ok(pattern('/(.*)\\.(js|css)').test('/a.js')&&!pattern('/(.*)\\.(js|css)').test('/ajs'));
 assert.ok(pattern('/wiki/:topic([a-z-]+)').test('/wiki/crops')&&pattern('/(.*)').test(AASA)&&!pattern('/(.*).html').test(AASA));
 const hits=rules=>rules.filter(rule=>pattern(rule.source).test(AASA));
 assert.deepEqual(hits(vercel.redirects),[],'no redirect');assert.deepEqual(hits(vercel.rewrites),[],'no rewrite');
 assert.equal(vercel.cleanUrls,false);assert.equal(vercel.trailingSlash,undefined);assert.equal(vercel.routes,undefined);assert.equal(vercel.functions,undefined);assert.equal(vercel.framework,null);
 assert.deepEqual(hits(vercel.headers).map(rule=>rule.source),[AASA,'/(.*)'],'its own rule and the site-wide nosniff');
 assert.deepEqual(vercel.headers.find(rule=>rule.source===AASA),{source:AASA,headers:[{key:'Content-Type',value:'application/json'}]});
 assert.deepEqual(hits(vercel.headers).flatMap(rule=>rule.headers.map(h=>h.key)).sort(),['Content-Type','X-Content-Type-Options']);
 // The static build copies public/ whole (no middleware, no server: Vercel builds only scripts/build-static.mjs into dist-static/).
 assert.equal(vercel.buildCommand,'npm run build:static');assert.equal(vercel.outputDirectory,'dist-static');
 assert.match(read('scripts/build-static.mjs'),/cpSync\('public','dist-static',\{recursive:true\}\);/);
 for(const file of ['middleware.js','middleware.ts','src/middleware.js','src/middleware.ts'])assert.throws(()=>read(file),{code:'ENOENT'},file);
 assert.doesNotMatch(read('.gitignore'),/well-known|^public\/?$/m);
});

// Sign in with Apple in the iPhone app 1.3 (16 Oct 2026, the owner; Apple's Human Interface Guidelines): first, on a row of its own
// (src/main.js), titled "Continue with Apple", logo and title both black on white with a thin black line, as tall as the others. Only
// under html[data-app-sign-in]: the website shows "Apple" in its two by two, exactly as before.
test('the Apple button in the iPhone app 1.3: "Continue with Apple", black on white with a black line; the website unchanged',()=>{
 const css=read('public/welcome.css'),rules=[...css.replace(/\/\*[^]*?\*\//g,'').matchAll(/([^{}]+)\{([^}]*)\}/g)].map(([,selector,body])=>({selector:selector.trim(),body}));
 const apple=rules.filter(rule=>/data-provider=apple|social-apple-title/.test(rule.selector));
 assert.deepEqual(apple.map(rule=>rule.selector),['.social-apple-title','html[data-app-sign-in] .social-button[data-provider=apple]','html[data-app-sign-in] .social-button[data-provider=apple] span:not(.social-apple-title)','html[data-app-sign-in] .social-apple-title']);
 assert.equal(apple[0].body,'display:none','the website: the title stays hidden');
 for(const rule of apple.slice(1))assert.ok(rule.selector.split(',').every(part=>part.startsWith('html[data-app-sign-in] ')),rule.selector);
 assert.equal(apple[1].body,'border-color:#000;background:#fff;color:#000;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;font-weight:600');
 assert.equal(apple[2].body,'display:none');assert.equal(apple[3].body,'display:inline');
 // As tall as the others: nothing in the app's rules touches the height, the padding or the font size (.social-button's 44px, 8px 12px, 14px).
 for(const rule of apple)assert.doesNotMatch(rule.body,/height|padding|font-size|font:|margin/,rule.selector);
 assert.match(css,/\.social-button\{width:100%;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:8px 12px;border:1px solid #e2d9cf;border-radius:11px;background:#fff;color:#3d3923;font:700 14px 'DM Sans',system-ui,sans-serif;/);
 // Nothing else in the styles knows the app's sign-in mark but the two locks that let its buttons through.
 assert.deepEqual(rules.filter(rule=>/data-app-sign-in/.test(rule.selector)&&!apple.includes(rule)).map(rule=>rule.selector),['html[data-app=android]:not([data-app-sign-in]) #social-login,html[data-app=android]:not([data-app-sign-in]) .social-button,html[data-app=android] .browser-tip']);
 // The page: the logo (black, #000), "Apple" for the website and the title for the app, both texts translated like the aria-label.
 const page=read('public/play.html'),button=/<button type="button" class="social-button" data-provider="apple"[^]*?<\/button>/.exec(page)[0];
 assert.match(button,/aria-label="Continue with Apple"/);assert.match(button,/<path fill="#000" /);assert.equal((button.match(/fill="/g)??[]).length,1,'one colour: black');
 assert.match(button,/<\/svg><span>Apple<\/span><span class="social-apple-title">Continue with Apple<\/span><\/button>$/);
 // One of the three titles Apple allows, in every language the game has: the runtime (public/i18n.js) translates a text in a hidden
 // span like any other, and the language pages (scripts/build-languages.mjs) need an exact translation of every play.html text.
 assert.equal(JSON.parse(read('i18n/catalog.json'))['Continue with Apple'],'public/play.html');
 const languages=readdirSync(new URL('../public/i18n/',import.meta.url)).filter(name=>/^[a-z]{2}\.json$/.test(name));
 assert.ok(languages.length>=15,languages.join());
 for(const name of languages){const out=JSON.parse(read(`public/i18n/${name}`))['Continue with Apple'];assert.ok(typeof out==='string'&&/Apple/.test(out),`${name}: ${out}`);}
});
