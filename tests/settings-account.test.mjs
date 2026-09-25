import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isRandomPlayerName,randomPlayerName} from '../src/account-form.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('a name the game made up at sign-up is recognised; a chosen one is not',()=>{
 for(let i=0;i<20;i++)assert.equal(isRandomPlayerName(randomPlayerName()),true);
 for(const name of ['Floris','Sunny Acres','Sunny Acres 48','sunny acres 4821','Sunny Acres 4821 x','Meadow Mia',null,undefined])assert.equal(isRandomPlayerName(name),false,String(name));
 assert.equal(isRandomPlayerName(' Golden Creek 1234 '),true);
});

test('Settings invites a made-up name to become your own, and the name dialog then saves instead of joining',()=>{
 const ui=read('src/ui.js');
 assert.match(ui,/<div class="name-nudge" id="name-nudge" hidden><strong>Make the name your own<\/strong>/);
 assert.match(ui,/const madeUp=Boolean\(player\)&&isRandomPlayerName\(profile\?\.username\);\$\('name-nudge'\)\.hidden=!madeUp;/);
 assert.match(ui,/\$\('rename-player'\)\.hidden=!player\|\|madeUp;/,'no second rename button next to the invitation');
 assert.match(ui,/\$\('name-nudge-button'\)\.onclick=\(\)=>\{nameFrom='settings';promptName\(''\);\};/,'an empty field, not the made-up name');
 assert.match(ui,/nameFrom==='settings'\?'Save my name':'Join the leaderboard'/);
 assert.match(ui,/\$\('username-dialog'\)\.addEventListener\('close',\(\)=>\{nameFrom='leaderboard';\}\);/);
});

test('sound and reminders use switches, and the sound part is a card of its own',()=>{
 const html=read('public/farm.html');
 assert.match(html,/<section id="sound-settings" class="settings-section"/);
 assert.equal((html.match(/type="checkbox" role="switch"/g)??[]).length,9,'sound, private messages (chat), in-game purchases (the admin only), five notification switches and full screen');
 assert.ok(!html.includes('Settle into a gentle melody'),'no intro sentence');
});
