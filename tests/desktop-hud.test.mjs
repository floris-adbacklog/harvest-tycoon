import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('on a computer the side tools are one panel and the camera buttons one row in the bottom-right corner',()=>{
 const html=read('public/farm.html'),css=read('public/desktop-hud.css');
 assert.match(html,/href="\/more-menu.css">\s*<link rel="stylesheet" href="\/desktop-hud.css">\s*<link rel="stylesheet" href="\/pwa-layout.css">/,'after the other game styles, pwa-layout.css stays last');
 assert.match(css,/\.side-tools\{[^}]*border-radius:22px;background:#fffdf5f2/,'the panel hides the map labels between the tiles');
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
