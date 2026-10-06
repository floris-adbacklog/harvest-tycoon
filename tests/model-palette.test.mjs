import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,mkdtempSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const dir=new URL('public/assets/models/',root);
const glb=buf=>{
 const jl=buf.readUInt32LE(12),json=JSON.parse(buf.subarray(20,20+jl).toString('utf8'));
 const binAt=20+jl,bin=buf.length>binAt?buf.subarray(binAt+8,binAt+8+buf.readUInt32LE(binAt)):Buffer.alloc(0);
 return {json,bin};
};

// 6 Oct 2026: every .glb carried its own copy of the palette (144 of the Farm one, 10 of the Village one, 1.7 MB of the models).
// The models now point at one palette.png (village-palette.png for village_*) beside them, fetched once a page.
test('the palette goes over the network once: every model points at palette.png or village-palette.png and carries no copy of it',()=>{
 const palette=readFileSync(new URL('palette.png',dir)),village=readFileSync(new URL('village-palette.png',dir));
 assert.equal(palette.subarray(1,4).toString(),'PNG');assert.equal(village.subarray(1,4).toString(),'PNG');
 for(const f of readdirSync(dir).filter(f=>f.endsWith('.glb'))){
  const {json,bin}=glb(readFileSync(new URL(f,dir)));
  for(const image of json.images??[]){
   if(image.bufferView!=null){
    const v=json.bufferViews[image.bufferView],bytes=bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);
    assert.ok(!bytes.equals(palette)&&!bytes.equals(village),`${f} carries its own copy of the palette again: run node scripts/share-palette.mjs`);
    continue;
   }
   assert.equal(image.uri,f.startsWith('village_')?'village-palette.png':'palette.png',`${f} points at the wrong palette`);
  }
 }
});

test('one request and one decode per palette: GLTFLoader gets the shared palette, and the shared picture is never closed',()=>{
 const game=read('public/game.js'),atlas=read('public/model-atlas.js');
 assert.match(game,/gltfLoader\?\?=sharePalette\(new GLTFLoader\(\)\);/,'the models\' loader shares the palette');
 assert.match(atlas,/export function sharePalette\(gltfLoader\)\{\n return gltfLoader\.register\(/);
 assert.match(atlas,/const PALETTE=\/\(\^\|\\\/\)\(village-\)\?palette\\\.png\$\/;/);
 assert.match(atlas,/let image=palettes\.get\(url\);/,'one fetch per palette address, shared by every model');
 assert.match(atlas,/image=loader\.loadAsync\(url\)\.catch\(\(\)=>loader\.loadAsync\(`\$\{url\}\?fresh=\$\{Date\.now\(\)\}`\)\);/,'asked once more past the browser\'s cache');
 assert.match(atlas,/image\.catch\(\(\)=>palettes\.delete\(url\)\);/,'a failed palette is asked for again by the next model');
 assert.match(atlas,/const loader=parser\.textureLoader;/,'the same ImageBitmap or <img> loader GLTFLoader chose for this browser');
 assert.match(atlas,/return parser\.loadTextureImage\(index,source,once\)\.then\(texture=>\{\n   if\(!texture\)throw new Error/,'no palette: the model fails (and gets its stand-in), it is never drawn unpainted');
 assert.match(atlas,/if\(map!==base&&map!==villageBase\)\{map\.dispose\(\);if\(!map\.userData\.sharedPalette\)map\.image\?\.close\?\.\(\);\}/,'closing the shared picture would blank every model');
});

test('scripts/share-palette.mjs takes a copy out again, keeps the rest byte for byte, and changes nothing on a second run',()=>{
 const tmp=mkdtempSync(join(tmpdir(),'palette-'));
 try{
  for(const f of ['palette.png','village-palette.png','plant_001.glb','village_boat_001.glb'])copyFileSync(new URL(f,dir),join(tmp,f));
  // plant_001 as it came from the pack: the palette inside the file again.
  const shared=readFileSync(new URL('plant_001.glb',dir)),{json,bin}=glb(shared),palette=readFileSync(new URL('palette.png',dir));
  const at=(bin.length+3)&~3,grown=Buffer.concat([bin,Buffer.alloc(at-bin.length),palette,Buffer.alloc(((palette.length+3)&~3)-palette.length)]);
  json.bufferViews.push({buffer:0,byteOffset:at,byteLength:palette.length});const {uri,...image}=json.images[0];json.images[0]={bufferView:json.bufferViews.length-1,...image};json.buffers[0].byteLength=grown.length;
  let text=Buffer.from(JSON.stringify(json));text=Buffer.concat([text,Buffer.alloc(((text.length+3)&~3)-text.length,0x20)]);
  const head=Buffer.alloc(20),binHead=Buffer.alloc(8);head.writeUInt32LE(0x46546c67,0);head.writeUInt32LE(2,4);head.writeUInt32LE(28+text.length+grown.length,8);head.writeUInt32LE(text.length,12);head.writeUInt32LE(0x4e4f534a,16);
  binHead.writeUInt32LE(grown.length,0);binHead.writeUInt32LE(0x004e4942,4);
  writeFileSync(join(tmp,'plant_001.glb'),Buffer.concat([head,text,binHead,grown]));
  const first=execFileSync(process.execPath,[new URL('scripts/share-palette.mjs',root).pathname,tmp],{encoding:'utf8'});
  assert.match(first,/1 of 2 models now point at the palette/);
  assert.ok(readFileSync(join(tmp,'plant_001.glb')).equals(shared),'the same file as the one in the game');
  assert.match(execFileSync(process.execPath,[new URL('scripts/share-palette.mjs',root).pathname,tmp],{encoding:'utf8'}),/0 of 2 models now point at the palette/);
  assert.ok(existsSync(join(tmp,'village-palette.png')));
 }finally{rmSync(tmp,{recursive:true,force:true});}
});
