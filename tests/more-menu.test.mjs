import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FEATURE_LEVELS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// The order a feature appears in "Your farm menu" (the mobile More dialog), keyed the same way progression-ui.js gates it.
function menuOrder(html){
 const grid=html.slice(html.indexOf('id="more-dialog"'),html.indexOf('</dialog>',html.indexOf('id="more-dialog"')));
 const buttons=[...grid.matchAll(/<button (data-menu-utility|data-menu-action)="([^"]+)"/g)];
 return buttons.map(([,kind,value])=>kind==='data-menu-utility'?value:value==='boosts-button'?'boosts':value==='estate-button'?'projects':null);
}
test('"Your farm menu" always lists every feature, gated ones in the order they unlock',()=>{
 const html=read('public/farm.html'),order=menuOrder(html);
 assert.equal(order.length,22,'nothing was dropped; Activities, Farm events, the (admin-only) dashboard, the Valley Market, the Ranch, the Estate Workshop, the Trade Depot, the fair and Invite a friend were added');
 assert.match(html,/data-menu-action="today-button"[\s\S]{0,200}<\/button>\n    <button data-menu-action="events-button">/,'Farm events sits right next to Daily rewards');
 assert.match(html,/<button data-menu-action="admin-button" id="admin-menu-entry" hidden>/,'the admin card is hidden for everyone until checkAdmin() allows it');
 assert(order.includes('activities'),'A helping hand has its own entry, it was missing entirely before');
 const gated=order.filter(Boolean);
 assert.deepEqual(gated,[...gated].sort((a,b)=>FEATURE_LEVELS[a]-FEATURE_LEVELS[b]),'gated entries are already in ascending unlock-level order in the markup');
 const grid2=html.slice(html.indexOf('id="more-dialog"'),html.indexOf('</dialog>',html.indexOf('id="more-dialog"')));
 for(const key of gated){
  const attr=key==='boosts'?'data-menu-action="boosts-button"':key==='projects'?'data-menu-action="estate-button"':`data-menu-utility="${key}"`;
  assert.match(grid2,new RegExp(`${attr}[\\s\\S]{0,120}class="menu-hint"`),`${key} has a swappable hint`);
 }
});
test('a locked feature stays visible in the menu, greyed and unclickable, with the level it needs; the side-tool bar keeps hiding it',()=>{
 const ui=read('public/progression-ui.js');
 assert.match(ui,/import \{[^}]*FEATURE_LEVELS[^}]*\} from '\.\/farm-state\.js';/);
 assert.match(ui,/const sideTools=\{'#boosts-button':'boosts','#estate-button':'projects'\};/,'the desktop side-tool bar still hides what is not open');
 assert.match(ui,/el\.disabled=!unlocked;el\.classList\.toggle\('locked',!unlocked\);/,'the More-menu card is disabled and greyed, never hidden');
 assert.match(ui,/hint\.textContent=unlocked\?hint\.dataset\.open:`Reach level \$\{FEATURE_LEVELS\[feature\]\}\.`;/);
 assert.doesNotMatch(ui,/data-menu-utility.*\.hidden=!featureUnlocked/s);
});
test('the locked card looks the part: greyscale icon, muted text and a lock badge, only on the More menu',()=>{
 const css=read('public/mobile.css');
 assert.match(css,/\.mobile-menu-grid button\.locked\{/);
 assert.match(css,/\.mobile-menu-grid button\.locked>\.game-art,\.mobile-menu-grid button\.locked>svg\{filter:grayscale\(1\)/);
 assert.match(css,/\.mobile-menu-grid button\.locked::after\{/,'a lock badge, not just dimming');
});

// Regression: "A helping hand" was added to the More menu as data-menu-utility="activities", but the generic utility-dialog in
// retention-ui.js only ever understood 'tractor' (anything else, including 'activities', silently rendered Silo research instead —
// a tap on "A helping hand" opened an unrelated, often still-locked screen).
test('"A helping hand" opens its own hub, not the generic tractor/silo dialog',()=>{
 const game=read('public/game.js');
 const body=game.slice(game.indexOf('function openUtility'),game.indexOf('\n',game.indexOf('function openUtility')+200));
 assert.match(body,/key==='activities'\)activities\.openHub\(\)/,'activities routes to its own hub, not retention.openUtility');
});

test('the menu is grouped under small headings, with compact tiles and the locked ones folded under "Coming later"',()=>{
 const html=read('public/farm.html'),grid=html.slice(html.indexOf('<div class="mobile-menu-grid">'),html.indexOf('</div>',html.indexOf('data-menu-later')));
 const headings=[...grid.matchAll(/<h3 class="menu-section" data-section-heading="([a-z]+)">([^<]+)<\/h3>/g)].map(m=>m[2]);
 assert.deepEqual(headings,['Every day','On the farm','Estate &amp; valley','Friends','Help &amp; settings']);
 const section=name=>{const start=grid.indexOf(`data-section-heading="${name}"`),end=grid.indexOf('<h3',start+10);return grid.slice(start,end<0?undefined:end);};
 assert.match(section('friends'),/leaderboard-button[\s\S]*invite-button/);assert.match(section('daily'),/all-quests-mobile/,'the Beginner guide is an everyday thing');assert.match(section('help'),/help-button[\s\S]*sound-button/);assert.match(section('daily'),/today-button[\s\S]*events-button/);
 assert.match(grid,/<button type="button" class="menu-later" data-menu-later aria-expanded="false" hidden><span>Coming later<\/span><b data-later-count>0<\/b>/);
 const ui=read('public/mobile-ui.js');
 assert.match(ui,/later\.onclick=\(\)=>\{grid\.classList\.toggle\('show-later'\);arrange\(\);\};/);
 assert.match(ui,/for\(const \[el,any\] of open\)el\.hidden=!any;/,'a heading hides when everything under it is locked');
 assert.match(ui,/classList\.toggle\('has-dot',!gift\.hidden\)/,'a waiting reward shows the yellow "!" on its tile');
 const css=read('public/more-menu.css');
 assert.match(css,/#more-dialog \.mobile-menu-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/#more-dialog \.mobile-menu-grid:not\(\.show-later\) button\.locked\{display:none\}/);
 assert.ok(html.indexOf('/more-menu.css')<html.indexOf('/pwa-layout.css'));
});
