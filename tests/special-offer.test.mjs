import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {OFFER,offerValueCents,offerProblem,offerFill,paidOfferProblem,validatePaidSession,APPLE_SELLS_OFFER,APPLE_PRODUCTS,PLAY_PRODUCTS} from '../game/payments.js';
import {STARTER_LEVEL} from '../game/farm-state.js';
import {offerParts,offerDiscount} from '../src/offer-ui.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('a special offer is worth €49.99 at shop prices and sells for €4.99 (90% off)',()=>{
 assert.equal(OFFER.cents,499);assert.equal(OFFER.valueCents,4999);assert.equal(offerDiscount({cents:OFFER.cents,valueCents:OFFER.valueCents}),90);
 assert.equal(offerValueCents({diamonds:500}),499,'a diamond as in the 500 pack');
 assert.equal(offerValueCents({coins:500}),1,'500 coins a diamond (20 Oct 2026; 200 before)');
 assert.equal(offerValueCents({coins:2500}),offerValueCents({diamonds:5}),'2,500 coins = 5 diamonds');
 assert.equal(offerValueCents({coins:1000},OFFER.coinsPerDiamondBefore),offerValueCents({diamonds:5}),'at the old rate 1,000 coins were 5 diamonds');
 assert.equal(offerValueCents({vipDays:30}),offerValueCents({diamonds:1500}),'VIP at its diamond price');
 assert.equal(offerValueCents({vipDays:7}),offerValueCents({diamonds:500}));
 assert.equal(offerValueCents({vipDays:60}),offerValueCents({diamonds:3000}),'60 days: two 30-day plans');
 assert.equal(offerValueCents({vipDays:90}),offerValueCents({diamonds:4500}),'90 days: three 30-day plans');
 assert.equal(offerProblem({diamonds:500,vipDays:90}),null);
 assert.match(offerProblem({vipDays:90}),/must be worth €7\.45, €9\.98 or €49\.99; it is worth €44\.91/,'VIP alone never reaches €49.99');
 assert.equal(offerProblem({diamonds:5000}),null);
 assert.equal(offerProblem({coins:2500000}),null);
 assert.match(offerProblem({coins:1000000}),/must be worth €7\.45, €9\.98 or €49\.99; it is worth €19\.96/,'a million coins was €49.99 at the old rate');
 assert.match(offerProblem({coins:3125000}),/must be worth €7\.45, €9\.98 or €49\.99/);
 assert.equal(offerProblem({diamonds:3500,vipDays:30}),null);
 assert.match(offerProblem({vipDays:30}),/must be worth €7\.45, €9\.98 or €49\.99; it is worth €14\.97/);
 assert.match(offerProblem({diamonds:6000}),/must be worth €7\.45, €9\.98 or €49\.99/);
 assert.equal(offerProblem({}),'Put something in the offer.');
 assert.equal(offerProblem({diamonds:5000,vipDays:14}),'Choose amounts within the limits.');
 assert.equal(offerProblem({diamonds:4999.5}),'Use whole numbers.');
});

test('ticking kinds in the Admin panel always fills in a valid offer',()=>{
 for(const diamonds of [false,true])for(const coins of [false,true])for(const vipDays of [0,7,30,60,90]){
  if(!diamonds&&!coins)continue;
  const o=offerFill({diamonds,coins,vipDays});
  assert.equal(offerProblem(o),null,JSON.stringify(o));
  assert.equal(o.diamonds>0,diamonds);assert.equal(o.coins>0,coins);assert.equal(o.diamonds%50,0);
 }
 assert.deepEqual(offerFill({diamonds:true,coins:true,vipDays:30}),{diamonds:1750,coins:875000,vipDays:30});
 assert.deepEqual(offerFill({diamonds:true,coins:true,vipDays:60}),{diamonds:1000,coins:500000,vipDays:60});
 assert.deepEqual(offerFill({coins:true}),{diamonds:0,coins:2500000,vipDays:0});
});

function fixture(contents={diamonds:1750,coins:875000,vip_days:30}){return {
 purchase:{id:'purchase',player_id:'player',pack:'offer',offer_id:'00000000-0000-4000-8000-000000000001',...contents,amount_cents:499,price_id:OFFER.price,livemode:true,stripe_session_id:'cs_1'},
 session:{id:'cs_1',payment_status:'paid',status:'complete',mode:'payment',livemode:true,client_reference_id:'player',metadata:{purchase_id:'purchase',player_id:'player',app:'harvest-tycoon'},currency:'eur',amount_total:499,amount_subtotal:499,payment_intent:'pi_1'},
 items:{has_more:false,data:[{quantity:1,price:{id:OFFER.price}}]}
};}
test('a paid offer is credited only with contents that still make a valid offer',()=>{
 const f=fixture();assert.equal(validatePaidSession(f.session,f.purchase,f.items),'pi_1');
 const vip=fixture({diamonds:0,coins:0,vip_days:30});assert.throws(()=>validatePaidSession(vip.session,vip.purchase,vip.items),/Offer mismatch/);
 const noOffer=fixture();noOffer.purchase.offer_id=null;assert.throws(()=>validatePaidSession(noOffer.session,noOffer.purchase,noOffer.items),/Offer mismatch/);
 const cheap=fixture();cheap.session.amount_total=cheap.session.amount_subtotal=199;assert.throws(()=>validatePaidSession(cheap.session,cheap.purchase,cheap.items));
 // A purchase begun under an offer made at 200 coins a diamond (before 20 Oct 2026) is still credited when it is paid later; contents
 // worth €49.99 at neither rate are not.
 const before=fixture({diamonds:1750,coins:350000,vip_days:30});assert.equal(validatePaidSession(before.session,before.purchase,before.items),'pi_1');
 assert.equal(paidOfferProblem({diamonds:0,coins:1000000,vip_days:0}),null);assert.equal(paidOfferProblem({diamonds:0,coins:2500000}),null);
 const neither=fixture({diamonds:1750,coins:600000,vip_days:30});assert.throws(()=>validatePaidSession(neither.session,neither.purchase,neither.items),/Offer mismatch/);
 assert.equal((read('game/payments.js').match(/\|\|paidOfferProblem\(purchase\)\)\)throw new Error\('Offer mismatch\.'\);/g)??[]).length,4,'the checkout, Google Play, Apple and Kongregate');
});

test('the database checks the same rules: admin in a Google session, from level 10 (14 unless the admin picks another), one offer at a time, once per farmer',()=>{
 const sql=read('supabase/special-offer.sql');
 assert.match(sql,/min_level integer not null default 14 check \(min_level between 10 and 200\)/);
 assert.match(sql,/lvl integer:=coalesce\(p_min_level,14\);/,'a call without a level is 14');
 assert.match(sql,/ if lvl not between 10 and 200 then raise exception 'Choose a level from 10 to 200\.' using errcode='22023'; end if;/);
 assert.match(sql,/worth:=round\(\(d\+c\/500\.0\+case v when 7 then 500 when 30 then 1500 when 60 then 3000 when 90 then 4500 else 0 end\)\*499\/500\.0\);/,'the same sum as offerValueCents');
 assert.match(sql,/if abs\(worth-4999\)>4999\*0\.02 then raise exception/);
 assert.equal((sql.match(/chat_staff_role\((?:me|\(select auth\.uid\(\)\))\) is distinct from 'admin'/g)??[]).length,3,'posting, listing and stopping');
 assert.match(sql,/update public\.harvest_offers set stopped_at=now\(\) where stopped_at is null and ends_at>now\(\);\n insert into public\.harvest_offers/);
 assert.match(sql,/create unique index if not exists harvest_one_offer_per_player on public\.harvest_purchases\(player_id, offer_id\)\n where pack='offer' and status<>'expired';/);
 assert.match(sql,/vip_until:=greatest\(coalesce\(\(farm_state->>'vipExpiresAt'\)::bigint,0\),\(extract\(epoch from now\(\)\)\*1000\)::bigint\)\+purchase\.vip_days::bigint\*86400000;/,'VIP after any VIP still running');
 assert.match(sql,/revoke all on public\.harvest_offers from public, anon, authenticated;/);
});

test('the checkout takes the contents from the running offer, never from the browser',()=>{
 const fn=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(fn,/if\(!special\|\|special\.id!==body\.offerId\)return reply\(\{error:'This offer has ended\.'\},409\);/);
 assert.match(fn,/if\(special\.bought\)return reply\(\{error:'You have already bought this offer\.'\},409\);/);
 assert.match(fn,/pack=\{id:'offer',cents:OFFER\.cents,price:OFFER\.price,diamonds:special\.diamonds,coins:special\.coins,vipDays:special\.vipDays,offerId:special\.id\};/);
 assert.match(fn,/if\(\(stats\.data\?\.level\?\?1\)<o\.min_level\)return null;/);
 assert.match(fn,/if\(found\.error\)\{console\.error\('Offer unavailable',found\.error\.code\);return null;\}/,'a missing offer table never breaks the shop');
 assert.equal(read('supabase/functions/diamond-checkout/payments.js'),read('game/payments.js'));
 assert.equal(read('supabase/functions/stripe-webhook/payments.js'),read('game/payments.js'));
});

test('the offer window: its cards, once per device, a sound, and the Diamond shop banner',()=>{
 assert.deepEqual(offerParts({diamonds:1750,coins:350000,vipDays:30}).map(p=>[p.key,p.amount,p.detail]),[['diamonds','1,750','diamonds'],['coins','350,000','coins'],['vipDays','VIP','30 days']]);
 assert.deepEqual(offerParts({diamonds:5000,coins:0,vipDays:0}).map(p=>p.key),['diamonds']);
 const ui=read('src/offer-ui.js');
 assert.match(ui,/const running=\(\)=>Boolean\(offer\)&&!offer\.bought&&left\(\)>0&&fitsDevice\(offer\.audience,device\(\)\);/);
 assert.match(ui,/if\(!running\(\)\|\|seen\(\)\|\|waiting\|\|doc\.documentElement\?\.hasAttribute\?\.\('data-admin-view'\)\)return;\n  let fished=0;const quiet=\(\)=>\{if\(doc\.body\?\.classList\?\.contains\?\.\('fishing'\)\)fished=Date\.now\(\);return !doc\.querySelector\('dialog\[open\]'\)&&Date\.now\(\)-fished>=AFTER_FISHING;\};/);
 assert.match(ui,/win\.harvestSound\?\.\('offer'\);/);
 assert.match(ui,/deals\.prepend\(b\);/,'first on the shop\'s Diamonds tab, above the pass and the packs');
 assert.match(ui,/await bridge\.checkout\('offer',requestId,offer\.id\);/);
 assert.match(read('src/starter-pack-ui.js'),/window\.dispatchEvent\(new CustomEvent\('harvest-catalog',\{detail:data\}\)\);/,'no second catalogue request');
 assert.match(read('public/sound-kit.js'),/case 'offer':/);
});

test('a paid offer reaches Tag Manager with its price in euro cents (the ChatGPT Ads pixel)',async()=>{
 const {trackCommerce}=await import('../src/analytics.js');
 const win={innerWidth:390};trackCommerce('diamond_pack_completed',{pack:'offer',diamonds:3000,amount_cents:499,playerId:'private'},win);
 assert.deepEqual(win.dataLayer[0],{event:'diamond_pack_completed',device:'mobile',pack:'offer',diamonds:3000,amount_cents:499,currency:'EUR'});
 assert.equal(win.dataLayer.at(-1).event,'purchase','and the standard purchase for other ad pixels (tests/ad-events.test.mjs)');
 assert.match(read('src/payment-ui.js'),/amount=paymentPack\(result\.pack\)\.cents;/);
});

// 13 Oct 2026: the admin may let an offer open at level 10 (the shop and boosts open at 10 since 5 Oct); 14 stays the default, and
// the Starter Pack keeps its own level 14.
const OFFER_POST='offer_post(integer,integer,integer,text,integer,integer)';
// What pg_get_functiondef gives for offer_post written as in these files (its header as Postgres prints it, then the body as written).
function offerPostDef(sql){
 const start=sql.indexOf('create or replace function public.offer_post(');assert.ok(start>=0);
 const body=sql.slice(sql.indexOf('as $f$',start)+'as $f$'.length,sql.indexOf('end $f$;',start)+'end '.length);
 return `CREATE OR REPLACE FUNCTION public.offer_post(p_diamonds integer, p_coins integer, p_vip_days integer, p_audience text, p_min_level integer, p_hours integer)\n RETURNS uuid\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$${body}$function$\n`;
}
const md5=text=>createHash('md5').update(text,'utf8').digest('hex');
// The levels a file lets an offer open at: both the table's check and offer_post's must take it.
function levelTaken(sql,level){
 const table=/check \(min_level between (\d+) and (\d+)\)/.exec(sql),post=/ if lvl not between (\d+) and (\d+) then raise exception 'Choose a level from (\d+) to (\d+)\.'/.exec(sql);
 assert.ok(table&&post);assert.equal(post[1],post[3]);assert.equal(post[2],post[4],'the message names the same levels');
 return level>=Number(table[1])&&level<=Number(table[2])&&level>=Number(post[1])&&level<=Number(post[2]);
}
test('an offer can open at level 10 at the earliest, 14 unless the admin picks another: level 9 is refused (supabase/offer-level-10.sql)',()=>{
 assert.equal(OFFER.minLevel,10);assert.equal(OFFER.defaultLevel,14);assert.equal(OFFER.maxLevel,200);
 const patch=read('supabase/offer-level-10.sql'),base=read('supabase/special-offer.sql');
 for(const sql of [patch,base]){
  for(const level of [10,11,14,25,200])assert.equal(levelTaken(sql,level),true,String(level));
  for(const level of [9,1,0,201])assert.equal(levelTaken(sql,level),false,String(level));
 }
 // The live database: the table's own check and offer_post, built from the live definition with an md5 guard, re-runnable.
 assert.match(patch,/alter table public\.harvest_offers drop constraint if exists harvest_offers_min_level_check;\nalter table public\.harvest_offers add constraint harvest_offers_min_level_check check \(min_level between 10 and 200\);/);
 assert.doesNotMatch(patch,/alter column min_level|set default/,'the default stays 14');
 const live=offerPostDef(read('supabase/special-offer-vip-60-90.sql')),patched=offerPostDef(patch);
 assert.equal(md5(live),'248e13ffd02423154bad639989a4ef6b','the definition live on 13 Oct 2026');
 const guard=patch.match(/if md5\(pg_get_functiondef\('public\.(.+?)'::regprocedure\)\)\n  not in \('([0-9a-f]{32})','([0-9a-f]{32})'\) then\n  raise exception/);
 assert.ok(guard);assert.equal(guard[1],OFFER_POST);assert.deepEqual([guard[2],guard[3]],[md5(live),md5(patched)],'the live one, or this file already run');
 assert.ok(patch.indexOf('$guard$')<patch.indexOf('alter table'),'the guard first');
 // And a check at the end: offer_post exactly as written (a € mangled by a clipboard that was not UTF-8 gives another md5) and the
 // table's check as Postgres prints between 10 and 200; otherwise the file stops (one transaction in the SQL editor).
 const after=patch.match(/do \$after\$\nbegin\n if md5\(pg_get_functiondef\('public\.(.+?)'::regprocedure\)\)<>'([0-9a-f]{32})'\n  or \(select pg_get_constraintdef\(c\.oid\) from pg_constraint c where c\.conrelid='public\.harvest_offers'::regclass and c\.conname='harvest_offers_min_level_check'\)\n   is distinct from 'CHECK \(\(\(min_level >= 10\) AND \(min_level <= 200\)\)\)' then\n  raise exception /);
 assert.ok(after,'the check at the end');assert.equal(after[1],OFFER_POST);assert.equal(after[2],md5(patched));
 assert.ok(patch.lastIndexOf('$after$')>patch.indexOf('end $f$;'),'after offer_post is replaced');assert.match(patched,/€49\.99/,'the € it guards');
 assert.equal(patched.replace('c/200.0','c/500.0'),offerPostDef(base),'supabase/special-offer.sql gives the same function, with coins at 500 since 20 Oct 2026');
 // Only the level line differs from the live function.
 const diff=(a,b)=>a.split('\n').filter((line,i)=>line!==b.split('\n')[i]);
 assert.equal(live.split('\n').length,patched.split('\n').length);
 assert.deepEqual(diff(patched,live),[" if lvl not between 10 and 200 then raise exception 'Choose a level from 10 to 200.' using errcode='22023'; end if;"]);
 // The Admin panel: from 10, 14 filled in, and 14 when the field is empty.
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/<input id="admin-offer-level" type="number" min="'\+OFFER\.minLevel\+'" max="'\+OFFER\.maxLevel\+'" step="1" value="'\+OFFER\.defaultLevel\+'" inputmode="numeric">/);
 assert.match(admin,/minLevel:Number\(\$o\('level'\)\.value\)\|\|OFFER\.defaultLevel,hours\}\)/);
 assert.match(read('src/chat-client.js'),/postOffer:\(\{diamonds=0,coins=0,vipDays=0,audience='all',minLevel=14,hours=48\}\)=>rpc\('offer_post'/);
 // diamond-checkout shows an offer from its own level, whatever it is.
 assert.match(read('supabase/functions/diamond-checkout/index.ts'),/if\(\(stats\.data\?\.level\?\?1\)<o\.min_level\)return null;/);
});
test('the Starter Pack keeps its own level 14',()=>{
 assert.equal(STARTER_LEVEL,14);assert.notEqual(OFFER.minLevel,STARTER_LEVEL);
 const fn=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(fn,/'The Starter Pack opens when you reach level 14 and is then available for 7 days\.'/);
 assert.match(fn,/if\(packId==='starter'&&!starter\.eligible\)return reply/);
 assert.doesNotMatch(read('supabase/offer-level-10.sql').replace(/^--.*$/gm,''),/starter/i,'the patch touches nothing of it');
});
test('the iPhone app never shows or sells a special offer until Apple sells special_offer, also an offer from level 10',()=>{
 assert.equal(APPLE_SELLS_OFFER,true,'special_offer goes to App Review with the app 1.5 (22 Oct 2026)');
 assert.equal(APPLE_PRODUCTS.offer,'special_offer');assert.equal(PLAY_PRODUCTS.offer,'special_offer','Google Play sells it as before');
 // The server: no offer in the iPhone app's catalogue, and its offer checkout finds none ('This offer has ended.').
 const fn=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(fn,/\(body\.operation==='catalog'\|\|body\.pack==='offer'\)&&\(!apple\|\|APPLE_SELLS_OFFER\)\?currentOffer\(user\.id\):null\]\);/);
 assert.match(fn,/const play=body\.store==='google_play',apple=body\.store==='app_store',/);
 assert.match(fn,/if\(!special\|\|special\.id!==body\.offerId\)return reply\(\{error:'This offer has ended\.'\},409\);/);
 for(const name of ['diamond-checkout','stripe-webhook','play-voided','app-store-notify'])assert.equal(read(`supabase/functions/${name}/payments.js`),read('game/payments.js'),name);
 // The page: none in the App Store's catalogue, whatever Apple prices (tests/auth-gate.test.mjs plays it).
 assert.match(read('src/main.js'),/offer:prices\.offer&&\(!appStore\|\|APPLE_SELLS_OFFER\)\?data\?\.offer\?\?null:null,/);
 assert.match(read('src/admin-dashboard.js'),/\(APPLE_SELLS_OFFER\?'':' The iPhone app does not show it until Apple has approved it as an in-app purchase\.'\)/,'the admin is told');
});
// 20 Oct 2026 (the owner: "1 diamond = 500 coins"): offer_post values coins at 500 a diamond, as offerValueCents. Built from the live
// definition (the one supabase/offer-level-10.sql gives) with an md5 guard, re-runnable, and only the sum changed.
test('the database values the coins in an offer at 500 a diamond too (supabase/offer-coins-500.sql)',()=>{
 assert.equal(OFFER.coinsPerDiamond,500);assert.equal(OFFER.coinsPerDiamondBefore,200);
 const patch=read('supabase/offer-coins-500.sql'),live=offerPostDef(read('supabase/offer-level-10.sql')),patched=offerPostDef(patch);
 assert.equal(md5(live),'6e7d4f9a43cde06be7806c57fdb311e2','the definition live on 20 Oct 2026');
 assert.equal(md5(patched),'2a12640e84d223cd0e4827abc2c9fafc','what the live database gives for the same replace');
 const guard=patch.match(/if md5\(pg_get_functiondef\('public\.(.+?)'::regprocedure\)\)\n  not in \('([0-9a-f]{32})','([0-9a-f]{32})'\) then\n  raise exception/);
 assert.ok(guard);assert.equal(guard[1],OFFER_POST);assert.deepEqual([guard[2],guard[3]],[md5(live),md5(patched)],'the live one, or this file already run');
 assert.ok(patch.indexOf('$guard$')<patch.indexOf('create or replace function'),'the guard first');
 const after=patch.match(/do \$after\$\nbegin\n if md5\(pg_get_functiondef\('public\.(.+?)'::regprocedure\)\)<>'([0-9a-f]{32})' then\n  raise exception /);
 assert.ok(after,'the check at the end');assert.equal(after[1],OFFER_POST);assert.equal(after[2],md5(patched));
 assert.ok(patch.lastIndexOf('$after$')>patch.indexOf('end $f$;'),'after offer_post is replaced');assert.match(patched,/€49\.99/,'the € it guards');
 const diff=(a,b)=>a.split('\n').filter((line,i)=>line!==b.split('\n')[i]);
 assert.equal(live.split('\n').length,patched.split('\n').length);
 assert.deepEqual(diff(patched,live),[' worth:=round((d+c/500.0+case v when 7 then 500 when 30 then 1500 when 60 then 3000 when 90 then 4500 else 0 end)*499/500.0);']);
 assert.equal(patched,offerPostDef(read('supabase/special-offer.sql')),'supabase/special-offer.sql gives the same function');
 assert.doesNotMatch(patch.replace(/^--.*$/gm,''),/alter table|harvest_purchases|starter/i,'the patch touches nothing else');
 // The same sum: what the Admin panel fills is worth €49.99 for the database (its formula, run here) and for offerProblem.
 const sqlWorth=(d,c,v)=>Math.round((d+c/500.0+({7:500,30:1500,60:3000,90:4500}[v]??0))*499/500.0);
 for(const vipDays of [0,7,30,60,90])for(const kinds of [{diamonds:true},{coins:true},{diamonds:true,coins:true}]){
  const o=offerFill({...kinds,vipDays});assert.ok(Math.abs(sqlWorth(o.diamonds,o.coins,o.vipDays)-4999)<=4999*0.02,JSON.stringify(o));assert.equal(sqlWorth(o.diamonds,o.coins,o.vipDays),offerValueCents(o));
 }
});
