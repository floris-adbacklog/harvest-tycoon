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
 assert.match(game,/floatReward\(id,floatChip\(result\.crop,`\+\$\{result\.quantity\}`\)\+floatChip\('xp',`\+\$\{result\.xp\} XP`,'is-xp'\)\)/);
});
test('phones show XP progress as a ring around the level badge',()=>{
 assert.match(read('public/game.js'),/\$\('journal-button'\)\.style\.setProperty\('--xp',/);
 assert.match(read('public/retention.css'),/\.level-card \.level-star::after\{[^}]*conic-gradient\(#d99a26 calc\(var\(--xp,0\)\*1%\)/);
});
test('an empty market offers the way forward',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/data-market-empty>\$\{marketTab==='crops'\?'Go to your fields':'Open buildings'\}<\/button>/);
 assert.match(ui,/\[data-market-empty\]'\)\?\.addEventListener\('click',\(\)=>\{\$\('market-dialog'\)\.close\(\);if\(marketTab!=='crops'\)openBuildings\(\);\}\)/);
});
test('the tractor shows a status pill, the crop as a chip that opens the crop picker, and one card per job',()=>{
 const ui=read('public/retention-ui.js'),css=read('public/retention.css');
 assert.match(ui,/<span id="tractor-timer" class="tractor-state \$\{cooldown\?'is-resting':''\}">\$\{cooldown\?`Resting · \$\{cooldown\}s`:'Ready'\}<\/span>/);
 assert.match(ui,/\$\('tractor-timer'\)\.textContent=s\?`Resting · \$\{s\}s`:'Ready';/,'the live countdown keeps the same wording');
 assert.match(ui,/document\.querySelector\('\[data-tractor-crop\]'\)\.onclick=\(\)=>\{\$\('utility-dialog'\)\.close\(\);\$\('selected-crop-button'\)\?\.click\(\);\};/);
 assert.match(ui,/<button class="tractor-job" data-tractor="\$\{mode\}"/);
 assert.match(css,/\.tractor-seed>span:not\(\.game-art\)\{flex:1;min-width:0\}/,'a crop picture (a span) is never stretched like the text');
});
test('the seed shop is one compact row per crop with its price on the right, and planting says what was planted',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/<button class="seed-row crop-\$\{key\} \$\{selectedCrop===key\?'selected':''\}/);
 assert.match(ui,/<span class="seed-row-price">\$\{art\('coins'\)\}\$\{seedCost\(state,key\)\}<\/span>/);
 assert.match(read('public/game.js'),/floatChip\(state\.plots\[id\]\.crop\?\?selectedCrop,'Planted'\)\+floatChip\('coins',`−\$\{result\.cost\}`,'is-cost'\)/);
});
