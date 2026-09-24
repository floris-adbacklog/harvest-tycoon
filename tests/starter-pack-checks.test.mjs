import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STARTER_LEVEL} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// The Starter Pack used to ask the server every minute for every player (a third of all Edge Function calls).
test('the Starter Pack asks the server only when something can have changed',()=>{
 const js=read('src/starter-pack-ui.js');
 assert.doesNotMatch(js,/setInterval\(refresh,60000\)/,'no more check every minute');
 assert.match(js,/const RECHECK=15\*60\*1000/);
 assert.match(js,/const due=\(\)=>!document\.hidden&&\(!catalog\|\|running\(\)&&Date\.now\(\)-checkedAt>=RECHECK\);/,'only while the offer runs, or until the first answer arrived');
 assert.match(js,/poll=setInterval\(\(\)=>\{if\(due\(\)\)refresh\(\);\},RECHECK\)/);
 assert.match(js,/const onVisible=\(\)=>\{if\(due\(\)\)refresh\(\);\}/,'coming back to the game is throttled too');
 assert.match(js,/window\.addEventListener\('harvest-purchase-confirmed',refresh\)/,'a purchase is picked up at once');
 assert.match(js,/dialog\.showModal\(\);refresh\(\);/,'and opening the offer checks it');
 assert.match(js,/if\(lastLevel<STARTER_LEVEL&&level>=STARTER_LEVEL\)setTimeout\(refresh,1500\)/,'reaching the level shows the new offer without a reload');
 assert.equal(STARTER_LEVEL,14);
});
