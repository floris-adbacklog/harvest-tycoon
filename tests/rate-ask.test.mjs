import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRateAsk,rateAskDue,RATE_ASK,RATE_ASK_KEY,RATE_ASK_LEVEL,RATE_ASK_WAIT_MS} from '../public/rate-ask.js';
import {createFarm,xpForLevel} from '../public/farm-state.js';
// A rating on Kongregate (26 Oct 2026): once on a device, from level 10, a plain question, no reward, never again.
const kong=name=>({parent:{harvestPortal:{name,features:{}}}});
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),m};};
const farmAt=level=>{const s=createFarm(Date.now());s.xp=xpForLevel(level)+1;return s;};
function run({portal='kongregate',level=12,quiet=()=>false,storage=memory()}={}){
 let t=0;const shown=[],timers=[];
 const ask=createRateAsk({win:kong(portal),state:farmAt(level),show:(text,o)=>shown.push([text,o]),storage,quiet:()=>quiet(),now:()=>t,later:(fn,ms)=>timers.push([fn,ms])});
 const tick=ms=>{t+=ms;const due=timers.splice(0);for(const [fn] of due)fn();};
 return {ask,shown,storage,tick,timers};
}

test('the rule: Kongregate only, from level 10, once',()=>{
 assert.equal(RATE_ASK_LEVEL,10);assert.equal(RATE_ASK_KEY,'harvest-tycoon:rate-ask-2');
 assert.equal(rateAskDue({portal:'kongregate',level:10,seen:false}),true);
 assert.equal(rateAskDue({portal:'kongregate',level:9,seen:false}),false);
 assert.equal(rateAskDue({portal:'kongregate',level:30,seen:true}),false);
 for(const p of ['crazygames','discord',null])assert.equal(rateAskDue({portal:p,level:30,seen:false}),false,String(p));
 assert.doesNotMatch(RATE_ASK,/diamond|coin|reward|5 stars|five/i,'no reward, no star asked for');
});

test('it waits a minute and for a quiet moment, shows once, and never again on this device',()=>{
 let busy=true;const r=run({quiet:()=>busy});
 assert.equal(r.shown.length,0);r.tick(RATE_ASK_WAIT_MS);assert.equal(r.shown.length,0,'a window is open');
 busy=false;r.tick(20000);assert.deepEqual(r.shown,[[RATE_ASK,{duration:9000}]]);assert.equal(r.storage.m.get(RATE_ASK_KEY),'seen');
 r.tick(20000);r.tick(20000);assert.equal(r.shown.length,1);assert.equal(r.timers.length,0,'it stops looking');
 const again=run({storage:r.storage});again.tick(RATE_ASK_WAIT_MS);again.tick(20000);assert.equal(again.shown.length,0,'a new start: never again');
});

test('not below level 10, not on CrazyGames, Discord or the website',()=>{
 const low=run({level:9});low.tick(RATE_ASK_WAIT_MS);low.tick(20000);assert.equal(low.shown.length,0);
 for(const p of ['crazygames','discord']){const r=run({portal:p});r.tick(RATE_ASK_WAIT_MS);assert.equal(r.shown.length,0,p);assert.equal(r.timers.length,0,p);}
 const web=createRateAsk({win:{parent:null},state:farmAt(20),show:()=>assert.fail('website'),later:()=>assert.fail('no timer')});assert.equal(web.check(),false);
});

test('the game starts it outside the admin and visit views, and the privacy policy names the key',()=>{
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(game,/if\(!adminView&&!visitView\)createRateAsk\(\{state,show:\(text,options\)=>toast\(text,options\),/);
 assert.match(readFileSync(new URL('../public/privacy.html',import.meta.url),'utf8'),/<code>harvest-tycoon:rate-ask<\/code>/);
});
