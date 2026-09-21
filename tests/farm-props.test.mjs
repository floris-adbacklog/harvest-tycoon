import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {THEMES,YARD_THEME,PROPS_PER_YARD,PROPS_AROUND_YARD,MEADOW_CLUMPS,seeded,scatterProps} from '../public/farm-props.js';
import {ANCHORS,anchorAt,roadRects} from '../public/farm-layout.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const anchors=Object.fromEntries(Object.keys(ANCHORS).map(id=>[id,anchorAt(id)]));
const roads=roadRects().slice(0,3).map(r=>r.horizontal?[r.minX+3,(r.minZ+r.maxZ)/2,r.maxX-3,(r.minZ+r.maxZ)/2]:[(r.minX+r.maxX)/2,r.minZ+3,(r.minX+r.maxX)/2,r.maxZ-3]);
const scatter=(options={})=>scatterProps({anchors,roads,free:()=>true,rand:seeded(20260921),...options});

test('every prop comes from the model pack and is loaded before the scene is built',()=>{
 const game=read('public/game.js');
 const life=read('public/farm-life.js').split('\n').find(line=>line.startsWith('export const LIFE_MODELS='));
 const loaded=new Set([...(game.split('\n').filter(line=>/^const modelNames=|^modelNames\.push\(/.test(line)).join('\n')+life).matchAll(/'([a-z_]+_\d+)'/g)].map(m=>m[1]));
 assert.match(game,/LIFE_MODELS/,'the farm-life models are loaded too');
 for(const [theme,list] of Object.entries(THEMES))for(const [name] of list){
  assert(existsSync(new URL(`../public/assets/models/${name}.glb`,import.meta.url)),`${theme}: ${name} is not in the pack`);
  assert(loaded.has(name),`${theme}: ${name} is never loaded`);
 }
});
test('every yard has a theme, and every theme exists',()=>{
 for(const id of Object.keys(ANCHORS))assert(Object.hasOwn(THEMES,YARD_THEME[id]),id);
 for(const theme of Object.values(YARD_THEME))assert(Object.hasOwn(THEMES,theme),theme);
});
test('the random spots are the same on every visit',()=>{
 const a=seeded(7),b=seeded(7);assert.deepEqual([a(),a(),a()],[b(),b(),b()]);
 for(let i=0;i<200;i++){const v=a();assert(v>=0&&v<1);}
 assert.deepEqual(scatter(),scatter());assert.notDeepEqual(scatter(),scatter({rand:seeded(8)}));
});
test('props sit around their yard, apart from each other, and add up to a lively but calm scene',()=>{
 const props=scatter(),yardProps=props.filter(p=>p.yard);
 assert(yardProps.length>=Object.keys(ANCHORS).length*PROPS_PER_YARD*.9,'every yard gets its share');
 for(const p of yardProps){const d=Math.hypot(p.x-anchors[p.yard][0],p.z-anchors[p.yard][1]);assert(d>=PROPS_AROUND_YARD[0]-1e-9&&d<=PROPS_AROUND_YARD[1]+1e-9,`${p.yard} prop at ${d.toFixed(1)}`);}
 for(let i=0;i<props.length;i++)for(let j=i+1;j<props.length;j++)assert(Math.hypot(props[i].x-props[j].x,props[i].z-props[j].z)>=1.6-1e-9,'no two props on top of each other');
 assert(props.some(p=>p.theme==='road')&&props.filter(p=>p.theme==='green'&&!p.yard).length>=MEADOW_CLUMPS*.8);
 assert(props.length>=60&&props.length<=200,`${props.length} props`);
});
test('nothing is placed where the scene says there is no room',()=>{
 assert.deepEqual(scatter({free:()=>false}),[]);
 const blockedEast=(x)=>x<0;const props=scatter({free:x=>blockedEast(x)===false});
 assert(props.length>0&&props.every(p=>p.x>=0),'a blocked half stays empty');
 const fields=[-5.6,-3,10.4,23.6];
 for(const p of scatter({free:(x,z)=>!(x>fields[0]&&x<fields[2]&&z>fields[1]&&z<fields[3])}))assert(!(p.x>fields[0]&&p.x<fields[2]&&p.z>fields[1]&&p.z<fields[3]));
});
test('the scene adds the props last, from the real free space',()=>{
 const game=read('public/game.js');
 assert.match(game,/farmLife\.watchProduction\(buildingViews\);\s*addExtraProps\(\);/);
 assert.match(game,/scatterProps\(\{anchors,roads,free,rand:seeded\(20260921\)\}\)/);
 assert.match(game,/\.\.\.\[-5\.6,-3,10\.4,23\.6\]|fields=\[-5\.6,-3,10\.4,23\.6\]/,'the crops are kept clear, with room for 28 fields');
});
