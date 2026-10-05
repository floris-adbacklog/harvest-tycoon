import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderFamilyOrderRewards,orderShareText} from '../public/family-order-rewards.js';
import {rankArt} from '../public/rank-art.js';
// 6,385 order points, one of two lines full: half of the whole order's rewards now (5 Oct 2026: an unfinished order pays for its full
// lines when the week ends).
const view={yourOrderPoints:6385,config:{minPoints:500},rewardPreview:{coins:6385,xp:63,diamonds:1,completionBonus:4,fullLines:2,lines:4,now:{coins:3192,xp:31,diamonds:0}},order:{completed:false,lines:{wheat:20,corn:10,eggs:5,bread:5},filled:{wheat:20,corn:10,eggs:4}}};
test('family reward preview shows what the full lines pay now, the rule, and the whole order with its shared bonus',()=>{
 const html=renderFamilyOrderRewards(view);
 for(const key of ['gift','coins','xp','diamonds'])assert.ok(html.includes(`data-art="${key}"`));
 assert.ok(html.includes('>3,192<'),'the coins two full lines pay now');assert.ok(html.includes('>31<'));assert.ok(html.includes('>0<')&&html.includes('>diamonds<'));
 assert.ok(html.includes('2 of 4 lines full: you’d get half now.'));
 assert.ok(html.includes('Every full line pays a quarter of the rewards; the whole order pays everything plus 4 bonus diamonds, shared by everyone who helped.'));
 assert.ok(html.includes('Whole order: 6,385 coins · 63 XP · 1 diamond'));
 assert.ok(!html.includes('goods complete')&&!html.includes('order points from you')&&!html.includes('<progress'),'the lines, your points and a bar are in the summary above, not repeated (26 Sep 2026)');
 assert.ok(!html.includes('available above'));
 const pending=renderFamilyOrderRewards({...view,yourOrderPoints:20,rewardPreview:{...view.rewardPreview,now:{coins:0,xp:0,diamonds:0}}});assert.ok(pending.includes('480 more order points'));assert.ok(pending.includes('Keep delivering to qualify'));assert.ok(!pending.includes('you’d get'));
 const whole=renderFamilyOrderRewards({...view,order:{...view.order,completed:true},rewardPreview:{...view.rewardPreview,fullLines:4,now:{coins:6385,xp:63,diamonds:1}}});
 assert.ok(whole.includes('Your order rewards'));assert.ok(whole.includes('>6,385<'));assert.ok(!whole.includes('Whole order:'),'a whole order has paid everything');
 // An older server sends no now and no line count: the whole order's numbers, and the lines counted from the order.
 const old=renderFamilyOrderRewards({...view,rewardPreview:{coins:6385,xp:63,diamonds:1,completionBonus:4}});assert.ok(old.includes('>6,385<'));assert.ok(old.includes('2 of 4 lines full'));
});
test('every number of full lines has its own whole sentence',()=>{
 assert.deepEqual([0,1,2,3,4].map(n=>orderShareText(n,4)),['No line full yet: each full line pays a quarter.','1 of 4 lines full: you’d get a quarter now.','2 of 4 lines full: you’d get half now.','3 of 4 lines full: you’d get three quarters now.','All 4 lines full: you get everything.']);
 assert.equal(orderShareText(0,0),'','no order, no sentence');
 // The order card's fold says it too, instead of "when the order is complete".
 const ui=readFileSync(new URL('../public/family-ui.js',import.meta.url),'utf8');
 assert.match(ui,/<summary><strong>Your rewards<\/strong><span>\$\{view\.yourOrderPoints>=view\.config\.minPoints\?orderShareText\(/);assert.doesNotMatch(ui,/when the order is complete/);
});
test('the first three places share trophy artwork, places four through ten use numbers',()=>{
 for(const [index,key] of ['rank-gold','rank-silver','rank-bronze'].entries())assert.ok(rankArt(index+1).includes(`data-art="${key}"`));
 for(let rank=4;rank<=10;rank++){assert.ok(rankArt(rank).includes(`>${rank}<`));assert.ok(!rankArt(rank).includes('rank-trophy'));}
 for(const path of ['../src/leaderboard.js','../public/family-tournament.js'])assert.match(readFileSync(new URL(path,import.meta.url),'utf8'),/rankArt/);
});
