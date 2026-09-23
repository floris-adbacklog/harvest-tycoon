import test from 'node:test';
import assert from 'node:assert/strict';
import {toastParts} from '../public/toast-ui.js';

test('a toast picks a tone and a matching picture from its message',()=>{
 assert.deepEqual([toastParts('Job well done! +5 coins and +1 XP.').tone,toastParts('Job well done! +5 coins and +1 XP.').icon],['reward','xp']);
 assert.equal(toastParts('You need 5 coins to help.').tone,'warn');
 assert.equal(toastParts('You need 5 coins to help.').icon,'lock');
 assert.equal(toastParts('Your batch is ready. Collect it from the building.').icon,'buildings');
 assert.equal(toastParts('Something happened.').icon,'farm');
});
test('amounts become chips with their own picture',()=>{
 const {html}=toastParts('Collected 40 bread · +12 XP and +1,200 coins, +2 diamonds');
 assert.match(html,/<b class="toast-chip is-xp">[\s\S]*\+12 XP<\/b>/);
 assert.match(html,/<b class="toast-chip is-coins">[\s\S]*\+1,200<\/b>/);
 assert.match(html,/<b class="toast-chip is-diamonds">[\s\S]*\+2<\/b>/);
});
test('text from other players is escaped before any chip is added',()=>{
 const {html}=toastParts('Gift from <img src=x onerror=alert(1)> +5 coins');
 assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
});
test('every game toast goes through the toast module',()=>{
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(game,/function toast\(message\)\{showToast\?\?=createToast\(\$\('toast'\)\);showToast\(message\);\}/);
});
import {readFileSync} from 'node:fs';
test('goods and crops become chips too, with no dot between neighbouring chips, and helping-hand jobs get their own picture',()=>{
 const {icon,html}=toastParts('Job complete! +48 XP · +1 Animal feed');
 assert.equal(icon,'helping-hand');
 assert.match(html,/<b class="toast-chip is-xp">[\s\S]*\+48 XP<\/b> <b class="toast-chip is-item">[\s\S]*data-art="feed"[\s\S]*\+1 Animal feed<\/b>/);
 assert.match(toastParts('Bonus: +2 wheat!').html,/<b class="toast-chip is-item">[\s\S]*\+2 wheat<\/b>!/);
});
test('field tools get their own picture: care, water and planting',()=>{
 assert.equal(toastParts('Extra care will be available in 2s.').icon,'care');
 assert.equal(toastParts('This crop was already watered.').icon,'lock','a warning keeps its warning picture');
 assert.equal(toastParts('Water will be available in 3s.').icon,'water');
 assert.equal(toastParts('Wheat selected. Choose an empty field to plant.').icon,'seeds');
});
