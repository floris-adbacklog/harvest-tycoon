import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localNumbers} from '../public/i18n.js';

const NB=' ';
test('English numbers are shown in each language\'s own notation',()=>{
 assert.equal(localNumbers('en'),null);assert.equal(localNumbers('ja'),null);assert.equal(localNumbers('hi'),null);
 assert.equal(localNumbers('nl')('Darabja 1,456 · 24.9K · 1.6× · 12,345,678'),'Darabja 1.456 · 24,9K · 1,6× · 12.345.678');
 assert.equal(localNumbers('de')('+2,500 coins'),'+2.500 coins');
 assert.equal(localNumbers('cs')('1,456'),`1${NB}456`);
 assert.equal(localNumbers('hu')('1,456 · 25,000'),`1456 · 25${NB}000`,'Hungarian and Spanish leave four digits together');
 assert.equal(localNumbers('es')('1,456 · 25,000'),'1456 · 25.000');
 assert.ok(/^1\s456$/u.test(localNumbers('fr')('1,456')),'French uses a (narrow) no-break space');
});

test('what a translator wrote, times, versions and lists stay as they are',()=>{
 const nl=localNumbers('nl');
 for(const text of ['1.000 munten','00:00 UTC','v1.2.3','1, 2, 3','3/5','2026. szeptember 16.','1,5×','10 %'])assert.equal(nl(text),text,text);
 for(const code of ['cs','de','es','fr','id','hu','nl','pt','tr','ru','uk']){
  const dict=JSON.parse(readFileSync(new URL(`../public/i18n/${code}.json`,import.meta.url),'utf8')),f=localNumbers(code);
  for(const value of Object.values(dict))for(const text of typeof value==='string'?[value]:Object.values(value))assert.equal(f(text),text,`${code}: ${text}`);
 }
});

test('the translation layer applies it to every text and attribute it writes, numbers-only texts too',()=>{
 const src=readFileSync(new URL('../public/i18n.js',import.meta.url),'utf8');
 assert.match(src,/numbers=localNumbers\(translator\.code\)/);
 assert.match(src,/if\(numbers&&\/\\d\/\.test\(next\)\)next=numbers\(next\);/);
 assert.match(src,/if\(numbers&&\/\\d\/\.test\(out\)\)out=numbers\(out\);/);
});
