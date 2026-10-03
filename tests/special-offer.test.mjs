import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OFFER,offerValueCents,offerProblem,offerFill,validatePaidSession} from '../game/payments.js';
import {offerParts,offerDiscount} from '../src/offer-ui.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('a special offer is worth €49.99 at shop prices and sells for €4.99 (90% off)',()=>{
 assert.equal(OFFER.cents,499);assert.equal(OFFER.valueCents,4999);assert.equal(offerDiscount({cents:OFFER.cents,valueCents:OFFER.valueCents}),90);
 assert.equal(offerValueCents({diamonds:500}),499,'a diamond as in the 500 pack');
 assert.equal(offerValueCents({coins:200}),1,'200 coins a diamond');
 assert.equal(offerValueCents({coins:1000}),offerValueCents({diamonds:5}),'1,000 coins = 5 diamonds');
 assert.equal(offerValueCents({vipDays:30}),offerValueCents({diamonds:1500}),'VIP at its diamond price');
 assert.equal(offerValueCents({vipDays:7}),offerValueCents({diamonds:500}));
 assert.equal(offerValueCents({vipDays:60}),offerValueCents({diamonds:3000}),'60 days: two 30-day plans');
 assert.equal(offerValueCents({vipDays:90}),offerValueCents({diamonds:4500}),'90 days: three 30-day plans');
 assert.equal(offerProblem({diamonds:500,vipDays:90}),null);
 assert.match(offerProblem({vipDays:90}),/must be worth €49\.99/,'VIP alone never reaches €49.99');
 assert.equal(offerProblem({diamonds:5000}),null);
 assert.equal(offerProblem({coins:1000000}),null);
 assert.match(offerProblem({coins:1250000}),/must be worth €49\.99/);
 assert.equal(offerProblem({diamonds:3500,vipDays:30}),null);
 assert.match(offerProblem({vipDays:30}),/must be worth €49\.99; it is worth €14\.97/);
 assert.match(offerProblem({diamonds:6000}),/must be worth €49\.99/);
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
 assert.deepEqual(offerFill({diamonds:true,coins:true,vipDays:30}),{diamonds:1750,coins:350000,vipDays:30});
});

function fixture(contents={diamonds:1750,coins:350000,vip_days:30}){return {
 purchase:{id:'purchase',player_id:'player',pack:'offer',offer_id:'00000000-0000-4000-8000-000000000001',...contents,amount_cents:499,price_id:OFFER.price,livemode:true,stripe_session_id:'cs_1'},
 session:{id:'cs_1',payment_status:'paid',status:'complete',mode:'payment',livemode:true,client_reference_id:'player',metadata:{purchase_id:'purchase',player_id:'player',app:'harvest-tycoon'},currency:'eur',amount_total:499,amount_subtotal:499,payment_intent:'pi_1'},
 items:{has_more:false,data:[{quantity:1,price:{id:OFFER.price}}]}
};}
test('a paid offer is credited only with contents that still make a valid offer',()=>{
 const f=fixture();assert.equal(validatePaidSession(f.session,f.purchase,f.items),'pi_1');
 const vip=fixture({diamonds:0,coins:0,vip_days:30});assert.throws(()=>validatePaidSession(vip.session,vip.purchase,vip.items),/Offer mismatch/);
 const noOffer=fixture();noOffer.purchase.offer_id=null;assert.throws(()=>validatePaidSession(noOffer.session,noOffer.purchase,noOffer.items),/Offer mismatch/);
 const cheap=fixture();cheap.session.amount_total=cheap.session.amount_subtotal=199;assert.throws(()=>validatePaidSession(cheap.session,cheap.purchase,cheap.items));
});

test('the database checks the same rules: admin in a Google session, from level 14, one offer at a time, once per farmer',()=>{
 const sql=read('supabase/special-offer.sql');
 assert.match(sql,/min_level integer not null default 14 check \(min_level between 14 and 200\)/);
 assert.match(sql,/worth:=round\(\(d\+c\/200\.0\+case v when 7 then 500 when 30 then 1500 when 60 then 3000 when 90 then 4500 else 0 end\)\*499\/500\.0\);/,'the same sum as offerValueCents');
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
 assert.match(ui,/if\(!running\(\)\|\|seen\(\)\|\|waiting\|\|doc\.documentElement\?\.hasAttribute\?\.\('data-admin-view'\)\)return;\n  const quiet=\(\)=>!doc\.querySelector\('dialog\[open\]'\);/);
 assert.match(ui,/win\.harvestSound\?\.\('offer'\);/);
 assert.match(ui,/wallet\.after\(b\);/);
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
