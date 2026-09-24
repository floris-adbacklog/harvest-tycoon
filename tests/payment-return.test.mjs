import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/payment-ui.js',import.meta.url),'utf8').replace(/^import .*;\n/,'').replace('export function','function');
const settle=async()=>{for(let n=0;n<15;n++)await Promise.resolve();};
function fixture({cancelled=false,payments,refresh}={}){
 const nodes=new Map(),listeners={},timers=new Map();let counter=0,cleared=0,confirmations=0;
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:'',hidden:false,disabled:false});return nodes.get(selector);};
 const dialog={dataset:{},setAttribute(){},querySelector:node,addEventListener(name,fn){listeners[name]=fn;},showModal(){this.open=true;},close(){this.open=false;listeners.close();},remove(){this.removed=true;}};
 const window=new EventTarget();window.harvestRefresh=refresh;window.addEventListener('harvest-purchase-confirmed',()=>confirmations++);
 const bridge={paymentReturn:()=>({id:'purchase',cancelled}),payments,clearPaymentReturn(){cleared++;}};
 vm.runInNewContext(source+'\nshowPaymentReturn(bridge);',{document:{createElement:()=>dialog,body:{append(){}}},window,bridge,Event,art:()=>'',setTimeout(fn){timers.set(++counter,fn);return counter;},clearTimeout(id){timers.delete(id);}});
 return {dialog,node,timers,get cleared(){return cleared;},get confirmations(){return confirmations;}};
}
test('server confirmation wins over a cancelled URL and a failed farm refresh',async()=>{
 const f=fixture({cancelled:true,payments:async()=>({status:'credited',diamonds:300}),refresh:async()=>{throw Error('offline');}});await settle();
 assert.equal(f.dialog.dataset.state,'credited');assert.equal(f.node('.payment-status').textContent,'Payment confirmed');assert.match(f.node('.payment-message').textContent,/300 diamonds/);assert.match(f.node('.payment-message').textContent,/refresh your balance/);assert.equal(f.node('[data-retry]').hidden,true);assert.equal(f.confirmations,1);assert.equal(f.timers.size,0);
});
test('closing a purchase dialog ignores an in-flight response and clears its return URL',async()=>{
 let resolve;const f=fixture({payments:()=>new Promise(r=>resolve=r)});f.dialog.close();resolve({status:'credited',diamonds:50});await settle();
 assert.equal(f.cleared,1);assert.equal(f.confirmations,0);assert.equal(f.timers.size,0);assert.equal(f.dialog.removed,true);
});
test('pending checkouts poll without announcing rewards; closing cancels polling',async()=>{
 const f=fixture({payments:async()=>({status:'pending'})});await settle();assert.equal(f.dialog.dataset.state,'pending');assert.equal(f.timers.size,1);assert.equal(f.confirmations,0);f.dialog.close();assert.equal(f.timers.size,0);
});
test('network errors show safe feedback and permit checking again',async()=>{
 let requests=0;const f=fixture({payments:async()=>{if(++requests===1)throw Error('private upstream details');return {status:'credited',pack:'starter',diamonds:300};}});await settle();assert.equal(f.dialog.dataset.state,'error');assert.doesNotMatch(f.node('.payment-message').textContent,/private/);assert.equal(f.node('[data-retry]').disabled,false);f.node('[data-retry]').onclick();await settle();assert.equal(f.dialog.dataset.state,'credited');assert.match(f.node('.payment-message').textContent,/10,000 coins/);assert.equal(f.confirmations,1);
});
test('expired checkout stops checking and points back to the shop',async()=>{
 const f=fixture({payments:async()=>({status:'expired'})});await settle();assert.equal(f.node('[data-retry]').hidden,true);assert.equal(f.timers.size,0);assert.match(f.node('.payment-message').textContent,/new checkout/);assert.equal(f.confirmations,0);
});
test('a closed checkout offers a way straight back to the diamond shop',async()=>{
 const f=fixture({cancelled:true,payments:async()=>({status:'open'})});await settle();
 const shop=f.node('[data-shop]');assert.equal(shop.hidden,false);
 f.dialog.open=true;shop.onclick();assert.equal(f.dialog.open,false);
});
