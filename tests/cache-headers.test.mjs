import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const rules=JSON.parse(read('vercel.json')).headers;
const get=source=>Object.fromEntries(rules.find(r=>r.source===source).headers.map(h=>[h.key,h.value]));

test('pinned vendor libraries and webfonts are cached for a year: nobody re-fetches three.js on every visit',()=>{
 assert.equal(get('/vendor/(.*)')['Cache-Control'],'public, max-age=31536000, immutable');
 assert.equal(get('/assets/fonts/(.*)')['Cache-Control'],'public, max-age=31536000, immutable');
 // Long caching is only safe for files this project never edits in place; every vendor and font file has exactly one commit, ever.
 for(const dir of ['public/vendor','public/assets/fonts']){
  const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${d}/${e.name}`):[`${d}/${e.name}`]);
  assert(walk(new URL(`../${dir}`,import.meta.url).pathname).length>0,dir);
 }
});
test('everything the game itself ships (game code, rules, HTML, the /cloud account bundle) still revalidates on every load',()=>{
 // These change with almost every release; a returning player must never run yesterday's rules against today's server (see HANDOFF-NOTES.md,
 // "push the client first" — an old client can misread a migrated farm). Vendor/font caching must not spill onto these.
 assert.equal(get('/')['Cache-Control'],'no-cache');
 assert.equal(get('/(.*).html')['Cache-Control'],'no-cache');
 assert.equal(get('/cloud/(.*)')['Cache-Control'],'no-cache');
 for(const source of ['/vendor/(.*)','/assets/fonts/(.*)'])assert(rules.findIndex(r=>r.source===source)>rules.findIndex(r=>r.source==='/cloud/(.*)'),`${source} is declared, and does not replace, the existing rules`);
});
