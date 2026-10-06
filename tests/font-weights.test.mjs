import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
// 6 Oct 2026: a chat message in Russian or Chinese looked much thicker than the same message in English. The game's fonts have
// DM Sans 400 and 700 and Outfit 600 and 700, and no Cyrillic, Chinese, Arabic or Hindi letters: those come from the device's own
// font at the weight the CSS asks for. A 500 (the chat) drew Latin letters regular but the others medium; an 800 drew them black.
// Only weights the fonts have, so every script gets the same weight; for Latin letters nothing changes (the browser already drew a
// 500 as 400 and an 800 as 700).
test('the CSS only asks for weights the game\'s fonts have, and bold text is 700, not "bolder"',()=>{
 const dir=new URL('../public/',import.meta.url),wrong=[];
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.css'))){
  const css=readFileSync(new URL(file,dir),'utf8').replace(/@font-face\{[^}]*\}/g,'');
  for(const m of css.matchAll(/(?:font-weight:\s*|\bfont:\s*(?:italic\s+)?)(\d{3})\b/g))if(!['400','600','700'].includes(m[1]))wrong.push(`${file}: ${m[0]}`);
 }
 assert.deepEqual(wrong,[]);
 assert.match(readFileSync(new URL('styles.css',dir),'utf8'),/\nb,strong\{font-weight:700\}\n/);
 assert.match(readFileSync(new URL('family-flag.js',dir),'utf8'),/\.font=`700 /,'the family flag\'s letters on the canvas too');
});
