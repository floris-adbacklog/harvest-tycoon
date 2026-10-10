import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enabledProviders,oauthStartError,oauthReturnMessage,SOCIAL_PROVIDERS} from '../src/social-login.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const reply=(body,ok=true)=>async()=>({ok,json:async()=>body});

test('only the providers switched on in Supabase get a button; any problem shows none',async()=>{
 assert.deepEqual(Object.keys(SOCIAL_PROVIDERS),['google','facebook','apple','discord']);
 assert.deepEqual(await enabledProviders({url:'https://x.supabase.co/',key:'k',fetchImpl:reply({external:{google:true,facebook:false,github:true}})}),['google']);
 assert.deepEqual(await enabledProviders({url:'https://x.supabase.co',key:'k',fetchImpl:reply({external:{google:true,facebook:true}})}),['google','facebook']);
 assert.deepEqual(await enabledProviders({url:'u',key:'k',fetchImpl:reply({},false)}),[]);
 assert.deepEqual(await enabledProviders({url:'u',key:'k',fetchImpl:async()=>{throw new Error('offline');}}),[]);
 assert.deepEqual(await enabledProviders({url:'',key:'k'}),[]);
 let asked;await enabledProviders({url:'https://x.supabase.co/',key:'anon',fetchImpl:async(url,options)=>{asked={url,options};return {ok:true,json:async()=>({})};}});
 assert.equal(asked.url,'https://x.supabase.co/auth/v1/settings');assert.equal(asked.options.headers.apikey,'anon');
});

test('sign-in problems with Google or Facebook are explained in plain English',()=>{
 assert.match(oauthStartError({message:'Unsupported provider: provider is not enabled'},'google').message,/^Signing in with Google is not available right now/);
 assert.equal(oauthStartError({message:'Failed to fetch'},'facebook').reason,'network');
 assert.match(oauthStartError({message:'???'},'facebook').message,/^We could not open Facebook/);
 assert.equal(oauthReturnMessage('google'),'Signing in with Google did not work. Please try again, or use your email address.');
});

test('the buttons are compact, English, hidden until a provider is on, and only on the sign-in and sign-up cards',()=>{
 const html=read('public/play.html'),main=read('src/main.js');
 assert.match(html,/<div id="social-login" class="social-login" hidden>/);
 assert.match(html,/data-provider="google" aria-label="Continue with Google" hidden>/);assert.match(html,/data-provider="facebook" aria-label="Continue with Facebook" hidden>/);assert.match(html,/data-provider="discord" aria-label="Continue with Discord" hidden>/,'Discord after Facebook (10 Oct 2026)');
 assert.match(html,/<span>or use your email<\/span>/);
 assert.match(main,/\$\('social-login'\)\.hidden=!providers\.length\|\|!\['signin','register'\]\.includes\(mode\)/);
 assert.match(main,/signInWithOAuth\(\{provider,options:\{redirectTo:redirectUrl\(true\)\}\}\)/);
});

test('the privacy policy and the deletion page are public, linked from the sign-in card and the footer, and load no tracking',()=>{
 const html=read('public/play.html'),vercel=JSON.parse(read('vercel.json'));
 assert.match(html,/class="account-legal">For players aged 16 and over\. <a href="\/privacy">Privacy Policy<\/a>/);
 assert.match(html,/<footer class="site-legal">.*href="\/privacy"/);assert.ok(!/<footer class="site-legal">[^\n]*delete-account/.test(html),'the deletion page is for Meta, not the footer');
 assert.deepEqual(vercel.rewrites.filter(r=>!r.source.endsWith('/')).map(r=>[r.source,r.destination]),[['/partners','/partners.html'],['/privacy','/privacy.html'],['/delete-account','/delete-account.html'],['/support','/support.html'],['/app','/app.html'],['/wiki','/wiki/index.html'],['/wiki/:topic([a-z-]+)','/wiki/:topic.html'],
  ['/:lang(cs|de|es|fr|id|hu|nl|pt|tr|ru|uk|hi|ja|ar|zh)/support','/:lang/support.html'],['/:lang(cs|de|es|fr|id|hu|nl|pt|tr|ru|uk|hi|ja|ar|zh)/app','/:lang/app.html']]);
 for(const page of ['public/privacy.html','public/delete-account.html']){
  const text=read(page);
  // Only our own app mark (public/android-app.js, Oct 2026: the footer's Google Play badge steps aside in the Android app); no tracking.
  assert.ok(!/googletagmanager|gtag\(|fbq\(/i.test(text)&&!/<script/i.test(text.replace('<script src="/android-app.js"></script>','')),`${page} loads no scripts but the app mark`);
  assert.match(text,/info@harvesttycoon\.com/);assert.doesNotMatch(text,/floris@millstone/);assert.match(text,/89795857/);assert.match(text,/<html lang="en">/);
 }
});

test('unknown pages get a friendly 404 in the same style, with the way back and no tracking',()=>{
 const html=read('public/404.html');
 assert.match(html,/<meta name="robots" content="noindex">/);assert.match(html,/<a class="legal-button nf-button" href="\/">Back to the farm<\/a>/);
 assert.ok(!/<script/i.test(html.replace('<script src="/android-app.js"></script>','')),'no scripts but the app mark');assert.match(html,/href="\/legal\.css"/,'absolute paths, so it works at any depth');
});

test('inside the Facebook, Instagram or other in-app browsers the Google button is left out; elsewhere both stay',async()=>{
 const {embeddedBrowser,usableProviders}=await import('../src/social-login.js');
 const ua={
  facebookIos:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.97;FBBV/620000000;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/nl_NL;FBOP/5]',
  instagramAndroid:'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.71 Mobile Safari/537.36 Instagram 337.0.0.35.102 Android',
  androidWebView:'Mozilla/5.0 (Linux; Android 13; SM-S911B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0 Mobile Safari/537.36',
  chromeIphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  safariIphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  homeScreenIphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  chromeAndroid:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  desktop:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
 };
 for(const key of ['facebookIos','instagramAndroid','androidWebView']){assert.equal(embeddedBrowser(ua[key]),true,key);assert.deepEqual(usableProviders(['google','facebook'],ua[key]),['facebook'],key);}
 for(const key of ['chromeIphone','safariIphone','homeScreenIphone','chromeAndroid','desktop']){assert.equal(embeddedBrowser(ua[key]),false,key);assert.deepEqual(usableProviders(['google','facebook'],ua[key]),['google','facebook'],key);}
 assert.match(read('src/main.js'),/providers=usableProviders\(list,navigator\.userAgent,undefined,\{fromAd:adVisit\(pendingSource\)\}\)/);
 // Two by two, the last of an odd number across the row (10 Oct 2026).
 assert.match(read('src/main.js'),/if\(shown\.length%2\)shown\.at\(-1\)\.classList\.add\('is-wide'\);/);
 assert.match(read('public/welcome.css'),/\.social-buttons\{display:grid;grid-template-columns:1fr 1fr;gap:8px\}\n\.social-button\.is-wide\{grid-column:1\/-1\}/);
});

test('Discord sign-in: never in an app\'s own browser, not for a visit from an ad; everywhere else beside Google and Facebook (10 Oct 2026)',async()=>{
 const {usableProviders,adVisit}=await import('../src/social-login.js');
 const all=['google','facebook','discord'],chrome='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
 const facebookApp='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.97]';
 assert.deepEqual(usableProviders(all,chrome,false),all);
 assert.deepEqual(usableProviders(all,facebookApp,false),['facebook'],'in the Facebook app: only Facebook (and email)');
 assert.deepEqual(usableProviders(all,chrome,false,{fromAd:true}),['google','facebook'],'from an ad in a normal browser: no Discord');
 assert.deepEqual(usableProviders(all,chrome,true),[],'our Android app: none');
 for(const source of [{fb:true},{tt:true},{g:true},{utm_source:'facebook'},{utm_source:'Instagram'},{utm_source:'tiktok'}])assert.equal(adVisit(source),true,JSON.stringify(source));
 for(const source of [null,{},{src:'itch'},{utm_source:'newsletter'},{ref:'discord.com'}])assert.equal(adVisit(source),false,JSON.stringify(source));
 assert.match(read('src/main.js'),/usableProviders\(list,navigator\.userAgent,undefined,\{fromAd:adVisit\(pendingSource\)\}\)/);
});

test('Apple sign-in: only on an iPhone, iPad or Mac, never in an app or an app\'s own browser, not for a visit from an ad (10 Oct 2026)',async()=>{
 const {usableProviders,appleDevice,SOCIAL_PROVIDERS}=await import('../src/social-login.js');
 const all=['google','facebook','apple','discord'];
 const ua={
  safariIphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeIphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  ipad:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  chromeMac:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  windows:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  android:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  facebookIphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.97]',
  instagramIphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.0.0.0 (iPhone15,2; iOS 17_5; nl_NL)'
 };
 assert.equal(SOCIAL_PROVIDERS.apple,'Apple');
 for(const key of ['safariIphone','chromeIphone','ipad','chromeMac']){assert.equal(appleDevice(ua[key]),true,key);assert.deepEqual(usableProviders(all,ua[key],false),all,key);}
 for(const key of ['windows','android']){assert.equal(appleDevice(ua[key]),false,key);assert.deepEqual(usableProviders(all,ua[key],false),['google','facebook','discord'],key);}
 for(const key of ['facebookIphone','instagramIphone'])assert.deepEqual(usableProviders(all,ua[key],false),['facebook'],`${key}: only Facebook (and email)`);
 assert.deepEqual(usableProviders(all,ua.safariIphone,false,{fromAd:true}),['google','facebook'],'from an ad: no Apple, no Discord');
 assert.deepEqual(usableProviders(all,ua.safariIphone,true),[],'our apps (the iPhone app is marked like the Android app): none');
 // The button: Apple's logo in black on our white button, between Facebook and Discord; two by two with the others.
 const html=read('public/play.html');
 assert.match(html,/<span>Facebook<\/span><\/button><button type="button" class="social-button" data-provider="apple" aria-label="Continue with Apple" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#000" d="M12\.152 6\.896[^"]+"\/><\/svg><span>Apple<\/span><\/button><button type="button" class="social-button" data-provider="discord"/);
 // The privacy policy names Apple: an address (its own or Hide My Email) and an identifier, no picture; where to take the access back.
 const privacy=read('public/privacy.html');
 assert.match(privacy,/<h2 id="social-sign-in">3\. Signing in with Google, Facebook, Apple or Discord<\/h2>/);
 assert.match(privacy,/If you choose Apple, Apple shares an <strong>email address<\/strong> and a unique identifier for your Apple Account, and no profile picture\./);
 assert.match(privacy,/Hide My Email/);assert.match(privacy,/We do not receive your Google, Facebook, Apple or Discord password/);
 assert.match(privacy,/Google, Meta, Apple and Discord process your data under their own privacy policies\..*your Apple Account \(Sign in with Apple\)/);
 // The admin says "Apple" under "Signs in with"; linking to Discord trusts Apple's address like Google's and Facebook's.
 assert.match(read('src/admin-players.js'),/discord:'Discord',apple:'Apple'\}/);
 assert.match(read('supabase/functions/discord-auth/discord.js'),/const OAUTH=\['google','facebook','apple'\];/);
});
