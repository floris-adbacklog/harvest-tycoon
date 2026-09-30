import test from 'node:test';
import assert from 'node:assert/strict';
import {trackCommerce,trackGame} from '../src/analytics.js';

test('ad pixels get the standard names: a paid pack is a "purchase" in euros, level 5 a "generate_lead"; never who it was',()=>{
 const win={innerWidth:400,dataLayer:[]};
 trackCommerce('diamond_pack_completed',{pack:'offer',diamonds:1750,amount_cents:499,email:'x@y.z'},win);
 assert.deepEqual(win.dataLayer.map(e=>e.event??'clear'),['diamond_pack_completed','clear','purchase']);
 assert.deepEqual(win.dataLayer[1],{ecommerce:null},'an earlier ecommerce is cleared first');
 assert.deepEqual(win.dataLayer[2],{event:'purchase',ecommerce:{value:4.99,currency:'EUR',items:[{item_id:'diamonds_offer',item_name:'Diamonds',price:4.99,quantity:1}]}});
 assert.ok(!JSON.stringify(win.dataLayer).includes('x@y.z'),'nothing personal');
 trackCommerce('vip_purchase_completed',{plan:'week',cost:120},win);
 assert.equal(win.dataLayer.filter(e=>e.event==='purchase').length,1,'VIP is bought with diamonds, not money: no purchase');
 trackGame('level_up',{level:4},win);trackGame('level_up',{level:5},win);trackGame('level_up',{level:6},win);
 assert.deepEqual(win.dataLayer.filter(e=>e.event==='generate_lead'),[{event:'generate_lead',level:5}],'only at level 5');
});
