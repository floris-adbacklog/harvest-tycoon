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
