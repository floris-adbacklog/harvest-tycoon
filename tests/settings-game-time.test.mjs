import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gameTime} from '../public/settings-nav.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Game time in Settings (31 Oct 2026, the owner: "zet game time in settings"): the UTC time the game's day follows.
test('game time: the UTC clock',()=>{
 assert.deepEqual(gameTime(Date.UTC(2026,9,31,14,32,10)),{time:'14:32'});
 assert.deepEqual(gameTime(Date.UTC(2026,9,31,0,0,0)),{time:'00:00'});
 assert.equal(gameTime(Date.UTC(2026,9,31,23,59,59)).time,'23:59');
});

test('Settings shows it under the list from the server\'s clock, not on an open part, and only ticks while open',()=>{
 const nav=read('public/settings-nav.js'),sound=read('public/sound-settings.js');
 assert.match(sound,/createSettingsNav\(dialog,\{now:farmNow\}\)/,'the server\'s clock, so a wrong phone clock still shows it right');
 assert.match(nav,/clock\.hidden=Boolean\(id\)/);
 assert.match(nav,/anchor\?\.before\(note,nav,clock\)/);
 assert.match(nav,/new MutationObserver\(\(\)=>clockOn\(dialog\.open\)\)/);
 assert.match(nav,/function drawClock\(\)\{clock\.textContent=t\('Game time \{0\}',gameTime\(now\(\)\)\.time\);\}/,'only the words and the time: no icon, no line under it');
});
