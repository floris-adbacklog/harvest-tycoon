import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// The desktop bar (31 Oct 2026, the owner): socials left, Play Skyline Topia in the middle, Wiki and App right, on the sign-in page and
// under the farm, only on a computer and never in our apps.
test('the desktop bar: socials, the copyright line, Wiki and App, in new tabs so the farm stays open',()=>{
 const home=read('public/play.html'),bar=/<nav class="desk-bar">([^]*?)<\/nav>/.exec(home)?.[1];
 assert.ok(bar,'the bar is on the home page');
 assert.equal(home.indexOf('<nav class="desk-bar">')>home.indexOf('<div id="farm-host"'),true,'outside the sign-in page, so it stays when the farm opens');
 assert.equal((bar.match(/class="desk-bar-social"/g)??[]).length,7);
 // In the middle since 4 Nov 2026 (the owner: "Haal Play Skyline Topia uit midden van de footer, zet neer Copyright 2026 Harvest Tycoon", "copyright icoon ipv copyright"): the same in every language.
 assert.match(bar,/<span class="desk-bar-play">© 2026 Harvest Tycoon<\/span>/);assert.doesNotMatch(bar,/Play Skyline Topia/);
 assert.match(bar,/<a href="\/wiki" target="_blank" rel="noopener">Wiki<\/a><a href="\/app" target="_blank" rel="noopener">App<\/a>/);
});

test('the desktop bar shows only while playing, on a computer, outside our apps, see-through over the farm',()=>{
 const css=read('public/welcome.css');
 assert.match(css,/\.desk-bar\{display:none\}\nhtml\[data-portal\] \.desk-bar\{display:none!important\}\n@media \(min-width:1024px\) and \(min-height:600px\) and \(hover:hover\) and \(pointer:fine\)\{\n html:not\(\[data-app\]\) body\[data-phase=authenticated\] \.desk-bar\{position:fixed;/);
 assert.doesNotMatch(css,/data-phase=unauthenticated[^{]*\.desk-bar/,'not on the sign-in page');
 assert.doesNotMatch(css,/#farm-host\{bottom:30px\}/,'the farm runs on under the bar');
});

test('the sign-in page keeps its footer with the social icons on every screen',()=>{
 assert.doesNotMatch(read('public/welcome.css'),/\.site-legal \.footer-social\{display:none\}/);
 assert.match(read('public/play.html'),/<footer class="site-legal">[^]*?class="footer-social"/);
});

test('never on a game portal: their pages have no bar, and a portal page would hide it anyway',()=>{
 for(const page of ['crazygames','kongregate','discord'])assert.doesNotMatch(read(`public/${page}.html`),/desk-bar|skylinetopia/i,page);
 assert.match(read('public/welcome.css'),/\nhtml\[data-portal\] \.desk-bar\{display:none!important\}\n/);
 for(const build of ['build-crazygames','build-itch'])assert.doesNotMatch(read(`scripts/${build}.mjs`),/play\.html/,`${build} does not ship the home page`);
});

test('over the farm the bar covers nothing to tap: the farm page lifts its buttons and windows by the bar\'s height',()=>{
 assert.match(read('src/main.js'),/page\.src='\/farm\.html';\$\('farm-host'\)\.append\(page\);deskBarRoom\(page\);/);
 // Its Wiki opens How to play inside the game while the farm is open (4 Nov 2026, the owner), the website's wiki only before that.
 assert.match(read('src/main.js'),/bar\.querySelector\?\.\('a\[href="\/wiki"\]'\)\?\.addEventListener\?\.\('click',event=>\{\n  try\{const game=frame\.contentWindow;if\(typeof game\?\.harvestWiki!=='function'/);
 assert.match(read('src/main.js'),/event\.preventDefault\(\);frame\.contentDocument\.querySelectorAll\('dialog\[open\]'\)\.forEach\(d=>d\.close\(\)\);game\.harvestWiki\(\);/);
 assert.match(read('src/main.js'),/root\.toggleAttribute\('data-desk-bar',shown\)/);
 assert.match(read('public/styles.css'),/\n:root\[data-desk-bar\]\{--safe-bottom:calc\(env\(safe-area-inset-bottom,0px\) \+ 30px\)\}\n/);
 assert.match(read('public/pwa-layout.css'),/html\[data-app-mode=standalone\]\[data-desk-bar\]\{--safe-bottom:calc\(max\(0px,calc\(env\(safe-area-inset-bottom,0px\) - var\(--viewport-shortfall,0px\)\)\) \+ 30px\)\}/);
 assert.match(read('public/styles.css'),/\n:root\[data-desk-bar\] :is\(\.bottom-hud,\.scene-controls\)\{translate:0 -30px\}\n/,'the tools bar and the zoom buttons too');
 assert.match(read('public/welcome.css'),/\.desk-bar\{[^}]*height:30px/,'the same 30 px as the bar');
});
