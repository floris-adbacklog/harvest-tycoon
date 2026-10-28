import test from 'node:test';
import assert from 'node:assert/strict';
import nodeModule from 'node:module';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});

// 28 Oct 2026 (the owner: World II's crops should feel like the farm's): the Village Fields' strips grow with their batches.
test('each strip stands as its batches do: bare soil, growing in the farm\'s steps, ripe when one is ready',{skip:!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)'},async()=>{
 const {villageFieldStatus}=await import('../public/village-scene.js'),now=1e9,H=3600000;
 const job=(recipe,start,end)=>({id:recipe,recipe,startedAt:now+start,readyAt:now+end});
 const s=villageFieldStatus([job('sowpotatoes',-2*H,-1),job('sowflax',-H/10,H),job('sowlavender',-H,H),job('sowlavender',-H/2,H*3)],now);
 assert.deepEqual(s.potatoes,{stage:'ripe',grown:1});
 assert.equal(s.flax.stage,'sprout');
 assert.deepEqual(s.lavender,{stage:'young',grown:.5},'the batch furthest along');
 assert.deepEqual(s.saffron,{stage:'empty',grown:0},'nothing sown: bare soil');
 assert.deepEqual(villageFieldStatus(undefined,now).potatoes,{stage:'empty',grown:0});
 assert.equal(villageFieldStatus([job('sowsaffron',-H,0)],now).saffron.stage,'ripe','ready at its very moment');
});

test('looks only, in the half-second tick, with the farm\'s hops and no motion when it is reduced',()=>{
 const game=read('public/game.js'),scene=read('public/village-scene.js');
 assert.match(game,/if\(villageWorld\)growVillageFields\(\);/);
 assert.match(game,/f\.grow\(fieldStatus\(productionJobs\(state\.buildings\.villagefields\),farmNow\(\)\),\{reducedMotion\}\)/);
 assert.match(scene,/import \{growthStage,hop\} from '\.\/crop-growth\.js';/);
 assert.doesNotMatch(scene.slice(scene.indexOf('// Growing with what is sown'),scene.indexOf('// The tap target')),/runAction|[^-]state\.|localStorage/,'nothing saved or counted');
});

// 28 Oct 2026 (the owner): the Village Windmill's sails turn while it makes something, as the farm's Windmill's do.
test('the Village Windmill\'s sails are cut out of the mill and turn only while it is busy',()=>{
 const game=read('public/game.js'),scene=read('public/village-scene.js');
 assert.match(scene,/export function villageMillSails\(village\)\{/);
 assert.match(scene,/o\.isInstancedMesh&&o\.name==='Building_016'/);
 assert.match(game,/if\(villageMillRotor\)\{const busy=buildingBusy\('villagemill'\);villageMillSpeed\+=\(\(busy\?\.28:0\)-villageMillSpeed\)\*Math\.min\(1,dt\*\.8\);villageMillRotor\.rotation\.x-=dt\*villageMillSpeed;\}/);
 assert.match(game,/try\{villageMillRotor=villageMillSails\(villageGroup\);\}catch/,'a mill that cannot be cut stays as it is');
});
