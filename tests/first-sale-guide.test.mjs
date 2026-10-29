import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');

// 29 Oct 2026, the CrazyGames launch: two thirds of its new farmers harvested and left within seconds, their corn unsold.
test('step 2 sells from the guide: a Sell all button on the card and beside the phone banner, through Market\'s own sell', ()=>{
 const html=read('public/farm.html'),ui=read('public/beginner-ui.js'),game=read('public/game.js'),economy=read('public/economy-ui.js');
 assert.match(html,/id="beginner-sell" class="primary-button beginner-sell" hidden/);
 assert.match(html,/id="beginner-mobile-sell" class="primary-button beginner-mobile-sell" hidden/);
 assert.match(ui,/current\?\.id==='sell'&&!village&&sellFirst\?sellableStock\(state,'corn',farmNow\(\)\):0/);
 assert.match(ui,/Sell all \$\{corn\}/);
 assert.match(game,/sellFirst:from=>economy\.sell\('corn',undefined,from\)/);
 assert.match(economy,/async function sell\(key='category',quantity,from=null\)/);
 assert.match(economy,/const tapped=from\?\?/);
});

test('inside CrazyGames only, the first basket sells itself once step 2 is reached', ()=>{
 const ui=read('public/beginner-ui.js'),game=read('public/game.js');
 assert.match(game,/autoSell:portal\(\)\?\.name==='crazygames'/);
 assert.match(ui,/if\(autoSell&&!village&&steps\.some\(step=>step\.step==='harvest'\)&&current\?\.id==='sell'\)setTimeout/);
 const i18n=JSON.parse(read('public/i18n/nl.json'));
 assert.ok(Object.values(i18n).some(v=>typeof v==='object'?'Sell all {0}' in v:false)||'Sell all {0}' in i18n,'Sell all {0} is translated');
});
