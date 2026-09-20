import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderFamilyOrderRewards} from '../public/family-order-rewards.js';
import {rankArt} from '../public/rank-art.js';
const view={yourOrderPoints:6385,config:{minPoints:500},rewardPreview:{coins:6385,xp:63,diamonds:1,completionBonus:4},order:{completed:false,lines:{wheat:20,corn:10},filled:{wheat:20,corn:4}}};
test('family reward preview separates personal earnings and the shared completion bonus',()=>{
 const html=renderFamilyOrderRewards(view);
 for(const key of ['gift','coins','xp','diamonds'])assert.ok(html.includes(`data-art="${key}"`));
 assert.ok(html.includes('6,385'));assert.ok(html.includes('>63<'));assert.ok(html.includes('>diamond<'));assert.ok(!html.includes('1 diamonds'));
 assert.ok(html.includes('4 diamonds · family completion bonus'));assert.ok(html.includes('Shared between eligible contributors'));assert.ok(html.includes('1 / 2 goods complete'));
 const pending=renderFamilyOrderRewards({...view,yourOrderPoints:20});assert.ok(pending.includes('480 more order points'));assert.ok(pending.includes('keep delivering to qualify'));
});
test('the first three places share trophy artwork, places four through ten use numbers',()=>{
 for(const [index,key] of ['rank-gold','rank-silver','rank-bronze'].entries())assert.ok(rankArt(index+1).includes(`data-art="${key}"`));
 for(let rank=4;rank<=10;rank++){assert.ok(rankArt(rank).includes(`>${rank}<`));assert.ok(!rankArt(rank).includes('rank-trophy'));}
 for(const path of ['../src/leaderboard.js','../public/family-tournament.js'])assert.match(readFileSync(new URL(path,import.meta.url),'utf8'),/rankArt/);
});
