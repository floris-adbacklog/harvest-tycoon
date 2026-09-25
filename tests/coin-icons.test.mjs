import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('every button that spends coins on an upgrade shows the coin icon and a number with separators',()=>{
 assert.match(read('public/economy-ui.js'),/<span class="upgrade-price">\$\{art\('coins'\)\}<b>\$\{number\(cost\)\}<\/b><\/span>/,'building upgrade: the coin picture and the price, in its own row (26 Sep 2026)');
 assert.match(read('public/growth-ui.js'),/id="stall-upgrade"[^>]*>\$\{s\.upgradeCost\?`<span>Upgrade<\/span><span class="button-price">\$\{art\('coins'\)\}\$\{number\(s\.upgradeCost\)\} coins<\/span>`:'Max level'\}/,'farm stall upgrade');
 const research=read('public/retention-ui.js');
 assert.match(research,/<span>Research<\/span><span class=\"button-price\">\$\{art\('coins'\)\}\$\{cost\.toLocaleString\('en-US'\)\} coins<\/span>/,'silo research');
 const button=research.slice(research.indexOf('id="research-silo"'),research.indexOf('</button>',research.indexOf('id="research-silo"')));
 assert.ok(!button.includes('Research ·'),'no bullet between the name and the price');assert.ok(!button.includes('sparkles'),'no research icon after the price');
 assert.match(button,/Research complete<i data-lucide=\"check\"><\/i>/,'a finished research keeps its check mark');
});
test('the coin icon in those buttons is sized like the other button icons',()=>{
 assert.match(read('public/beta.css'),/\.primary-button>\.game-art,\.small-button>\.game-art\{width:25px;height:25px\}/);
});
