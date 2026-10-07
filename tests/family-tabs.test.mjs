import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// The family's five tabs on a phone of 360px (7 Oct 2026, "Tournamen t" in the Play screenshots): a word never breaks; each tab is at
// least as wide as its longest word, and a language that still doesn't fit scrolls the row sideways. Measured in all 16 languages at
// 360px: every row fits, Portuguese once its Sharing tab is "Doações" ("Compartilhamento" did not).
test('the family tabs never break a word on a small phone',()=>{
 const css=read('public/family.css');
 assert.match(css,/@media\(max-width:600px\)\{#family-tabs\{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:minmax\(min-content,auto\);overflow-x:auto;overflow-y:hidden;scrollbar-width:none\}#family-tabs::-webkit-scrollbar\{display:none\}#family-tabs button>span\{overflow-wrap:normal;hyphens:manual\}\}/);
 assert.ok(css.lastIndexOf('overflow-wrap:normal;hyphens:manual')>css.lastIndexOf('#family-tabs button>span{max-width:100%;overflow-wrap:anywhere'),'the phone rule comes after the general one');
 assert.equal(JSON.parse(read('public/i18n/pt.json')).Sharing,'Doações');
});
