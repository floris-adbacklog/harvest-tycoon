// The diamond shop made to sell better, honestly (18 Oct 2026, the owner: "Maak het meer conversiegedreven om verkoop te stimuleren";
// "groen voelt beter bij kopen dan goud"). The live numbers behind it: the Special offer brought 13 of 19 payments, every paying farmer
// bought a deal (offer, Starter Pack, pass) and one plain pack ever sold. So the deals come first and say what is in them, the Starter
// Pack is in the shop too, real money is green with its price, Best value is worked out, and taps on the deals are counted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {diamondPackCards} from '../public/boosts-ui.js';
import {trackCommerce} from '../src/analytics.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const cards=html=>[...html.matchAll(/class="diamond-pack( is-best)?[^"]*" data-diamond-pack="(\d+)"[^>]*>(?:<span class="pack-ribbon[^"]*">([^<]*)<\/span>)?/g)].map(m=>[m[2],m[3]??'',Boolean(m[1])]);

test('Best value is worked out from the prices, and the extras follow the prices the farmer sees',()=>{
 assert.deepEqual(cards(diamondPackCards({catalog:{enabled:true,mode:'live'}})),[['150','',false],['500','+33% extra',false],['1250','+66% extra',false],['3500','+86% extra',true]],'the website: as before');
 // An app store whose own prices make the 1,250 pack the best buy: the sticker and Best value say so.
 const usd=(micros,price)=>({price,micros,currency:'USD'});
 const store={enabled:true,store:'google_play',prices:{'150':usd(2e6,'$2.00'),'500':usd(5e6,'$5.00'),'1250':usd(8e6,'$8.00'),'3500':usd(30e6,'$30.00')}};
 assert.deepEqual(cards(diamondPackCards({catalog:store})),[['150','',false],['500','+33% extra',false],['1250','+108% extra',true],['3500','+56% extra',false]]);
 // Not every pack has the store's amount, or two currencies: the shop's euro prices, as before.
 for(const prices of [{'500':usd(5e6,'$5.00')},{...store.prices,'150':{price:'€1.99',micros:1990000,currency:'EUR'}}])
  assert.deepEqual(cards(diamondPackCards({catalog:{...store,prices}})).map(c=>[c[1],c[2]]),[['',false],['+33% extra',false],['+66% extra',false],['+86% extra',true]]);
});

test('real money is green with its price everywhere; gold is never a button',()=>{
 const shop=read('public/shop.css'),buttons=read('public/buttons.css'),pass=read('public/pass.css');
 assert.match(shop,/#diamond-packs \.pack-price\{[^}]*background:var\(--btn-main\);[^}]*color:var\(--btn-main-text\)/);
 assert.match(shop,/#boost-dialog \.shop-offer-price b,#boost-dialog \.shop-pass-price b,#boost-dialog \.shop-starter-price b\{[^}]*background:var\(--btn-main\)/);
 assert.match(buttons,/\.is-money\{background:var\(--btn-main\);/);assert.match(pass,/\.primary-button\.pass-buy\{[^}]*background:var\(--btn-main\)/);
 for(const css of [shop,buttons,pass])assert.doesNotMatch(css,/background:var\(--btn-gold\)/);
});

test('the Special offer in the shop says what is in it, with the real time left and no struck-through worth',()=>{
 const ui=read('src/offer-ui.js'),banner=ui.slice(ui.indexOf('function banner('),ui.indexOf('async function buy('));
 assert.match(banner,/offerParts\(offer\)\.map\(p=>`<span class="is-\$\{p\.key\}"><img src="\/assets\/icons\/\$\{p\.art\}\.webp" alt=""><strong>\$\{p\.amount\}<\/strong>/);
 assert.match(banner,/<small>Ends in \$\{duration\(left\(\)\)\}<\/small>/);
 assert.doesNotMatch(banner,/<s>/,'the worth is explained in the offer\'s own window, not struck through on the banner');
 assert.match(read('public/shop.css'),/#boost-dialog \.shop-offer\{grid-template-areas:"art title price" "art time price" "parts parts parts";/,'on a phone the contents get their own row');
});

test('the Starter Pack has its row in the shop while it can be bought, between the offer and the pass',()=>{
 const ui=read('src/starter-pack-ui.js'),shop=read('public/shop.css');
 assert.match(ui,/b=document\.createElement\('button'\);b\.type='button';b\.id='shop-starter';b\.className='shop-starter';b\.onclick=\(\)=>button\.onclick\(\);deals\.append\(b\);/);
 assert.match(ui,/b\.hidden=!\(remaining>0\);/);assert.match(ui,/banner\(eligible\?remaining:0,pack\?\.diamonds\?\?500\);/);
 assert.match(ui,/<small>Ends in \$\{formatDuration\(remaining\)\}<\/small>/,'the server\'s own end time');
 assert.match(ui,/<b>\$\{shopPrice\(catalog,'starter',299\)\}<\/b>/,'the store\'s own price');
 assert.match(shop,/#boost-dialog \.shop-offer\{order:0;/);assert.match(shop,/#boost-dialog \.shop-starter\{order:1;/);assert.match(shop,/#boost-dialog \.shop-pass\{order:2;/);
 assert.match(read('public/android.css'),/html\[data-app=android\]:not\(\[data-app-billing\]\) #shop-starter,/,'not in an app that cannot take payments');
});

test('taps on the deals and on Get diamonds are counted, with nothing personal',()=>{
 const win={innerWidth:390};
 trackCommerce('shop_deal_opened',{pack:'starter',email:'x@y.z'},win);trackCommerce('get_diamonds_clicked',{short:40},win);
 assert.deepEqual(win.dataLayer,[{event:'shop_deal_opened',device:'mobile',pack:'starter'},{event:'get_diamonds_clicked',device:'mobile'}]);
 assert.match(read('public/boosts-ui.js'),/const deal=event\.target\.closest\('#shop-offer,#shop-starter,#shop-pass'\);if\(deal\)track\('shop_deal_opened',\{pack:deal\.id\.slice\(5\)\}\);/);
});

// The review (18 Oct 2026): every price is the same green, so Best value has no price look of its own and its Opening… and Unavailable
// read as on the other packs; the pack Get diamonds marks stays marked until the shop closes or another tab is chosen, and the Diamonds
// tab opens at the window's top (nothing under the sticky tabs); the deal rows' padding follows the reading direction (Arabic).
test('review: Best value\'s price states, the marked pack stays, the top of the tab, padding in both directions',()=>{
 const shop=read('public/shop.css'),payments=read('public/payments.css'),ui=read('public/boosts-ui.js');
 for(const css of [shop,payments])assert.doesNotMatch(css,/\.diamond-pack\.is-best[^{,]*\.pack-price\{/);
 assert.match(payments,/#diamond-packs \.diamond-pack\[data-state="opening"\] \.pack-price\{background:#e2eddc;/);
 assert.doesNotMatch(ui,/suggestionTimer|6000\)/);
 assert.match(ui,/dialog\.dataset\.shopTab=id;if\(id!=='diamond-store'&&suggestion\)\{suggestion=0;render\(\);\}/);
 assert.match(ui,/\$\('boost-dialog'\)\.addEventListener\('close',\(\)=>\{suggestion=0;\}\);/);
 assert.match(ui,/\$\('boost-dialog'\)\.scrollTo\(\{top:0,/);
 assert.match(shop,/\.shop-offer-parts>span\{[^}]*padding-block:2px;padding-inline:3px 9px;/);
 for(const row of ['shop-offer','shop-starter','shop-pass'])assert.doesNotMatch(shop.match(new RegExp(`#boost-dialog \\.${row}\\{[^}]*\\}`))[0],/padding:\d/,row);
});
