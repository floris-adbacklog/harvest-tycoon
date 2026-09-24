import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('on a phone a new farmer starts zoomed in on their fields until the Beginner guide is done',()=>{
 const game=read('public/game.js');
 assert.match(game,/const startView=\(\)=>mobileLayout\.matches&&!beginnerProgress\(state\)\.every\(q=>q\.done\)\?'fields':'home';/);
 assert.match(game,/viewMode=startView\(\);/,'the first view');
 assert.match(game,/function resetView\(\)\{viewMode=startView\(\);/,'and "My farm" goes back to it');
});
