import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm} from './legacy-farm.mjs';
import {VIP_PLANS,vipActive,normalizeFarm,applyFarmAction,cropDuration,recipeDuration,marketSaleValue,marketQuote,dailyTasks,dailyOrders,utcDay,levelReward,upgradeCost,diamondUpgradeCost,DAY_MS,DAILY_REWARDS,DAILY_DIAMONDS,BOOSTS} from '../game/farm-state.js';
import {PAYMENT_PACKS,paymentPack,checkoutPack,validatePaidSession} from '../game/payments.js';
import {vipBadge,refreshVipBadges} from '../public/vip-ui.js';
import {trackCommerce} from '../src/analytics.js';
const now=Date.UTC(2026,8,21,12);
const farm=()=>{const s=createLegacyFarm(now);s.diamonds=10000;return s;};
const purchase=(s,plan='week',at=now)=>applyFarmAction(s,{type:'buy_vip',plan,expectedCost:VIP_PLANS[plan].cost,expectedExpiresAt:s.vipExpiresAt},at);
test('VIP has exact week/month costs and time; renewals add time without stronger bonuses',()=>{
 const s=farm();assert.deepEqual(Object.values(VIP_PLANS).map(p=>[p.cost,p.duration]),[[500,7*DAY_MS],[1500,30*DAY_MS]]);
 const first=purchase(s);assert.equal(first.extended,false);assert.equal(s.diamonds,9500);assert.equal(s.vipExpiresAt,now+7*DAY_MS);
 const speed=cropDuration(s,'wheat',false,now);assert.equal(purchase(s,'month',now+DAY_MS).extended,true);
 assert.equal(s.vipExpiresAt,now+37*DAY_MS);assert.equal(s.diamonds,8000);assert.equal(cropDuration(s,'wheat',false,now),speed);
 const later=now+40*DAY_MS;purchase(s,'week',later);assert.equal(s.vipExpiresAt,later+7*DAY_MS);
});
test('VIP restores from saved state and expires at the exact server timestamp',()=>{
 const s=farm();purchase(s);const expiry=s.vipExpiresAt;const restored=normalizeFarm(JSON.parse(JSON.stringify(s)),expiry-1);
 assert.equal(vipActive(restored,expiry-1),true);assert.equal(vipActive(restored,expiry),false);
 assert.equal(vipActive(restored,expiry+1),false);assert.equal(restored.vipExpiresAt,expiry);
 const old=farm();delete old.vipExpiresAt;const balance=old.diamonds;normalizeFarm(old,now);assert.equal(old.vipExpiresAt,0);assert.equal(old.diamonds,balance);
});
test('invalid, forged, stale or unaffordable VIP purchases cannot debit diamonds',()=>{
 for(const change of [{plan:'__proto__'},{plan:'forever'},{plan:[]},{expectedCost:1},{expectedCost:'500'},{expectedCost:undefined},{expectedExpiresAt:undefined},{expectedExpiresAt:now+DAY_MS}]){
  const s=farm(),before=structuredClone(s);assert.throws(()=>applyFarmAction(s,{type:'buy_vip',plan:'week',expectedCost:500,expectedExpiresAt:0,...change},now));assert.deepEqual(s,before);
 }
 const s=farm();s.diamonds=499;const before=structuredClone(s);assert.throws(()=>purchase(s),/diamonds/);assert.deepEqual(s,before);
 s.diamonds=1000;purchase(s);const paid=structuredClone(s);
 assert.throws(()=>applyFarmAction(s,{type:'buy_vip',plan:'week',expectedCost:500,expectedExpiresAt:0},now),/status has changed/);assert.deepEqual(s,paid);
});
test('new VIP plantings/batches are 10% shorter; buying or expiring VIP never rewrites running work',()=>{
 const s=farm();s.inventory.corn=10;applyFarmAction(s,{type:'produce',recipe:'feed'},now);
 const plots=structuredClone(s.plots),job=structuredClone(s.buildings.mill.job),normalCrop=cropDuration(s,'wheat',false,now),normalBatch=recipeDuration(s,'feed',now);
 purchase(s);assert.deepEqual(s.plots,plots);assert.deepEqual(s.buildings.mill.job,job);
 applyFarmAction(s,{type:'field',id:8,action:'plant',crop:'wheat'},now);
 assert.equal(s.plots[8].readyAt-now,Math.round(normalCrop*.9));
 s.buildings.mill.level=2;const batchDuration=recipeDuration({...s,vipExpiresAt:0},'feed',now);
 applyFarmAction(s,{type:'produce',recipe:'feed'},now);assert.equal(s.buildings.mill.extraJobs[0].readyAt-now,Math.round(batchDuration*.9));
 assert.equal(recipeDuration({...s,buildings:{...s.buildings,mill:{...s.buildings.mill,level:1}}},'feed',now),Math.round(normalBatch*.9));
 const ready=s.plots[8].readyAt;normalizeFarm(s,s.vipExpiresAt);assert.equal(s.plots[8].readyAt,ready);
 assert.equal(cropDuration(s,'wheat',false,s.vipExpiresAt),normalCrop);
});
test('orchard regrowth takes the VIP status at manual collection and never stacks while away',()=>{
 const s=farm();s.plots[8]={id:8,crop:'apples',plantedAt:now-100000,readyAt:now-1,watered:false};
 const normal=cropDuration(s,'apples',true,now);purchase(s);
 applyFarmAction(s,{type:'field',id:8,action:'harvest'},now);assert.equal(s.plots[8].readyAt-now,Math.round(normal*.9));
 const inventory=s.inventory.apples;normalizeFarm(s,now+60*DAY_MS);assert.equal(s.inventory.apples,inventory);
 applyFarmAction(s,{type:'field',id:8,action:'harvest'},now+60*DAY_MS);assert.equal(s.plots[8].readyAt-(now+60*DAY_MS),normal);
});
test('market totals round once after VIP and Double earnings, without altering base prices',()=>{
 for(const vip of [false,true])for(const boost of [false,true]){
  const s=farm();if(vip)purchase(s);if(boost)s.boosts.coinsUntil=now+1000;
  s.inventory.wheat=13;s.inventory.corn=7;const base=13*marketQuote('wheat',now).price;
  const expected=Math.floor(base*(vip?1.05:1)*(boost?2:1));
  assert.equal(marketSaleValue(s,base,now),expected);
  const r=applyFarmAction(s,{type:'sell',item:'wheat',quantity:13,day:utcDay(now)},now);assert.equal(r.coins,expected);assert.equal(s.inventory.wheat,0);assert.equal(s.inventory.corn,7);
 }
 const s=farm();purchase(s);s.boosts.coinsUntil=now+1000;assert.equal(marketSaleValue(s,19,now),39);
 assert.equal(marketSaleValue(s,19,s.vipExpiresAt),19);
});
test('VIP doubles all Today reward currencies only once, with repeat claims rejected',()=>{
 const s=farm(),plain=farm();purchase(s);
 const gift=applyFarmAction(s,{type:'checkin'},now);assert.equal(gift.coins,DAILY_REWARDS[0]*2);assert.equal(gift.diamonds,DAILY_DIAMONDS[0]*2);assert.equal(gift.xp,20);
 assert.throws(()=>applyFarmAction(s,{type:'checkin'},now),/already collected/);
 const normalTasks=dailyTasks(plain,now),tasks=dailyTasks(s,now);
 for(const [i,q]of tasks.entries()){
  assert.equal(q.reward,normalTasks[i].reward*2);assert.equal(q.diamonds,normalTasks[i].diamonds*2);
  s.stats[q.stat]=(s.daily.baseline[q.stat]??0)+q.target;
  const reward=applyFarmAction(s,{type:'daily',id:q.id,day:utcDay(now)},now);
  assert.equal(reward.coins,q.reward+(i===2?120:0));assert.equal(reward.xp,20+(i===2?30:0));assert.equal(reward.diamonds,q.diamonds);
  assert.throws(()=>applyFarmAction(s,{type:'daily',id:q.id,day:utcDay(now)},now),/already claimed/);
 }
 const o=dailyOrders(s,now)[0],base=plain.daily.orderBoard[0];assert.equal(o.coins,base.coins*2);assert.equal(o.xp,base.xp*2);
 Object.assign(s.inventory,o.input);s.boosts.xpUntil=now+1000;s.boosts.coinsUntil=now+1000;
 const r=applyFarmAction(s,{type:'delivery',id:o.id,day:utcDay(now)},now);assert.equal(r.coins,o.coins*2);assert.equal(r.xp,o.xp*2);assert.equal(r.diamonds,o.diamonds);
 assert.throws(()=>applyFarmAction(s,{type:'delivery',id:o.id,day:utcDay(now)},now),/already delivered/);
});
test('VIP expiry before a daily claim pays regular rewards; upgrades and level rewards do not change',()=>{
 const s=farm(),regular=farm();purchase(s);const expiry=s.vipExpiresAt;
 const v=dailyOrders(s,expiry),b=dailyOrders(regular,expiry);assert.deepEqual(v,b);
 const gift=applyFarmAction(s,{type:'checkin'},expiry);assert.equal(gift.coins,40);assert.equal(gift.diamonds,4);assert.equal(gift.xp,10);
 assert.equal(upgradeCost(s,'mill'),upgradeCost(regular,'mill'));assert.equal(diamondUpgradeCost(s,'mill'),diamondUpgradeCost(regular,'mill'));
 assert.deepEqual(levelReward(20),{coins:200,diamonds:4});
 assert.deepEqual(Object.values(BOOSTS).map(b=>b.cost),[50,100,150,200,250]);
});
test('all historical payment receipts remain valid and every new pack rejects a substituted price',()=>{
 for(const id of ['50','100','150','300','500','600','1000','1250','2000','3500','starter']){
  const p=paymentPack(id),purchase={id:'p',player_id:'u',pack:id,diamonds:p.diamonds,coins:p.coins??0,amount_cents:p.cents,price_id:p.price,livemode:true,stripe_session_id:'cs_1'},session={id:'cs_1',payment_status:'paid',status:'complete',mode:'payment',livemode:true,client_reference_id:'u',metadata:{purchase_id:'p',player_id:'u',app:'harvest-tycoon'},currency:'eur',amount_total:p.cents,amount_subtotal:p.cents,payment_intent:'pi_1'},items={has_more:false,data:[{quantity:1,price:{id:p.price}}]};
  assert.equal(validatePaidSession(session,purchase,items),'pi_1');purchase.price_id='price_substitute';items.data[0].price.id='price_substitute';assert.throws(()=>validatePaidSession(session,purchase,items),/items mismatch/);
 }
 for(const id of [null,150,{},[],['150'],'__proto__','constructor'])assert.throws(()=>checkoutPack(id));
 assert.equal(checkoutPack('600').id,'1250');assert.equal(PAYMENT_PACKS['500'].price,'price_1UI5oE04FdNTUSp4F2BP95IK');
});
test('public VIP badges vanish on expiry and never render untrusted attributes',()=>{
 assert.match(vipBadge(now+1000,now),/vip.png/);assert.equal(vipBadge(now,now),'');assert.equal(vipBadge('" onerror="alert(1)',now),'');
 let removed=false;const node={dataset:{vipUntil:String(now)},remove(){removed=true;}};refreshVipBadges({querySelectorAll:()=>[node]},now);assert.equal(removed,true);
});
test('commerce events whitelist anonymous facts and reject identifiers or raw text',()=>{
 const win={innerWidth:390};trackCommerce('vip_purchase_completed',{plan:'week',cost:500,email:'secret',playerId:'private',error:'raw'},win);
 assert.deepEqual(win.dataLayer,[{event:'vip_purchase_completed',device:'mobile',plan:'week',cost:500}]);trackCommerce('unapproved',{email:'secret'},win);assert.equal(win.dataLayer.length,1);
});
