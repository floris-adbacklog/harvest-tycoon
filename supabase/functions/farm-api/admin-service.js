import {normalizeFarm,levelOf,ITEMS,CROPS} from './farm-state.js';

// The only account that may ever give coins, XP, diamonds or goods to another farmer. Checked against the
// authenticated, server-verified user (index.ts already resolved this from a real Supabase JWT) — never against
// anything the client claims about itself.
const SUPERADMINS=new Set(['floris@millstone.nl']);
export const isSuperadmin=user=>SUPERADMINS.has(String(user?.email??'').trim().toLowerCase());

// Generous enough for a real reward, small enough that an extra typed zero cannot hand out a fortune by accident.
// Diamonds are capped tighter: they are the currency the diamond-checkout Stripe packs sell, topping out at 3500.
// A single item is capped tighter still — these stack in an inventory slot, not a wallet.
const MAX_GRANT=1000000,MAX_DIAMONDS=5000,MAX_ITEM=10000,MAX_MESSAGE=200;
export const validGrantAmount=(value,max)=>Number.isInteger(value)&&value>=0&&value<=max;
export const validItem=(item,itemCount)=>item==null?!itemCount:Object.hasOwn(ITEMS,item)&&validGrantAmount(itemCount,MAX_ITEM)&&itemCount>0;
export function validGrant({coins,xp,diamonds,item,itemCount}){
 return validGrantAmount(coins,MAX_GRANT)&&validGrantAmount(xp,MAX_GRANT)&&validGrantAmount(diamonds,MAX_DIAMONDS)&&validItem(item,itemCount)&&Boolean(coins||xp||diamonds||(item&&itemCount));
}
// A short, optional note; the player always sees the amounts once notify is on, the note is extra. Rendered as
// plain text on the client (never HTML), so nothing here needs escaping — trimming and a length cap are enough.
export const sanitizeGiftMessage=value=>{const trimmed=String(value??'').trim().slice(0,MAX_MESSAGE);return trimmed||null;};

// Adds to a farmer's coins/XP/diamonds and logs who gave it. Reuses harvest_commit_farm — the exact same
// atomic, revision-checked write every ordinary farm action already goes through — so nothing about this
// write is a special or less-safe path; only reaching it is restricted, in index.ts, to the superadmin above.
export async function handleAdminGrant({admin,body,user}){
 const respond=(data,status=200)=>({status,data});
 if(!isSuperadmin(user))return respond({error:'Not authorized.'},403);
 const playerId=body.playerId;
 if(typeof playerId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId))return respond({error:'Choose a valid farmer.'},400);
 const coins=Number(body.coins)||0,xp=Number(body.xp)||0,diamonds=Number(body.diamonds)||0;
 const item=typeof body.item==='string'&&body.item?body.item:null,itemCount=item?Math.max(0,Math.floor(Number(body.itemCount)||0)):0;
 if(!validGrant({coins,xp,diamonds,item,itemCount}))return respond({error:'Enter whole, non-negative amounts (at least one), within the per-gift limit.'},400);
 const notify=body.notify===true,message=notify?sanitizeGiftMessage(body.message):null;
 for(let attempt=0;attempt<5;attempt++){
  const [foundFarm,foundProfile]=await Promise.all([
   admin.from('player_farms').select('*').eq('player_id',playerId).maybeSingle(),
   admin.from('player_stats').select('username').eq('player_id',playerId).maybeSingle()
  ]);
  if(foundFarm.error)throw foundFarm.error;if(foundProfile.error)throw foundProfile.error;
  const row=foundFarm.data;if(!row||!foundProfile.data)return respond({error:'This farmer could not be found.'},404);
  const now=Date.now(),state=normalizeFarm(row.state,now);
  state.coins+=coins;state.xp+=xp;state.diamonds+=diamonds;
  if(item&&itemCount){
   state.inventory[item]=(state.inventory[item]??0)+itemCount;
   // A gift counts the same way actually getting it would: a crop as a harvest (also raising its mastery
   // progress — the badges players actually chase), a production good as goods made. Coins/XP/diamonds do not
   // touch stats at all — there is no "earned coins" leaderboard category tied to a stat the same way.
   if(Object.hasOwn(CROPS,item)){
    state.stats['harvest_'+item]=(state.stats['harvest_'+item]??0)+itemCount;
    state.stats.harvested=(state.stats.harvested??0)+itemCount;
    state.mastery.harvests[item]=(state.mastery.harvests[item]??0)+itemCount;
   }else{
    state.stats.goods_produced=(state.stats.goods_produced??0)+itemCount;
    state.stats['made_'+item]=(state.stats['made_'+item]??0)+itemCount;
   }
  }
  // Picked up and cleared the next time this farmer's own client loads (index.ts, operation 'load') — works
  // whether they are online right now or come back later, with no separate push mechanism needed.
  if(notify)state.pendingGift={coins,xp,diamonds,item,itemCount,message,at:now};
  const level=levelOf(state);
  const saved=await admin.rpc('harvest_commit_farm',{p_player:playerId,p_expected:row.revision,p_state:state,p_receipts:row.receipts,p_username:foundProfile.data.username,p_currency:state.coins,p_level:level});
  if(saved.error)throw saved.error;
  if(saved.data){
   const logged=await admin.from('admin_grants').insert({player_id:playerId,granted_by:user.id,coins,xp,diamonds,item,item_count:itemCount,notified:notify,message});
   if(logged.error)throw logged.error;
   return respond({granted:{coins,xp,diamonds,item,itemCount},totals:{coins:state.coins,xp:state.xp,diamonds:state.diamonds,level}});
  }
 }
 return respond({error:'This farmer changed at the same moment. Please try again.'},409);
}
