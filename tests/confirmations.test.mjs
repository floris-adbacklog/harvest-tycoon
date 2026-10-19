import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('every confirmation is the game\'s own, never the browser\'s plain confirm()',()=>{
 for(const dir of ['public','src'])for(const file of readdirSync(new URL(`../${dir}`,import.meta.url)).filter(f=>f.endsWith('.js'))){
  assert.doesNotMatch(read(`${dir}/${file}`),/(^|[^.\w])(window\.)?confirm\(/,`${dir}/${file}`);
 }
});

test('the confirmations share one look: a picture, the question, a line, two buttons; red for what is hard to undo',()=>{
 const generic=read('public/confirm-dialog.js'),diamonds=read('public/diamond-confirm.js'),css=read('public/vip.css');
 assert.match(generic,/picture='',tone=''/);assert.match(generic,/tone==='danger'\?' is-danger':''/);
 assert.match(diamonds,/picture='diamonds',balance/);assert.match(diamonds,/You keep \$\{left\.toLocaleString\('en-US'\)\} diamonds/);assert.match(diamonds,/Spend \$\{amount\}/);
 // 18 Oct 2026: the red of a hard-to-undo confirm is the one red button of buttons.css (the window shell), no colour of its own here.
 assert.match(read('public/buttons.css'),/\.diamond-confirm\.is-danger \.confirm-spend\{background:var\(--btn-red\)/);
 const boosts=read('public/boosts-ui.js');for(const picture of ["picture:kind==='crop'?'harvest':'buildings'","picture:id==='crops'?'instant-harvest':boost.art","picture:'vip'","picture:COIN_PACK.art"])assert(boosts.includes(picture),picture);
 // Four: finishing crops or batches, a boost, VIP and the coins (20 Oct 2026).
 assert.equal((boosts.match(/balance:state\.diamonds/g)??[]).length,4,'every diamond confirmation shows what you keep');
 const family=read('public/family-ui.js');assert.match(family,/if\(ask&&!await confirmAction\(\{\.\.\.ask,cancelLabel:'Cancel',picture:'family-members'\}\)\)return;/);
 assert.match(family,/family_leave:\{title:'Leave this family\?'[^}]*tone:'danger'\}/);
 const economy=read('public/economy-ui.js');assert.match(economy,/confirmLabel:'Remove',cancelLabel:'Keep it',picture:p\.crop,tone:'danger'/);
 assert.match(economy,/cancelLabel:'Keep them',picture:'market'/);
 assert.match(read('src/player-profiles.js'),/cancelLabel:'Cancel',picture:'gift'/);
});
