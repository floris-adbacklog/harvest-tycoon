import {confirmDiamondSpend} from './diamond-confirm.js';
import {villageShopStatus,villageShopAction,VILLAGE_SHOP,VILLAGER_CALLS_PER_DAY,LANDMARK_COINS_PER_DIAMOND,POND_MAX_CASTS,formatDuration} from './farm-state.js';
import {art} from './visual-icons.js';
const number=n=>n.toLocaleString('en-US');

// The Village tab of the diamond shop (20 Oct 2026, the owner's choices; the rules in game/farm-state.js villageShopStatus): one place for
// the small diamond button at a wait, the pay step, the line of a card and the message after a buy. The shop (boosts-ui.js), the boat
// (boat-ui.js), the market square (village-square-ui.js) and the lake (pond-ui.js) all use it.

// The countdowns of the waits, each its own whole text (the languages find them; all four exist already: the harbour's ship since 28 Oct 2026).
export const untilText=(wait,ms)=>wait==='ship'?`Next ship in ${formatDuration(ms)}`:wait==='boat'?`Back in ${formatDuration(ms)}`:wait==='cast'?`Next cast in ${formatDuration(ms)}`:`Next villager in ${formatDuration(ms)}`;
// The small diamond button where a wait is shown: the price, then the card's own name (the shop's card title).
export const waitButton=s=>`<button type="button" class="small-button is-diamond wait-buy" data-wait-buy="${s.id}"${Number.isInteger(s.board)?` data-board="${s.board}"`:''}${Number.isInteger(s.quay)?` data-quay="${s.quay}"`:''} aria-label="Buy ${s.name} for ${number(s.cost)} diamonds">${art('diamonds')}<b>${number(s.cost)}</b><span>${s.name}</span></button>`;
// Goods for diamonds always ask first, like the coin pack (20 Oct 2026, the owner: "kreeg geen confirmatiescherm"); the three time-skips
// are one tap, in the shop and at the waits (the owner, 20 Oct 2026). 150 diamonds or more always asks.
export const VILLAGE_ASK=new Set(['supplycart','tilecart','landmark']);
// Each card's line (the shop's card and the carts' confirm): what it does, said once.
export function villageLine(s){
 const goods=VILLAGE_SHOP[s.id]?.goods;
 if(s.id==='villager')return `An empty board gets its next villager right away. ${VILLAGER_CALLS_PER_DAY} a day.`;
 if(s.id==='casts')return `Your lake casts go back to ${POND_MAX_CASTS} right away. Only when none are left.`;
 if(s.id==='tilecart')return `${number(goods.rooftile)} roof tiles into your barn, right away.`;
 if(s.id==='boat')return 'The town boat comes back right away with its next cargo.';
 if(s.id==='supplycart')return `${number(goods.plank)} planks and ${number(goods.ironbar)} iron bars into your barn, right away.`;
 return `All the goods the ${s.landmarkName} still needs, handed in right away. 1 diamond for every ${number(LANDMARK_COINS_PER_DIAMOND)} coins they are worth.`;
}
// The toast and the shop's feedback line after a buy.
export function villageMessage(id,r){
 if(id==='supplycart')return `${number(r.goods.plank)} planks and ${number(r.goods.ironbar)} iron bars are in your barn.`;
 if(id==='tilecart')return `${number(r.goods.rooftile)} roof tiles are in your barn.`;
 if(id==='boat')return 'The town boat is back at the pier.';
 if(id==='villager')return `${r.villager} has come to the market square.`;
 if(id==='casts')return `Your ${POND_MAX_CASTS} lake casts are ready.`;
 return 'Everything is handed in. Pay the coins to finish it.';
}
// Some of the goods Landmark supplies would buy are in the barn already: the card and the confirm say so.
export const goodsInBarn=(state,s)=>Object.keys(s.goods??{}).some(k=>(state.inventory[k]??0)>0);
// One buy, as the tractor's Full care pays (retention-ui.js): the card as it is now; short of diamonds the shop opens (on the Village tab in
// the village) and the error says how many; a cart and Landmark supplies ask first (always), anything of 150 or more too. The action
// carries the price and goods that were shown. Returns null when nothing was bought (blocked, or Keep diamonds).
export async function buyVillage({state,id,board,now,runAction,close,always=false}){
 const s=villageShopStatus(state,id,now,board);
 if(s.reason||!s.shown)return null;
 const short=s.cost-state.diamonds;
 if(short>0){close?.();globalThis.harvestShop?.open?.();throw new Error(`You need ${short} more diamonds.`);}
 if(always||s.cost>=150){
  const landmark=id==='landmark';
  const description=landmark?`All the goods the ${s.landmarkName} still needs, handed in now. You still pay ${number(s.coins)} coins to finish it.`:villageLine(s);
  const warning=landmark&&goodsInBarn(state,s)?'Some of these goods are in your barn. Give them first and this costs less.':'';
  if(!await confirmDiamondSpend({title:s.name,cost:s.cost,picture:s.art,balance:state.diamonds,description,warning}))return null;
 }
 const result=await runAction(villageShopAction(s));
 return {result,message:villageMessage(id,result)};
}
