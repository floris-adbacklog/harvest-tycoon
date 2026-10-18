// A window's late stylesheet that fails is asked for again (18 Oct 2026: a player's Android app showed the Special offer without its
// stylesheet right after an update, its pictures full width; public/dialog-shell.js retryStyle).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {retryStyle,STYLE_RETRIES} from '../public/dialog-shell.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('a stylesheet that fails is asked for twice more, 2 and 4 seconds later, never from a cache',()=>{
 const link={tagName:'LINK',rel:'stylesheet',href:'https://www.harvesttycoon.com/offer.css?v=e016ccd8b9',dataset:{}},waits=[];
 const later=(fn,ms)=>{waits.push(ms);fn();};
 assert.equal(retryStyle({target:link},later),true);assert.equal(link.href,'https://www.harvesttycoon.com/offer.css?v=e016ccd8b9&retry=1');
 assert.equal(retryStyle({target:link},later),true);assert.equal(link.href,'https://www.harvesttycoon.com/offer.css?v=e016ccd8b9&retry=2');
 assert.equal(retryStyle({target:link},later),false,'then it stops');assert.equal(STYLE_RETRIES,2);assert.deepEqual(waits,[2000,4000]);
});

test('only stylesheets: a picture or a script that fails is left alone',()=>{
 for(const target of [{tagName:'IMG',dataset:{}},{tagName:'SCRIPT',dataset:{}},{tagName:'LINK',rel:'modulepreload',href:'https://x/y.js',dataset:{}},null])
  assert.equal(retryStyle({target},()=>assert.fail('no retry')),false);
});

test('the page listens on the way down (a load error does not bubble), and the windows that add a sheet later are the ones it covers',()=>{
 assert.match(read('public/dialog-shell.js'),/document\.addEventListener\('error',event=>retryStyle\(event\),true\);/);
 assert.match(read('public/game.js'),/^import '\.\/dialog-shell\.js';/,'loaded first by the game, before the offer and the Starter Pack add theirs');
 for(const [file,sheet] of [['src/offer-ui.js','/offer.css'],['src/starter-pack-ui.js','/starter-pack.css']])
  assert.ok(read(file).includes(`style.rel='stylesheet';style.href=import.meta.resolve?.('${sheet}')`),file);
});
