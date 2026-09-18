import test from 'node:test';
import assert from 'node:assert/strict';
import {PAYMENT_PACKS,starterEligibility,STARTER_WINDOW,validatePaidSession} from '../game/payments.js';
import {createFarm,applyFarmAction,choreStatus} from '../game/farm-state.js';
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
 assert.throws(()=>validatePaidSession(s,p,{...items,data:[{quantity:1,price:{id:PAYMENT_PACKS['300'].price}}]}));
});
test('seed-box sorting starts at 35%, keeps practice and caps at 60% after 13 attempts',()=>{
 const s=createFarm(start);s.chorePractice={weeds:20,troughs:20,sorting:0};
 assert.equal(choreStatus(s,'sorting',start).chance,35);
 for(let n=0;n<13;n++)applyFarmAction(s,{type:'chore',id:'sorting'},start+n*480000,()=>0);
 assert.equal(choreStatus(s,'sorting',start+13*480000).chance,60);
 assert.equal(choreStatus(s,'fences',start+13*480000).locked,false);
});
