import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('every button that spends coins on an upgrade shows the coin icon and a number with separators',()=>{
 assert.match(read('public/economy-ui.js'),/\$\{art\('coins'\)\} \$\{number\(cost\)\} coins/,'building upgrade');
 assert.match(read('public/growth-ui.js'),/id="stall-upgrade"[^>]*>\$\{s\.upgradeCost\?`\$\{art\('coins'\)\} \$\{number\(s\.upgradeCost\)\} coins`:'Max level'\}/,'farm stall upgrade');
 assert.match(read('public/retention-ui.js'),/Research · \$\{art\('coins'\)\} \$\{cost\.toLocaleString\('en-US'\)\} coins/,'silo research');
});
test('the coin icon in those buttons is sized like the other button icons',()=>{
 assert.match(read('public/beta.css'),/\.primary-button>\.game-art,\.small-button>\.game-art\{width:25px;height:25px\}/);
});
