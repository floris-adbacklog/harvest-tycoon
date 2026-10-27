import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SALE,saleKind,salePack,saleRunning,bonusFor,saleBonus,saleRow,saleCatalog,salePurchaseProblem,PAYMENT_PACKS,validatePaidSession,checkPlayPurchase,checkApplePurchase,checkKongPurchase} from '../game/payments.js';
import {SALE_TITLES,saleTitle,shopSale,shopSaleBonus,saleBanner} from '../public/diamond-sale.js';
import {diamondPackCards} from '../public/boosts-ui.js';
import {LANGUAGES} from '../public/languages.js';

// The Sale (27 Oct 2026, the owner): 40% more diamonds in every plain pack for the same price, 1 to 72 hours, started by the admin
// under a name from a fixed list; decided when the purchase row is made, kept on the row and credited once; a refund takes it back.
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const NOW=Date.UTC(2026,9,27,12),SALE_ID='5a1e0000-0000-4000-8000-000000000001',FARMER='0000000a-0000-4000-8000-000000000000',ROW='1111111a-0000-4000-8000-00000000000a';
const running={id:SALE_ID,kind:'halloween',percent:40,endsAt:NOW+3600000};
const sql=read('supabase/diamond-sale.sql');

test('the bonus: 40% of the pack, rounded, capped at 2,000; the price never changes',()=>{
 assert.equal(SALE.percent,40);assert.equal(SALE.minHours,1);assert.equal(SALE.maxHours,72);assert.equal(SALE.maxBonus,2000);
 assert.deepEqual(SALE.packs.map(id=>[id,saleBonus(id,running,NOW)]),[['150',60],['500',200],['1250',500],['3500',1400]]);
 assert.equal(bonusFor(10000),2000,'capped');assert.equal(bonusFor(5000),2000);assert.equal(bonusFor(4999),2000);assert.equal(bonusFor(4000),1600);
 assert.equal(bonusFor(3),1,'rounded');assert.equal(bonusFor(1),0);
 for(const bad of [0,-500,1.5,NaN,'500',null,undefined])assert.equal(bonusFor(bad),0,String(bad));
 // The four packs keep their amounts and prices (the store products are not changed).
 assert.deepEqual(SALE.packs.map(id=>[PAYMENT_PACKS[id].diamonds,PAYMENT_PACKS[id].cents]),[[150,199],[500,499],[1250,999],[3500,2499]]);
 assert.deepEqual(saleRow('500',running,NOW),{sale_id:SALE_ID,sale_bonus:200});
 assert.deepEqual(saleCatalog(running,NOW),{id:SALE_ID,kind:'halloween',percent:40,endsAt:NOW+3600000,bonus:{150:60,500:200,1250:500,3500:1400}});
});

test('only during a running Sale',()=>{
 for(const sale of [null,undefined,{},{...running,id:'not-a-uuid'},{...running,endsAt:NOW},{...running,endsAt:NOW-1},{...running,endsAt:undefined}]){
  assert.equal(saleRunning(sale,NOW),null,JSON.stringify(sale));assert.equal(saleBonus('500',sale,NOW),0);assert.deepEqual(saleRow('500',sale,NOW),{});assert.equal(saleCatalog(sale,NOW),null);
 }
 assert.equal(saleBonus('500',running,NOW+3600000),0,'over at its end');assert.equal(saleBonus('500',running,NOW+3599999),200);
 // An unknown kind shows as the plain Sale.
 assert.equal(saleCatalog({...running,kind:'bogus'},NOW).kind,'sale');
});

test('only the plain diamond packs: not the Starter Pack, the special offer, a pass, the Season Pass or an old pack id',()=>{
 for(const pack of ['starter','offer','pass','season','100','300','600','1000','2000','50','coins','vip',undefined,null,500])
  {assert.equal(salePack(pack),false,String(pack));assert.equal(saleBonus(pack,running,NOW),0);assert.deepEqual(saleRow(pack,running,NOW),{});}
 assert.deepEqual(SALE.packs,['150','500','1250','3500']);
 // The database says the same (harvest_purchases_sale_check).
 assert.match(sql,/sale_bonus>0 and sale_id is not null and pack in \('150','500','1250','3500'\) and sale_bonus=least\(2000,round\(diamonds\*0\.4\)::integer\)/);
});

test('a purchase row is only paid with the bonus it was made with: every store checks it before crediting',()=>{
 const good={sale_id:SALE_ID,sale_bonus:200};
 assert.equal(salePurchaseProblem({pack:'500',diamonds:500}),null,'an old row without the columns');
 assert.equal(salePurchaseProblem({pack:'500',diamonds:500,sale_id:null,sale_bonus:0}),null);
 assert.equal(salePurchaseProblem({pack:'500',diamonds:500,...good}),null);
 for(const bad of [{pack:'500',diamonds:500,sale_id:SALE_ID,sale_bonus:201},{pack:'500',diamonds:500,sale_id:null,sale_bonus:200},{pack:'500',diamonds:500,sale_id:'x',sale_bonus:200},
  {pack:'500',diamonds:500,sale_id:SALE_ID,sale_bonus:0},{pack:'starter',diamonds:500,...good},{pack:'offer',diamonds:500,...good},{pack:'1000',diamonds:1000,sale_id:SALE_ID,sale_bonus:400}])
  assert.equal(salePurchaseProblem(bad),'Sale mismatch.',JSON.stringify(bad));
 // Stripe
 const pack=PAYMENT_PACKS['500'];
 const purchase=over=>({id:ROW,player_id:FARMER,pack:'500',diamonds:500,amount_cents:499,price_id:pack.price,livemode:true,stripe_session_id:'cs_1',...over});
 const session={id:'cs_1',payment_status:'paid',status:'complete',mode:'payment',livemode:true,client_reference_id:FARMER,metadata:{purchase_id:ROW,player_id:FARMER,app:'harvest-tycoon'},currency:'eur',amount_total:499,amount_subtotal:499,payment_intent:'pi_1'};
 const items={has_more:false,data:[{quantity:1,price:{id:pack.price}}]};
 assert.equal(validatePaidSession(session,purchase(good),items),'pi_1','the same Stripe price with the bonus');
 assert.throws(()=>validatePaidSession(session,purchase({...good,sale_bonus:500}),items),/Sale mismatch/);
 // Google Play
 const row=over=>({id:ROW,player_id:FARMER,pack:'500',diamonds:500,coins:0,amount_cents:499,price_id:'diamonds_500',status:'pending',livemode:true,vip_days:0,...over});
 const google={kind:'androidpublisher#productPurchase',purchaseState:0,consumptionState:0,orderId:'GPA.1',quantity:1,obfuscatedExternalAccountId:FARMER,obfuscatedExternalProfileId:ROW};
 assert.equal(checkPlayPurchase(google,row({...good,store:'google_play'}),{product:'diamonds_500',player:FARMER}).state,'purchased');
 assert.throws(()=>checkPlayPurchase(google,row({sale_id:SALE_ID,sale_bonus:1,store:'google_play'}),{product:'diamonds_500',player:FARMER}),/Sale mismatch/);
 // The App Store
 const apple={transactionId:'2000000123456789',originalTransactionId:'2000000123456789',bundleId:'com.harvesttycoon.app',productId:'diamonds_500',type:'Consumable',quantity:1,environment:'Production',appAccountToken:ROW};
 assert.equal(checkApplePurchase(apple,row({...good,store:'app_store'}),{product:'diamonds_500',player:FARMER}).state,'purchased');
 assert.throws(()=>checkApplePurchase(apple,row({sale_id:null,sale_bonus:200,store:'app_store'}),{product:'diamonds_500',player:FARMER}),/Sale mismatch/);
 // Kreds
 assert.deepEqual(checkKongPurchase(row({...good,store:'kongregate'}),{product:'diamonds_500',player:FARMER}),{product:'diamonds_500'});
 assert.throws(()=>checkKongPurchase(row({pack:'starter',diamonds:500,coins:10000,amount_cents:299,price_id:'starter_pack',...good,store:'kongregate'}),{product:'starter_pack',player:FARMER}),/mismatch/);
 // Every function copy of payments.js is game/payments.js.
 for(const fn of ['diamond-checkout','stripe-webhook','play-voided','app-store-notify','checkout-reminder'])assert.equal(read(`supabase/functions/${fn}/payments.js`),read('game/payments.js'),fn);
});

test('diamond-checkout decides the bonus when the row is made, for Stripe, Google Play, the App Store and Kreds, never from the page',()=>{
 const fn=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(fn,/const found=await admin\.rpc\('diamond_sale_now'\);/);
 assert.match(fn,/catch\(e\)\{console\.error\('Sale unavailable',e\?\.name\);return null;\}/,'a problem only leaves the Sale out');
 // The website's row and every app/Kreds row get the Sale of this request; nothing of the body decides it.
 assert.match(fn,/\.\.\.\(packId==='pass'\|\|packId==='season'\?\{pass_id:pack\.passId\}:\{\}\),\.\.\.saleRow\(packId,sale\)\}\);/);
 assert.match(fn,/\.\.\.\(pack\.id==='pass'\|\|pack\.id==='season'\?\{pass_id:pack\.passId\}:\{\}\),\.\.\.saleRow\(pack\.id,sale\)\}\);/);
 assert.match(fn,/appCreate\(play\?'google_play':apple\?'app_store':'kongregate',user\.id,pack,body\.requestId,starter,sale\)/);
 assert.doesNotMatch(fn,/body\.(sale|bonus|saleBonus)/,'the page never says the bonus');
 assert.equal((fn.match(/saleRow\(/g)??[]).length,2);
 // Never for CrazyGames or Discord (they buy nothing); the catalogue carries it for the shop, the status the bonus for the result.
 assert.match(fn,/saleHere=portal!=='crazygames'&&portal!=='discord'/);
 assert.match(fn,/\(body\.operation==='catalog'\|\|body\.operation==='create'\)&&saleHere\?currentSale\(\):null\]\);/);
 assert.match(fn,/sale:saleCatalog\(sale\),packs:/);
 assert.match(fn,/saleBonus:p\.sale_bonus\?\?0,/);
 // A Kreds pack bought without a row of ours gets the Sale running when its row is made (harvest_credit_kong_pack).
 assert.match(sql,/kreds,sale_id,sale_bonus\)\n   select made,[^\n]*s\.id,case when s\.id is null then 0 else least\(2000,round\(d\*0\.4\)::integer\) end/);
 // The result window counts the bonus.
 assert.match(read('src/payment-ui.js'),/\(Number\(result\.diamonds\)\+\(Number\(result\.saleBonus\)\|\|0\)\)\.toLocaleString\('en-US'\)\} diamonds have been added/);
});

test('credited once, and a refund takes the bonus back: only the grant adds it, every refund takes it off',()=>{
 const patch=name=>{const at=sql.indexOf(`select pg_temp.sale_patch('${name}`);assert.ok(at>0,name);return sql.slice(at,sql.indexOf(');\n',at));};
 // harvest_purchase_grant runs once per row: from the crediting functions, which answer a row credited before as a duplicate.
 assert.match(patch('harvest_purchase_grant(uuid)'),/\+purchase\.diamonds\+purchase\.sale_bonus\)\);/);
 assert.equal((sql.match(/\+purchase\.sale_bonus\)\);/g)??[]).length,1,'added to the farm in one place');
 for(const fn of ['harvest_revoke_play_purchases(jsonb)','harvest_revoke_apple_purchases(jsonb)','harvest_revoke_kong_purchases(jsonb)']){
  const p=patch(fn);
  assert.match(p,/-purchase\.diamonds-purchase\.sale_bonus\)\)\);/,fn);
  assert.match(p,/to_char\(purchase\.diamonds\+purchase\.sale_bonus,'FM999G999'\)\|\|' diamonds' end/,fn);
 }
 // The crediting functions themselves are not touched: their once-only checks stay as they are live.
 for(const fn of ['harvest_credit_purchase','harvest_credit_play_purchase','harvest_credit_apple_purchase','harvest_credit_kong_purchase('])assert.doesNotMatch(sql,new RegExp(`sale_patch\\('${fn.replace('(','\\(')}`),fn);
 // A small model of the credited row: the farm gets diamonds + bonus once, a second confirm adds nothing, a refund takes both.
 const farm={diamonds:10},row={status:'pending',diamonds:500,sale_bonus:200};
 const credit=()=>{if(['credited','test_paid','refunded'].includes(row.status))return 'duplicate';farm.diamonds+=row.diamonds+row.sale_bonus;row.status='credited';return 'credited';};
 const refund=()=>{if(row.status!=='credited')return;farm.diamonds=Math.max(0,farm.diamonds-row.diamonds-row.sale_bonus);row.status='refunded';};
 assert.equal(credit(),'credited');assert.equal(credit(),'duplicate');assert.equal(farm.diamonds,710);refund();assert.equal(farm.diamonds,10);refund();assert.equal(farm.diamonds,10);
});

test('the SQL file: idempotent, guarded like offer_post, md5 checks of every live body it patches, a check at the end, plain ASCII',()=>{
 assert.match(sql,/^[\x09\x0a\x0d\x20-\x7e]*$/,'ASCII only (safe to copy)');
 assert.match(sql,/create table if not exists public\.harvest_diamond_sales\(/);
 assert.match(sql,/add column if not exists sale_id uuid references public\.harvest_diamond_sales\(id\);/);
 assert.match(sql,/add column if not exists sale_bonus integer not null default 0;/);
 assert.match(sql,/drop constraint if exists harvest_purchases_sale_check;/);
 assert.match(sql,/check \(ends_at>starts_at and ends_at<=starts_at\+interval '72 hours'\)/);
 assert.match(sql,/if hours is null or hours not between 1 and 72 then raise exception 'Choose 1 to 72 hours\.'/);
 for(const fn of ['diamond_sale_start','diamond_sale_stop','diamond_sale_list']){
  const body=sql.slice(sql.indexOf(`create or replace function public.${fn}(`));
  assert.match(body.slice(0,body.indexOf('end $f$;')),/if public\.chat_staff_role\((me|\(select auth\.uid\(\)\))\) is distinct from 'admin' then raise exception 'Not authorized\.' using errcode='42501';/,fn);
  assert.match(body.slice(0,body.indexOf('end $f$;')),/security definer set search_path to ''/,fn);
 }
 assert.match(sql,/revoke all on function public\.%s from public, anon/);assert.match(sql,/grant execute on function public\.diamond_sale_now\(\) to anon, authenticated, service_role;/);
 // Seven live bodies, each with its md5 before (read 27 Oct 2026) and after, checked again at the end.
 const patches=[...sql.matchAll(/select pg_temp\.sale_patch\('([^']+)','([0-9a-f]{32})','([0-9a-f]{32})',/g)];
 assert.deepEqual(patches.map(m=>m[1]),['harvest_purchase_grant(uuid)','harvest_revoke_play_purchases(jsonb)','harvest_revoke_apple_purchases(jsonb)','harvest_revoke_kong_purchases(jsonb)',
  'harvest_credit_kong_pack(uuid,text,bigint,bigint,integer,boolean)','harvest_purchase_alert()','harvest_purchase_log()']);
 for(const [,fn,before,after] of patches){
  assert.ok(sql.includes(`('${fn}','${before}')`),`${fn}: guarded before`);
  assert.ok(sql.includes(`('${fn}','${after}')`),`${fn}: checked after`);
 }
 assert.match(sql,/if position\('sale_bonus' in src\)>0 then\n  if md5\(src\)<>p_after then raise exception/,'a second run leaves a patched body alone');
 assert.match(sql,/do \$after\$/);
});

test('the names: a fixed list, checked by the database, the same titles in the Admin panel and the shop, translated in every language',()=>{
 const kinds=['sale','halloween','autumn','black_friday','christmas','winter','new_year','valentines','easter','spring','summer','weekend'];
 assert.deepEqual(Object.keys(SALE.kinds),kinds);assert.equal(SALE.defaultKind,'sale');assert.equal(SALE.kinds.sale,'Sale');
 assert.deepEqual(Object.values(SALE.kinds),['Sale','Halloween Sale','Autumn Sale','Black Friday Sale','Christmas Sale','Winter Sale','New Year Sale','Valentine\'s Sale','Easter Sale','Spring Sale','Summer Sale','Weekend Sale']);
 assert.deepEqual(SALE_TITLES,SALE.kinds,'the shop and the Admin panel name it the same');
 for(const k of kinds)assert.ok(saleKind(k),k);for(const k of ['','Sale','black-friday',null,'xmas'])assert.equal(saleKind(k),false,String(k));
 assert.equal(saleTitle('bogus'),'Sale');assert.equal(saleTitle('black_friday'),'Black Friday Sale');
 const list=`('${kinds.join("','")}')`;
 assert.ok(sql.includes(`check (kind in ${list})`),'the table');assert.ok(sql.includes(`if what not in ${list} then`),'diamond_sale_start');
 const shopTexts=[...Object.values(SALE.kinds),'Buy {0} diamonds and {1} extra for {2}','Ends in {0}','{0}% more diamonds in every pack, for the same price',
  'The payment screen shows the usual pack. Your {0}% extra diamonds are added automatically after you pay.'];
 const catalog=JSON.parse(read('i18n/catalog.json'));
 const codes=LANGUAGES.map(l=>l.code).filter(c=>c!=='en');
 assert.deepEqual([...codes].sort(),['ar','cs','de','es','fr','hi','hu','id','ja','nl','pt','ru','tr','uk','zh']);
 for(const text of shopTexts){
  assert.ok(text in catalog,text);
  for(const code of codes){const t=JSON.parse(read(`public/i18n/${code}.json`))[text];assert.ok(typeof t==='string'&&t.trim(),`${code}: ${text}`);assert.ok(!t.includes(' · '),`${code}: no middle dot`);}
 }
});

test('the shop: a banner with the name, the time left and the payment-screen line; each pack shows its bonus; nothing outside a Sale',()=>{
 const catalog={enabled:true,store:'stripe',mode:'live',sale:saleCatalog(running,NOW)};
 assert.equal(shopSale(catalog,NOW).id,SALE_ID);assert.equal(shopSaleBonus(catalog,500,NOW),200);assert.equal(shopSaleBonus(catalog,'3500',NOW),1400);
 const banner=saleBanner(catalog,{now:NOW});
 assert.match(banner,/<strong class="shop-sale-badge">Halloween Sale<\/strong>/);assert.match(banner,/40% more diamonds in every pack, for the same price/);assert.match(banner,/data-sale-left>Ends in 1h</);
 assert.match(banner,/The payment screen shows the usual pack\. Your 40% extra diamonds are added automatically after you pay\./);
 assert.doesNotMatch(banner,/·|Stripe|Google|Apple|App Store|Kongregate|Kreds/,'no middle dot, no store named: true in every app');
 const cards=diamondPackCards({catalog,now:NOW});
 // The usual amount small and struck through, the total large where the amount was (the owner, 27 Oct 2026).
 for(const [was,total] of [['150','210'],['500','700'],['1,250','1,750'],['3,500','4,900']])assert.match(cards,new RegExp(`<span class="pack-amount"><s class="pack-was">${was}</s><b>${total}</b><small>diamonds</small></span>`));
 assert.doesNotMatch(cards,/pack-bonus|\+\d[\d,]* extra</,'no separate bonus line');
 assert.equal((cards.match(/pack-ribbon is-sale">\+40% extra</g)??[]).length,4);
 assert.match(cards,/aria-label="Buy 500 diamonds and 200 extra for €4\.99"/,'the same price');
 // The pack that covers what is short keeps its green tab.
 assert.match(diamondPackCards({catalog,now:NOW,suggestion:500}),/data-diamond-pack="500"[^>]*><span class="pack-ribbon is-enough">/);
 // Ended, stopped (no sale in the catalogue), a shop that does not sell, or no catalogue at all (CrazyGames asks none): as before.
 for(const [c,now] of [[catalog,NOW+3600000],[{...catalog,sale:null},NOW],[{...catalog,enabled:false},NOW],[null,NOW]]){
  assert.equal(saleBanner(c,{now}),'');const plain=diamondPackCards({catalog:c,now});
  assert.doesNotMatch(plain,/pack-was|<s |is-sale/);assert.match(plain,/<span class="pack-amount"><b>500<\/b><small>diamonds<\/small><\/span>/,'as before');
 }
 // Kreds and the apps' own prices: the bonus shows the same, on the store's price.
 const kong={...catalog,store:'kongregate',prices:{150:{price:'20 Kreds',kreds:20},500:{price:'50 Kreds',kreds:50},1250:{price:'100 Kreds',kreds:100},3500:{price:'250 Kreds',kreds:250}}};
 assert.match(diamondPackCards({catalog:kong,now:NOW}),/aria-label="Buy 500 diamonds and 200 extra for 50 Kreds"/);
 const app={...catalog,store:'app_store',prices:{150:{price:'€1,99',micros:1990000,currency:'EUR'},500:{price:'€4,99',micros:4990000,currency:'EUR'},1250:{price:'€9,99',micros:9990000,currency:'EUR'},3500:{price:'€24,99',micros:24990000,currency:'EUR'}}};
 assert.match(diamondPackCards({catalog:app,now:NOW}),/<s class="pack-was">500<\/s><b>700<\/b>/);
 // The page: the banner sits between the deals and the packs; it ticks and goes away when the Sale ends.
 const farm=read('public/farm.html'),ui=read('public/boosts-ui.js');
 assert.match(farm,/<div class="shop-deals" id="shop-deals"><\/div><div id="shop-sale" class="shop-sale" role="note" hidden><\/div><div id="diamond-packs" class="diamond-packs">/);
 assert.match(ui,/const saleBox=\$\('shop-sale'\);if\(saleBox\)\{const banner=saleBanner\(catalog,\{now:farmNow\(\),art\}\);saleBox\.hidden=!banner;/);
 assert.match(ui,/if\(\$\('boost-dialog'\)\.open&&saleShown\)\{if\(shopSale\(catalog,now\)\)\{[^}]*\}else render\(\);\}/);
 // CrazyGames: the shop asks no catalogue there (so no Sale), and the server gives none either.
 assert.match(ui,/track\('diamond_shop_view'\);if\(portalOff\('payments'\)\)return;try\{catalog=await bridge\(\)\.payments\(\{operation:'catalog'\}\)/);
 // The calm house style: cream card, the buttons.css gold token, 400/700 only, no middle dots.
 const css=read('public/payments.css'),part=css.slice(css.indexOf('/* The Sale (27 Oct 2026'));
 assert.match(part,/\.shop-sale\{[^}]*background:#fff8e6/);assert.match(part,/\.diamond-pack\.is-sale \.pack-amount b\{font-size:32px;color:var\(--btn-red/,'the total in the red token');assert.match(part,/\.pack-ribbon\.is-sale\{top:-12px;[^}]*background:var\(--btn-gold/,'a tab on the top edge');assert.match(part,/\.shop-sale-badge\{[^}]*background:var\(--btn-red/);assert.match(part,/\.pack-was\{[^}]*color:#8a7443;text-decoration:line-through/,'struck through in the muted brown of "diamonds"');assert.match(part,/var\(--btn-gold-line/);
 for(const m of part.matchAll(/font:(\d+) (\d+)px/g)){assert.ok(['400','700'].includes(m[1]),m[0]);assert.ok(Number(m[2])>=12,m[0]);}
 assert.doesNotMatch(read('public/diamond-sale.js'),/ · /);
});

test('the Admin panel: a Sale card next to the special offer, a name from the list, 1 to 72 hours, Start and Stop, and the list',()=>{
 const admin=read('src/admin-dashboard.js'),client=read('src/chat-client.js');
 assert.match(client,/startSale:\(\{hours=24,kind='sale'\}=\{\}\)=>rpc\('diamond_sale_start',\{p_hours:hours,p_kind:kind\}\),/);
 assert.match(client,/saleList:\(\)=>rpc\('diamond_sale_list'\),/);assert.match(client,/stopSale:id=>rpc\('diamond_sale_stop',\{p_id:id\}\),/);
 assert.ok(admin.indexOf('id="admin-sales"')>admin.indexOf('id="admin-offers"'),'after the special offer');
 assert.match(admin,/<select id="admin-sale-kind">'\+Object\.entries\(SALE\.kinds\)/);
 assert.match(admin,/<input id="admin-sale-hours" type="number" min="'\+SALE\.minHours\+'" max="'\+SALE\.maxHours\+'"/);
 assert.match(admin,/data-sale-stop=/);assert.match(admin,/if\(role==='admin'\)void showSales\(\);/);
 assert.match(admin,/<button type="submit" class="primary-button">Start sale<\/button>/);
});
