import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {CROPS,MASTERY_TIERS} from '../public/farm-state.js';
import {renderPlayerProfile} from '../src/player-profiles.js';
import {LEADERBOARD_CATEGORIES} from '../src/leaderboard.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const migrations=readdirSync(new URL('../supabase/',import.meta.url)).filter(f=>f.endsWith('.sql')).map(f=>read(`supabase/${f}`)).join('\n');
const FIRST_CROPS=['wheat','corn','barley','lettuce','cabbage','cauliflower','pumpkin','redcabbage','sunflower'];

// Farmer profiles (farm-api player-profile-service.js) and the crop leaderboards read harvested_<crop> for every crop in the game.
// A crop without its column broke every profile after the midgame update, so a new crop needs its column and the save that fills it.
test('every crop has its own harvest column in player_stats, filled on every save',()=>{
 for(const crop of Object.keys(CROPS).filter(k=>!FIRST_CROPS.includes(k)))assert.match(migrations,new RegExp(`alter table public\\.player_stats add column (if not exists )?harvested_${crop} bigint`),`${crop} needs its column`);
 const commit=read('supabase/midgame-crop-columns.sql');
 for(const crop of Object.keys(CROPS)){
  assert.match(commit,new RegExp(`insert into public\\.player_stats\\([^)]*harvested_${crop}[,)]`),`${crop} is written on a new row`);
  assert.match(commit,new RegExp(`harvested_${crop}=excluded\\.harvested_${crop}`),`${crop} is updated on every save`);
 }
 assert.match(read('supabase/functions/farm-api/player-profile-service.js'),/cropKeys\.map\(key=>`harvested_\$\{key\}`\)/,'profiles read every crop');
});
test('the crop leaderboards follow the crop list',()=>{
 for(const crop of Object.keys(CROPS))assert.equal(LEADERBOARD_CATEGORIES[`harvested_${crop}`]?.group,'crops',crop);
 assert.equal(Object.values(LEADERBOARD_CATEGORIES).filter(c=>c.group==='crops').length,Object.keys(CROPS).length);
});
test('the farmer profile counts the badges of every crop, so a new crop raises the total',()=>{
 const html=renderPlayerProfile({username:'Farmer',level:66,badges:[{crop:'cherries',tier:0}],stats:{}},Date.now());
 assert.match(html,new RegExp(`1 / ${Object.keys(CROPS).length*MASTERY_TIERS.length} badges`));assert.match(html,/Cherries/);
});
