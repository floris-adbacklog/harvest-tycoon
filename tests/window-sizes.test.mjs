import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('on a computer the windows with a long list are wider, with the list in two columns',()=>{
 const css=read('public/desktop-hud.css');
 assert.match(css,/@media\(min-width:1200px\) and \(pointer:fine\)\{\s*:is\(#market-dialog,#seed-dialog,#today-dialog,#building-dialog:has\(\.recipe-list\)\)\{width:min\(1000px,calc\(100% - 96px\)\)/);
 assert.match(css,/#market-items\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/#building-dialog \.recipe-list>\.factory-recipe-group\[open\]\{grid-column:1\/-1\}/,'an open Factory group takes the whole row');
 assert.match(css,/#market-items>:not\(\.market-card\)\{grid-column:1\/-1\}/,'"Not in stock" and its price list take the whole width, not one column');
});

test('on a phone the windows waste less room: title-only headings, a short Family heading and compact market rows',()=>{
 const css=read('public/mobile-windows.css');
 assert.match(css,/@media\(max-width:900px\),\(max-height:550px\) and \(pointer:coarse\)\{/,'the same phones as mobile.css');
 assert.match(css,/\.game-dialog \.dialog-heading \.eyebrow\{display:none\}/);
 assert.match(css,/#family-dialog \.family-heading h2\{[^}]*white-space:nowrap;overflow:hidden;text-overflow:ellipsis\}/,'the family name stays on one line');
 assert.match(css,/#market-items \.market-card \.market-sale-controls\{display:none;/);
 assert.match(css,/#market-items \.market-card\.is-open \.market-sale-controls\{display:block\}/);
 assert.match(css,/\.wiki-quick button\{min-height:40px/);
 assert.match(css,/^\.market-quick,\.market-kept\{display:none\}/m,'a computer keeps the slider and both buttons');
});

test('a market row on a phone has Sell all and a Pick amount button that opens the slider',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/<button type="button" class="small-button market-quick-sell" data-sell-item-all="\$\{key\}"/);
 assert.match(ui,/class="market-amount-toggle" data-sell-amount="\$\{key\}" aria-expanded="\$\{open\}" aria-controls="sell-controls-\$\{key\}"/);
 assert.match(ui,/if\(open\)openSaleRows\.add\(key\);else openSaleRows\.delete\(key\);/,'an open row stays open when the market redraws');
 assert.match(read('public/wiki-content.js'),/on a phone: tap Pick amount/,'the wiki says how');
});
