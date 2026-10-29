import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');

// 29 Oct 2026, the owner: the family badge also beside names in the leaderboard and the event standings.
test('the family badge sits beside the name in the leaderboard and the event standings, and opens the family', async ()=>{
 const board=read('src/leaderboard.js'),events=read('public/live-events-ui.js'),cloud=read('src/game-cloud.js'),badge=read('public/family-badge.js');
 assert.match(board,/const family=familyBadge\(row\.player_id\);if\(family\)strong\.insertAdjacentHTML\('beforeend',family\);/);
 assert.match(events,/\$\{vipBadge\(r\.vipExpiresAt,farmNow\(\)\)\}\$\{familyBadge\(r\.playerId\)\}/);
 assert.match(cloud,/void loadFamilies\(\[\.\.\.\(board\?\.rows\?\?\[\]\)\.map\(r=>r\.player_id\)/);
 assert.match(badge,/globalThis\.harvestFamilyProfile\?\.open\(badge\.dataset\.familyView\)/);
 const {loadFamilies,familyBadge}=await import('../public/family-badge.js');
 const asked=[];const lookup=async ids=>{asked.push(ids);return new Map(ids.map(id=>[id,id==='a'?{id:'f1',name:'Golden Acres',emblem:'wheat'}:null]));};
 assert.equal(await loadFamilies(['a','b'],{lookup,now:1000}),true);
 assert.match(familyBadge('a'),/class="name-family" data-family-view="f1"[^>]*title="Golden Acres"/);
 assert.equal(familyBadge('b'),'','no family, no badge');
 assert.equal(await loadFamilies(['a','b'],{lookup,now:2000}),false,'read once a minute');assert.equal(asked.length,1);
 assert.equal(await loadFamilies(['a'],{lookup:async()=>null,now:70000}),false,'a failed read changes nothing');
});
