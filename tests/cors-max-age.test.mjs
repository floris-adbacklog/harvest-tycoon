import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 11 Oct 2026 (Part A, A2): farm-api and crazygames-auth let a browser keep the answer to its preflight for up to 2 hours. A kept
// preflight that misses a header the browser sends fails every request for those 2 hours, so Allow-Headers is checked against what
// the game really sends: supabase-js (farm-api, through functions.invoke) and our own fetch (crazygames-auth).
const corsOf=file=>{const line=read(file).match(/^const cors=\{.*\};$/m)?.[0];assert.ok(line,`${file} has its cors line`);return Object.fromEntries([...line.matchAll(/'([^']+)':'([^']*)'/g)].map(m=>[m[1],m[2]]));};
const FILES=['supabase/functions/farm-api/index.ts','supabase/functions/crazygames-auth/index.ts'];

test('farm-api and crazygames-auth keep their preflight for 2 hours and answer OPTIONS with it',()=>{
 for(const file of FILES){
  const cors=corsOf(file),source=read(file);
  assert.equal(cors['Access-Control-Max-Age'],'7200',file);
  assert.equal(cors['Access-Control-Allow-Origin'],'*',file);
  assert.match(cors['Access-Control-Allow-Methods'],/POST/);assert.match(cors['Access-Control-Allow-Methods'],/OPTIONS/);
  assert.match(source,/if\(req\.method==='OPTIONS'\)return new Response\('ok',\{headers:cors\}\);/,`${file}: the preflight answer carries the same headers`);
 }
});

test('Allow-Headers names every header the game sends to them',()=>{
 const allowed=file=>new Set(corsOf(file)['Access-Control-Allow-Headers'].split(',').map(h=>h.trim().toLowerCase()));
 // supabase-js functions.invoke: the bearer and the key (fetchWithAuth), JSON, and its own X-Client-Info.
 for(const h of ['authorization','apikey','content-type','x-client-info'])assert.ok(allowed(FILES[0]).has(h),`farm-api allows ${h}`);
 // Our own fetch in src/crazygames.js askServer: content-type, apikey and (for a guest who logs in) authorization.
 const ask=read('src/crazygames.js').match(/fetch\(`\$\{functionsUrl\}\/crazygames-auth[^\n]*/)?.[0]??'';
 const sent=[...ask.matchAll(/'?([a-z-]+)'?:(?:'application\/json'|supabaseKey|`Bearer)/g)].map(m=>m[1].toLowerCase());
 assert.deepEqual(sent.sort(),['apikey','authorization','content-type']);
 for(const h of sent)assert.ok(allowed(FILES[1]).has(h),`crazygames-auth allows ${h}`);
 // No trace headers (traceparent, tracestate, baggage): they are only sent with tracePropagation, which the game never turns on.
 assert.doesNotMatch(read('src/supabase.js'),/tracePropagation/);
});

// A future supabase-js that sends a header of its own by default must not slip past: the installed one's default headers are all allowed.
test('the installed supabase-js sends no default header that farm-api does not allow',{skip:!existsSync(new URL('../node_modules/.pnpm',import.meta.url))},()=>{
 const pnpm=new URL('../node_modules/.pnpm/',import.meta.url),dir=readdirSync(pnpm).find(d=>d.startsWith('@supabase+supabase-js@'));
 if(!dir)return;
 const lib=readFileSync(new URL(`${dir}/node_modules/@supabase/supabase-js/dist/index.mjs`,pnpm),'utf8');
 const defaults=lib.match(/const DEFAULT_HEADERS = \{([^}]*)\}/)?.[1]??'';
 const names=[...defaults.matchAll(/"([A-Za-z-]+)":/g)].map(m=>m[1].toLowerCase());
 assert.ok(names.length,'found its DEFAULT_HEADERS');
 const allowed=new Set(corsOf(FILES[0])['Access-Control-Allow-Headers'].split(',').map(h=>h.trim().toLowerCase()));
 for(const name of names)assert.ok(allowed.has(name),`supabase-js sends ${name} by default`);
});
