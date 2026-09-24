import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('on a computer the side tools stay see-through and the camera buttons are one row in the bottom-right corner',()=>{
 const html=read('public/farm.html'),css=read('public/desktop-hud.css');
 assert.match(html,/href="\/more-menu.css">\s*<link rel="stylesheet" href="\/desktop-hud.css">\s*<link rel="stylesheet" href="\/pwa-layout.css">/,'after the other game styles, pwa-layout.css stays last');
 assert.doesNotMatch(css,/\.side-tools\{[^}]*background/,'no panel behind the side tools');
 const game=read('public/game.js');
 assert.match(game,/behindTools\(x,y,80\)/,'a building name behind the side tools is hidden');
 assert.match(game,/behindTools\(x,y,22\)/,'and so is a small place marker');
 assert.match(game,/if\(!tools\|\|mobileLayout\.matches\)\{toolsBox=null;hudShift=0;return;\}/,'only on a computer');
 assert.match(game,/hudShift=\(toolsBox\.right-\(g\?\.width\?w\.right-g\.left:0\)\)\/2;/,'the farm sits between the side tools and an open Beginner guide');
 assert.match(game,/if\(!t\.width\)\{toolsBox=null;hudShift=0;return;\}/,'tools or a guide that are not on screen do not count');
 assert.match(game,/const shift=!mobile&&viewMode!=='overview'\?hudShift\*span\/height:0;\n camera\.left=-span\*aspect\/2-shift;camera\.right=span\*aspect\/2-shift;/);
 assert.match(css,/\.scene-controls\{flex-direction:row;top:auto;right:20px;bottom:20px\}/);
 assert.match(css,/\.beginner-card\{max-height:calc\(100dvh - 215px\)\}/,'the Beginner guide ends above the camera row');
 assert.match(css,/max-width:1040px[^{]*\{\s*\.scene-controls\{bottom:124px\}/,'narrow windows lift the row above the dock');
});

test('the Leaderboard is a side tool next to Invite on a computer and stays in the More menu on phones',()=>{
 const ui=read('src/ui.js');
 assert.match(ui,/button\.className='side-tool';[^\n]*<b>Leaderboard<\/b>'[^\n]*getElementById\('invite-button'\);if\(invite\)invite\.after\(button\)/);
 assert.doesNotMatch(ui,/querySelector\('\.tool-dock'\)\.append\(button\)/,'no longer in the tool dock');
 assert.match(read('public/mobile.css'),/\.side-tools #leaderboard-button\{display:none\}/);
 assert.match(read('public/farm.html'),/data-menu-action="leaderboard-button"/);
});

test('the Starter Pack is a small button next to the diamonds on a computer, the corner tile on phones',()=>{
 const js=read('src/starter-pack-ui.js'),css=read('public/starter-pack.css');
 assert.match(js,/getElementById\('diamond-button'\)\?\.after\(chip\)/);
 assert.match(js,/button\.hidden=chip\.hidden=!eligible/,'both follow the offer');
 assert.match(js,/button\.onclick=chip\.onclick=/);
 assert.match(css,/\(min-width:901px\) and \(min-height:551px\),\(min-width:901px\) and \(pointer:fine\)\{#starter-pack-button\{display:none\}\}/);
 assert.match(css,/\(max-width:900px\),\(max-height:550px\) and \(pointer:coarse\)\{#starter-pack-chip\{display:none\}\}/);
});

test('desktop building labels are compact: the name, and a second line only when there is news',()=>{
 const css=read('public/desktop-hud.css');
 assert.match(css,/\.building-label \.building-status\.idle\{display:none\}/,'"Ready to work · 0 / 5 slots" said nothing');
 assert.match(css,/\.building-label\{gap:6px;padding:4px 10px 4px 4px;border-radius:10px\}/);
});
