import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 25 Sep 2026: the game loads only the line icons it uses (public/lucide-icons.js, ~28 KB), not all of Lucide (400 KB).
test('the game loads the slim icon file, and every icon name in the code is in it',()=>{
 const farm=read('public/farm.html');
 assert.match(farm,/<script src="\/lucide-icons\.js"><\/script><script>lucide\.createIcons\(\);<\/script>/);
 assert.doesNotMatch(farm,/vendor\/lucide\.min\.js/,'not the whole library');
 const file=read('public/lucide-icons.js'),icons=JSON.parse(file.match(/const icons=(\{.*?\});\n/s)[1]);
 const pascal=n=>n.replace(/^([A-Z])|[\s-_]+(\w)/g,(x,a,b)=>b?b.toUpperCase():a.toLowerCase()).replace(/^./,c=>c.toUpperCase());
 const code=['public','src'].flatMap(dir=>readdirSync(new URL(`../${dir}/`,import.meta.url)).filter(f=>/\.(js|html)$/.test(f)&&f!=='lucide-icons.js').map(f=>read(`${dir}/${f}`))).join('\n');
 const used=[...new Set([...code.matchAll(/data-lucide="([a-z0-9-]+)"/g)].map(m=>m[1]))];
 assert.ok(used.length>40,`found ${used.length} icon names`);
 for(const name of used)assert.ok(icons[pascal(name)],`${name} is in public/lucide-icons.js (run node scripts/build-lucide-subset.mjs)`);
 for(const name of ['check','lock-keyhole','droplets','trash-2','circle-check'])assert.ok(icons[pascal(name)],`${name}, picked at run time`);
 assert.ok(file.length<60000,'a small file');
 assert.match(read('scripts/build-static.mjs'),/await import\('\.\/build-lucide-subset\.mjs'\);/,'made again on every deploy');
 assert.match(file,/@license lucide/,'the licence stays with the icons');
});
