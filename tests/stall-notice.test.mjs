import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm} from './legacy-farm.mjs';
import {createFarm,stallNotice,stallStatus,STALL_NOTICE_SHARE} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,24,12),hour=3600000,minute=60000;

test('the stall asks to be emptied once it is a quarter full: 6 hours at level 1, 12 hours at the top',()=>{
 assert.equal(STALL_NOTICE_SHARE,.25);
 const s=createLegacyFarm(now);s.stall.since=now;s.stall.bank=0;
 assert.equal(stallNotice(s,now+6*hour-minute),false);assert.equal(stallNotice(s,now+6*hour),true);
 s.stall.level=8;assert.equal(stallStatus(s,now).capacityHours,48);
 assert.equal(stallNotice(s,now+12*hour-minute),false);assert.equal(stallNotice(s,now+12*hour),true);
 assert.equal(stallNotice(s,now+100*hour),true,'and stays on when full');
});

test('no stall "!" before the stall is unlocked',()=>{
 const s=createFarm(now);s.stall.since=now-100*hour;
 assert.equal(stallNotice(s,now),false);
});

test('the "!" sits on the phone menu tile, the More button and the Estate button, not on the map pin, never a "G"',()=>{
 const growth=read('public/growth-ui.js');
 assert.match(growth,/\$\('estate-dot'\)\.hidden=!projectReady\(\)&&!waiting;/);
 assert.match(growth,/\[data-menu-utility="stall"\]'\)\?\.classList\.toggle\('has-dot',waiting\)/);
 assert.doesNotMatch(growth,/utility-label/,'the map pin stays a plain picture');
 assert.doesNotMatch(growth,/'G'/);
 assert.match(growth,/open\(!projectReady\(\)&&stallNotice\(state,farmNow\(\)\)\?'stall':'projects'\)/,'the Estate button opens the stall when that is what waits');
 assert.match(read('public/farm.html'),/<em id="estate-dot" hidden>!<\/em>/);
 assert.match(read('public/mobile-ui.js'),/&&!menu\.querySelector\('\[data-menu-utility="stall"\]'\)\?\.classList\.contains\('has-dot'\)/);
 assert.doesNotMatch(read('public/icons.css'),/\.utility-label\.has-dot/);
});
