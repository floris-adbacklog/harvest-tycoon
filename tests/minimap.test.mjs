import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('on a computer a live farm map takes the logo\'s place; the logo moves small to the bottom-left; phones keep neither',()=>{
 const html=read('public/farm.html'),css=read('public/desktop-hud.css');
 assert.match(html,/<div class="minimap" id="minimap" role="img" aria-label="Farm map\. Click a spot to look there\."><canvas width="420" height="252"><\/canvas><\/div>/);
 assert.match(html,/src="\/assets\/harvest-tycoon-logo\.webp"/,'the logo stays in the page');
 assert.match(css,/^\.minimap\{display:none\}/m,'no map on phones');
 assert.match(css,/\.minimap\{display:block;/);
 assert.match(css,/@media\(min-width:901px\) and \(min-height:760px\)\{\s*\.topbar \.brand>img\{display:block;position:fixed;left:22px;top:auto;bottom:14px;width:118px;height:118px/);
});

test('the map is a small render of the farm, refreshed now and then, with live rings and the view frame; clicking moves the view',()=>{
 const game=read('public/game.js'),map=read('public/minimap.js');
 assert.match(game,/renderer\.setScissorTest\(true\);renderer\.setViewport\(0,0,w\/ratio,h\/ratio\);/,'rendered into a corner of the screen buffer');
 assert.match(game,/renderer\.setScissorTest\(false\);renderer\.setViewport\(0,0,viewportWidth,viewportHeight\);renderer\.render\(scene,camera\);/,'and the farm drawn again in the same frame');
 assert.match(game,/if\(mapShown\(\)\)\{if\(performance\.now\(\)-lastMapShot>30000\)shootMinimap\(\);else minimap\.draw\(\);\}/);
 assert.match(game,/const mapShown=\(\)=>!!minimap&&getComputedStyle\(\$\('minimap'\)\)\.display!=='none';/,'phones never render it');
 assert.match(game,/pan=clamp\(\(\(x-bx\)-\(z-bz\)\)\/2\);panDepth=clamp\(\(\(x-bx\)\+\(z-bz\)\)\/2\);resize\(\);/);
 assert.match(map,/if\(!p\.ready\|\|p\.locked\)continue;/,'a gold ring only where something is ready');
 assert.match(map,/canvas\.addEventListener\('pointerdown',event=>\{dragging=true;/);
});

test('the gold ring on the map stands still (no blinking), and the ground runs on into the haze',()=>{
 const map=read('public/minimap.js'),game=read('public/game.js');
 assert.doesNotMatch(map,/pulse/);assert.match(map,/ctx\.arc\(x,y,6\.5\*dpr,0,Math\.PI\*2\)/);
 assert.match(game,/const ground=patch\(0,0,600,600,0x8aa64e,0\);/,'no edge of the world in view');
 assert.match(read('public/scene-polish.js'),/600\/22\)/,'the same grass tile on the wider ground');
});

test('Tab from field to field: the field ring lights up, the label gets a soft edge, an empty field no stray square',()=>{
 assert.match(read('public/game.js'),/label\.addEventListener\('focus',\(\)=>highlight\(i\)\);label\.addEventListener\('blur',\(\)=>highlight\(-1\)\);/);
 const css=read('public/retention.css');
 assert.match(css,/\.plot-label:focus-visible\{outline:none;box-shadow:0 0 0 2px #fffdf5,0 0 0 4\.5px #f3c353/);assert.match(css,/\.plot-label:empty:focus-visible\{opacity:0\}/);
});
