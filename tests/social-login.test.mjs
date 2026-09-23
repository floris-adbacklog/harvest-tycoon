import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enabledProviders,oauthStartError,oauthReturnMessage,SOCIAL_PROVIDERS} from '../src/social-login.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const reply=(body,ok=true)=>async()=>({ok,json:async()=>body});

test('only the providers switched on in Supabase get a button; any problem shows none',async()=>{
 assert.deepEqual(Object.keys(SOCIAL_PROVIDERS),['google','facebook']);
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
 assert.match(html,/data-provider="google" aria-label="Continue with Google" hidden>/);assert.match(html,/data-provider="facebook" aria-label="Continue with Facebook" hidden>/);
 assert.match(html,/<span>or use your email<\/span>/);
 assert.match(main,/\$\('social-login'\)\.hidden=!providers\.length\|\|!\['signin','register'\]\.includes\(mode\)/);
 assert.match(main,/signInWithOAuth\(\{provider,options:\{redirectTo:redirectUrl\(\)\}\}\)/);
});

test('the privacy policy and the deletion page are public, linked from the sign-in card and the footer, and load no tracking',()=>{
 const html=read('public/play.html'),vercel=JSON.parse(read('vercel.json'));
 assert.match(html,/class="account-legal">For players aged 16 and over · <a href="\/privacy">Privacy Policy<\/a>/);
 assert.match(html,/<footer class="site-legal">.*href="\/privacy"/);assert.ok(!/<footer class="site-legal">[^\n]*delete-account/.test(html),'the deletion page is for Meta, not the footer');
 assert.deepEqual(vercel.rewrites.filter(r=>!r.source.endsWith('/')).map(r=>[r.source,r.destination]),[['/privacy','/privacy.html'],['/delete-account','/delete-account.html']]);
 for(const page of ['public/privacy.html','public/delete-account.html']){
  const text=read(page);
  assert.ok(!/googletagmanager|gtag\(|fbq\(|<script/i.test(text),`${page} loads no scripts`);
  assert.match(text,/floris@millstone\.nl/);assert.match(text,/89795857/);assert.match(text,/<html lang="en">/);
 }
});

test('unknown pages get a friendly 404 in the same style, with the way back and no tracking',()=>{
 const html=read('public/404.html');
 assert.match(html,/<meta name="robots" content="noindex">/);assert.match(html,/<a class="legal-button nf-button" href="\/">Back to the farm<\/a>/);
 assert.ok(!/<script/i.test(html),'no scripts');assert.match(html,/href="\/legal\.css"/,'absolute paths, so it works at any depth');
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
 assert.match(read('src/main.js'),/providers=usableProviders\(list,navigator\.userAgent\)/);
});
