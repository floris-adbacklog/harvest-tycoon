import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 1 Oct 2026, "a harvest took over five seconds": farm-api ran in the region nearest the player while the database is in Frankfurt
// (1.2–1.7 s a tap in Asia). It now always runs next to the database; the query parameter needs no CORS change.
test('farm-api runs in Frankfurt, next to the database',()=>{
 const supabase=read('src/supabase.js');
 assert.match(supabase,/export const FARM_API='farm-api\?forceFunctionRegion=eu-central-1';/);
 assert.match(supabase,/supabase\.functions\.invoke\(FARM_API,\{body,timeout:20000\}\)/);
 assert.doesNotMatch(supabase,/invoke\('farm-api'/,'no call left that runs wherever the player is');
});

// 1 Oct 2026, "The help needs to teach rather than do": Show me points at the way in and the farmer taps it.
test('Show me points the way: the bubble sits above the button when there is room, and stays on a phone screen',async()=>{
 const {bubblePlace}=await import('../public/coach.js');
 const view={width:390,height:844};
 const nav=bubblePlace({left:157,top:785,width:76,height:56,bottom:841},{width:187,height:40},view);
 assert.equal(nav.above,true,'over the bottom bar');assert.equal(nav.top,785-12-40);assert(nav.left>=12&&nav.left+187<=390-12);
 const top=bubblePlace({left:300,top:10,width:76,height:40,bottom:50},{width:240,height:40},view);
 assert.equal(top.above,false,'below a button at the very top');assert.equal(top.left,390-12-240,'kept 12 px from the edge');
 assert(top.arrow>16&&top.arrow<=240-16,'the arrow still points at the button');
});
test('every Show me goal uses the buttons a farmer uses: the bottom bar and More on a phone, the side buttons and the map on a computer',()=>{
 const steps=read('public/guide-steps.js'),game=read('public/game.js'),coach=read('public/coach.js');
 assert.match(game,/else if\(guideSteps\(target,\{state,now:farmNow\(\)\}\)\)coach\.start\(guideSteps\(target,\{state,now:farmNow\(\)\}\)\);/);
 assert.doesNotMatch(game,/else if\(target==='market'\)openDialog\('market-dialog'\);\n  else if\(guideSteps/,'pointing comes first');
 for(const sel of ["shown('#market-button')","shown('#buildings-button')","shown('#more-button')",'[data-menu-action="today-button"]','.utility-label[data-utility="chores"]:not(.locked)','.start-recipe[data-recipe="eggs"]','#checkin-gift','[data-collect-job]'])assert.ok(steps.includes(sel),sel);
 assert.match(coach,/pointer-events|r\.index===at/);assert.match(read('public/beginner.css'),/\.coach-bubble\{position:fixed;[^}]*pointer-events:none/,'taps go through the bubble');
 assert.match(game,/label\.className='building-label';label\.dataset\.building=key;/);
});
