// The Sale in the diamond shop (27 Oct 2026, the owner; supabase/diamond-sale.sql, game/payments.js SALE). The catalogue of
// diamond-checkout carries the running Sale (catalog.sale: id, kind, percent, endsAt, bonus per pack) only while it runs and only where
// the shop sells (never on CrazyGames or Discord: portalOff('payments') asks no catalogue, and the server gives those accounts none).
// The shop shows a calm banner over the packs (its name, what it gives, the time left and one line on the payment screen) and the
// bonus on each pack. The titles are the same as game/payments.js SALE.kinds (a test checks it), here so they are translated.
import {formatDuration} from './farm-state.js';

export const SALE_TITLES=Object.freeze({sale:'Sale',halloween:'Halloween Sale',autumn:'Autumn Sale',black_friday:'Black Friday Sale',christmas:'Christmas Sale',
 winter:'Winter Sale',new_year:'New Year Sale',valentines:'Valentine\'s Sale',easter:'Easter Sale',spring:'Spring Sale',summer:'Summer Sale',weekend:'Weekend Sale'});
export const saleTitle=kind=>Object.hasOwn(SALE_TITLES,kind)?SALE_TITLES[kind]:SALE_TITLES.sale;

// The Sale the shop shows at now (the server's clock), or null: a shop that sells, and a Sale that has not ended.
export function shopSale(catalog,now=Date.now()){
 const sale=catalog?.sale;
 if(!catalog?.enabled||!sale||typeof sale.id!=='string'||!(Number(sale.endsAt)>now))return null;
 return sale;
}
// The extra diamonds a pack shows (its amount as a string or number), 0 outside a Sale.
export function shopSaleBonus(catalog,pack,now=Date.now()){
 const sale=shopSale(catalog,now),bonus=Number(sale?.bonus?.[String(pack)]);
 return Number.isSafeInteger(bonus)&&bonus>0?bonus:0;
}
// The time left, as the banner says it.
export const saleLeft=(catalog,now=Date.now())=>`Ends in ${formatDuration(Number(catalog?.sale?.endsAt)-now)}`;
// The banner over the packs (empty outside a Sale). The payment screen of every store still names the usual pack (the owner does not
// change the store products), so one line says the extra diamonds come by themselves; it names no store, so it is true everywhere.
export function saleBanner(catalog,{now=Date.now(),art=()=>''}={}){
 const sale=shopSale(catalog,now);if(!sale)return '';
 const percent=Number(sale.percent)||40;
 return `<div class="shop-sale-head">${art('diamonds')}<span class="shop-sale-copy"><strong>${saleTitle(sale.kind)}</strong><span>${percent}% more diamonds in every pack, for the same price</span></span><span class="shop-sale-time" data-sale-left>${saleLeft(catalog,now)}</span></div>`
  +`<p class="shop-sale-note">The payment screen shows the usual pack. Your ${percent}% extra diamonds are added automatically after you pay.</p>`;
}
