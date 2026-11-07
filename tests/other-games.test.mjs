import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Other games from us (1 Nov 2026, the owner: "Schrijf onder More menu Other games from us en zet daar ook Skyline Topia"): one link
// tile in its own group of the More menu, opening Skyline Topia in a new tab, never on the portals (no links out of the game there).
test('the More menu links to Skyline Topia under Other games from us',()=>{
 const html=read('public/farm.html'),menu=html.slice(html.indexOf('id="more-dialog"'),html.indexOf('</dialog>',html.indexOf('id="more-dialog"')));
 assert.match(menu,/<h3 class="menu-section menu-other-games" data-section-heading="other">Other games from us<\/h3>\n    <a class="menu-other-game" href="https:\/\/www\.skylinetopia\.com\/\?utm_source=harvesttycoon&amp;utm_medium=more_menu" target="_blank" rel="noopener"><img src="\/assets\/skyline-topia\.webp" width="96" height="96" alt="" loading="lazy" decoding="async"><span><strong>Skyline Topia<\/strong>/);
 assert.match(read('public/mobile-ui.js'),/\(el\.tagName==='BUTTON'\|\|el\.tagName==='A'\)/,'a link tile keeps its group heading open');
 assert.match(read('public/portal.css'),/html\[data-portal\] \.menu-other-games,html\[data-portal\] \.menu-other-game\{display:none!important\}/);
 assert.ok(readFileSync(new URL('../public/assets/skyline-topia.webp',import.meta.url)).subarray(8,12).toString()==='WEBP','the logo is a WebP');
 assert.match(menu,/<a class="menu-other-game" href="https:\/\/www\.thundersiege\.com\/\?utm_source=harvesttycoon&amp;utm_medium=more_menu" target="_blank" rel="noopener"><img src="\/assets\/thunder-siege\.webp"[^>]*><span><strong>Thunder Siege<\/strong>/,'Thunder Siege too (3 Nov 2026)');
 for(const code of ['nl','de','es','fr','ja'])assert.ok(JSON.parse(read(`public/i18n/${code}.json`))['Other games from us'],code);
 // Hangilo (5 Nov 2026, the owner: "voeg Hangilo toe aan andere games van ons"), after Thunder Siege, its logo a WebP too: the wordmark without a background, wider (more-menu.css .menu-other-wordmark).
 assert.match(menu,/<a class="menu-other-game" href="https:\/\/www\.hangilo\.com\/\?utm_source=harvesttycoon&amp;utm_medium=more_menu" target="_blank" rel="noopener"><img src="\/assets\/hangilo\.webp"[^>]*><span><strong>Hangilo<\/strong>/);
 assert.ok(readFileSync(new URL('../public/assets/hangilo.webp',import.meta.url)).subarray(8,12).toString()==='WEBP');
 // Lootvale (7 Nov 2026, the owner): after Hangilo, its logo a WebP; an 18+ game with slots, so the website only, never in our apps.
 assert.match(menu,/<a class="menu-other-game menu-other-web" href="https:\/\/lootvale\.com\/\?utm_source=harvesttycoon&amp;utm_medium=more_menu" target="_blank" rel="noopener"><img src="\/assets\/lootvale\.webp"[^>]*><span><strong>Lootvale<\/strong><small>Slots 18\+<\/small>/);
 assert.ok(readFileSync(new URL('../public/assets/lootvale.webp',import.meta.url)).subarray(8,12).toString()==='WEBP');
 assert.match(read('public/more-menu.css'),/html\[data-app\] #more-dialog \.mobile-menu-grid>a\.menu-other-web\{display:none!important\}/);
});
