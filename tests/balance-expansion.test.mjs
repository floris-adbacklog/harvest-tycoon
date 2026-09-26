import test from 'node:test';
import assert from 'node:assert/strict';
import {RECIPES,RECIPE_LEVELS,recipeValue} from '../game/farm-state.js';
// Balance guards for the midgame expansion (levels 28-90), checked at normal prices (the market pays 0.8×).
const perHour=id=>recipeValue(id).added/(RECIPES[id].duration/3600000);
const ratio=id=>{const v=recipeValue(id);return v.output/v.input;};
const expansion=Object.keys(RECIPES).filter(id=>RECIPES[id].building!=='factory'&&RECIPE_LEVELS[id]>=28);
const wave=(from,to)=>expansion.filter(id=>RECIPE_LEVELS[id]>=from&&RECIPE_LEVELS[id]<=to&&RECIPES[id].building!=='glasshouse');
const median=list=>{const v=list.map(perHour).sort((a,b)=>a-b);return v[Math.floor(v.length/2)];};

test('every expansion recipe is worth making: at least 40% on top of its ingredients and 120 coins an hour',()=>{
 for(const id of expansion){assert.ok(ratio(id)>=1.4,`${id} adds ${Math.round((ratio(id)-1)*100)}%`);assert.ok(perHour(id)>=120,`${id} earns ${Math.round(perHour(id))} an hour`);}
});
test('later goods pay better: each wave beats the one before it',()=>{
 const one=wave(28,47),two=wave(54,70),three=wave(75,90);
 assert.ok(median(two)>=median(one),`wave 2 ${Math.round(median(two))} vs wave 1 ${Math.round(median(one))}`);
 assert.ok(Math.max(...[...three,'prizeproduce'].map(perHour))>=Math.max(...two.map(perHour)),'the best of wave 3 beats the best of wave 2');
 assert.ok(Math.min(perHour('cherryjam'),perHour('cherrypie'))>Math.max(perHour('goatcheese'),perHour('candles')),'the cherry goods (67-68) beat the goat cheese and candles (55-58)');
 assert.ok(perHour('cider')>perHour('applejuice'),'cider beats the apple juice it grew up from');
});
test('grazing the flock is a real choice: more wool per hour in the Sheep Barn than feeding it, but more barley per wool',()=>{
 // Wool per hour, not coins: since 26 Sep 2026 feed is cheaper (sells for 60), so the coin value of a fed batch went up.
 const woolPerHour=id=>RECIPES[id].output.wool/(RECIPES[id].duration/3600000);
 assert.ok(woolPerHour('grazewool')>woolPerHour('wool'));
 const viaFeed=RECIPES.windfeed.input.barley/RECIPES.windfeed.output.feed*RECIPES.wool.input.feed/RECIPES.wool.output.wool,grazing=RECIPES.grazewool.input.barley/RECIPES.grazewool.output.wool;
 assert.ok(grazing>viaFeed&&grazing<2.5*viaFeed,   // the Windmill makes 13 feed of 8 barley since 26 Sep 2026 (was 10)
  `${grazing.toFixed(2)} barley a wool by grazing, ${viaFeed.toFixed(2)} through the Windmill`);
});
test('a candle costs at most one sunflower, the slowest crop on the farm',()=>{
 assert.ok(RECIPES.candles.input.beeswax/RECIPES.hives.output.beeswax*RECIPES.hives.input.sunflower<=1);
});
