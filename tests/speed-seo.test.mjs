import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {art,pictureFile,refreshArt} from '../public/visual-icons.js';
import {BUILDINGS} from '../game/farm-state.js';
const file=path=>new URL(`../${path}`,import.meta.url);
const read=path=>readFileSync(file(path),'utf8');
const bytes=path=>readFileSync(file(path));
// Pixel size from the file header, without an image library.
function size(path){
 const b=bytes(path);
 if(b.toString('ascii',1,4)==='PNG')return {w:b.readUInt32BE(16),h:b.readUInt32BE(20)};
 if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'){
  const chunk=b.toString('ascii',12,16);
  if(chunk==='VP8X')return {w:b.readUIntLE(24,3)+1,h:b.readUIntLE(27,3)+1};
  if(chunk==='VP8 ')return {w:b.readUInt16LE(26)&0x3fff,h:b.readUInt16LE(28)&0x3fff};
  if(chunk==='VP8L'){const v=b.readUInt32LE(21);return {w:(v&0x3fff)+1,h:((v>>14)&0x3fff)+1};}
 }
 if(b[0]===0xff&&b[1]===0xd8){
  for(let i=2;i<b.length;){const marker=b[i+1],length=b.readUInt16BE(i+2);if(marker>=0xc0&&marker<=0xc2)return {w:b.readUInt16BE(i+7),h:b.readUInt16BE(i+5)};i+=2+length;}
 }
 throw new Error(`unknown image ${path}`);
}

test('the music loads as FLAC first: lossless, every sample identical to the WAV, under a quarter of its size, with the WAV as fallback',()=>{
 const flac=bytes('public/assets/audio/harvest-meadow.flac'),wav=bytes('public/assets/audio/harvest-meadow.wav');
 assert.equal(flac.toString('ascii',0,4),'fLaC');assert.equal(flac[4]&0x7f,0,'STREAMINFO comes first');
 const info=flac.subarray(8,42);
 assert.equal((info[10]<<12)|(info[11]<<4)|(info[12]>>4),24000,'24 kHz like the WAV');
 assert.equal(((info[12]>>1)&7)+1,1,'mono');assert.equal((((info[12]&1)<<4)|(info[13]>>4))+1,16,'16-bit');
 assert.equal((info[13]&0xf)*2**32+info.readUInt32BE(14),3456000,'144 seconds of samples');
 // FLAC stores the MD5 of the decoded samples: equal to the WAV's sample data means the loop (and its seam) is bit for bit the same.
 assert.equal(info.subarray(18,34).toString('hex'),createHash('md5').update(wav.subarray(44)).digest('hex'));
 assert.ok(flac.length<wav.length/4);
 const audio=read('public/farm-audio.js');
 assert.match(audio,/\['\.\/assets\/audio\/harvest-meadow\.flac','\.\/assets\/audio\/harvest-meadow\.wav'\]/,'FLAC first, WAV as fallback');
});

const LARGE=['familyhall-model','helping-hand','windmill','family-fox','family-owl','family-windmill','chore-weeds','chore-fences','activity-paddock','activity-workshop','greenbeans','juicepress','preserves','kitchen','berrysmoothie','applevinegar','beangratin','beeyard','sheepbarn','glasshouse','weaving','goatshed','craftshop'];
const PLACES=['valleymarket','ranch','estateworkshop','tradedepot','grandfair'].map(key=>`place-${key}`);
test('the second WebP batch: same pixel size as the PNG it came from (which stays), well under half its weight, and actually requested',()=>{
 for(const name of [...LARGE,...PLACES]){
  const png=`public/assets/icons/${name}.png`,webp=`public/assets/icons/${name}.webp`;
  assert.ok(existsSync(file(png))&&existsSync(file(webp)),name);
  assert.deepEqual(size(webp),size(png),`${name}: same pixel size`);
  assert.ok(statSync(file(webp)).size<statSync(file(png)).size*.4,`${name}.webp should be well under half the PNG`);
 }
 for(const key of LARGE)assert.match(art(key),new RegExp(`/assets/icons/${key}\\.webp"`),key);
});
test('the Buildings list and a building page ask pictureFile() for every picture, and every file it names exists',()=>{
 const ui=read('public/economy-ui.js');
 assert.doesNotMatch(ui,/\/assets\/icons\/\$\{[^}]*\}\.png/,'no hardcoded .png picture paths left');
 for(const name of [...Object.keys(BUILDINGS),'familyhall-model',...PLACES])assert.ok(existsSync(file(`public${pictureFile(name)}`)),pictureFile(name));
 assert.equal(pictureFile('farmhouse'),'/assets/icons/farmhouse.png','the small pictures stay PNG');
 assert.equal(pictureFile('glasshouse'),'/assets/icons/glasshouse.webp');
});

test('the logo is a WebP at the full 1024 px everywhere it is shown; the favicon is a small file, not the 700 KB logo',()=>{
 assert.deepEqual(size('public/assets/harvest-tycoon-logo.webp'),size('public/assets/harvest-tycoon-logo.png'));
 assert.ok(statSync(file('public/assets/harvest-tycoon-logo.webp')).size<statSync(file('public/assets/harvest-tycoon-logo.png')).size*.4);
 for(const page of ['public/play.html','public/farm.html','public/privacy.html','public/delete-account.html','public/404.html','src/ui.js']){
  const html=read(page);
  assert.doesNotMatch(html,/harvest-tycoon-logo\.png/,page);
  assert.match(html,/src="\/assets\/harvest-tycoon-logo\.webp"/,page);
 }
});

test('Google can load the favicon: /favicon.ico (16, 32 and 48 px) and a 96 px PNG (a multiple of 48), linked from every page',()=>{
 const ico=bytes('public/favicon.ico');
 assert.equal(ico.readUInt16LE(0),0);assert.equal(ico.readUInt16LE(2),1,'an icon file');
 const sizes=Array.from({length:ico.readUInt16LE(4)},(_,i)=>ico[6+i*16]);assert.deepEqual(sizes,[16,32,48]);
 for(let i=0;i<sizes.length;i++){const offset=ico.readUInt32LE(6+i*16+12);assert.equal(ico.toString('ascii',offset+1,offset+4),'PNG');}
 assert.deepEqual(size('public/assets/favicon-96.png'),{w:96,h:96});
 for(const page of ['public/play.html','public/farm.html','public/privacy.html','public/delete-account.html','public/404.html']){
  const html=read(page);
  assert.match(html,/<link rel="icon" href="\/favicon\.ico" sizes="16x16 32x32 48x48">/,page);
  assert.match(html,/<link rel="icon" type="image\/png" sizes="96x96" href="\/assets\/favicon-96\.png">/,page);
 }
});

test('the home page has a search title and description, a canonical address, and a share card with a real 1200×630 image',()=>{
 const html=read('public/play.html'),SITE='https://www.harvesttycoon.com';
 const meta=(attr,name)=>html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)">`))?.[1];
 const title=html.match(/<title>([^<]+)<\/title>/)[1];
 assert.ok(title.startsWith('Harvest Tycoon')&&title.length<=60,title);
 const description=meta('name','description');assert.ok(description.length>=70&&description.length<=160,description);
 assert.match(html,new RegExp(`<link rel="canonical" href="${SITE}/">`));
 assert.equal(meta('property','og:url'),`${SITE}/`);assert.equal(meta('property','og:type'),'website');
 for(const name of ['og:title','og:description','og:image:alt','twitter:title','twitter:description'])assert.ok(meta(name.startsWith('og')?'property':'name',name)?.length>10,name);
 assert.equal(meta('property','og:image'),`${SITE}/assets/og-image.jpg`);assert.equal(meta('name','twitter:image'),`${SITE}/assets/og-image.jpg`);
 assert.equal(meta('name','twitter:card'),'summary_large_image');
 assert.deepEqual(size('public/assets/og-image.jpg'),{w:1200,h:630});
 assert.equal(meta('property','og:image:width'),'1200');assert.equal(meta('property','og:image:height'),'630');
 const data=JSON.parse(html.match(/<script type="application\/ld\+json">(.+?)<\/script>/)[1]);
 assert.deepEqual(data,{'@context':'https://schema.org','@type':'WebSite',name:'Harvest Tycoon',url:`${SITE}/`});
 // The static build serves this same file as / (dist-static/index.html), so the tags reach the home page.
 assert.match(read('scripts/build-static.mjs'),/readFileSync\('public\/play\.html'/);
});
test('robots.txt keeps the site open, hides only the bare farm frame, and points to the sitemap',()=>{
 const robots=read('public/robots.txt');
 assert.match(robots,/^User-agent: \*$/m);assert.match(robots,/^Disallow: \/farm\.html$/m);
 assert.doesNotMatch(robots,/^Disallow: \/$/m,'never block the whole site');
 assert.match(robots,/^Sitemap: https:\/\/www\.harvesttycoon\.com\/sitemap\.xml$/m);
 const sitemap=read('public/sitemap.xml');
 assert.match(sitemap,/<loc>https:\/\/www\.harvesttycoon\.com\/<\/loc>/);assert.match(sitemap,/<loc>https:\/\/www\.harvesttycoon\.com\/privacy<\/loc>/);
});

test('refreshArt only asks Lucide to draw when an icon is still waiting (Lucide would otherwise redraw them all twice a second)',()=>{
 const drawn=[];let waiting=false;const selectors=[];
 globalThis.window={lucide:{createIcons:()=>drawn.push(1)}};
 globalThis.document={querySelectorAll:selector=>{if(selector.includes(':not(svg)')){selectors.push(selector);return waiting?[{}]:[];}return [];}};
 try{
  refreshArt();assert.equal(drawn.length,0);
  waiting=true;refreshArt();assert.equal(drawn.length,1);
  assert.deepEqual([...new Set(selectors)],['[data-lucide]:not(svg)']);
 }finally{delete globalThis.window;delete globalThis.document;}
});
test('the map labels read the view size once per update, not once per label (each read after a move forces a new layout)',()=>{
 const game=read('public/game.js');
 const body=name=>{const start=game.indexOf(`function ${name}(){`);let depth=0,i=game.indexOf('{',start);for(;i<game.length;i++){if(game[i]==='{')depth++;else if(game[i]==='}'&&!--depth)break;}return game.slice(start,i+1);};
 for(const name of ['positionLabels','positionBuildingLabels']){
  const code=body(name);
  assert.equal(code.match(/world\.clientWidth/g).length,1,name);assert.equal(code.match(/world\.clientHeight/g).length,1,name);
 }
});
