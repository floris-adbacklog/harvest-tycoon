// Every rule from farm-state.js that game.js calls must be imported there (26 Oct 2026: binPaidNote called utcDay without importing it,
// and every farm whose shipping bin had paid failed to start with "utcDay is not defined").
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const game=fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const rules=fs.readFileSync(new URL('../public/farm-state.js',import.meta.url),'utf8');
const exported=new Set([...rules.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]));
const imported=new Set([...game.matchAll(/^import\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/gm)].flatMap(m=>m[1].split(',').map(s=>s.trim().split(/\s+as\s+/).pop()).filter(Boolean)));
const declared=new Set([...game.matchAll(/(?:function\*?\s+|(?:const|let|var)\s+|[{,]\s*)([A-Za-z_$][\w$]*)\s*(?=[=(,}])/g)].map(m=>m[1]));
test('game.js imports every farm-state rule it calls',()=>{
 const missing=[...exported].filter(name=>new RegExp(`(?<![\\w$.])${name.replace(/\$/g,'\\$')}\\(`).test(game)&&!imported.has(name)&&!declared.has(name));
 assert.deepEqual(missing,[],'called in game.js but not imported from farm-state.js: '+missing.join(', '));
});
