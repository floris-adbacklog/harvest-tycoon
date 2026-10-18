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

test('the kinds: main green (also for real money), second cream, light blue for diamonds, red for what is hard to undo, and off',()=>{
 assert.match(css,/--btn-main:#3f8a4a;/,'a lighter, cheerful leaf green (7 Oct 2026), still readable with white text');
 assert.match(css,/#boost-dialog \.boost-buy\{\n background:var\(--btn-diamond\)/);
 for(const kind of ['main','second','diamond','red'])assert.match(css,new RegExp(`background:var\\(--btn-${kind}\\)`),kind);
 // Real money is green with its price (18 Oct 2026, the owner): no button is gold any more.
 assert.match(css,/\.is-money\{background:var\(--btn-main\);/);assert.doesNotMatch(css,/background:var\(--btn-gold\)/);
 assert.match(css,/\.primary-button,\n\.collect-all-panel \.primary-button/);
 assert.match(css,/\.small-button,\n\.secondary-button/);
 assert.match(css,/\.primary-button\.starter-buy\{background:var\(--btn-main\)/);
 assert.match(css,/\.small-button\.is-danger,/);
 assert.match(css,/#boost-dialog \.boost-buy:disabled\{\n background:var\(--btn-off\)/);
});

// 18 Oct 2026, the owner ("Maak het iets moderner, minder AI-gegenereerd ogend"): chunkier, more game-like buttons. A 2 px outline, a 4 px
// edge in each family's own colour that the button sinks 3 px onto when pressed, and one 44 px close with a drawn × for every window.
test('every button sinks onto its edge when pressed, and every close button has the same shape',()=>{
 assert.match(css,/transform:translateY\(3px\);box-shadow:0 1px 0 var\(--btn-main-edge\)/);
 assert.match(css,/#boost-dialog \.boost-buy:not\(:disabled\):active,\.is-diamond:active:not\(:disabled\)[^{]*\{box-shadow:0 1px 0 var\(--btn-diamond-edge\)\}/,'each family sinks onto its own edge');
 assert.match(css,/\.dialog-heading \.icon-button,\.game-dialog \.dialog-heading \.icon-button\{width:44px;height:44px;/);
 for(const close of ['.payment-dialog .payment-dismiss','.starter-close','.rookie-close','.level-up-close','.offer-close','.popup-close','.farmer-profile-close','[data-family-profile-close]','[data-book-close]','.chat-close'])assert.ok(css.includes(close),close);
 assert.match(css,/::before\{rotate:45deg\}/,'the × is drawn, the same in every window');
 for(const kind of ['main','second','diamond','red'])assert.match(css,new RegExp(`box-shadow:var\\(--btn-top\\),0 4px 0 var\\(--btn-${kind}-edge\\)`),kind);
});

test('tabs share the style: a sunken track and the chosen tab raised like a second button',()=>{
 assert.match(css,/\.market-tabs,\.chat-tabs,\.auth-tabs\{background:#efe6d8/);
 for(const chosen of ['.market-tabs button.active','.market-tabs button[aria-selected="true"]','.market-tabs button[aria-pressed="true"]','#tasks-dialog .quest-filters button[aria-pressed="true"]','.chat-tabs button.active'])assert.ok(css.includes(chosen),chosen);
 assert.match(css,/color:#5b4520;box-shadow:0 3px 0 #e2d3b3\}/);
});

test('hovering or pressing a green or red small button keeps its own border and edge',()=>{
 assert.doesNotMatch(css,/:hover\{background:var\(--btn-second-hover\);border-color/);
 // 18 Oct 2026: the Market's Sell 1 and Sell N are second buttons (the one green button of the window is Sell all), with the cream edge.
 assert.match(css,/\.market-sale-buttons \[data-sell\]:active:not\(:disabled\)\{box-shadow:0 1px 0 var\(--btn-second-edge\)\}/);
});
