import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const js=read('public/pretty-select.js'),css=read('public/pretty-select.css');

test('every dropdown in the game gets the game look: the stylesheet is loaded and the game dresses each <select>, also later ones',()=>{
 const farm=read('public/farm.html');
 assert.ok(farm.indexOf('/pretty-select.css')>0&&farm.indexOf('/pretty-select.css')<farm.indexOf('/pwa-layout.css'),'before pwa-layout.css, which stays last');
 assert.match(read('public/game.js'),/import \{ watchSelects \} from '\.\/pretty-select\.js';/);assert.match(read('public/game.js'),/\n watchSelects\(\);/);
 assert.match(js,/new MutationObserver\(records=>\{/,'selects drawn later (gifts, family, admin, boosts) are dressed too');
 // No dropdown opts out, so none of them looks like the browser's own.
 const sources=[...readdirSync(new URL('../public/',import.meta.url)).filter(f=>/\.(js|html)$/.test(f)&&f!=='pretty-select.js').map(f=>`public/${f}`),...readdirSync(new URL('../src/',import.meta.url)).filter(f=>f.endsWith('.js')).map(f=>`src/${f}`)];
 const selects=sources.flatMap(f=>[...read(f).matchAll(/<select[^>]*>/g)].map(m=>`${f}: ${m[0]}`));
 assert.ok(selects.length>=5,selects.join('\n'));
 for(const tag of selects)assert.doesNotMatch(tag,/data-native/,tag);
});

test('the real <select> stays and keeps working: picking fires change, setting .value from code updates the button',()=>{
 assert.match(js,/select\.classList\.add\('pretty-select-native'\);select\.tabIndex=-1;select\.setAttribute\('aria-hidden','true'\);/);
 assert.match(css,/\.pretty-select-native\{display:none!important\}/);
 assert.match(js,/select\.dispatchEvent\(new Event\('input',\{bubbles:true\}\)\);select\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\);/);
 assert.match(js,/for\(const key of \['value','selectedIndex'\]\)/);
 assert.match(js,/attributeFilter:\['disabled','hidden','aria-label','selected','label'\]/);
 assert.match(js,/select\.form\?\.addEventListener\('reset'/);
});

test('it works like a dropdown: arrows, Home/End, typing, Escape closes only the menu, a tap elsewhere closes it',()=>{
 assert.match(js,/aria-haspopup','listbox'/);assert.match(js,/role="option"/);assert.match(js,/aria-selected="\$\{option\.selected\}"/);
 assert.match(js,/if\(event\.key==='Escape'\)\{event\.preventDefault\(\);event\.stopPropagation\(\);close\(\);toggle\.focus\(\);return;\}/,'the dialog around it stays open');
 assert.match(js,/\{ArrowDown:Math\.min\(at\+1,list\.length-1\),ArrowUp:Math\.max\(at-1,0\),Home:0,End:list\.length-1\}/);
 assert.match(js,/document\.addEventListener\('pointerdown',event=>\{if\(openMenu&&!openMenu\.wrap\.contains\(event\.target\)\)openMenu\.close\(\);\},true\);/);
 assert.match(js,/const labels=\[\.\.\.\(select\.labels\?\?\[\]\)\];/,'the label is read before it is pointed at the button');
 // Opens upward when there is no room below, and never runs off the right edge.
 assert.match(js,/menu\.classList\.toggle\('is-up',up\)/);assert.match(css,/\.pretty-select-menu\.is-up\{top:auto;bottom:calc\(100% \+ 6px\)\}/);assert.match(css,/\.pretty-select-menu\.is-end\{left:auto;right:0\}/);
});

test('the look: soft field or small pill, pictures and notes in the menu, the picked option light blue, 44 px to tap',()=>{
 assert.match(css,/\.pretty-select-option\[aria-selected="true"\]\{background:#e3f3fd;color:#1f5877\}/);
 assert.match(css,/\.pretty-select-option\{[^}]*min-height:44px/);
 assert.match(css,/\.pretty-select\.is-compact \.pretty-select-toggle::after\{content:'';position:absolute;inset:-8px -4px\}/,'the pill looks small but is 44 px to tap');
 assert.match(js,/option\.dataset\.art\?`<span class="pretty-select-option-art">\$\{art\(option\.dataset\.art\)\}<\/span>`/);
 assert.match(js,/option\.dataset\.note\?`<small>/);assert.match(js,/option\.dataset\.detailArt\?art\(option\.dataset\.detailArt\)/);
});

test('each dropdown uses it: boost lengths and the reminder hour as pills, crops and goods with their pictures',()=>{
 assert.match(read('public/boosts-ui.js'),/data-pretty="compact"/);
 assert.match(read('public/farm.html'),/<select id="notify-hour" data-pretty="compact"><\/select>/);
 assert.match(read('public/social-ui.js'),/<option value="\$\{k\}" data-art="\$\{k\}"\$\{withStock\?` data-note="\$\{stock\(k\)\} in storage"`:''\}/);
 assert.match(read('public/family-ui.js'),/<option value="\$\{key\}" data-art="\$\{key\}" data-note="\$\{num\(state\.inventory\[key\]\)\} in stock · \$\{num\(item\.sell\)\} points each">\$\{esc\(item\.name\)\}<\/option>/);
 assert.equal(read('src/player-profiles.js').match(/<option value="\$\{key\}" data-art="\$\{key\}">/g).length,2,'crops and goods in the admin gift');
 // Where a <select> had its own place in a layout, the dropdown takes it.
 for(const rule of ['.sharing-picker .pretty-select{grid-area:select}','.family-extra .pretty-select{grid-column:1;grid-row:2;margin-bottom:14px}','.admin-grant-field .pretty-select{margin-top:5px}'])assert.ok(css.includes(rule),rule);
});
