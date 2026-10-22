// The Sheep Barn's own roof (22 Oct 2026, the owner: "kunnen we dit dak een iets andere kleur geven om het te onderscheiden, zowel in
// het gebouw als plaatje"). It stands in the Goat Shed's barn (hangar_015, brown roof); its copy paints the roof from the palette's
// slate blue-grey swatch, the Goat Shed and the Warehouse (hangar_006, green roof) keep theirs, and its picture shows the new roof
// under an address of its own, so a browser that kept the old picture asks for the new one.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as nodeModule from 'node:module';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const {registerHooks}=nodeModule,vendor=new URL('public/vendor/',root).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';

// The corners of a model and where they sit on the palette, straight from the .glb.
function corners(name){
 const buf=readFileSync(new URL(`public/assets/models/${name}.glb`,root)),jl=buf.readUInt32LE(12),json=JSON.parse(buf.subarray(20,20+jl).toString()),bin=20+jl+8;
 const read=(index,n)=>{const a=json.accessors[index],v=json.bufferViews[a.bufferView],at=bin+(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??n*4;
  return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,j)=>buf.readFloatLE(at+i*stride+j*4)));};
 const p=json.meshes[0].primitives[0];return {position:read(p.attributes.POSITION,3),uv:read(p.attributes.TEXCOORD_0,2)};
}
const swatch=([u,v])=>[Math.floor(u*11),Math.floor(v*11)];

test('the barn\'s roof is the brown swatch [8, 5]: the top of the barn and nothing low on its walls',()=>{
 const {position,uv}=corners('hangar_015'),roof=position.filter((_,i)=>swatch(uv[i]).join()==='8,5');
 assert.ok(roof.length>500,'the roof is in that swatch');
 assert.ok(Math.min(...roof.map(p=>p[1]))>4,'no wall or door is painted from it');
 assert.ok(Math.max(...position.map(p=>p[1]))===Math.max(...roof.map(p=>p[1])),'the ridge is roof');
});

test('repaint moves one copy\'s corners to the other swatch, the same spot inside it, and leaves the model and its other copies alone',{skip},async()=>{
 const THREE=await import('three'),{repaint,PALETTE_CELLS}=await import('../public/model-atlas.js');
 assert.equal(PALETTE_CELLS,11);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('uv',new THREE.Float32BufferAttribute([.7796,.5029, .0443,.5924, .8621,.7625],2));
 const model=new THREE.Group();model.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()));
 const other=model.clone(true),barn=repaint(model.clone(true),[[[8,5],[10,5]]]);
 const uvs=object=>Array.from(object.children[0].geometry.attributes.uv.array);
 const moved=uvs(barn);
 assert.ok(Math.abs(moved[0]-(.7796+2/11))<1e-6&&Math.abs(moved[1]-.5029)<1e-6,'the roof corner, two swatches on');
 assert.deepEqual(swatch([moved[0],moved[1]]),[10,5]);
 assert.deepEqual(moved.slice(2),uvs(other).slice(2),'the red walls and white trim stay');
 assert.deepEqual(uvs(other),Array.from(geometry.attributes.uv.array),'the other copies keep the model\'s own geometry');
 assert.notEqual(barn.children[0].geometry,geometry);assert.equal(other.children[0].geometry,geometry);
 assert.equal(barn.children[0].material,other.children[0].material,'one material and the one shared palette for all');
});

test('only the Sheep Barn\'s copy is repainted, to slate blue-grey; the Goat Shed keeps the brown roof',()=>{
 const game=read('public/game.js');
 assert.match(game,/const SHEEP_BARN_ROOF=Object\.freeze\(\[\[\[8,5\],\[10,5\]\]\]\);/);
 assert.match(game,/addBuilding\('sheepbarn',23\.8,-15\.4,\{width:5,height:4\.6,depth:8,paint:SHEEP_BARN_ROOF\}\);/);
 assert.match(game,/addBuilding\('goatshed',31\.9,-14\.6,\{width:5,height:4\.6,depth:8\}\);/);
 assert.match(game,/function cloneModel\(name,x,z,\{[^}]*paint\}=\{\}\)\{[^]*?if\(paint\)repaint\(obj,paint\);/);
 assert.equal(game.match(/paint:SHEEP_BARN_ROOF/g).length,1,'one building only');
});

test('the Sheep Barn\'s picture has an address of its own, everywhere it is shown; the Warehouse and the Goat Shed keep theirs',async()=>{
 const {art,artSource,pictureFile}=await import('../public/visual-icons.js');
 assert.equal(pictureFile('sheepbarn'),'/assets/icons/sheepbarn.webp?v=20261022');
 assert.match(art('sheepbarn'),/src="\/assets\/icons\/sheepbarn\.webp\?v=20261022"/);
 assert.equal(artSource('sheepbarn').src,'/assets/icons/sheepbarn.webp?v=20261022');
 assert.equal(pictureFile('warehouse'),'/assets/icons/warehouse.webp');assert.equal(pictureFile('goatshed'),'/assets/icons/goatshed.webp');
 const sheep=readFileSync(new URL('public/assets/icons/sheepbarn.webp',root)),goat=readFileSync(new URL('public/assets/icons/goatshed.webp',root)),warehouse=readFileSync(new URL('public/assets/icons/warehouse.webp',root));
 assert.ok(!sheep.equals(goat)&&!sheep.equals(warehouse));
});
