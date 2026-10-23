// Checkout recovery (23 Oct 2026, the owner's options 1, 2, 4 and 5): the choice after Buy on an Android phone (Google Play), the
// reminder card on the next visit, the honest line where card payment cannot work, and the one reminder email for farmers who said yes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {unfinishedCheckout,UNFINISHED_HOURS,PASS} from '../game/payments.js';
import {STRIPE_BLOCKED,cardBlocked,deviceKind,payWays,askFirst,otherWays,playStoreLink,appStoreLink,packName,reminderFor,REMIND_AFTER,reminderKey} from '../src/pay-ways.js';
import {payChoiceHtml,withPayChoice,packPicture} from '../src/pay-choice-ui.js';
import {reminderHtml} from '../src/checkout-reminder-ui.js';
import {trackCommerce} from '../src/analytics.js';
import {runCheckoutReminders,stillForSale,createSender,BATCH,JOB_GAP_MINUTES} from '../supabase/functions/checkout-reminder/job.js';
import {reminderEmail,unsubscribeLink,gameLink} from '../supabase/functions/checkout-reminder/mail.js';
import {reminderTexts,packNameIn,REMINDER_LANGUAGES} from '../supabase/functions/checkout-reminder/texts.js';
import {newsTexts,NEWS_LANGUAGES} from '../supabase/functions/news-mail/texts.js';
import {unsubscribeLink as newsUnsubscribe} from '../supabase/functions/news-mail/mail.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const H=3600000,NOW=Date.UTC(2026,9,23,12),iso=ms=>new Date(ms).toISOString();
const ANDROID='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const MAC='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

test('the unfinished purchase: the latest website one of the last day, pending or expired, with nothing paid since in any store',()=>{
 const row=(id,hours,more={})=>({id,pack:'500',status:'pending',store:'stripe',livemode:true,created_at:iso(NOW-hours*H),diamonds:500,...more});
 assert.equal(UNFINISHED_HOURS,24);
 assert.deepEqual(unfinishedCheckout([row('a',3)],NOW),{id:'a',pack:'500',createdAt:NOW-3*H,offerId:null,passId:null,diamonds:500});
 assert.equal(unfinishedCheckout([row('a',3,{status:'expired'})],NOW).id,'a','an expired page counts too');
 assert.equal(unfinishedCheckout([row('a',3),row('b',1)],NOW).id,'b','the newest');
 assert.equal(unfinishedCheckout([row('a',25)],NOW),null,'older than a day');
 assert.equal(unfinishedCheckout([row('a',3),row('p',2,{status:'credited',store:'google_play'})],NOW),null,'paid since, in another store');
 assert.equal(unfinishedCheckout([row('a',3),row('t',1,{status:'test_paid'})],NOW),null);
 assert.equal(unfinishedCheckout([row('p',5,{status:'credited'}),row('a',3)],NOW).id,'a','a payment before it changes nothing');
 assert.equal(unfinishedCheckout([row('a',3,{store:'google_play'})],NOW),null,'only the website (Stripe)');
 assert.equal(unfinishedCheckout([row('a',3,{livemode:false})],NOW),null,'never a test checkout');
 assert.equal(unfinishedCheckout([row('a',3,{status:'refunded'})],NOW),null);
 assert.deepEqual(unfinishedCheckout([row('o',2,{pack:'offer',offer_id:'off-1'})],NOW).offerId,'off-1');
 assert.equal(unfinishedCheckout(null,NOW),null);
 assert.equal(unfinishedCheckout([{id:'x',status:'pending',created_at:'nonsense'}],NOW),null);
});

test('diamond-checkout: only the website catalogue reads the last day, in the same round trip, and a failure only leaves the reminder out',()=>{
 const src=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(src,/UNFINISHED_HOURS,unfinishedCheckout\} from '\.\/payments\.js';/);
 assert.match(src,/const \[existingStarter,offerRow,special,recent\]=await Promise\.all\(\[/);
 assert.match(src,/body\.operation==='catalog'&&!play&&!apple&&!kong\?admin\.from\('harvest_purchases'\)\.select\('id,pack,status,store,livemode,created_at,offer_id,pass_id,diamonds'\)\.eq\('player_id',user\.id\)\.gte\('created_at',new Date\(Date\.now\(\)-UNFINISHED_HOURS\*3600000\)\.toISOString\(\)\)\.order\('created_at',\{ascending:false\}\)\.limit\(25\):null\]\);/);
 assert.match(src,/unfinished:recent&&!recent\.error\?unfinishedCheckout\(recent\.data\):null,packs:/);
 assert.equal(read('supabase/functions/diamond-checkout/payments.js'),read('game/payments.js'));
 assert.equal(read('supabase/functions/checkout-reminder/payments.js'),read('game/payments.js'));
});

test('card payment cannot work in the countries Stripe does not serve, by the device time zone, in one list',()=>{
 for(const code of ['CU','IR','KP','SY','RU','BY'])assert.ok(STRIPE_BLOCKED.countries.includes(code),code);
 assert.deepEqual(STRIPE_BLOCKED.zones,['Europe/Simferopol'],'Crimea by its own time zone');
 assert.ok(Object.isFrozen(STRIPE_BLOCKED)&&Object.isFrozen(STRIPE_BLOCKED.countries));
 for(const zone of ['Europe/Moscow','Asia/Vladivostok','Europe/Kaliningrad','Europe/Minsk','Asia/Tehran','Asia/Damascus','America/Havana','Asia/Pyongyang','Europe/Simferopol'])assert.equal(cardBlocked(zone),true,zone);
 for(const zone of ['Europe/Kyiv','Europe/Amsterdam','Asia/Manila','Africa/Johannesburg','Africa/Blantyre','Asia/Tbilisi','Africa/Cairo','UTC','Nowhere/Else',null,undefined,42])assert.equal(cardBlocked(zone),false,String(zone));
 // the list lives in one place: no other file names these countries for payments
 assert.equal((read('src/pay-ways.js').match(/\['CU','IR','KP','SY','RU','BY'\]/g)??[]).length,1);
});

test('who sees the choice after Buy: an Android phone in a browser, or where card payment cannot work; never in our apps or on a portal',()=>{
 assert.equal(deviceKind(ANDROID),'android');assert.equal(deviceKind(IPHONE),'iphone');assert.equal(deviceKind(MAC),'other');assert.equal(deviceKind(undefined),'other');
 const android=payWays({ua:ANDROID,timeZone:'Asia/Manila'});
 assert.deepEqual(android,{card:true,play:true,appStore:false,blocked:false});assert.equal(askFirst(android),true);assert.equal(otherWays(android),true);
 const desktop=payWays({ua:MAC,timeZone:'Europe/Amsterdam'});
 assert.deepEqual(desktop,{card:true,play:false,appStore:false,blocked:false});assert.equal(askFirst(desktop),false,'the card page straight away, as before');
 const iphone=payWays({ua:IPHONE,timeZone:'Europe/Amsterdam'});
 assert.equal(askFirst(iphone),false,'an iPhone browser in a country where cards work: unchanged');assert.equal(iphone.appStore,false);
 const iphoneIran=payWays({ua:IPHONE,timeZone:'Asia/Tehran'});
 assert.deepEqual(iphoneIran,{card:false,play:false,appStore:true,blocked:true});assert.equal(askFirst(iphoneIran),true);
 const russiaAndroid=payWays({ua:ANDROID,timeZone:'Europe/Moscow'});
 assert.deepEqual(russiaAndroid,{card:false,play:true,appStore:false,blocked:true});
 const minskDesktop=payWays({ua:MAC,timeZone:'Europe/Minsk'});
 assert.equal(askFirst(minskDesktop),true,'the line instead of the card page');assert.equal(otherWays(minskDesktop),false);
 assert.equal(payWays({ua:ANDROID,timeZone:'Asia/Manila',app:true}),null,'our apps sell through their own store');
 assert.equal(payWays({ua:ANDROID,timeZone:'Europe/Moscow',portal:true}),null,'portals stay exactly as they are');
 assert.equal(askFirst(null),false);
});

test('the Google Play link is our app with where the tap came from; the App Store link carries Apple\'s campaign token',()=>{
 assert.equal(playStoreLink(),'https://play.google.com/store/apps/details?id=com.harvesttycoon.app&referrer=utm_source%3Dshop%26utm_medium%3Dweb%26utm_campaign%3Dcheckout');
 assert.equal(playStoreLink('reminder'),'https://play.google.com/store/apps/details?id=com.harvesttycoon.app&referrer=utm_source%3Dreminder%26utm_medium%3Dweb%26utm_campaign%3Dcheckout');
 assert.equal(playStoreLink('<script>'),playStoreLink('shop'),'only known sources');
 assert.equal(appStoreLink('https://apps.apple.com/nl/app/harvest-tycoon/id6818875983'),'https://apps.apple.com/nl/app/harvest-tycoon/id6818875983?ct=shop');
 assert.equal(appStoreLink('https://x.test/a?b=1','reminder'),'https://x.test/a?b=1&ct=reminder');
});

test('the sheet: the card first and green, Google Play with its short line, and the honest line where cards cannot work',()=>{
 const choice=payChoiceHtml({pack:'500',ways:payWays({ua:ANDROID,timeZone:'Asia/Manila'})});
 assert.match(choice,/<h2 id="pay-choice-title">500 diamonds<\/h2>/);
 assert.ok(choice.indexOf('data-way="card"')<choice.indexOf('data-way="play"'),'the card stays the default, first');
 assert.match(choice,/class="pay-way is-go" data-way="card"/);
 assert.match(choice,/<b>Pay with Google Play<\/b><small>Phone credit, gift cards and local wallets<\/small>/);
 assert.match(choice,/The app opens with your farm when you sign in with the same account\./);
 assert.doesNotMatch(choice,/not available|data-way="app_store"/);
 const russia=payChoiceHtml({pack:'starter',ways:payWays({ua:ANDROID,timeZone:'Europe/Moscow'})});
 assert.match(russia,/<p class="pay-choice-line">Card payment is not available in your country\.<\/p>/);
 assert.doesNotMatch(russia,/data-way="card"/,'no Stripe page where it cannot work');
 assert.match(russia,/<small>In our app, where Google Play takes payments<\/small>/,'no promise the store takes payments there');
 assert.match(russia,/Diamonds you earn in the game keep working\./);
 assert.match(payChoiceHtml({pack:'500',ways:payWays({ua:IPHONE,timeZone:'Asia/Tehran'})}),/data-way="app_store"/);
 const desktop=payChoiceHtml({pack:'500',ways:payWays({ua:MAC,timeZone:'Europe/Minsk'})});
 assert.doesNotMatch(desktop,/data-way=/);assert.doesNotMatch(desktop,/The app opens/);
 for(const html of [choice,russia,desktop])assert.doesNotMatch(html,/ · |·/,'no middle dots');
 assert.equal(packName('starter'),'Starter Pack');assert.equal(packName('offer'),'Special offer');assert.equal(packName('season'),'Season Pass');
 assert.equal(packName('pass'),PASS.name);assert.equal(packName('3500'),'3,500 diamonds');
 assert.equal(packPicture('season','winter-2026'),'/assets/icons/season-pass-winter.webp');assert.equal(packPicture('1250'),'/assets/icons/offer-diamonds.webp');
});

test('withPayChoice: the card flow unchanged where nothing is asked, and the reminder\'s Try again skips the sheet',async()=>{
 const calls=[],checkout=async(...args)=>{calls.push(args);return {store:'tab'};};
 const plain=withPayChoice(checkout,{ways:()=>payWays({ua:MAC,timeZone:'Europe/Amsterdam'}),doc:()=>{throw new Error('no sheet');}});
 assert.deepEqual(await plain('500','req-1',undefined,{season:'autumn-2026'}),{store:'tab'});
 assert.deepEqual(calls[0],['500','req-1',undefined,{season:'autumn-2026'}]);
 const app=withPayChoice(checkout,{ways:()=>null,doc:()=>{throw new Error('no sheet');}});
 await app('starter','req-2');assert.equal(calls.length,2);
 const android=withPayChoice(checkout,{ways:()=>payWays({ua:ANDROID,timeZone:'Asia/Manila'}),doc:()=>{throw new Error('no sheet');}});
 await android('500','req-3',undefined,{way:'card'});assert.equal(calls.length,3,'Try again goes straight to the card');
 const blocked=withPayChoice(checkout,{ways:()=>payWays({ua:ANDROID,timeZone:'Europe/Moscow'}),doc:()=>{throw new Error('sheet');}});
 await assert.rejects(blocked('500','req-4',undefined,{way:'card'}),/sheet/,'never the card page where it cannot work, not even from Try again');
 assert.equal(calls.length,3);
});

test('main.js puts the choice in front of the website\'s card flow only; the apps and the portals keep their own flows',()=>{
 const main=read('src/main.js');
 assert.match(main,/bridge\.checkout=inApp\?cardCheckout:withPayChoice\(cardCheckout,\{ways:\(\)=>payWays\(\{ua:navigator\.userAgent,timeZone:deviceTimeZone\(\)\}\),/);
 assert.match(main,/doc:\(\)=>\{try\{return frame\?\.contentDocument\?\.body\?frame\.contentDocument:document;\}catch\{return document;\}\}/,'drawn in the farm\'s page');
 // the portals' pages have checkouts of their own, untouched
 for(const file of ['src/kongregate-kreds.js','src/farm-session.js','src/crazygames.js','src/discord.js'])assert.doesNotMatch(read(file),/withPayChoice|pay-ways/,file);
 // the reminder only on the website and in the apps, never on a portal
 assert.match(read('src/game-cloud.js'),/if\(shop&&!portal\)part\(\(\)=>createCheckoutReminder\(bridge\)\);\n   if\(shop\)\{createOfferUI\(bridge\);/);
});

test('the reminder card: once per purchase, not too soon, and only while the pack can still be bought',()=>{
 const catalog=(unfinished,more={})=>({enabled:true,serverNow:NOW,packs:[{id:'150'},{id:'500'},{id:'1250'},{id:'3500'},{id:'starter'}],unfinished,...more});
 const u=(pack,more={})=>({id:'pid-'+pack,pack,createdAt:NOW-2*H,offerId:null,passId:null,...more});
 assert.equal(REMIND_AFTER,10*60000);
 assert.deepEqual(reminderFor(catalog(u('500')),{now:NOW}),{id:'pid-500',pack:'500',offerId:null,season:null});
 assert.equal(reminderFor(catalog(u('500',{createdAt:NOW-5*60000})),{now:NOW}),null,'not over the window of the same visit');
 assert.equal(reminderFor(catalog(u('500')),{now:NOW,shown:id=>id==='pid-500'}),null,'once per purchase');
 assert.equal(reminderFor(catalog(u('500'),{enabled:false}),{now:NOW}),null,'not while the shop is closed');
 assert.equal(reminderFor(catalog(null),{now:NOW}),null);
 assert.equal(reminderFor(catalog(u('600')),{now:NOW}),null,'a pack no longer sold');
 // the Starter Pack: only in its week, not once received
 assert.ok(reminderFor(catalog(u('starter'),{starter:{eligible:true,claimed:false,expiresAt:NOW+H}}),{now:NOW}));
 assert.equal(reminderFor(catalog(u('starter'),{starter:{eligible:false,claimed:false,expiresAt:NOW-H}}),{now:NOW}),null,'its week ended');
 // the special offer: the same offer, still running, not bought
 const offer={id:'off-1',bought:false,endsAt:NOW+H};
 assert.deepEqual(reminderFor(catalog(u('offer',{offerId:'off-1'}),{offer}),{now:NOW}),{id:'pid-offer',pack:'offer',offerId:'off-1',season:null});
 assert.equal(reminderFor(catalog(u('offer',{offerId:'off-0'}),{offer}),{now:NOW}),null,'another offer runs now');
 assert.equal(reminderFor(catalog(u('offer',{offerId:'off-1'}),{offer:{...offer,bought:true}}),{now:NOW}),null);
 assert.equal(reminderFor(catalog(u('offer',{offerId:'off-1'}),{offer:null}),{now:NOW}),null,'the offer ended');
 // the passes: while on sale
 assert.ok(reminderFor(catalog(u('pass',{passId:'halloween-2026'}),{pass:{id:'halloween-2026',ready:true}}),{now:NOW}));
 assert.equal(reminderFor(catalog(u('pass',{passId:'halloween-2026'}),{pass:{id:'halloween-2026',ready:false}}),{now:NOW}),null);
 assert.deepEqual(reminderFor(catalog(u('season',{passId:'winter-2026'}),{seasons:[{id:'winter-2026',ready:true}]}),{now:NOW}).season,'winter-2026');
 assert.equal(reminderFor(catalog(u('season',{passId:'autumn-2026'}),{seasons:[{id:'winter-2026',ready:true}]}),{now:NOW}),null);
 assert.equal(reminderKey('abc'),'harvest-checkout-reminder:abc');
});

test('the reminder card: Try again where the card works, Other ways only where there is one, Not now always, no discount',()=>{
 const android=reminderHtml({pack:'500',ways:payWays({ua:ANDROID,timeZone:'Asia/Manila'})});
 assert.match(android,/data-reminder="retry"><b>Try again<\/b>/);assert.match(android,/Other ways to pay/);assert.match(android,/>Not now</);
 assert.match(android,/<p class="pay-choice-line">Your purchase is still waiting\.<\/p>/);
 const desktop=reminderHtml({pack:'starter',ways:payWays({ua:MAC,timeZone:'Europe/Amsterdam'})});
 assert.match(desktop,/Try again/);assert.doesNotMatch(desktop,/Other ways to pay/);assert.match(desktop,/>Starter Pack</);
 const blocked=reminderHtml({pack:'1250',ways:payWays({ua:ANDROID,timeZone:'Asia/Damascus'})});
 assert.doesNotMatch(blocked,/Try again/);assert.match(blocked,/Card payment is not available in your country\./);assert.match(blocked,/Other ways to pay/);
 assert.match(reminderHtml({pack:'500',ways:null}),/Try again/,'in the Galaxy Store app (no ways): the card flow');
 for(const html of [android,desktop,blocked])assert.doesNotMatch(html,/%|off\b|bonus|free|discount| · /i,'calm, no discount or bonus');
 const ui=read('src/checkout-reminder-ui.js');
 assert.match(ui,/way:'card',source:'reminder'/,'Try again: the same pack, through the card flow');
 assert.match(ui,/try\{const back=bridge\.paymentReturn\?\.\(\)\?\.id;if\(typeof back==='string'&&back\)mark\(back\);\}catch\{\}/,'not for the purchase this page came back from');
 assert.match(ui,/if\(!first\|\|disposed\)return;first=false;/,'only the catalogue of the farm\'s start: the next visit');
 assert.match(ui,/!doc\.querySelector\('dialog\[open\]'\)/,'when nothing else is open');
});

test('the new commerce events reach analytics, without who bought',()=>{
 for(const event of ['pay_choice_shown','pay_with_google_play','pay_with_app_store','card_unavailable_shown','checkout_reminder_shown','checkout_reminder_retry','checkout_reminder_other']){
  const win={dataLayer:[]};trackCommerce(event,{pack:'500',purchaseId:'x',email:'a@b.c'},win);
  assert.equal(win.dataLayer.length,1,event);assert.equal(win.dataLayer[0].event,event);assert.equal(win.dataLayer[0].pack,'500');
  assert.ok(!('purchaseId' in win.dataLayer[0])&&!('email' in win.dataLayer[0]));
 }
});

test('the reminder email\'s SQL: only farmers who said yes, 1 to 24 hours old, the latest, nothing paid since, once, for the service role only',()=>{
 const sql=read('supabase/checkout-reminder.sql');
 assert.match(sql,/and public\.news_mail_ok\(p\.player_id\)\)/,'the news email\'s own consent rule');
 assert.match(sql,/p\.store='stripe' and p\.livemode and p\.status in \('pending','expired'\) and p\.player_id is not null\n   and p\.reminder_mailed_at is null\n   and p\.created_at>now\(\)-interval '24 hours' and p\.created_at<=now\(\)-interval '1 hour'/);
 assert.match(sql,/not exists\(select 1 from public\.harvest_purchases n where n\.player_id=p\.player_id and n\.store='stripe' and n\.created_at>p\.created_at\)/,'the latest website purchase');
 assert.match(sql,/not exists\(select 1 from public\.harvest_purchases c where c\.player_id=p\.player_id and c\.status in \('credited','test_paid'\) and c\.created_at>=p\.created_at\)/,'nothing paid since, any store');
 assert.match(sql,/not exists\(select 1 from public\.harvest_purchases r where r\.player_id=p\.player_id and r\.reminder_mailed_at>now\(\)-interval '30 days'\)/);
 assert.match(sql,/update public\.harvest_purchases set reminder_mailed_at=now\(\) where id=p_purchase and reminder_mailed_at is null returning player_id into v_player;/,'claimed before it goes, once');
 assert.match(sql,/if not public\.checkout_reminder_due\(p_purchase\) then return null; end if;/,'checked again at the claim');
 for(const fn of ['checkout_reminder_due(uuid)','checkout_reminder_candidates(integer)','checkout_reminder_claim(uuid)','checkout_reminder_done(uuid,text)'])
  assert.match(sql,new RegExp(`revoke all on function public\\.${fn.replace(/[()]/g,'\\$&')} from public, anon, authenticated;`),fn);
 assert.doesNotMatch(sql,/to (anon|authenticated)\b/,'never callable from a browser');
 assert.match(sql,/limit least\(greatest\(coalesce\(p_limit,20\),1\),50\)/,'tiny volume');
 assert.match(sql,/select cron\.schedule\('harvest-checkout-reminder','23 \* \* \* \*',/);
 assert.match(sql,/functions\/v1\/checkout-reminder'/);
 assert.doesNotMatch(sql.replace(/--[^\n]*/g,''),/discount|bonus/i);
 // no new table: the account deletion needs nothing new
 assert.doesNotMatch(sql,/create table/);
});

test('the reminder email job: once an hour, only packs still for sale, claimed before sending, Resend\'s answer noted',async()=>{
 assert.equal(JOB_GAP_MINUTES,50);assert.equal(BATCH,20);
 const now=Date.UTC(2026,9,23,12);
 assert.equal(stillForSale({pack:'500'},now),true);assert.equal(stillForSale({pack:'600'},now),false,'a pack no longer sold');
 assert.equal(stillForSale({pack:'nope'},now),false);
 assert.equal(stillForSale({pack:'starter',starter_running:true},now),true);assert.equal(stillForSale({pack:'starter',starter_running:false},now),false);
 assert.equal(stillForSale({pack:'offer',offer_running:false},now),false);
 assert.equal(stillForSale({pack:'pass',pass_id:'halloween-2026'},now),true);assert.equal(stillForSale({pack:'pass',pass_id:'halloween-2026'},Date.UTC(2026,11,1)),false);
 assert.equal(stillForSale({pack:'season',pass_id:'winter-2026'},now),true);assert.equal(stillForSale({pack:'season',pass_id:'spring-2027'},now),false);
 const log=[];
 const db={begin:async gap=>{log.push(['begin',gap]);return true;},
  candidates:async limit=>{log.push(['candidates',limit]);return [{purchase_id:'p1',pack:'500',diamonds:500},{purchase_id:'p2',pack:'starter',starter_running:false},{purchase_id:'p3',pack:'1250',diamonds:1250},{purchase_id:'p4',pack:'150',diamonds:150}];},
  claim:async id=>{log.push(['claim',id]);return id==='p3'?null:{email:`${id}@example.com`,token:'tok-'+id,language:id==='p4'?'nl':'en'};},
  done:async(id,note)=>{log.push(['done',id,note]);}};
 const mails=[];
 const send=async(mail,key)=>{mails.push({mail,key});return mail.to.startsWith('p4')?{ok:false,detail:'422 invalid'}:{ok:true,id:'re_1'};};
 const result=await runCheckoutReminders({db,send,env:{functionsUrl:'https://x.supabase.co/functions/v1',appUrl:'https://www.harvesttycoon.com'},now:()=>now});
 assert.deepEqual(result,{candidates:4,sent:1,failed:1,skipped:2});
 assert.deepEqual(log.filter(l=>l[0]==='claim').map(l=>l[1]),['p1','p3','p4'],'an ended Starter Pack is never claimed');
 assert.deepEqual(mails.map(m=>m.key),['checkout-reminder/p1','checkout-reminder/p4']);
 assert.equal(mails[1].mail.subject,'Je aankoop staat nog klaar','the farmer\'s language');
 assert.deepEqual(log.filter(l=>l[0]==='done'),[['done','p1','sent re_1'],['done','p4','failed: 422 invalid']]);
 assert.deepEqual(await runCheckoutReminders({db:{...db,begin:async()=>false},send,env:{}}),{skipped:'ran recently'});
 const index=read('supabase/functions/checkout-reminder/index.ts');
 assert.match(index,/--no-verify-jwt/);assert.match(index,/CHECKOUT_REMINDER_ENABLED/);
 assert.match(index,/admin\.rpc\('harvest_job_begin',\{p_name:'checkout-reminder',p_gap_minutes:gap\}\)/);
});

test('Resend: one email with its own Idempotency-Key, tried again once with the same key when there was no answer',async()=>{
 const calls=[];let answer=[null,{ok:true,status:200,json:async()=>({id:'re_9'})}];
 const send=createSender({key:'k',from:'Harvest Tycoon <noreply@harvesttycoon.com>',sleep:async()=>{},fetchImpl:async(url,init)=>{calls.push({url,init});const a=answer.shift();if(!a)throw new Error('down');return a;}});
 assert.deepEqual(await send({to:'a@b.c',subject:'s',html:'h',text:'t',headers:{},tags:[]},'checkout-reminder/p1'),{ok:true,id:'re_9'});
 assert.equal(calls.length,2);assert.equal(calls[0].init.headers['Idempotency-Key'],'checkout-reminder/p1');assert.equal(calls[1].init.headers['Idempotency-Key'],'checkout-reminder/p1');
 assert.equal(calls[0].url,'https://api.resend.com/emails');
 answer=[{ok:false,status:422,text:async()=>'bad address'}];
 assert.deepEqual(await send({to:'x'},'checkout-reminder/p2'),{ok:false,detail:'422 bad address'},'a refusal is not tried again');
});

test('the reminder email: every game language with its own subject, the news email\'s consent line and unsubscribe link, no discount',()=>{
 assert.deepEqual([...REMINDER_LANGUAGES].sort(),[...NEWS_LANGUAGES].sort());
 assert.equal(REMINDER_LANGUAGES.length,16);
 const subjects=new Set();
 for(const code of REMINDER_LANGUAGES){
  const t=reminderTexts(code);
  for(const key of ['subject','body','android','button','why','unsubscribe'])assert.ok(t[key]&&t[key].length<300,`${code} ${key}`);
  assert.equal(t.why,newsTexts(code).why,`${code}: the consent line is the news email's`);assert.equal(t.unsubscribe,newsTexts(code).unsubscribe,code);
  subjects.add(t.subject);
  const mail=reminderEmail({language:code,pack:'1250',diamonds:1250,unsubscribeUrl:unsubscribeLink('https://x.supabase.co/functions/v1','tok',code)});
  assert.match(mail.html,/notify-hourly\?unsubscribe=tok&amp;only=news&amp;lang=/,code);
  assert.equal(mail.headers['List-Unsubscribe'],`<https://x.supabase.co/functions/v1/notify-hourly?unsubscribe=tok&only=news&lang=${code}>`);
  assert.equal(mail.headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');
  assert.ok(mail.html.includes(gameLink('https://www.harvesttycoon.com').replace(/&/g,'&amp;')),code);
  assert.doesNotMatch(mail.html+mail.text,/ · |€/,`${code}: no middle dots, no price`);assert.doesNotMatch(mail.text,/%/,`${code}: no discount`);
 }
 assert.equal(subjects.size,16,'a subject per language');
 assert.equal(unsubscribeLink('u','t','xx'),newsUnsubscribe('u','t','xx'),'the same link as the news email');
 assert.equal(reminderEmail({language:'ar',pack:'500',diamonds:500,unsubscribeUrl:'u'}).html.includes('dir="rtl"'),true);
 assert.equal(reminderEmail({language:'xx',pack:'500',diamonds:500,unsubscribeUrl:'u'}).language,'en');
 assert.equal(packNameIn('en','3500',3500),'3,500 diamonds');assert.equal(packNameIn('nl','starter'),'Starterspakket');
 assert.equal(packNameIn('ru','500',500),'500 алмазов');assert.equal(packNameIn('ru','1250',1250),'1 250 алмазов'.replace(' ',' '));
 assert.equal(packNameIn('cs','150',150),'150 diamantů');
 assert.match(gameLink('https://www.harvesttycoon.com'),/^https:\/\/www\.harvesttycoon\.com\/\?source=email&/,'counted as an email open (public/app-links.js reminderSource)');
 // escaped: nothing a farmer wrote goes in, and the pack name cannot add markup either
 assert.doesNotMatch(reminderEmail({language:'en',pack:'<b>',diamonds:0,unsubscribeUrl:'"><script>'}).html,/<script>|"><script/);
});

test('the window style: compact card, the game palette, weights 400 and 700 only, nothing under 12px, logical sides',()=>{
 const css=read('public/payments.css'),part=css.slice(css.indexOf('/* How to pay (23 Oct 2026'));
 assert.ok(part.length>500);
 for(const m of part.matchAll(/font:(\d+) (\d+)px/g)){assert.ok(['400','700'].includes(m[1]),m[0]);assert.ok(Number(m[2])>=12,m[0]);}
 assert.doesNotMatch(part,/font-weight:(?!400|700)/);
 assert.doesNotMatch(part,/\b(left|right):|margin-(left|right)|padding-(left|right)|text-align:(left|right)/,'logical sides only');
 assert.match(part,/border-color:#8cc06a/,'the positive action green-edged');assert.match(part,/#fffdf4/);assert.match(part,/#ddd2c7/);
});
