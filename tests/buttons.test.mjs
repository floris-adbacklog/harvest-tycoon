import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const css=read('public/buttons.css'),farm=read('public/farm.html');

test('one button style is loaded after the screens\' own styles, before the menu and layout fixes',()=>{
 const sheets=[...farm.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 const at=sheets.indexOf('/buttons.css');
 assert.ok(at>sheets.indexOf('/chat.css')&&at<sheets.indexOf('/more-menu.css'),sheets.join(' '));
});

test('five kinds: main green, second cream, gold for money, red for what is hard to undo, and off',()=>{
 assert.match(css,/--btn-main:#3f6b4a/);
 for(const kind of ['main','second','gold','red'])assert.match(css,new RegExp(`background:var\\(--btn-${kind}\\)`),kind);
 assert.match(css,/\.primary-button,\n\.collect-all-panel \.primary-button/);
 assert.match(css,/\.small-button,\n\.secondary-button/);
 assert.match(css,/\.primary-button\.starter-buy\{background:var\(--btn-gold\)/);
 assert.match(css,/\.small-button\.is-danger,/);
 assert.match(css,/#boost-dialog \.boost-buy:disabled\{\n background:var\(--btn-off\)/);
});

test('every button sinks onto its edge when pressed, and every close button has the same shape',()=>{
 assert.match(css,/transform:translateY\(2px\);box-shadow:0 1px 0 var\(--btn-main-edge\)/);
 assert.match(css,/\.dialog-heading \.icon-button,\.game-dialog \.dialog-heading \.icon-button\{width:42px;height:42px\}/);
 for(const close of ['.payment-dialog .payment-dismiss','.starter-close','.rookie-close','.level-up-close'])assert.ok(css.includes(close),close);
});
