import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the fish bar stands left of the reel button, right of it for left-handed farmers (23 Oct 2026, a player)',()=>{
 const css=read('public/pond.css'),ui=read('public/pond-ui.js'),game=read('public/game.js'),html=read('public/farm.html');
 assert.match(css,/\.pond-bar\{position:absolute;bottom:0;left:calc\(50% - 100px\);/,'left of the button by default');
 assert.match(css,/\.pond-view\[data-bar="right"\] \.pond-bar\{left:calc\(50% \+ 66px\)\}/,'right of it when chosen');
 assert.match(ui,/dialog\.dataset\.bar=barSide\(\);/);
 assert.match(ui,/localStorage\.getItem\('harvest-tycoon:pond-bar'\)==='right'\?'right':'left'/);
 assert.match(game,/localStorage\.setItem\('harvest-tycoon:pond-bar',hand\.checked\?'right':'left'\)/);
 assert.match(html,/<input id="pond-bar-right" type="checkbox" role="switch">/);
});
