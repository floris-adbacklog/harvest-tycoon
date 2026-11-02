import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');

// 30 Oct 2026, the owner picked 1+2+3: 19% stopped at step 5 (start a batch) and 17% at step 7, about a minute after the step before.
test('the guide button does steps 5 and 7: the first egg batch, then collect and sell the eggs (or the first chore)', async ()=>{
 const game=read('public/game.js'),ui=read('public/beginner-ui.js');
 assert.match(game,/quickStep:guideQuickStep,/);
 assert.match(game,/if\(id==='produce'\)\{[^\n]*runAction\(\{type:'produce',recipe:'eggs',count:1\}\)/);
 assert.match(game,/if\(id==='sell_egg'\)\{/);assert.match(game,/runAction\(\{type:'collect',building:'coop'\}\)/);assert.match(game,/economy\.sell\('eggs',undefined,from\)/);
 assert.match(game,/if\(id==='chore'\)\{[^\n]*runAction\(\{type:'chore',id:key\}\)/);
 assert.match(ui,/quick=!corn&&current&&!current\.ready&&!village&&quickStep\?quickStep\(current\.id\):null;/);
 assert.match(ui,/if\(\(q\?\.label\?\?null\)!==\(quick\?\.label\?\?null\)\)refresh\(\);/,'ready eggs bring Collect by themselves');
 // 3: the first batch in a building is ready in 30 s already (11 Oct 2026).
 const {createFarm,batchDuration}=await import('../public/farm-state.js');assert.equal(batchDuration(createFarm(Date.now()),'eggs',Date.now()),30000);
});
