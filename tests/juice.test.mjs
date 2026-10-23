import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {haptic,HAPTICS} from '../public/haptics.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('a short buzz on good moments, only on touch devices that support it, never an error',()=>{
 const calls=[],nav={vibrate:p=>{calls.push(p);return true;}};
 assert.equal(haptic('harvest',{nav,touch:()=>true}),true);assert.deepEqual(calls,[HAPTICS.harvest]);
 assert.equal(haptic('levelup',{nav,touch:()=>false}),false,'no buzz with a mouse');
 assert.equal(haptic('plant',{nav,touch:()=>true}),false,'planting is not a reward');
 assert.equal(haptic('harvest',{nav:{},touch:()=>true}),false,'iOS has no vibrate');
 assert.equal(haptic('reward',{nav:{vibrate(){throw Error('blocked');}},touch:()=>true}),false);
 assert.match(read('public/game.js'),/kind=>\{farmAudio\.play\(kind\);haptic\(kind\);\}/,'every action sound also gets its buzz');
});
test('floating rewards over a field are chips with their own picture',()=>{
 const game=read('public/game.js');
 assert.match(game,/const floatChip=\(key,text,cls=''\)=>`<span class="float-chip \$\{cls\}">\$\{art\(key\)\}\$\{text\}<\/span>`;/);
 assert.match(game,/floatChip\(result\.crop,`\+\$\{result\.quantity\}`\)\+worthChip\(\{\[result\.crop\]:result\.quantity\}\)\+floatChip\('xp',`\+\$\{result\.xp\} XP`,'is-xp'\)\)/);
});
test('phones show XP progress as a ring around the level badge',()=>{
 assert.match(read('public/game.js'),/\$\('journal-button'\)\.style\.setProperty\('--xp',/);
 assert.match(read('public/retention.css'),/\.level-card \.level-star::after\{[^}]*conic-gradient\(#d99a26 calc\(var\(--xp,0\)\*1%\)/);
});
test('an empty market offers the way forward',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/data-market-empty>\$\{marketTab==='crops'\?'Go to your fields':marketTab==='village'\?'Open places':'Open buildings'\}<\/button>/);
 assert.match(ui,/\[data-market-empty\]'\)\?\.addEventListener\('click',\(\)=>\{\$\('market-dialog'\)\.close\(\);if\(marketTab!=='crops'\)openBuildings\(\);\}\)/);
});
test('the tractor shows the crop as a chip that opens the crop picker, and one tile per job (5 Oct 2026); no rest pill since it never rests (4 Oct 2026)',()=>{
 const ui=read('public/retention-ui.js'),css=read('public/retention.css');
 assert.doesNotMatch(ui,/tractor-timer|Resting ·|\bcooldown\b|tractor rests/,'nothing of the old rest is left (a leftover cooldown broke the card on 4 Oct 2026)');
 // Since 17 Oct 2026 the seed shop returns to the tractor once a crop is picked (tractor-plant-ask.test.mjs).
 assert.match(ui,/document\.querySelector\('\[data-tractor-crop\]'\)\.onclick=\(\)=>toSeeds\(false\);/);
 assert.match(ui,/\$\('utility-dialog'\)\.close\(\);const seeds=\$\('seed-dialog'\);seeds\.dataset\.from='tractor';\$\('selected-crop-button'\)\?\.click\(\);/);
 assert.match(ui,/<button class="tractor-tile" data-tractor="\$\{mode\}"/);
 assert.match(css,/\.tractor-seed>span:not\(\.game-art\)\{flex:1;min-width:0\}/,'a crop picture (a span) is never stretched like the text');
});
test('the seed shop is one compact row per crop with its price on the right, and planting says what was planted',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/<button class="seed-row crop-\$\{key\} \$\{selectedCrop===key\?'selected':''\}/);
 assert.match(ui,/<span class="seed-row-price">\$\{art\('coins'\)\}\$\{seedCost\(state,key\)\}<\/span>/);
 assert.match(read('public/game.js'),/floatChip\(state\.plots\[id\]\.crop\?\?selectedCrop,'Planted'\)\+floatChip\('coins',`−\$\{result\.cost\}`,'is-cost'\)/);
});
// 23 Oct 2026 (the owner's production window redesign): the slots as tiles on top, a free slot as an empty tile, and each recipe as one
// compact card with Start beside it; the old head/footer markup (recipe-head, recipe-footer) is gone on purpose.
test('production: slot tiles on top and compact recipe cards, Collect only when ready',()=>{
 const ui=read('public/economy-ui.js'),css=read('public/retention.css');
 assert.match(ui,/<span class="recipe-art">\$\{art\(output\[0\]\)\}<b class="recipe-yield">\$\{number\(output\[1\]\*count\)\}×<\/b><\/span>/);
 assert.match(ui,/<span class="recipe-xp">\$\{art\('xp'\)\}\+\$\{r\.xp\} XP<\/span>/);
 assert.match(ui,/\$\{isReady\?`<button data-collect-job="\$\{job\.id\}" class="primary-button job-collect">Collect<\/button>`:''\}/,'no disabled button while a batch is running');
 assert.match(ui,/<div class="job-tile is-free" aria-hidden="true">[^']*<span class="job-state">Free<\/span><\/div>'\.repeat\(free\)/,'a free slot is an empty tile');
 assert.match(ui,/time\.textContent=now>=job\.readyAt\?'Ready':`\$\{seconds\(job\.readyAt-now\)\} left`;/);
 assert.match(ui,/a\.missing\.length\?`Missing: \$\{a\.missing\.map\(m=>`\$\{number\(m\.need-m\.have\)\} \$\{m\.name\}`\)\.join\(', '\)\}\.`/,'a recipe you cannot start says what is missing');
 assert.match(css,/#building-dialog #building-content \.recipe-card\{display:grid;grid-template-columns:52px minmax\(0,1fr\) auto;/,'Start beside the card');
 assert.match(css,/#building-dialog #building-content \.job-tile\.is-ready\{border-color:#8cc06a;/,'a ready slot has the green edge');
});
// The player's report (23 Oct 2026): a ready batch did not come in while the Warehouse was full. The slots say so (its chip, and Full on a
// ready tile); Collect stays, and a batch finished with diamonds is a ready tile with Collect like any other.
test('production: with something ready and the Warehouse (nearly) full, the slots show its chip and Full',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/const room=warehouseFull\(state\)\?'full':warehouseNearFull\(state\)\?'near':'ok'/);
 assert.match(ui,/\$\{ready\.length&&room!=='ok'\?`<div class="production-room is-\$\{room\}"><button type="button" class="warehouse-chip is-\$\{room\}" data-open-warehouse>/);
 assert.match(ui,/\$\{room==='full'\?'Full':'Ready'\}/);
 assert.match(ui,/querySelector\('\[data-open-warehouse\]'\)\?\.addEventListener\('click',\(\)=>onWarehouse\?\.\(\)\)/);
});
