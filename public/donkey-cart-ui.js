import {cartLoads,ITEMS,CART_LOADS} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
import {confirmDiamondSpend} from './diamond-confirm.js';

// The donkey cart's window (27 Oct 2026, the owner: "je klikt op de ezelkar"; farm-state.js cartLoads): a tap on the cart on the trunk
// road opens it. One row a load (its picture, how many, what it is worth) with its price on a diamond button, or "Bought today"; every
// buy asks first. The rule folds away under the list.
const $=id=>document.getElementById(id);
const number=n=>Math.round(n).toLocaleString('en-US');
export const CART_RULE=`Every day the donkey cart brings ${CART_LOADS} of your farm's goods. Each load costs what it is worth at the coin pack's price, and you can buy each load once a day. New goods come at 00:00 UTC.`;
export function cartPanel(state,now){
 const loads=cartLoads(state,now);
 const row=l=>`<li class="cart-load ${l.bought?'is-bought':''}">${art(l.item)}<div class="cart-load-copy"><strong>${number(l.count)} ${ITEMS[l.item].name}</strong><small>Worth ${number(l.value)} coins</small></div>${l.bought?'<span class="cart-load-done">Bought today</span>':`<button type="button" class="small-button is-diamond" data-cart-buy="${l.item}" aria-label="Buy ${number(l.count)} ${ITEMS[l.item].name} for ${l.cost} diamonds">${art('diamonds')}<b>${l.cost}</b></button>`}</li>`;
 return `<section class="cart-loads"><ul class="cart-load-list">${loads.map(row).join('')}</ul><details class="fold" data-fold="donkey-cart-rule"><summary>How it works</summary><p>${CART_RULE}</p></details></section>`;
}
// One buy: short of diamonds the shop opens and the error says how many; otherwise "Spend diamonds?" first. Sends what the row showed.
export async function buyCartLoad({state,item,now,runAction}){
 const load=cartLoads(state,now).find(l=>l.item===item);if(!load||load.bought)return null;
 const short=load.cost-state.diamonds;
 if(short>0){globalThis.harvestShop?.open?.();throw new Error(`You need ${short} more diamonds.`);}
 const name=ITEMS[item].name;
 if(!await confirmDiamondSpend({title:`${number(load.count)} ${name}`,cost:load.cost,picture:item,balance:state.diamonds,description:`The donkey cart brings ${number(load.count)} ${name}, worth ${number(load.value)} coins, to your barn.`}))return null;
 const r=await runAction({type:'donkey_cart_buy',item,expectedCount:load.count,expectedCost:load.cost});
 return `${number(r.count)} ${name} are in your barn.`;
}
export function createDonkeyCartUI({state,runAction,notify,onChange}){
 let busy=false;
 const dialog=()=>$('donkeycart-dialog');
 function render(){
  const d=dialog();if(!d?.open)return;
  $('donkeycart-content').innerHTML=cartPanel(state,farmNow());
  $('donkeycart-content').querySelectorAll('[data-cart-buy]').forEach(b=>b.addEventListener('click',()=>buy(b.dataset.cartBuy)));
  refreshArt();
 }
 async function buy(item){
  if(busy)return;busy=true;$('donkeycart-content').querySelectorAll('button').forEach(b=>b.disabled=true);
  try{const message=await buyCartLoad({state,item,now:farmNow(),runAction});if(message){onChange();notify(message);}}
  catch(e){notify(e.message);}
  finally{busy=false;render();}
 }
 function open(){
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  const d=dialog();if(!d)return;d.showModal();render();
 }
 return {open,render};
}
