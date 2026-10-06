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
 assert.match(toastParts('Bonus: +2 wheat!').html,/<b class="toast-chip is-item">[\s\S]*\+2 wheat<\/b>$/,'no stray punctuation after a chip');
});
test('field tools get their own picture: care, water and planting',()=>{
 assert.equal(toastParts('Extra care will be available in 2s.').icon,'care');
 assert.equal(toastParts('This crop was already watered.').icon,'lock','a warning keeps its warning picture');
 assert.equal(toastParts('Water will be available in 3s.').icon,'water');
 assert.equal(toastParts('Wheat selected. Choose an empty field to plant.').icon,'seeds');
});

test('every amount is a chip: collected goods, plain coin amounts; no dots and the goods lead with their picture',()=>{
 const collected=toastParts('Collected 3 Eggs · +10 XP.');
 assert.equal(collected.icon,'eggs');
 assert.doesNotMatch(collected.html,/·/);assert.doesNotMatch(collected.html,/<\/b>\./);
 assert.match(collected.html,/<b class="toast-chip is-item">[\s\S]*3 Eggs<\/b> <b class="toast-chip is-xp">/);
 assert.match(toastParts('Sold 12 Wheat for 84 coins.').html,/for <b class="toast-chip is-coins">[\s\S]*84<\/b>/);
 assert.equal(toastParts('You need 5 coins to help.').icon,'lock','warnings keep their lock');
});
// 6 Oct 2026: in another language the whole message is translated before the chips ("Job well done!" stayed English between them).
test('a toast in another language is translated whole, its rewards chips again, and the page leaves it alone',()=>{
 const nl=text=>({'Job well done! +12 coins and +5 XP.':'Goed gedaan! +12 munten en +5 XP.','Sold! +1,250 coins':'Verkocht! +1.250 munten','Harvested 3 wheat':'3 tarwe geoogst'})[text]??null;
 let parts=toastParts('Job well done! +12 coins and +5 XP.',nl);
 assert.equal(parts.local,true);assert.equal(parts.icon,'xp','tone and picture still come from the English');assert.equal(parts.tone,'reward');
 assert.match(parts.html,/^Goed gedaan! <b class="toast-chip is-coins">[\s\S]*\+12<\/b> munten en <b class="toast-chip is-xp">[\s\S]*\+5<\/b> XP\.$/);
 assert.match(toastParts('Sold! +1,250 coins',nl).html,/Verkocht! <b class="toast-chip is-coins">[\s\S]*\+1\.250<\/b> munten/,'the number as the language writes it');
 assert.equal(toastParts('Harvested 3 wheat',nl).html,'3 tarwe geoogst','goods stay words');
 assert.equal(toastParts('Something new',nl).local,false,'a text no translation knows: as before');
 assert.equal(toastParts('Job well done! +12 coins and +5 XP.').local,false,'English: as before');
 assert.match(toastParts('<b>x</b> +5 coins',()=>'<b>x</b> +5 munten').html,/&lt;b&gt;x&lt;\/b&gt;/,'escaped');
 const src=readFileSync(new URL('../public/toast-ui.js',import.meta.url),'utf8'),center=readFileSync(new URL('../public/center-notice.js',import.meta.url),'utf8');
 assert.match(src,/<span class="toast-text"\$\{local\?' translate="no"':''\}>/);assert.match(center,/<p class="toast-text"\$\{local\?' translate="no"':''\}>/);
});
