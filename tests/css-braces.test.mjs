import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
// A stray "}" is no error to a browser: it quietly drops the rule after it (Oct 2026: one after the header media queries in pass.css
// took #pass-menu-entry's object-fit with it). Every stylesheet's braces must pair up, never closing more than are open.
const sheets=[...readdirSync(new URL('../public/',import.meta.url)).filter(name=>name.endsWith('.css')).map(name=>`public/${name}`),
 ...readdirSync(new URL('../',import.meta.url)).filter(name=>name.endsWith('.css'))];
function strayBrace(css){
 const text=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/"[^"\n]*"|'[^'\n]*'/g,'""');
 let depth=0;
 for(let i=0;i<text.length;i++){
  if(text[i]==='{')depth++;
  else if(text[i]==='}'&&--depth<0)return `a "}" with nothing open on line ${text.slice(0,i).split('\n').length}`;
 }
 return depth?`${depth} "{" never closed`:null;
}
test('every stylesheet has balanced braces',()=>{
 assert.ok(sheets.length>20);
 for(const sheet of sheets)assert.equal(strayBrace(readFileSync(new URL(`../${sheet}`,import.meta.url),'utf8')),null,sheet);
});
test('the check finds a stray brace and an open one',()=>{
 assert.match(strayBrace('@media(x){a{b:c}}\n}\nd{e:f}'),/line 2/);
 assert.match(strayBrace('a{b:c'),/never closed/);
 assert.equal(strayBrace('a{content:"}"}/* } */'),null);
});
