import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {OFFER,OFFER_DISCOUNTS,offerValueCents,offerProblem,offerFill,offerDiscountOf,offerVipFits,paidOfferProblem,validatePaidSession,PLAY_PRODUCTS,APPLE_PRODUCTS} from '../game/payments.js';
import {offerDiscount} from '../src/offer-ui.js';

// 21 Oct 2026 (the owner: "kiezen uit 33%, 50% of 90% korting in de actie i.p.v. enkel 90%"): the price stays €4.99, the same store
// product everywhere; what is in the offer follows the discount the admin picks.
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const md5=text=>createHash('md5').update(text,'utf8').digest('hex');
const OFFER_POST='offer_post(integer,integer,integer,text,integer,integer)';
function offerPostDef(sql){
 const start=sql.indexOf('create or replace function public.offer_post(');assert.ok(start>=0);
 const body=sql.slice(sql.indexOf('as $f$',start)+'as $f$'.length,sql.indexOf('end $f$;',start)+'end '.length);
 return `CREATE OR REPLACE FUNCTION public.offer_post(p_diamonds integer, p_coins integer, p_vip_days integer, p_audience text, p_min_level integer, p_hours integer)\n RETURNS uuid\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$${body}$function$\n`;
}

test('three discounts: worth €49.99 at 90% off, €9.98 at 50%, €7.45 at 33%, always for €4.99',()=>{
 assert.deepEqual(OFFER_DISCOUNTS,[90,50,33]);assert.equal(OFFER.defaultDiscount,90);
 assert.deepEqual(Object.fromEntries(OFFER_DISCOUNTS.map(d=>[d,{...OFFER.discounts[d]}])),{90:{valueCents:4999,target:5000,shownCents:5000},50:{valueCents:998,target:1000,shownCents:1000},33:{valueCents:745,target:750,shownCents:750}});
 assert.equal(OFFER.valueCents,OFFER.discounts[90].valueCents,'90% is the offer as before');assert.equal(OFFER.target,OFFER.discounts[90].target);
 assert.equal(OFFER.cents,499);assert.equal(OFFER.price,'price_1UL3qr04FdNTUSp41m7H0DCp','one Stripe price for every discount');
 assert.equal(PLAY_PRODUCTS.offer,'special_offer');assert.equal(APPLE_PRODUCTS.offer,'special_offer');
 // The discount each worth stands for, from the €4.99 price.
 for(const d of OFFER_DISCOUNTS)assert.equal(offerDiscount({cents:OFFER.cents,valueCents:OFFER.discounts[d].valueCents}),d);
 // The 2% bands never touch, so a worth belongs to one discount at most.
 const band=d=>[OFFER.discounts[d].valueCents*0.98,OFFER.discounts[d].valueCents*1.02];
 assert.ok(band(33)[1]<band(50)[0]&&band(50)[1]<band(90)[0]);
 assert.equal(offerDiscountOf(745),33);assert.equal(offerDiscountOf(731),33);assert.equal(offerDiscountOf(730),null);assert.equal(offerDiscountOf(759),33);assert.equal(offerDiscountOf(760),null);
 assert.equal(offerDiscountOf(998),50);assert.equal(offerDiscountOf(979),50);assert.equal(offerDiscountOf(978),null);assert.equal(offerDiscountOf(1017),50);assert.equal(offerDiscountOf(1018),null);
 assert.equal(offerDiscountOf(4999),90);assert.equal(offerDiscountOf(4900),90);assert.equal(offerDiscountOf(4899),null);
 assert.equal(offerDiscountOf(2500),null);
});

test('the Admin panel fills each discount with a valid offer of that worth, VIP only where it fits',()=>{
 for(const discount of OFFER_DISCOUNTS)for(const vipDays of [0,7,30,60,90])for(const kinds of [{diamonds:true},{coins:true},{diamonds:true,coins:true}]){
  const o=offerFill({...kinds,vipDays,discount});
  if(!offerVipFits(vipDays,discount)){assert.deepEqual(o,{diamonds:0,coins:0,vipDays},'VIP worth more than the offer leaves nothing to fill');assert.ok(offerProblem(o));continue;}
  assert.equal(offerProblem(o),null,JSON.stringify(o));assert.equal(offerDiscountOf(offerValueCents(o)),discount,JSON.stringify(o));
  assert.equal(offerDiscount({cents:OFFER.cents,valueCents:offerValueCents(o)}),discount,'the window shows the discount picked');
  assert.equal(o.diamonds>0,Boolean(kinds.diamonds));assert.equal(o.coins>0,Boolean(kinds.coins));assert.equal(o.diamonds%50,0);
 }
 assert.deepEqual(OFFER_DISCOUNTS.map(d=>[0,7,30,60,90].filter(v=>offerVipFits(v,d))),[[0,7,30,60,90],[0,7],[0,7]]);
 // What the owner sees for each.
 assert.deepEqual(offerFill({diamonds:true,coins:true,vipDays:60}),{diamonds:1000,coins:500000,vipDays:60},'90% as before (the default)');
 assert.deepEqual(offerFill({diamonds:true,coins:true,vipDays:7,discount:50}),{diamonds:250,coins:125000,vipDays:7});
 assert.deepEqual(offerFill({diamonds:true,discount:50}),{diamonds:1000,coins:0,vipDays:0});
 assert.deepEqual(offerFill({coins:true,discount:50}),{diamonds:0,coins:500000,vipDays:0});
 assert.deepEqual(offerFill({diamonds:true,coins:true,discount:33}),{diamonds:400,coins:175000,vipDays:0});
 assert.deepEqual(offerFill({diamonds:true,vipDays:7,discount:33}),{diamonds:250,coins:0,vipDays:7});
 assert.deepEqual(offerFill({coins:true,vipDays:7,discount:33}),{diamonds:0,coins:125000,vipDays:7});
 assert.equal(offerValueCents({diamonds:1000}),998);assert.equal(offerValueCents({diamonds:750}),749);assert.equal(offerValueCents({diamonds:5000}),4990);
 // Amounts in between are refused, with the three worths named.
 assert.equal(offerProblem({diamonds:2500}),'The offer must be worth €7.45, €9.98 or €49.99; it is worth €24.95.');
 assert.equal(offerProblem({diamonds:1000}),null);assert.equal(offerProblem({diamonds:750}),null);assert.equal(offerProblem({vipDays:7,diamonds:500}),null);
});

test('a paid 33% or 50% offer is credited; an old 90% offer at 200 coins a diamond still is',()=>{
 for(const contents of [{diamonds:1000,coins:0,vip_days:0},{diamonds:250,coins:125000,vip_days:7},{diamonds:400,coins:175000,vip_days:0},{diamonds:0,coins:375000,vip_days:0}])assert.equal(paidOfferProblem(contents),null,JSON.stringify(contents));
 assert.equal(paidOfferProblem({diamonds:1750,coins:350000,vip_days:30}),null,'made at 200 coins a diamond, before 20 Oct 2026');
 assert.ok(paidOfferProblem({diamonds:2500,coins:0,vip_days:0}),'worth none of the three');
 const purchase={id:'purchase',player_id:'player',pack:'offer',offer_id:'00000000-0000-4000-8000-000000000001',diamonds:250,coins:125000,vip_days:7,amount_cents:499,price_id:OFFER.price,livemode:true,stripe_session_id:'cs_1'};
 const session={id:'cs_1',payment_status:'paid',status:'complete',mode:'payment',livemode:true,client_reference_id:'player',metadata:{purchase_id:'purchase',player_id:'player',app:'harvest-tycoon'},currency:'eur',amount_total:499,amount_subtotal:499,payment_intent:'pi_1'};
 assert.equal(validatePaidSession(session,purchase,{has_more:false,data:[{quantity:1,price:{id:OFFER.price}}]}),'pi_1','the same €4.99 Stripe price');
});

test('the database takes the same three worths (supabase/offer-discount.sql): md5 guard, one line changed, a check at the end',()=>{
 const patch=read('supabase/offer-discount.sql'),live=offerPostDef(read('supabase/offer-coins-500.sql')),patched=offerPostDef(patch);
 assert.equal(md5(live),'2a12640e84d223cd0e4827abc2c9fafc','the definition live on 21 Oct 2026');
 assert.equal(md5(patched),'95e353a5f6665cec26b31e29035109b9');
 const guard=patch.match(/if md5\(pg_get_functiondef\('public\.(.+?)'::regprocedure\)\)\n  not in \('([0-9a-f]{32})','([0-9a-f]{32})'\) then\n  raise exception/);
 assert.ok(guard);assert.equal(guard[1],OFFER_POST);assert.deepEqual([guard[2],guard[3]],[md5(live),md5(patched)],'the live one, or this file already run');
 assert.ok(patch.indexOf('$guard$')<patch.indexOf('create or replace function'),'the guard first');
 const after=patch.match(/do \$after\$\nbegin\n if md5\(pg_get_functiondef\('public\.(.+?)'::regprocedure\)\)<>'([0-9a-f]{32})' then\n  raise exception /);
 assert.ok(after);assert.equal(after[1],OFFER_POST);assert.equal(after[2],md5(patched));assert.ok(patch.lastIndexOf('$after$')>patch.indexOf('end $f$;'));
 const diff=(a,b)=>a.split('\n').filter((line,i)=>line!==b.split('\n')[i]);
 assert.equal(live.split('\n').length,patched.split('\n').length);
 assert.deepEqual(diff(patched,live),[" if abs(worth-4999)>4999*0.02 and abs(worth-998)>998*0.02 and abs(worth-745)>745*0.02 then raise exception 'The offer must be worth €7.45, €9.98 or €49.99; it is worth €%.', to_char(worth/100.0,'FM990.00') using errcode='22023'; end if;"]);
 assert.doesNotMatch(patch.replace(/^--.*$/gm,''),/alter table|create table|harvest_purchases|grant /i,'no new column, check or grant: the worth says which discount it is');
 // The same numbers as game/payments.js, and the same yes/no for every worth around the three.
 const targets=[...patched.matchAll(/abs\(worth-(\d+)\)>(\d+)\*0\.02/g)].map(m=>{assert.equal(m[1],m[2]);return Number(m[1]);});
 assert.deepEqual(targets.sort((a,b)=>b-a),OFFER_DISCOUNTS.map(d=>OFFER.discounts[d].valueCents));
 const sqlTakes=worth=>!targets.every(t=>Math.abs(worth-t)>t*0.02);
 for(let worth=600;worth<=5200;worth++)assert.equal(sqlTakes(worth),offerDiscountOf(worth)!=null,String(worth));
 assert.equal(offerProblem({diamonds:2500}),patched.match(/'(The offer must be worth [^']+)'/)[1].replace('%','24.95'),'the same message');
});

test('the screens show the real worth of what is in the offer, never a fixed €49.99',()=>{
 const fn=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(fn,/cents:OFFER\.cents,valueCents:offerShownCents\(\{diamonds:o\.diamonds,coins:o\.coins,vipDays:o\.vip_days\}\),bought:/);
 assert.doesNotMatch(fn,/valueCents:OFFER\.valueCents/);
 const ui=read('src/offer-ui.js');
 assert.match(ui,/function preview\(\{diamonds=0,coins=0,vipDays=0,valueCents=4999,hours=48\}=\{\}\)/);
 assert.match(ui,/cents:499,valueCents,endsAt:/);assert.doesNotMatch(ui.replace(/^\s*\/\/.*$/gm,''),/49\.99|4999,endsAt|10x/);
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/<select id="admin-offer-discount">'\+OFFER_DISCOUNTS\.map\(/);
 assert.match(admin,/offerFill\(\{diamonds:\$o\('has-diamonds'\)\.checked,coins:\$o\('has-coins'\)\.checked,vipDays:Number\(\$o\('vip'\)\.value\)\|\|0,discount\}\)/);
 assert.match(admin,/\['discount','has-diamonds','has-coins','vip'\]\.forEach\(id=>\$o\(id\)\.addEventListener\('change',offerRefill\)\);/);
 assert.match(admin,/window\.harvestOffer\?\.preview\(\{\.\.\.o,valueCents:offerShownCents\(o\),hours:/);
 for(const f of ['diamond-checkout','stripe-webhook','play-voided','app-store-notify'])assert.equal(read(`supabase/functions/${f}/payments.js`),read('game/payments.js'),f);
});

test('players see the round worth of the discount: €50, €10 or €7.50 (the owner, 21 Oct 2026: "dus €50, €10 of €7.50")',async()=>{
 const pay=await import('../game/payments.js'),{shopWorth}=await import('../public/android.js');
 for(const [d,shown,text] of [[90,5000,'€50'],[50,1000,'€10'],[33,750,'€7.50']]){
  const o=pay.offerFill({diamonds:true,coins:true,discount:d});
  assert.equal(pay.offerShownCents(o),shown);assert.equal(shopWorth(null,'offer',pay.OFFER.cents,shown),text);
  assert.equal(Math.round((1-pay.OFFER.cents/shown)*100),d,'the window still says the discount picked');
 }
 assert.equal(pay.offerShownCents({diamonds:5000}),5000,'5,000 diamonds add up to €49.90 but show €50');
 assert.equal(pay.offerShownCents({diamonds:300}),pay.offerValueCents({diamonds:300}),'no discount: the sum itself');
 assert.equal(shopWorth(null,'offer',499,4999),'€49.99','a worth with cents keeps them');
});
