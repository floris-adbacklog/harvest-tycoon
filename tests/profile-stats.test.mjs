import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {profileStatPages,renderStatPages} from '../src/profile-stats.js';
import {renderPlayerProfile} from '../src/player-profiles.js';
import {LEADERBOARD_CATEGORIES} from '../src/leaderboard.js';
import {CROPS,QUESTS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const DAY=24*60*60*1000,now=Date.UTC(2026,8,25,12);
const player={username:'Anna',level:24,memberSince:now-8*DAY-3600e3,stats:{harvested_crops:1843,goods_produced:612,items_sold:2210,deliveries:37,badges:5,farm_fields:18,building_upgrades:23,best_streak:6,events_finished:2,chores_done:41,helping_rounds:0,estate_projects:0,currency:1284350,goods_kinds:14,quests_done:47},harvests:{wheat:720,corn:910,lettuce:0},badges:[]};

test('the profile shows two pages of nine stats: on the farm and in the valley',()=>{
 const pages=profileStatPages(player,now);
 assert.deepEqual(pages.map(p=>p.title),['On the farm','In the valley']);
 assert.deepEqual(pages.map(p=>p.stats.length),[9,9]);
 const labels=pages.flatMap(p=>p.stats.map(s=>s.label));
 assert.deepEqual(labels,['Crops harvested','Crop kinds','Top crop: Corn','Goods produced','Fields','Building upgrades','Badges','Quests done','Best day streak','Items sold','Deliveries','Coins','Events finished','Chores done','Helping-hand rounds','Estate projects','Goods kinds','Days farming']);
 const find=label=>pages.flatMap(p=>p.stats).find(s=>s.label===label);
 assert.equal(find('Crop kinds').value,2,'crops harvested at least once');assert.equal(find('Crop kinds').of,Object.keys(CROPS).length);
 assert.equal(find('Quests done').of,QUESTS.length);assert.equal(find('Days farming').value,9,'the sign-up day counts as day 1');
});
test('every stat with a board opens a real leaderboard; the top crop opens its own crop board',()=>{
 const stats=profileStatPages(player,now).flatMap(p=>p.stats),boards=stats.filter(s=>s.board).map(s=>s.board);
 for(const board of boards)assert.ok(Object.hasOwn(LEADERBOARD_CATEGORIES,board),board);
 assert.ok(boards.includes('harvested_corn'));assert.ok(boards.includes('quests_done'));assert.ok(boards.includes('currency'));
 assert.deepEqual(stats.filter(s=>!s.board).map(s=>s.label),['Crop kinds','Goods kinds','Days farming'],'only the stats without a board are not buttons');
 const html=renderStatPages(player,now);
 assert.match(html,/<button type="button" class="farmer-stat" data-stat-board="harvested_crops"/);
 assert.match(html,/<div class="farmer-stat" title="2 of 16 · Crop kinds" role="group"/);
 assert.match(html,/<p class="farmer-stats-hint">Tap a stat to see its leaderboard\.<\/p>/);
});
test('zero is greyed, an unknown value shows a dash, big numbers are short with the full number in the title',()=>{
 const html=renderStatPages(player,now);
 assert.match(html,/class="farmer-stat is-zero" data-stat-board="helping_rounds"/);
 assert.match(html,/<strong>1\.3M<\/strong><span>Coins<\/span>/);assert.match(html,/title="1,284,350 · Coins\. Tap to see the leaderboard\."/);
 assert.match(html,/<strong>2,210<\/strong>/,'up to 99,999 in full');assert.match(html,/<strong>18<small>\/40<\/small><\/strong><span>Fields<\/span>/);
 const fresh=renderStatPages({username:'New',stats:{}},now);
 assert.match(fresh,/<div class="farmer-stat is-zero" title="None yet · Top crop" role="group" aria-label="None yet · Top crop"><span[^]*?<strong>—<\/strong>/);
 assert.match(fresh,/title="None yet · Days farming"/,'no sign-up date, no number');
});
test('the arrows, the dots and the page you are on; the other page cannot be tabbed into',()=>{
 const first=renderStatPages(player,now,0),second=renderStatPages(player,now,1);
 assert.match(first,/data-stat-title aria-live="polite">On the farm</);assert.match(second,/data-stat-title aria-live="polite">In the valley</);
 assert.match(first,/data-stat-step="-1" aria-label="Previous stats" disabled>/);assert.doesNotMatch(first,/data-stat-step="1" aria-label="Next stats" disabled/);
 assert.match(second,/data-stat-step="1" aria-label="Next stats" disabled>/);
 assert.match(first,/aria-label="On the farm, page 1 of 2">/);assert.match(first,/aria-label="In the valley, page 2 of 2" inert>/);
 assert.match(renderPlayerProfile(player,now,{statPage:1}),/aria-label="On the farm, page 1 of 2" inert>/,'the profile passes the page on');
});
test('the profile keeps its stat page on a refresh, starts on page 1 for another farmer, and a tap opens the board',()=>{
 const profiles=read('src/player-profiles.js');
 assert.match(profiles,/renderPlayerProfile\(data\.playerProfile,Date\.now\(\)\+clockOffset,\{statPage\}\)/);
 assert.match(profiles,/bindStatPages\(content,\{page:statPage,onPage:page=>\{statPage=page;\},onBoard:key=>showBoard\?\.\(key\)\}\)/);
 assert.match(profiles,/selected=playerId;profileUsername=null;statPage=0;/);
 assert.match(read('src/game-cloud.js'),/createPlayerProfiles\(bridge,\{showBoard:key=>ui\.showBoard\(key\)\}\)/);
 assert.match(read('src/ui.js'),/function showBoard\(key\)\{if\(!Object\.hasOwn\(LEADERBOARD_CATEGORIES,key\)\)return;show\('leaderboard-dialog'\);picker\.select\(key\);\$\('leaderboard-category'\)\.onchange\(\);\}/);
 const css=read('public/player-profiles.css');
 assert.match(css,/\.farmer-stat-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);[^}]*scroll-snap-align:start/);
 assert.match(css,/\.farmer-stats-track\{[^}]*scroll-snap-type:x mandatory/);assert.match(css,/\.farmer-stats-arrow\{width:40px;height:40px;/);
});
