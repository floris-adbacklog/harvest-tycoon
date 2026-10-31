import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// The desktop bar (31 Oct 2026, the owner): socials left, Play Skyline Topia in the middle, Wiki and App right, on the sign-in page and
// under the farm, only on a computer and never in our apps.
test('the desktop bar: socials, Skyline Topia, Wiki and App, in new tabs so the farm stays open',()=>{
 const home=read('public/play.html'),bar=/<nav class="desk-bar">([^]*?)<\/nav>/.exec(home)?.[1];
 assert.ok(bar,'the bar is on the home page');
 assert.equal(home.indexOf('<nav class="desk-bar">')>home.indexOf('<div id="farm-host"'),true,'outside the sign-in page, so it stays when the farm opens');
 assert.equal((bar.match(/class="desk-bar-social"/g)??[]).length,7);
 assert.match(bar,/<a class="desk-bar-play" href="https:\/\/www\.skylinetopia\.com\/[^"]*" target="_blank" rel="noopener">Play Skyline Topia<\/a>/);
 assert.match(bar,/<a href="\/wiki" target="_blank" rel="noopener">Wiki<\/a><a href="\/app" target="_blank" rel="noopener">App<\/a>/);
 for(const code of ['nl','de','ja'])assert.match(JSON.parse(read(`public/i18n/${code}.json`))['Play Skyline Topia'],/Skyline Topia/,code);
});

test('the desktop bar shows only on a computer, outside our apps and the loading screen, and the farm makes room for it',()=>{
 const css=read('public/welcome.css');
 assert.match(css,/\.desk-bar\{display:none\}\n@media \(min-width:1024px\) and \(min-height:600px\) and \(hover:hover\) and \(pointer:fine\)\{/);
 assert.match(css,/html:not\(\[data-app\]\) body:is\(\[data-phase=unauthenticated\],\[data-phase=authenticated\],\[data-phase=error\]\) \.desk-bar\{/);
 assert.match(css,/html:not\(\[data-app\]\) body\[data-phase=authenticated\] #farm-host\{bottom:30px\}/);
});

test('where the bar shows, the footer above it leaves out its social icons, so they are not there twice',()=>{
 const css=read('public/welcome.css'),desk=css.slice(css.indexOf('.desk-bar{display:none}'));
 assert.match(desk,/html:not\(\[data-app\]\) \.site-legal \.footer-social\{display:none\}\n[^]*?\n\}/);
 assert.match(read('public/play.html'),/<footer class="site-legal">[^]*?class="footer-social"/,'phones keep them in the footer');
});
