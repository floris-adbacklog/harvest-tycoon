import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PAYMENT_PACKS,starterEligibility,STARTER_WINDOW,validatePaidSession} from '../game/payments.js';
import {createFarm as freshFarm,normalizeFarm,xpForLevel,levelOf,STARTER_LEVEL,FEATURE_LEVELS} from '../game/farm-state.js';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction,choreStatus} from '../game/farm-state.js';
const start=Date.UTC(2026,8,18),created=new Date(start).toISOString();
test('starter eligibility is server-time bounded to 72 hours and unavailable after purchase',()=>{
 assert.equal(starterEligibility(created,false,start).eligible,true);
 assert.equal(starterEligibility(created,false,start+STARTER_WINDOW-1).eligible,true);
 assert.equal(starterEligibility(created,false,start+STARTER_WINDOW).eligible,false);
 assert.equal(starterEligibility(created,true,start).eligible,false);
 assert.equal(starterEligibility('invalid',false,start).eligible,false);
 assert.equal(starterEligibility(created,false,start-1).eligible,false);
});
test('Starter Pack verifies €2.99, 300 diamonds and 10000 coins against exact price',()=>{
 const pack=PAYMENT_PACKS.starter;
 const p={id:'purchase',player_id:'player',pack:'starter',diamonds:300,coins:10000,amount_cents:299,price_id:pack.price,livemode:true,stripe_session_id:'cs_starter'};
 const s={id:'cs_starter',mode:'payment',status:'complete',payment_status:'paid',livemode:true,client_reference_id:'player',metadata:{app:'harvest-tycoon',purchase_id:'purchase',player_id:'player'},currency:'eur',amount_total:299,amount_subtotal:299,payment_intent:'pi_starter'};
 const items={has_more:false,data:[{quantity:1,price:{id:pack.price}}]};
 assert.equal(validatePaidSession(s,p,items),'pi_starter');
 assert.throws(()=>validatePaidSession({...s,amount_total:199},p,items));
 assert.throws(()=>validatePaidSession(s,{...p,coins:0},items));
 assert.throws(()=>validatePaidSession(s,p,{...items,data:[{quantity:1,price:{id:PAYMENT_PACKS['1250'].price}}]}));
});
test('seed-box sorting starts at 35%, keeps practice and caps at 60% after 13 attempts',()=>{
 const s=createFarm(start);s.chorePractice={weeds:20,troughs:20,sorting:0};
 assert.equal(choreStatus(s,'sorting',start).chance,35);
 for(let n=0;n<13;n++)applyFarmAction(s,{type:'chore',id:'sorting'},start+n*480000,()=>0);
 assert.equal(choreStatus(s,'sorting',start+13*480000).chance,60);
 assert.equal(choreStatus(s,'fences',start+13*480000).locked,false);
});

// ---- The Starter Pack opens at level 14 (where diamond boosts unlock) and is then there for 72 hours ----
const stamp=Date.UTC(2026,8,22,10);
function coopBatch(s,xp){s.buildings.coop.job={id:'batch',recipe:'eggs',output:{eggs:3},xp,startedAt:stamp-1000,readyAt:stamp};}
test('a new farmer is not met by the shop: nothing is offered below level 14, however long the account exists',()=>{
 assert.equal(STARTER_LEVEL,14);assert.equal(STARTER_LEVEL,FEATURE_LEVELS.boosts,'the pack opens when diamond boosts do');
 const s=freshFarm(stamp);assert.equal(s.starterOffer,undefined);
 s.xp=xpForLevel(STARTER_LEVEL-1);coopBatch(s,5);applyFarmAction(s,{type:'collect',building:'coop'},stamp);
 assert.equal(levelOf(s),STARTER_LEVEL-1);assert.equal(s.starterOffer,undefined,'still nothing at level 13');
 const ten=freshFarm(stamp);ten.xp=xpForLevel(10)-5;coopBatch(ten,10);applyFarmAction(ten,{type:'collect',building:'coop'},stamp);
 assert.equal(levelOf(ten),10);assert.equal(ten.starterOffer,undefined,'level 10 no longer opens it');
 assert.equal(starterEligibility(s.starterOffer?.unlockedAt,false,stamp+40*3600000).eligible,false);
});
test('the server stamps the moment level 14 is reached, once, and the offer lasts 72 hours from then',()=>{
 const s=freshFarm(stamp);s.xp=xpForLevel(STARTER_LEVEL)-5;coopBatch(s,10);
 applyFarmAction(s,{type:'collect',building:'coop'},stamp);
 assert.equal(levelOf(s),STARTER_LEVEL);assert.deepEqual(s.starterOffer,{unlockedAt:stamp});
 applyFarmAction(s,{type:'checkin'},stamp+3*3600000);assert.equal(s.starterOffer.unlockedAt,stamp,'later actions never move it');
 assert.equal(normalizeFarm(structuredClone(s),stamp+1).starterOffer.unlockedAt,stamp,'and a reload keeps it');
 const offer=(now,claimed=false)=>starterEligibility(s.starterOffer.unlockedAt,claimed,now);
 assert.equal(offer(stamp-1).eligible,false);assert.equal(offer(stamp).eligible,true);assert.equal(offer(stamp+STARTER_WINDOW-1).eligible,true);
 assert.equal(offer(stamp+STARTER_WINDOW).eligible,false,'three days later it is over');assert.equal(offer(stamp+1000).expiresAt,stamp+STARTER_WINDOW);
 assert.equal(offer(stamp+1000,true).eligible,false,'and never twice');
});
test('a farm that was already past level 14 when the rule came gets no new offer; one between 10 and 13 gets its moment on the way up',()=>{
 const mid=freshFarm(stamp);mid.xp=xpForLevel(12);delete mid.starterOffer;
 applyFarmAction(mid,{type:'checkin'},stamp);assert.equal(mid.starterOffer,undefined,'not yet: it is still below 14');
 mid.xp=xpForLevel(STARTER_LEVEL)-5;coopBatch(mid,10);applyFarmAction(mid,{type:'collect',building:'coop'},stamp+1000);
 assert.deepEqual(mid.starterOffer,{unlockedAt:stamp+1000});
 const stamped=freshFarm(stamp);stamped.starterOffer={unlockedAt:stamp-3600000};applyFarmAction(stamped,{type:'checkin'},stamp);
 assert.equal(stamped.starterOffer.unlockedAt,stamp-3600000,'a moment that was already written is never moved');
 const s=freshFarm(stamp);s.xp=xpForLevel(30);delete s.starterOffer;
 applyFarmAction(s,{type:'checkin'},stamp);assert.deepEqual(s.starterOffer,{unlockedAt:0});
 for(const now of [stamp,stamp+3600000])assert.equal(starterEligibility(s.starterOffer.unlockedAt,false,now).eligible,false);
 assert.equal(starterEligibility(0,false,stamp).expiresAt,0);
});
test('an offer moment can be a number or a date, and rubbish means no offer',()=>{
 assert.equal(starterEligibility(stamp,false,stamp+1).eligible,true);assert.equal(starterEligibility(new Date(stamp).toISOString(),false,stamp+1).eligible,true);
 for(const bad of [undefined,null,NaN,'nope',-5,{}])assert.equal(starterEligibility(bad,false,stamp+1).eligible,false,String(bad));
});
test('the checkout function reads the moment from the farm, not from the account date, and says when the offer opens',()=>{
 const checkout=readFileSync(new URL('../supabase/functions/diamond-checkout/index.ts',import.meta.url),'utf8');
 assert.match(checkout,/select\('offer:state->starterOffer'\)\.eq\('player_id',user\.id\)/);
 assert.match(checkout,/starterEligibility\(offerRow\?\.data\?\.offer\?\.unlockedAt,/);
 assert.doesNotMatch(checkout,/starterEligibility\(user\.created_at/);
 assert.match(checkout,new RegExp(`The Starter Pack opens when you reach level ${STARTER_LEVEL} and is then available for 72 hours\\.`),'the message names the level the rules use');
 assert.match(checkout,/starter_expires_at:packId==='starter'\?new Date\(starter\.expiresAt\)\.toISOString\(\):null/,'the database still checks the same 72-hour window');
 for(const dir of ['diamond-checkout','stripe-webhook'])assert.equal(readFileSync(new URL(`../supabase/functions/${dir}/payments.js`,import.meta.url),'utf8'),readFileSync(new URL('../game/payments.js',import.meta.url),'utf8'),dir);
});

