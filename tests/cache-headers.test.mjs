import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {versionable} from '../scripts/cache-bust.mjs';
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
// Oct 2026: the language pages (/es/, ...) are the sign-in page too. Vercel matches the address asked for, so /es/ needs its own rule.
test('the language pages revalidate on every load like the home page',()=>{
 const rule=rules.find(r=>/^\/:lang\([a-z|]+\)\/$/.test(r.source));
 assert.ok(rule,'a rule for /:lang(...)/');assert.equal(get(rule.source)['Cache-Control'],'no-cache');
});
// 15 Oct 2026 (the 12% report, fourth time): at 12% the farm page asks again, for every one of its ~126 scripts and stylesheets,
// whether it changed (max-age=0), and one such request left without an answer kept the bar at 12% until a refresh. Their addresses
// carry their content (?v=<sha256 start>, scripts/cache-bust.mjs), so a changed file is a new address: those are kept 30 days without
// asking (30, not a year: an old ?v asked after a deploy gets today's file, and is then kept no longer than that). The pages stay
// no-cache, so a new release still reaches every player at once, and an address without ?v still revalidates.
test('scripts and stylesheets at a versioned address (?v=) are kept 30 days without asking again; everything else as before',()=>{
 const rule=rules.find(r=>r.source==='/(.*)\\.(js|css)');
 assert.ok(rule,'a rule for versioned scripts and stylesheets');
 assert.deepEqual(rule.has,[{type:'query',key:'v'}],'only an address with ?v=, never the plain one');
 assert.deepEqual(rule.headers,[{key:'Cache-Control',value:'public, max-age=2592000, immutable'}]);
 assert.equal(get('/(.*).html')['Cache-Control'],'no-cache','the pages that name the versions still revalidate');
 assert.ok(versionable('/game.js')&&versionable('/styles.css')&&!versionable('/vendor/three.module.js'),'cache-bust versions our scripts and stylesheets, not the vendor files');
});
