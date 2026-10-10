// The payment page fixes of 10 Oct 2026: the address and language Stripe's page gets, a page that expired, a purchase back from the
// app after a day, the webhook ending unpaid pages, and the admin panel's Paid / Open / Not paid.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkoutEmail,checkoutLocale} from '../supabase/functions/diamond-checkout/checkout-session.js';
import {purchaseState,purchaseCounts,PURCHASE_LABELS,PAGE_HOURS} from '../src/admin-purchases.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Stripe gets the address Google, Facebook or Apple checked, never an email sign-up\'s, a relay or a broken one',()=>{
 const at='2026-10-01T00:00:00Z',by=provider=>({app_metadata:{provider},email_confirmed_at:at});
 for(const provider of ['google','facebook','apple'])assert.equal(checkoutEmail({...by(provider),email:'farmer@example.com'}),'farmer@example.com',provider);
 assert.equal(checkoutEmail({...by('google'),email:' farmer@example.com '}),'farmer@example.com');
 assert.equal(checkoutEmail({...by('email'),email:'farmer@gmail.con'}),undefined,'an email sign-up is confirmed without a mail: it may be a typo');
 assert.equal(checkoutEmail({...by('discord'),email:'farmer@example.com'}),undefined);
 assert.equal(checkoutEmail({email:'farmer@example.com',email_confirmed_at:at}),undefined,'no provider');
 assert.equal(checkoutEmail({app_metadata:{provider:'google'},email:'farmer@example.com'}),undefined,'not confirmed');
 assert.equal(checkoutEmail({...by('apple'),email:'abc123@privaterelay.appleid.com'}),undefined,'Apple relay');
 assert.equal(checkoutEmail({...by('google'),email:'no-at-sign'}),undefined);
 assert.equal(checkoutEmail({...by('google'),email:''}),undefined);
 assert.equal(checkoutEmail(by('google')),undefined);
 assert.equal(checkoutEmail(null),undefined);
 assert.equal(checkoutEmail({...by('google'),email:`${'a'.repeat(250)}@x.io`}),undefined,'too long');
});

test('the payment page speaks the game\'s language where Stripe has it, else follows the browser',()=>{
 assert.equal(checkoutLocale('nl'),'nl');
 assert.equal(checkoutLocale('pt'),'pt-BR','the game\'s Portuguese is Brazilian');
 assert.equal(checkoutLocale('zh'),'zh');
 assert.equal(checkoutLocale('ru'),'ru');
 assert.equal(checkoutLocale('en'),'auto','English is also the game\'s fallback: Stripe follows the browser (Polish, Romanian …)');
 assert.equal(checkoutLocale('en-GB'),'auto');
 for(const code of ['uk','hi','ar','xx','',undefined,null,42])assert.equal(checkoutLocale(code),'auto',String(code));
 // every language the game speaks maps to a Stripe locale or to 'auto'
 const languages=[...read('public/languages.js').matchAll(/code:'([a-z]{2})'/g)].map(m=>m[1]);
 assert.ok(languages.length>=16);
 for(const code of languages)assert.match(checkoutLocale(code),/^(auto|[a-z]{2}(-[A-Z]{2})?)$/);
});

test('diamond-checkout fills both in and opens a new page when the old one expired, but not for a row just back from an app',()=>{
 const src=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(src,/import \{checkoutEmail,checkoutLocale\} from '\.\/checkout-session\.js';/);
 assert.match(src,/customer_email:checkoutEmail\(user\),locale:checkoutLocale\(body\.language\),/);
 // the session's metadata and the payment's are the row's own (a fresh row gets its own id in both)
 assert.match(src,/metadata:\{app:'harvest-tycoon',purchase_id:row\.id,player_id:user\.id\}/);
 assert.match(src,/payment_intent_data:\{metadata:\{app:'harvest-tycoon',purchase_id:row\.id,player_id:user\.id\}\}/);
 assert.match(src,/\{idempotencyKey:`harvest-\$\{live\?'live':'test'\}-\$\{row\.id\}`\}/);
 assert.match(src,/success_url:`\$\{origin\}\/play\.html\?purchase=\$\{row\.id\}`,cancel_url:`\$\{origin\}\/play\.html\?purchase=\$\{row\.id\}&checkout=cancelled`/);
 // an expired page: the old row expires and a fresh row with a fresh page is returned at once, no error
 assert.match(src,/if\(session\.status==='expired'\)\{\n   const expired=await admin\.from\('harvest_purchases'\)\.update\(\{status:'expired'\}\)\.eq\('id',p\.id\)\.eq\('status','pending'\);if\(expired\.error\)throw expired\.error;\n   if\(movedBack\)return reply\(\{error:'This checkout expired\. Close the shop and try again\.'\},409\);\n   const fresh=await admin\.from\('harvest_purchases'\)\.insert\(newRow\(crypto\.randomUUID\(\)\)\)\.select\('\*'\)\.single\(\);if\(fresh\.error\)throw fresh\.error;\n   p=fresh\.data;session=await openPage\(p\);\n  \}/);
 // the first insert and the fresh one are the same row, built in one place
 assert.match(src,/const insert=await admin\.from\('harvest_purchases'\)\.insert\(newRow\(body\.requestId\)\);/);
 // a row back from Google Play or the App Store: its store's sheet may still be paying, so no fresh row in that tap, and the 23-hour
 // refusal stays for every row (the review of 10 Oct: else one purchase could be paid twice)
 assert.match(src,/movedBack=true;/);
 assert.match(src,/if\(movedBack\)return reply\(\{error:'This checkout expired\. Close the shop and try again\.'\},409\);\n   const fresh=/);
 assert.match(src,/\n  if\(Date\.now\(\)-Date\.parse\(p\.created_at\)>23\*3600000&&!p\.stripe_session_id\)return reply/);
 // the saved session is the page that is returned
 assert.match(src,/const saved=await admin\.from\('harvest_purchases'\)\.update\(\{stripe_session_id:session\.id\}\)\.eq\('id',p\.id\)/);
 assert.match(src,/return reply\(\{url:session\.url,purchaseId:p\.id\}\);/);
});

test('the webhook ends an unpaid page\'s own pending Stripe row, and only that',()=>{
 const src=read('supabase/functions/stripe-webhook/index.ts');
 assert.match(src,/if\(event\.type==='checkout\.session\.expired'\|\|event\.type==='checkout\.session\.async_payment_failed'\)\{/);
 assert.match(src,/\.update\(\{status:'expired'\}\)\.eq\('id',ended\.metadata\.purchase_id\)\.eq\('stripe_session_id',ended\.id\)\.eq\('store','stripe'\)\.eq\('status','pending'\);/);
 assert.match(src,/if\(ended\.metadata\?\.app!=='harvest-tycoon'\|\|!UUID\.test\(ended\.metadata\?\.purchase_id\?\?''\)\)return reply\(\{received:true,ignored:true\}\);/);
 // a page ended early was ended by diamond-checkout moving the row to an app store: that move looks after the row
 assert.match(src,/if\(event\.type==='checkout\.session\.expired'&&Number\(ended\.expires_at\)\*1000>Date\.now\(\)\+60000\)return reply\(\{received:true,ignored:true\}\);/);
 // a failure asks Stripe to send the event again
 assert.match(src,/return reply\(\{error:'Checkout could not be ended yet\. Retry this event\.'\},500\);/);
 // paying is handled exactly as before, after it
 assert.ok(src.indexOf("checkout.session.expired")<src.indexOf("['checkout.session.completed','checkout.session.async_payment_succeeded']"));
});

test('the page sends its language with a Stripe checkout',()=>{
 assert.match(read('src/main.js'),/bridge\.payments\(\{operation:'create',pack,requestId,language:document\.documentElement\?\.lang,\.\.\.\(offerId\?\{offerId\}:\{\}\)\}\)/);
 assert.match(read('src/farm-session.js'),/bridge\.payments\(\{operation:'create',pack,requestId,language:doc\?\.documentElement\?\.lang,\.\.\.\(offerId\?\{offerId\}:\{\}\)\}\)/);
});

test('the admin panel says Paid, Open (a page up to 24 hours old) or Not paid',()=>{
 const now=Date.parse('2026-10-10T20:00:00Z'),ago=h=>new Date(now-h*3600000).toISOString();
 assert.equal(PAGE_HOURS,24);
 assert.equal(purchaseState({status:'credited',createdAt:ago(100)},now),'paid');
 assert.equal(purchaseState({status:'test_paid',createdAt:ago(1)},now),'paid');
 assert.equal(purchaseState({status:'pending',createdAt:ago(1)},now),'open');
 assert.equal(purchaseState({status:'pending',createdAt:ago(23.9)},now),'open');
 assert.equal(purchaseState({status:'pending',createdAt:ago(24.1)},now),'unpaid');
 assert.equal(purchaseState({status:'expired',createdAt:ago(1)},now),'unpaid');
 assert.equal(purchaseState({status:'refunded',createdAt:ago(1)},now),'refunded');
 assert.deepEqual(purchaseCounts([{status:'credited',createdAt:ago(5)},{status:'pending',createdAt:ago(2)},{status:'pending',createdAt:ago(30)},{status:'expired',createdAt:ago(3)}],now),{paid:1,open:1,unpaid:2,refunded:0});
 for(const state of ['paid','open','unpaid','refunded'])assert.ok(PURCHASE_LABELS[state],state);
 const dash=read('src/admin-dashboard.js');
 assert.match(dash,/import \{purchaseState,purchaseCounts,PURCHASE_LABELS\} from '\.\/admin-purchases\.js';/);
 assert.match(dash,/data-purchase-filter="open" aria-pressed="false">Open<\/button><button type="button" class="admin-filter" data-purchase-filter="unpaid" aria-pressed="false">Not paid<\/button>/);
 assert.match(dash,/<strong>\$\{number\(counts\.open\)\}<\/strong> open<\/span><span><strong>\$\{number\(counts\.unpaid\)\}<\/strong> not paid<\/span>/);
 assert.match(dash,/const \[label,cls\]=PURCHASE_LABELS\[purchaseState\(p\)\];/);
 assert.doesNotMatch(dash,/Not finished/);
});
