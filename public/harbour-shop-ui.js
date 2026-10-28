import {confirmDiamondSpend} from './diamond-confirm.js';
import {harbourShopStatus,harbourShopAction,LANDMARK_COINS_PER_DIAMOND} from './farm-state.js';
import {goodsInBarn} from './village-shop-ui.js';
const number=n=>n.toLocaleString('en-US');

// The Harbour tab of the diamond shop (28 Oct 2026, the owner's choices; the rules in game/farm-state.js harbourShopStatus): the line of a
// card, the message after a buy and the pay step, for the shop (boosts-ui.js) and the quays (harbour-ui.js). Ship back now is one tap,
// as the village's time-skips; Harbour supplies always asks first, as Landmark supplies.
export function harbourLine(s){
 if(s.id==='ship')return 'The quay’s next ship docks right away.';
 return `All the goods the ${s.workName} still needs, handed in right away. 1 diamond for every ${number(LANDMARK_COINS_PER_DIAMOND)} coins they are worth.`;
}
export const harbourMessage=id=>id==='ship'?'A new ship is at the quay.':'Everything is handed in. Pay the coins to finish it.';
// One buy, as buyVillage: short of diamonds the shop opens (on the Harbour tab in the harbour) and the error says how many. Returns null
// when nothing was bought (blocked, or Keep diamonds).
export async function buyHarbour({state,id,quay,now,runAction,close}){
 const s=harbourShopStatus(state,id,now,quay);
 if(s.reason||!s.shown)return null;
 const short=s.cost-state.diamonds;
 if(short>0){close?.();globalThis.harvestShop?.open?.();throw new Error(`You need ${short} more diamonds.`);}
 if(id==='supplies'){
  const warning=goodsInBarn(state,s)?'Some of these goods are in your barn. Give them first and this costs less.':'';
  if(!await confirmDiamondSpend({title:s.name,cost:s.cost,picture:s.art,balance:state.diamonds,description:`All the goods the ${s.workName} still needs, handed in now. You still pay ${number(s.coins)} coins to finish it.`,warning}))return null;
 }
 const result=await runAction(harbourShopAction(s));
 return {result,message:harbourMessage(id)};
}
